#!/bin/bash

# AI News Dashboard - Daily Scraper
# Runs all scrapers and updates the dashboard data

PROJECT_DIR="/Users/cgnguyen/Downloads/Scraperrrr"
LOG_FILE="$PROJECT_DIR/logs/scraper.log"
NODE_PATH="/opt/homebrew/bin/node"
NPM_PATH="/opt/homebrew/bin/npm"

# Export PATH so node_modules/.bin is accessible
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Log start time
echo "========================================" >> "$LOG_FILE"
echo "Scraper started: $(date)" >> "$LOG_FILE"

# Run scrapers
cd "$PROJECT_DIR" && "$NPM_PATH" run scrape >> "$LOG_FILE" 2>&1

# Log result
if [ $? -eq 0 ]; then
    echo "✅ Scraper completed successfully: $(date)" >> "$LOG_FILE"
else
    echo "❌ Scraper failed: $(date)" >> "$LOG_FILE"
fi

echo "========================================" >> "$LOG_FILE"
