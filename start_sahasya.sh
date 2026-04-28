#!/bin/bash

# SAHASYA - Automated All-in-One Launcher
# This script starts the Backend, Frontend, and YOUR Telegram Bot.

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "🚀 Starting Sahasya Suite..."
echo "📂 Project Directory: $PROJECT_DIR"

# 1. Start Backend
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_DIR/backend' && npm run dev\""
echo "✅ Backend window opened"

# 2. Start Frontend
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_DIR/frontend' && npm run dev\""
echo "✅ Frontend window opened"

# 3. Start Telegram Bot Listener
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_DIR/backend' && npx tsx src/bot.ts\""
echo "✅ Telegram Bot window opened"

echo "🌐 Waiting for systems to warm up..."
sleep 5

# 4. Open the browser
open "http://localhost:5173"

echo "🎉 All systems launched! Check your terminal windows for logs."
