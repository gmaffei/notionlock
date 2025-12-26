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

        // Inject a base tag so relative links (like /image.png) resolve to https://notion.site
        // This is the simplest "Cheat" to make assets load without proxying every single image yet.
        // Ideally we would proxy assets too for full white-labeling, but that's Phase 2.
        $('head').prepend('<base href="https://notion.site">');

        // 3. Inject generic custom styles to hide Notion header/footer if possible
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
