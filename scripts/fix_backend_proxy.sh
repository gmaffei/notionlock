#!/bin/bash
# Fix backend to use HTML proxy instead of Notion API

cd /opt/notionlock

# Wait for deploy to complete
sleep 10

# Pull latest code (should have frontend fixed)
git pull  

# Now manually patch the backend file
cat > /tmp/fix_backend.patch << 'PATCH_EOF'
--- a/backend/src/routes/public.js
+++ b/backend/src/routes/public.js
@@ -198,40 +198,16 @@
     }
     
-    // 3. Fetch from Notion API and return JSON for react-notion-x
+    // 3. Fetch and return HTML (supports all content)
     const notionUrl = pageData.notionUrl || pageData.notion_url;
-    const notionService = require('../services/notion');
     
     try {
-      // Extract page ID from URL  
-      const pageId = notionService.extractPageId(notionUrl);
-      if (!pageId) {
-        return res.status(400).json({ error: 'Invalid Notion URL format' });
-      }
-
-      // Fetch page data from Notion API
-      const pageContentData = await notionService.getPageData(pageId);
-      
-      // Convert to recordMap format for react-notion-x
-      const recordMap = notionService.toRecordMap(pageContentData);
-
-      // Return JSON instead of HTML
-      res.json({
-        recordMap,
-        showBranding
-      });
+      const rewrittenHtml = await fetchAndRewriteNotionPage(notionUrl);
       
-    } catch (notionError) {
-      console.error('[View] Notion API error:', notionError.message);
-      
-      if (notionError.code === 'object_not_found' || notionError.status === 404) {
-        return res.status(403).json({ 
-          error: 'Page not accessible',
-          message: 'Make sure the page is public or shared with the NLock integration.'
-        });
-      }
+      res.setHeader('Content-Type', 'text/html; charset=utf-8');
+      res.setHeader('X-Show-Branding', showBranding.toString());
+      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
+      res.send(rewrittenHtml);
       
-      return res.status(500).json({ 
-        error: 'Error fetching page from Notion',
-        details: notionError.message 
-      });
+    } catch (fetchError) {
+      console.error('[View] Notion fetch error:', fetchError.message);
+      return res.status(500).send('<h1>Error Loading Page</h1><p>Could not fetch content from Notion.</p>');
     }
PATCH_EOF

# Apply patch
cd /opt/notionlock
patch -p1 <  /tmp/fix_backend.patch

# Restart backend
docker compose -f docker/docker-compose.yml restart backend

echo "Backend fixed and restarted!"
