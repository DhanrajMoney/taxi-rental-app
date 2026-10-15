#!/usr/bin/env bash
# RideDesk Release Packaging Script (Linux / macOS)
# Builds production assets, verifies tests, and packages a ready-to-distribute release ZIP.

set -e

VERSION="1.1.3"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_PATH="$(dirname "$SCRIPT_DIR")"
RELEASE_DIR="$ROOT_PATH/release-dist"
ZIP_FILE="$ROOT_PATH/ridedesk-v$VERSION-release.zip"

echo "================================================"
echo "  RideDesk Packaging & Build Pipeline v$VERSION  "
echo "================================================"

# 1. Run Tests
echo -e "\n[1/5] Running automated backend tests..."
cd "$ROOT_PATH/backend-laravel"
php artisan config:clear
php artisan test

# 2. Build Frontend
echo -e "\n[2/5] Compiling frontend production bundle (Vite)..."
cd "$ROOT_PATH/frontend-react"
npm run build

# 3. Publish Frontend Dist to Laravel Public
echo -e "\n[3/5] Publishing frontend SPA to backend-laravel/public..."
mkdir -p "$ROOT_PATH/backend-laravel/public"
cp -r "$ROOT_PATH/frontend-react/dist/"* "$ROOT_PATH/backend-laravel/public/"

# 4. Prepare Staging
echo -e "\n[4/5] Preparing clean release staging directory..."
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

mkdir -p "$RELEASE_DIR/backend-laravel"
rsync -av --exclude='.git' --exclude='.github' --exclude='node_modules' --exclude='.env' "$ROOT_PATH/backend-laravel/" "$RELEASE_DIR/backend-laravel/"

mkdir -p "$RELEASE_DIR/frontend-react"
rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' "$ROOT_PATH/frontend-react/" "$RELEASE_DIR/frontend-react/"

cp -r "$ROOT_PATH/installation" "$RELEASE_DIR/"
cp "$ROOT_PATH/README.md" "$RELEASE_DIR/"
cp "$ROOT_PATH/plan.md" "$RELEASE_DIR/"

# 5. Compress
echo -e "\n[5/5] Compressing release package into ZIP..."
rm -f "$ZIP_FILE"
cd "$RELEASE_DIR"
zip -r -q "$ZIP_FILE" .
rm -rf "$RELEASE_DIR"

echo -e "\n================================================"
echo "  SUCCESS! Release ZIP Created:"
echo "  $ZIP_FILE"
echo "================================================"

