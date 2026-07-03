Set-Location C:\tosouapp.com
git add .
git commit -m "fix: leave hours blank on PDF if checkin or checkout is missing (prod)" > C:\tosouapp.com\push_log.txt 2>&1
git push origin main >> C:\tosouapp.com\push_log.txt 2>&1
