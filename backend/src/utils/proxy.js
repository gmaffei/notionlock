const axios = require('axios');
const cheerio = require('cheerio');

async function fetchAndRewriteNotionPage(notionUrl) {
    try {
        // 1. Fetch the raw HTML from Notion
        const response = await axios.get(notionUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

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
