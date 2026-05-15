@echo off
git status > git-out.txt
git log -n 3 >> git-out.txt
git remote -v >> git-out.txt
git branch >> git-out.txt
