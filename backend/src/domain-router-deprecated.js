const { Pool } = require('pg');

// Create a separate pool for the router if needed, or pass the existing db
// For simplicity, we'll assume 'req.db' is populated by a previous middleware (connection-pool.js)
// But since this router needs to run BEFORE everything else, it might need its own db connection or be placed carefully.
// Best approach: Use the existing DB connection if available, or create a lightweight query.

const domainRouter = async (req, res, next) => {
    const host = req.hostname;
    const protocol = req.protocol;

    // 1. Skip if it's our main domain (using env or hardcoded list)
    // We should allow 'localhost' for dev testing if mapped in /etc/hosts, but skip api subdomain.
    const mainDomain = process.env.DOMAIN || 'notionlock.com';

    // Skip API, Main Domain, and localhost (unless testing custom domain on localhost)
    if (host === mainDomain || host === `api.${mainDomain}` || host === 'localhost' || host.endsWith('.notionlock.com')) {
        return next();
    }

    console.log(`[Domain Router] Intercepting request for host: ${host}`);

    const { db } = req; // Assumes db middleware is already mounted. 
    // If db middleware is mounted AFTER this, we have a problem. 
    // We should mount the db middleware first, then this router.

    try {
        // 2. Lookup Domain
        const result = await db.query(
            `SELECT p.id, p.slug, p.notion_url 
             FROM custom_domains d
             JOIN protected_pages p ON d.page_id = p.id
             WHERE d.domain = $1 AND d.verified = TRUE`,
            [host]
        );

        if (result.rows.length === 0) {
            console.log(`[Domain Router] Domain ${host} not found or not verified.`);
            return next(); // Or render a specific 404 for unconnected usage
        }

        const page = result.rows[0];
        console.log(`[Domain Router] Routing ${host} to Page ID ${page.id} (Slug: ${page.slug})`);

        // 3. Serve Proxy Content
        // We can internally rewrite the URL to /view/:slug and let the public route handle it?
        // OR manually call the proxy logic here.
        // Rewriting req.url is risky if the public route expects clean params.

        // Safer: Redirect to our proxy handler function logic via internal redirect?
        // Express method: req.url = '/api/p/view/' + page.slug; 
        // But we want to preserve the browser properties.

        // Let's attach the page data to the request and forward to a specific handler
        req.domainPage = page;

        // We can forward to a specialized route handler
        // If we set req.url, it changes routing.
        req.url = `/api/p/view/${page.slug}`;

        // IMPORTANT: We need to ensure we don't loop or break static assets if they are requested relative to root.
        // If the proxy returns HTML with relative links, they might break on custom domain.
        // But our viewer is Iframe or Direct Proxy. 
        // If Iframe: we serve our NotionViewer.js App?

        // WAIT. If we want Custom Domain to serve the "Viewer App", we need to serve the Frontend Index.html mostly.
        // AND tell the frontend which slug to load.

        // Scenario A: Custom Domain -> Iframe Viewer
        // We serve the React App. The React App checks "window.location.hostname".
        // If hostname != notionlock.com, calls API to get "Slug for this Host".
        // Then renders NotionViewer.

        // Scenario B: Custom Domain -> Direct Proxy (headless)
        // We serve the HTML content directly.

        // Current architecture: We use Client-Side Iframe Viewer in NotionViewer.js.
        // So we should Serve the Frontend App.

        // If we want to serve the frontend, we should just let NGINX/Traefik handle it?
        // Traefik points custom domain -> Backend Container? Or Frontend Container?

        // PLAN UPDATE:
        // 1. Traefik points Custom Domain -> Frontend Container.
        // 2. Frontend loads.
        // 3. Frontend `App.js` checks hostname.
        // 4. If hostname is custom, it calls `API /public/domain-lookup?host=...`
        // 5. API returns { slug: 'abc' }.
        // 6. Frontend renders `<NotionViewer slug='abc' />`.

        // This is much easier than backend routing proxying HTML.
        // So this file might be redundant IF we route via Frontend.

        // Let's stick to the "Frontend-First" approach for consistent UI (Password prompt etc).
        // So Backend just needs a lookup endpoint.

        return next();

    } catch (error) {
        console.error('[Domain Router] Error:', error);
        next();
    }
};

module.exports = domainRouter;
