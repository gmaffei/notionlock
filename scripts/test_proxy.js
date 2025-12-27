const { fetchAndRewriteNotionPage } = require('../backend/src/utils/proxy');

// A public notion page is required. Let's use a known public page or just a generic one.
// The user's failing page is likely private or specific, but we test the mechanism.
// Example: Notion's own public help page or similar.
const TEST_URL = 'https://www.notion.so/What-is-Notion-55e1d4d6232b45398d5a5e3l7f62d1d4'; // Just a random guess, better use a stable one.
// Actually, let's try to fetch the user's specific page if we knew the notion_url. 
// We don't, so we'll test with a generic one.
// Let's use https://notion.site or similar if possible.

// Better to test with a known working public page.
// Let's use the one from a popular template or similar.
const TARGET_URL = 'https://www.notion.so/Notion-Official-83715d7703ee4c8699b5bb4577da7573'; // Notion Official public page

async function test() {
    console.log(`Testing proxy with URL: ${TARGET_URL}`);
    try {
        const html = await fetchAndRewriteNotionPage(TARGET_URL);
        console.log('Success! HTML length:', html.length);
        console.log('Snippet:', html.substring(0, 200));
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

test();
