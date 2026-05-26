#!/bin/bash
set -e

echo "🔄 Pulling latest from main..."
git pull origin main

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔨 Building web app..."
npm run build

echo "🔁 Syncing to iOS..."
npx cap sync ios

echo "🚀 Opening in Xcode..."
npx cap open ios

echo "✅ Done! Hit ⌘+R in Xcode to deploy to iPhone"
