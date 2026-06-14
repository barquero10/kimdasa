#!/bin/bash
# push-to-github.sh — Syncs all tracked source code to github.com/barquero10/kimdasa
#
# What is synced:
#   All tracked source files: TypeScript/React source, configs, schemas, migrations,
#   scripts, environment definitions, images used by the web app, reference images
#   in attached_assets/, PDFs, logos, and ad creatives.
#
# What is NOT synced (binary media exceeding GitHub's 100 MB per-file limit or
# Replit's extraction quota for large binary blobs):
#   *.mp4 / *.avi / *.mov — video files (hero loops, project walkthroughs, raw uploads)
#   *.zip               — archive exports (kimdasa-source.zip, kimdasa-project.zip)
#
# LFS-tracked files (4 MP4s + kimdasa-project.zip) are excluded above as well;
# their pointer text is available in .gitattributes on GitHub for reference.
#
# This mirrors the full deployable source state of the project.
set -eo pipefail

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "[GitHub Sync] ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set. Cannot push to GitHub."
  exit 1
fi

echo "[GitHub Sync] Syncing source to github.com/barquero10/kimdasa..."

TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
WORKSPACE="/home/runner/workspace"

TEMP_REPO=$(mktemp -d)
cleanup() { rm -rf "$TEMP_REPO"; }
trap cleanup EXIT

git -C "$TEMP_REPO" init -b main
git -C "$TEMP_REPO" config user.email "admin@kimdasa.com"
git -C "$TEMP_REPO" config user.name "Kimdasa Construction"
git -C "$TEMP_REPO" remote add github \
  "https://barquero10:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/barquero10/kimdasa.git"

# Export all tracked files from HEAD (committed state = deployed state in Replit).
# Video and zip files are excluded because they exceed GitHub's 100 MB per-file
# hard limit and would cause the push to be rejected by GitHub's pre-receive hook.
git -C "$WORKSPACE" archive HEAD \
  ':!*.mp4' ':!*.avi' ':!*.mov' ':!*.zip' \
  | tar -x -C "$TEMP_REPO"

# Remove LFS tracking entries from .gitattributes so GitHub does not require
# the LFS binary objects (pointer text is stored as plain file content instead).
if [ -f "$TEMP_REPO/.gitattributes" ]; then
  grep -v "filter=lfs" "$TEMP_REPO/.gitattributes" > "$TEMP_REPO/.gitattributes.tmp" || true
  mv "$TEMP_REPO/.gitattributes.tmp" "$TEMP_REPO/.gitattributes"
fi

git -C "$TEMP_REPO" add -A
git -C "$TEMP_REPO" commit -m "Deploy sync: $TIMESTAMP" --allow-empty

echo "[GitHub Sync] Pushing to github.com/barquero10/kimdasa..."

# Capture output separately to redact the token without losing the push exit status
# (avoids set -o pipefail masking the real git push result via sed's exit code).
PUSH_LOG=$(GIT_LFS_SKIP_PUSH=1 git -C "$TEMP_REPO" push github main --force 2>&1) || {
  echo "$PUSH_LOG" | sed "s|${GITHUB_PERSONAL_ACCESS_TOKEN}|***|g"
  echo "[GitHub Sync] ERROR: Push to GitHub failed."
  exit 1
}
echo "$PUSH_LOG" | sed "s|${GITHUB_PERSONAL_ACCESS_TOKEN}|***|g"
echo "[GitHub Sync] Done. Repository updated at github.com/barquero10/kimdasa ($TIMESTAMP)"
