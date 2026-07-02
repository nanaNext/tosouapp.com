@echo off
cd c:\tosouapp.com
git log origin/main -n 5 --oneline > c:\tosouapp.com\git_check.txt
git status >> c:\tosouapp.com\git_check.txt
