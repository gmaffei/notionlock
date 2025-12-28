const axios = require('axios');
const cheerio = require('cheerio');

async function fetchAndRewriteNotionPage(notionUrl) {
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

        const html = response.data;
        const $ = cheerio.load(html);

        // 2. Rewrite base to ensure relative links work (or remove it to handle manually)
        // Notion uses relative paths often, we need to make sure they resolve to Notion's domains
        // OR proxy them. For MVP, we'll try to resolve them to absolute Notion URLs where possible
        // or leave them if they are data-uris.

        // Inject Fetch/XHR Interceptor to tunnel API calls through our CORS proxy
        $('head').prepend(`
        <script>
          (function() {
            console.log("NotionLock Proxy Interceptor Loaded");
            const PROXY_ENDPOINT = window.location.origin + "/api/p/cors-proxy?url=";

            function rewriteUrl(url) {
              if (typeof url !== 'string') return url;
              
              // Handle relative URLs manually since we might intercept before browser resolves against <base>
              if (url.startsWith("/")) {
                url = "https://www.notion.so" + url;
              }
              
              // Proxy Notion API calls
              if (url.includes("notion.so") || url.includes("notion.site")) {
                return PROXY_ENDPOINT + encodeURIComponent(url);
              }
              return url;
            }

            const originalFetch = window.fetch;
            window.fetch = function(input, init) {
              let url = input;
              if (typeof input === "string") {
                url = rewriteUrl(input);
              } else if (input instanceof Request) {
                 // For Request objects, we create a new Request with proxied URL
                 // This is basic and might miss some properties but suffices for URL rewrite
                 url = rewriteUrl(input.url);
                 // If we need to preserve body/headers from input Request, it's complex.
                 // Notion's client mostly passes string URL + init object.
                 // We will assume string input for safety or return original if complex.
              }
              return originalFetch(url, init);
            };

            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
              const newUrl = rewriteUrl(url);
              return originalOpen.call(this, method, newUrl, ...args);
            };
          })();
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
        const API_HOST = process.env.API_BASE_URL || 'https://api.notionlock.com';

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
