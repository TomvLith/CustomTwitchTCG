@echo off
cd /d D:\StreamCards
git add collections.json
git commit -m "Auto-sync collection on stream end"
git push origin main