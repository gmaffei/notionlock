const axios = require('axios');

/**
 * JavaScript Rewriting Endpoint
 * Fetches Notion JS files and strips SharedWorker/Worker code
 */
router.get('/js-proxy', async (req, res) => {
    const { url } = req.query;
    const { redis } = req;

    if (!url) return res.status(400).send('URL required');

    try {
        // Check cache first
        const cacheKey = `js:${url}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            res.set('Content-Type', 'application/javascript; charset=utf-8');
            res.set('Cache-Control', 'public, max-age=86400');
            return res.send(cached);
        }

        // Fetch original JavaScript
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': '*/*',
                'Referer': 'https://www.notion.so/'
            },
            responseType: 'text'
        });

        let code = response.data;

        // CRITICAL: Strip SharedWorker and Worker instantiations
        // Replace with no-op functions that return mock objects

        // 1. Replace SharedWorker constructor
        code = code.replace(
            /new\s+SharedWorker\s*\(/g,
            '(function(){console.warn("[NotionLock] SharedWorker blocked");return{port:{start:function(){},addEventListener:function(){},postMessage:function(){}}}})&&new SharedWorker('
        );

        // 2. Replace Worker constructor  
        code = code.replace(
            /new\s+Worker\s*\(/g,
            '(function(){console.warn("[NotionLock] Worker blocked");return{postMessage:function(){},addEventListener:function(){},terminate:function(){}}})&&new Worker('
        );

        // 3. Replace OPFS/FileSystem access
        code = code.replace(
            /navigator\.storage\.getDirectory\s*\(/g,
            '(async function(){console.warn("[NotionLock] OPFS blocked");throw new Error("OPFS not available")})&&navigator.storage.getDirectory('
        );

        // Cache modified code for 24 hours
        await redis.setex(cacheKey, 86400, code);

        // Send modified JavaScript  
        res.set('Content-Type', 'application/javascript; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=86400');
        res.set('Access-Control-Allow-Origin', '*');
        res.send(code);

        console.log(`[JS-Proxy] Modified and served: ${url.substring(0, 80)}...`);

    } catch (error) {
        console.error('[JS-Proxy] Error:', error.message);
        res.status(500).send('// Error fetching script');
    }
});

module.exports = router;
