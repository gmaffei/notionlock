#!/bin/bash
# Add Notion API key to production environment
# Usage: ./add-notion-key.sh <NOTION_API_KEY>

NOTION_KEY="${1}"

if [ -z "$NOTION_KEY" ]; then
  echo "❌ Error: NOTION_API_KEY not provided"
  exit 1
fi

echo "" >> /opt/notionlock/.env_prod
echo "# Notion API Integration" >> /opt/notionlock/.env_prod
echo "NOTION_API_KEY=$NOTION_KEY" >> /opt/notionlock/.env_prod

echo "✅ NOTION_API_KEY added to .env_prod"

# Restart backend to load new environment
cd /opt/notionlock
docker compose -f docker/docker-compose.yml restart backend

echo "✅ Backend restarted"
