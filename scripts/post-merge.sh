#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
bash scripts/push-to-github.sh || echo "[GitHub Sync] Warning: push to GitHub failed (see above). Merge continues."
