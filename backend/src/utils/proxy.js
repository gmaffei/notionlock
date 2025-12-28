const axios = require('axios');
const cheerio = require('cheerio');

async function fetchAndRewriteNotionPage(notionUrl) {
    // Define API_HOST early to prevent ReferenceError in template literals below
    const API_HOST = process.env.API_BASE_URL || 'https://api.notionlock.com';

    try {
        // 1. Fetch the raw HTML from Notion
        // 1. Fetch the raw HTML from Notion
        const response = await axios.get(notionUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            },
            maxRedirects: 5,
            validateStatus: (status) => status < 500 // Resolve even on 4xx to handle gracefully
        });

        if (response.status >= 400) {
            console.error(`Notion upstream error: ${response.status} for URL ${notionUrl}`);
            throw new Error(`Notion upstream error: ${response.status}`);
        }

        let html = response.data;

        // CRITICAL FIX: Inject worker blocker DIRECTLY into HTML string BEFORE Cheerio parsing
        // This ensures it's absolutely first and executed before any Notion scripts
        const workerBlocker = `<script>
(function(){
console.log("[NotionLock] Initializing early worker/OPFS blocker");
try {
    // Store original constructors
    const OriginalSharedWorker = window.SharedWorker;
    const OriginalWorker = window.Worker;
    
    // Override SharedWorker - throw error to force Notion's fallback
    window.SharedWorker = function(url, options) {
        console.warn('[NotionLock] Blocked SharedWorker:', url);
        throw new DOMException('SharedWorker not available in cross-origin context', 'NotSupportedError');
    };
    
    // Override Worker - throw error to force Notion's fallback
    window.Worker = function(url, options) {
        console.warn('[NotionLock] Blocked Worker:', url);
        throw new DOMException('Worker not available in cross-origin context', 'NotSupportedError');
    };
    
    // Remove OPFS APIs
    if (navigator.storage && navigator.storage.getDirectory) {
        delete navigator.storage.getDirectory;
    }
    if (window.FileSystemSyncAccessHandle) {
        delete window.FileSystemSyncAccessHandle;
    }
    
    console.log("[NotionLock] Worker/OPFS blocker active");
} catch (e) {
    console.error("[NotionLock] Blocker failed:", e);
}
})();
</script>`;

        // Inject RIGHT AFTER <head> tag or at the beginning of <html>
        if (html.includes('<head>')) {
            html = html.replace('<head>', '<head>' + workerBlocker);
        } else if (html.includes('<html>')) {
            html = html.replace('<html>', '<html><head>' + workerBlocker + '</head>');
        } else {
            // If no head or html tag, prepend to entire content
            html = workerBlocker + html;
        }

        // NOW parse with Cheerio
        const $ = cheerio.load(html);

        // 2. Rewrite base to ensure relative links work (or remove it to handle manually)
        // Notion uses relative paths often, we need to make sure they resolve to Notion's domains
        // OR proxy them. For MVP, we'll try to resolve them to absolute Notion URLs where possible
        // or leave them if they are data-uris.

        // Inject Fetch/XHR Interceptor to tunnel API calls through our CORS proxy
        $('head').append(`
        <script>
            console.log("NotionLock Proxy Interceptor Loaded");
            const PROXY_ENDPOINT = "${API_HOST}/api/p/cors-proxy?url=";
            const ASSET_ENDPOINT = "${API_HOST}/api/p/asset?url=";

            function rewriteUrl(url, type = 'api') {
              if (typeof url !== 'string') return url;
              
              // Handle relative URLs manually
              if (url.startsWith("/")) {
                url = "https://www.notion.so" + url;
              }
              
              // Proxy Notion calls
              if (url.includes("notion.so") || url.includes("notion.site")) {
                const endpoint = type === 'asset' ? ASSET_ENDPOINT : PROXY_ENDPOINT;
                return endpoint + encodeURIComponent(url);
              }
              return url;
            }

            const originalFetch = window.fetch;
            window.fetch = function(input, init) {
              let url = input;
              if (typeof input === "string") {
                url = rewriteUrl(input, 'api');
              } else if (input instanceof Request) {
                 url = rewriteUrl(input.url, 'api');
              }
              return originalFetch(url, init);
            };

            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
              const newUrl = rewriteUrl(url, 'api');
              return originalOpen.call(this, method, newUrl, ...args);
            };
        </script>
        `);

        // Inject a base tag so relative links (like /image.png) resolve to https://www.notion.so
        // AND inject no-referrer to bypass hotlink protection on assets
        $('head').prepend('<base href="https://www.notion.so">');
        $('head').prepend('<meta name="referrer" content="no-referrer">');

        // Remove any CSP meta tags that might block execution in our iframe
        $('meta[http-equiv="Content-Security-Policy"]').remove();
        $('meta[http-equiv="X-Content-Security-Policy"]').remove();

        // Rewrite Asset URLs to use our Proxy
        // We use absolute URL for the proxy endpoint to ensure it resolves correctly inside the iframe
        // regardless of base tag (although base tag affects relative URLs, so we must resolve them first)
        const PROXY_ASSET_BASE = process.env.REACT_APP_API_URL + '/p/asset?url=';
        // Fallback if env var missing in backend context (usually available via dotenv)
        // or just use relative path if we trust the iframe context (but iframe has base=notion.site)
        // SAFETY: We MUST use absolute URL because of <base href="https://notion.site">
        // If we use /api/p/asset, it will try https://notion.site/api/p/asset -> 404.

        // Let's assume we can construct it or hardcode for now if env generic
        // Let's assume we can construct it or hardcode for now if env generic

        const rewriteUrl = (url) => {
            if (!url) return url;
            // Resolve relative URLs against www.notion.so (where assets live)
            if (url.startsWith('/')) {
                url = 'https://www.notion.so' + url;
            }
            // Only proxy Notion assets
            if (url.includes('notion.site') || url.includes('notion.so')) {
                // Ensure we fetch from notion.so to avoid redirects
                const fetchUrl = url.replace('notion.site', 'www.notion.so');
                return `${API_HOST}/api/p/asset?url=${encodeURIComponent(fetchUrl)}`;
            }
            return url;
        };

        $('script').each((i, el) => {
            const src = $(el).attr('src');
            if (src) {
                $(el).attr('src', rewriteUrl(src));
                $(el).removeAttr('integrity'); // Remove SRI hash to prevent blocking
            }
        });

        $('link[rel="stylesheet"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                $(el).attr('href', rewriteUrl(href));
                $(el).removeAttr('integrity'); // Remove SRI hash to prevent blocking
            }
        });
        $('head').append(`
      <style>
        .notion-topbar { display: none !important; } /* Hide Notion Header */
        .notion-frame { height: 100vh !important; }
      </style>
    `);

        // 4. Return the modified HTML
        return $.html();
    } catch (error) {
        console.error('Proxy Fetch Error:', error.message);
        throw new Error('Failed to fetch Notion page');
    }
}

module.exports = {
    fetchAndRewriteNotionPage
};
