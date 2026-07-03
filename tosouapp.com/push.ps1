$env:GIT_PAGER = "cat"
git add .
git commit -m "chore: push v8"
git push origin main
git log -n 1
