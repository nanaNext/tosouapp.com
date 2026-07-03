@echo off
git add .
git commit -m "chore: bump cache buster to v8 to ensure frontend picks up blank hours logic"
git push origin main
git log -n 1
