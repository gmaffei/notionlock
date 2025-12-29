const { Client } = require('@notionhq/client');

/**
 * NotionService - Handles all interactions with Notion API
 */
class NotionService {
    constructor() {
        this.client = process.env.NOTION_API_KEY
            ? new Client({ auth: process.env.NOTION_API_KEY })
            : null;
    }

    /**
     * Extract page ID from Notion URL
     * Supports formats:
     * - https://notion.so/page-name-abc123def456
     * - https://www.notion.so/workspace/page-abc123def456
     * - abc123def456 (direct ID)
     */
    extractPageId(notionUrl) {
        if (!notionUrl) return null;

        // If it's already just an ID
        if (/^[a-f0-9]{32}$/.test(notionUrl)) {
            return notionUrl;
        }

        // Extract from URL - supports both formats with and without dashes
        const match = notionUrl.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
        if (!match) return null;

        // Remove dashes to get clean 32-char ID
        return match[1].replace(/-/g, '');
    }

    /**
     * Format page ID with dashes for Notion API
     * Notion API expects: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
     */
    formatPageId(pageId) {
        if (!pageId || pageId.length !== 32) return pageId;

        return `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20)}`;
    }

    /**
     * Fetch page metadata and content blocks from Notion
     */
    async getPageData(pageId) {
        if (!this.client) {
            throw new Error('Notion API client not initialized. Check NOTION_API_KEY environment variable.');
        }

        const formattedId = this.formatPageId(pageId);

        // Fetch page metadata
        const page = await this.client.pages.retrieve({ page_id: formattedId });

        // Fetch all blocks (content)
        const blocks = await this.getAllBlocks(formattedId);

        return {
            page,
            blocks
        };
    }

    /**
     * Recursively fetch all blocks including children
     * Notion API limits to 100 blocks per request
     */
    async getAllBlocks(blockId, blocks = []) {
        const response = await this.client.blocks.children.list({
            block_id: blockId,
            page_size: 100
        });

        for (const block of response.results) {
            blocks.push(block);

            // Recursively fetch children if block has any
            if (block.has_children) {
                await this.getAllBlocks(block.id, blocks);
            }
        }

        // Handle pagination if there are more blocks
        if (response.has_more && response.next_cursor) {
            const nextResponse = await this.client.blocks.children.list({
                block_id: blockId,
                page_size: 100,
                start_cursor: response.next_cursor
            });

            for (const block of nextResponse.results) {
                blocks.push(block);

                if (block.has_children) {
                    await this.getAllBlocks(block.id, blocks);
                }
            }
        }

        return blocks;
    }

    /**
     * Convert Notion API response to react-notion-x compatible format
     */
    toRecordMap(pageData) {
        const { page, blocks } = pageData;

        // Create recordMap structure expected by react-notion-x
        const recordMap = {
            block: {},
            collection: {},
            collection_view: {},
            notion_user: {},
            collection_query: {},
            signed_urls: {}
        };

        // Add page as root block
        recordMap.block[page.id] = {
            value: {
                id: page.id,
                type: 'page',
                properties: page.properties,
                created_time: page.created_time,
                last_edited_time: page.last_edited_time,
                parent_id: page.parent?.page_id || null,
                parent_table: 'space',
                alive: true,
                content: blocks.map(b => b.id)
            }
        };

        // Add all blocks
        blocks.forEach(block => {
            recordMap.block[block.id] = {
                value: {
                    id: block.id,
                    type: block.type,
                    properties: {},
                    created_time: block.created_time,
                    last_edited_time: block.last_edited_time,
                    parent_id: block.parent?.page_id || page.id,
                    parent_table: 'block',
                    alive: true,
                    ...block
                }
            };
        });

        return recordMap;
    }
}

module.exports = new NotionService();
