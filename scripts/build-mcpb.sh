#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_path="$repo_root/dist/meta-business-mcp-0.1.0.mcpb"
stage_dir="$(mktemp -d "${TMPDIR:-/tmp}/meta-business-mcp-mcpb.XXXXXX")"

cleanup() {
  rm -rf -- "$stage_dir"
}
trap cleanup EXIT

cd "$repo_root"
npm run build

mkdir -p "$stage_dir/apps/server/dist" "$stage_dir/assets" "$stage_dir/packages" "$repo_root/dist"
cp manifest.json package.json package-lock.json README.md PRIVACY.md TERMS.md LICENSE NOTICE "$stage_dir/"
cp assets/icon.png "$stage_dir/assets/"
cp apps/server/package.json "$stage_dir/apps/server/"
cp -R apps/server/dist/. "$stage_dir/apps/server/dist/"

for package_dir in packages/*; do
  package_name="$(basename "$package_dir")"
  mkdir -p "$stage_dir/packages/$package_name/dist"
  cp "$package_dir/package.json" "$stage_dir/packages/$package_name/"
  cp -R "$package_dir/dist/." "$stage_dir/packages/$package_name/dist/"
done

(
  cd "$stage_dir"
  npm ci --omit=dev --ignore-scripts --no-audit --no-fund
)

npx --yes @anthropic-ai/mcpb@2.1.2 pack "$stage_dir" "$output_path"
npx --yes @anthropic-ai/mcpb@2.1.2 info "$output_path"
