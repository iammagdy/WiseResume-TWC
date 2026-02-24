#!/bin/bash

# WiseResume - Android Setup Script
# Version: 2.3.1
# Run this script after ensuring Node.js >= 22.0.0 is installed

set -e

echo "=================================="
echo "WiseResume Android Setup v2.3.1"
echo "=================================="
echo ""

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Error: Node.js 22 or higher required. Current: $(node -v)"
    echo "Please upgrade Node.js:"
    echo "  - Using nvm: nvm install 22 && nvm use 22"
    echo "  - Or download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "📦 Building web app..."
    npm run build
    echo "✅ Web app built successfully"
else
    echo "✅ Web app already built (dist folder exists)"
fi
echo ""

# Check if android platform already added
if [ -d "android" ]; then
    echo "⚠️  Android platform already exists"
    read -p "Do you want to remove and re-add it? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing existing Android platform..."
        npx cap remove android
        echo "➕ Adding Android platform..."
        npx cap add android
        echo "✅ Android platform re-added"
    else
        echo "⏭️  Skipping Android platform addition"
    fi
else
    echo "➕ Adding Android platform..."
    npx cap add android
    echo "✅ Android platform added successfully"
fi
echo ""

# Sync web assets to Android
echo "🔄 Syncing web assets to Android..."
npx cap sync android
echo "✅ Assets synced successfully"
echo ""

# Check if Android Studio is installed
if command -v studio &> /dev/null || command -v /Applications/Android\ Studio.app/Contents/MacOS/studio &> /dev/null; then
    echo "📱 Android Studio detected"
    read -p "Do you want to open the project in Android Studio? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx cap open android
    fi
else
    echo "ℹ️  Android Studio not found. You can open the project later with:"
    echo "   npx cap open android"
fi

echo ""
echo "=================================="
echo "✨ Setup Complete!"
echo "=================================="
echo ""
echo "Next Steps:"
echo "1. Open project in Android Studio: npx cap open android"
echo "2. Configure signing key (see ANDROID_DEPLOYMENT_GUIDE.md)"
echo "3. Build release: cd android && ./gradlew bundleRelease"
echo "4. Test on device: adb install app/build/outputs/apk/release/app-release.apk"
echo "5. Upload AAB to Google Play Console"
echo ""
echo "📄 Full guide: /app/ANDROID_DEPLOYMENT_GUIDE.md"
echo ""
