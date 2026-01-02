const axios = require('axios');
const cheerio = require('cheerio');

async function fetchAndRewriteNotionPage(notionUrl) {
    // Use process.env.REACT_APP_API_URL if available, otherwise default to production domain
    // CRITICAL: Do NOT fallback to localhost in production or mixed content errors will occur
    const API_HOST = process.env.REACT_APP_API_URL || 'https://api.notionlock.com';

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

        // Parse with Cheerio  
        const $ = cheerio.load(html);

        // CRITICAL FIX: Rewrite all Notion script tags to proxy through our JS modifier
        // This will strip SharedWorker/Worker code server-side before sending to browser
        $('script[src]').each((i, elem) => {
            const src = $(elem).attr('src');

            // Only rewrite Notion scripts (not third-party CDN scripts)
            if (src && (src.includes('notion.so') || src.startsWith('/_next/') || src.startsWith('/_assets/') || src.startsWith('/'))) {
                const absoluteUrl = src.startsWith('http') ? src : `https://www.notion.so${src}`;
                const proxiedUrl = `${API_HOST}/api/p/js-proxy?url=${encodeURIComponent(absoluteUrl)}`;
                $(elem).attr('src', proxiedUrl);
            }
        });

        // 2. Rewrite base to ensure relative links work (or remove it to handle manually)
        // Notion uses relative paths often, we need to make sure they resolve to Notion's domains
        // OR proxy them. For MVP, we'll try to resolve them to absolute Notion URLs where possible
        // or leave them if they are data-uris.

        // CRITICAL: Inject interceptor FIRST via prepend, before any Notion scripts run
        // This ensures we catch all dynamic script loading
        $('head').prepend(`
        <script>
            (function() {
            // Execute immediately in IIFE to ensure it runs before anything else
            console.log("NotionLock Proxy Interceptor Loaded");
            const PROXY_ENDPOINT = "${API_HOST}/api/p/cors-proxy?url=";
            const ASSET_ENDPOINT = "${API_HOST}/api/p/asset?url=";
            const JS_PROXY_ENDPOINT = "${API_HOST}/api/p/js-proxy?url=";

            function rewriteUrl(url, type = 'api') {
              if (typeof url !== 'string') return url;

              // Handle relative URLs manually
              if (url.startsWith("/")) {
                url = "https://www.notion.so" + url;
              }

              // Skip already proxied URLs
              if (url.includes('/api/p/')) return url;

              // Proxy Notion calls
              if (url.includes("notion.so") || url.includes("notion.site")) {
                if (type === 'script') {
                  return JS_PROXY_ENDPOINT + encodeURIComponent(url);
                }
                const endpoint = type === 'asset' ? ASSET_ENDPOINT : PROXY_ENDPOINT;
                return endpoint + encodeURIComponent(url);
              }
              return url;
            }

            // 1. Intercept fetch() calls
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

            // 2. Intercept XMLHttpRequest.open()
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
              const newUrl = rewriteUrl(url, 'api');
              return originalOpen.call(this, method, newUrl, ...args);
            };

            // 3. CRITICAL: Intercept document.createElement to catch dynamically created scripts
            const originalCreateElement = document.createElement.bind(document);
            document.createElement = function(tagName, options) {
              const element = originalCreateElement(tagName, options);

              if (tagName.toLowerCase() === 'script') {
                // Override the src property setter to intercept script URLs
                const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
                let interceptedSrc = '';

                Object.defineProperty(element, 'src', {
                  get() {
                    return interceptedSrc;
                  },
                  set(value) {
                    if (value && (value.includes('notion.so') || value.includes('notion.site') || value.startsWith('/'))) {
                      let absoluteUrl = value;
                      if (value.startsWith('/')) {
                        absoluteUrl = 'https://www.notion.so' + value;
                      }
                      // Don't double-proxy
                      if (!absoluteUrl.includes('/api/p/')) {
                        interceptedSrc = JS_PROXY_ENDPOINT + encodeURIComponent(absoluteUrl);
                        console.log('[NotionLock] Intercepted script:', value, '->', interceptedSrc);
                        originalSrcDescriptor.set.call(this, interceptedSrc);
                        return;
                      }
                    }
                    interceptedSrc = value;
                    originalSrcDescriptor.set.call(this, value);
                  },
                  configurable: true,
                  enumerable: true
                });
              }

              if (tagName.toLowerCase() === 'link') {
                // Similarly intercept stylesheets
                const originalHrefDescriptor = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href');
                let interceptedHref = '';

                Object.defineProperty(element, 'href', {
                  get() {
                    return interceptedHref;
                  },
                  set(value) {
                    if (value && (value.includes('notion.so') || value.includes('notion.site') || value.startsWith('/'))) {
                      let absoluteUrl = value;
                      if (value.startsWith('/')) {
                        absoluteUrl = 'https://www.notion.so' + value;
                      }
                      if (!absoluteUrl.includes('/api/p/')) {
                        interceptedHref = ASSET_ENDPOINT + encodeURIComponent(absoluteUrl);
                        originalHrefDescriptor.set.call(this, interceptedHref);
                        return;
                      }
                    }
                    interceptedHref = value;
                    originalHrefDescriptor.set.call(this, value);
                  },
                  configurable: true,
                  enumerable: true
                });
              }

              return element;
            };

            // 4. MutationObserver as backup for any scripts that slip through
            console.log("Resource Sentinel initialized...");
            const observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                  if (node.tagName === 'SCRIPT' && node.src) {
                    const src = node.src;
                    if ((src.includes('notion.so') || src.includes('notion.site')) && !src.includes('/api/p/')) {
                      console.log('[NotionLock] MutationObserver caught script:', src);
                      // Replace the script element
                      const newScript = originalCreateElement('script');
                      newScript.src = JS_PROXY_ENDPOINT + encodeURIComponent(src);
                      if (node.parentNode) {
                        node.parentNode.replaceChild(newScript, node);
                      }
                    }
                  }
                  if (node.tagName === 'LINK' && node.rel === 'stylesheet' && node.href) {
                    const href = node.href;
                    if ((href.includes('notion.so') || href.includes('notion.site')) && !href.includes('/api/p/')) {
                      node.href = ASSET_ENDPOINT + encodeURIComponent(href);
                    }
                  }
                });
              });
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });

            // 5. Handle script loading errors by logging them
            window.addEventListener('error', function(e) {
              if (e.target && e.target.tagName === 'SCRIPT') {
                console.log('Resource Sentinel noted a failed resource load of type script', e.target.src);
              }
              if (e.target && e.target.tagName === 'LINK') {
                console.log('Resource Sentinel noted a failed resource load of type stylesheet', e.target.href);
              }
            }, true);

            // 6. Override webpack's script loading mechanism if present
            // Webpack uses __webpack_require__.l for dynamic imports
            Object.defineProperty(window, '__webpack_public_path__', {
              get() { return '${API_HOST}/api/p/js-proxy?url=' + encodeURIComponent('https://www.notion.so'); },
              set() { /* ignore */ },
              configurable: true
            });

            // 7. CRITICAL: Also intercept setAttribute for scripts (Webpack sometimes uses this)
            const originalSetAttribute = Element.prototype.setAttribute;
            Element.prototype.setAttribute = function(name, value) {
              if (this.tagName === 'SCRIPT' && name.toLowerCase() === 'src') {
                if (value && (value.includes('notion.so') || value.includes('notion.site') || value.startsWith('/'))) {
                  let absoluteUrl = value;
                  if (value.startsWith('/')) {
                    absoluteUrl = 'https://www.notion.so' + value;
                  }
                  if (!absoluteUrl.includes('/api/p/')) {
                    console.log('[NotionLock] setAttribute intercepted:', value);
                    value = JS_PROXY_ENDPOINT + encodeURIComponent(absoluteUrl);
                  }
                }
              }
              if (this.tagName === 'LINK' && name.toLowerCase() === 'href') {
                if (value && (value.includes('notion.so') || value.includes('notion.site') || value.startsWith('/'))) {
                  let absoluteUrl = value;
                  if (value.startsWith('/')) {
                    absoluteUrl = 'https://www.notion.so' + value;
                  }
                  if (!absoluteUrl.includes('/api/p/')) {
                    value = ASSET_ENDPOINT + encodeURIComponent(absoluteUrl);
                  }
                }
              }
              return originalSetAttribute.call(this, name, value);
            };

            // 8. Override HTMLScriptElement.prototype.src setter directly as ultimate fallback
            const scriptSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
            if (scriptSrcDescriptor && scriptSrcDescriptor.set) {
              Object.defineProperty(HTMLScriptElement.prototype, 'src', {
                get: scriptSrcDescriptor.get,
                set: function(value) {
                  if (value && (value.includes('notion.so') || value.includes('notion.site'))) {
                    if (!value.includes('/api/p/')) {
                      console.log('[NotionLock] Direct src setter intercepted:', value);
                      value = JS_PROXY_ENDPOINT + encodeURIComponent(value);
                    }
                  } else if (value && value.startsWith('/') && !value.startsWith('/api/')) {
                    const absoluteUrl = 'https://www.notion.so' + value;
                    value = JS_PROXY_ENDPOINT + encodeURIComponent(absoluteUrl);
                    console.log('[NotionLock] Relative src intercepted:', value);
                  }
                  return scriptSrcDescriptor.set.call(this, value);
                },
                configurable: true,
                enumerable: true
              });
            }

            console.log('[NotionLock] All interceptors installed successfully');
            })(); // End IIFE
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

        // NOTE: Scripts are already rewritten to /js-proxy above (lines 36-47)
        // DO NOT rewrite scripts here or it will overwrite the /js-proxy rewriting!
        // Scripts need /js-proxy, not /asset, because we need to modify the JavaScript code

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
