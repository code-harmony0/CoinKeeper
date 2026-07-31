#!/usr/bin/env bash
#
# Verifies the lite bundle contains no chit-fund and no Firebase code, and that
# the pro bundle still does. This is the objective gate for the public/private
# split — "the flag is false at runtime" is not sufficient, the code must be
# absent from the bundle.
#
# Usage: ./scripts/verify-bundle-split.sh
set -euo pipefail

OUT="${TMPDIR:-/tmp}/ck-bundle-verify"
mkdir -p "$OUT"

# Symbols that must never appear in lite, and must appear in pro.
SYMBOLS=(ChitDetail useDraws firestore firebase AdminDashboard PermissionsRoles AuditLog)

echo "==> Bundling lite (no CK_CHITFUND)"
env -u CK_CHITFUND npx react-native bundle \
  --platform android --dev false --entry-file index.js \
  --bundle-output "$OUT/lite.bundle" --reset-cache >/dev/null

echo "==> Bundling pro (CK_CHITFUND=1)"
CK_CHITFUND=1 npx react-native bundle \
  --platform android --dev false --entry-file index.js \
  --bundle-output "$OUT/pro.bundle" --reset-cache >/dev/null

echo
printf "%-20s %8s %8s\n" "SYMBOL" "LITE" "PRO"
failed=0

for sym in "${SYMBOLS[@]}"; do
  lite=$(strings "$OUT/lite.bundle" | grep -ic "$sym" || true)
  pro=$(strings "$OUT/pro.bundle" | grep -ic "$sym" || true)
  printf "%-20s %8s %8s" "$sym" "$lite" "$pro"

  if [ "$lite" -ne 0 ]; then
    echo "   FAIL: present in lite"
    failed=1
  elif [ "$pro" -eq 0 ]; then
    echo "   FAIL: missing from pro"
    failed=1
  else
    echo "   ok"
  fi
done

echo
if [ "$failed" -ne 0 ]; then
  echo "BUNDLE SPLIT VERIFICATION FAILED"
  exit 1
fi

echo "Bundle split verified: lite is clean, pro is complete."
echo "  lite $(du -h "$OUT/lite.bundle" | cut -f1)   pro $(du -h "$OUT/pro.bundle" | cut -f1)"
