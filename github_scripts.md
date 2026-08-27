### Create new branch for workspace

git checkout develop
git checkout -b feature/[name]
git push origin feature/[name]

### Merge and delete used branch

git checkout develop
git merge feature/[name]
git push origin develop
git branch -d feature/[name]
git push origin --delete feature/[name]