@echo off
cd /d "%~dp0"

git add collections.json
git commit -m "Auto-update collection: pack opened"
git push origin main

echo Sync complete!