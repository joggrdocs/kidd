#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
OUT_DIR="${ROOT_DIR}/.oxc/lint"
MODE="${1:-all}"

rm -rf "${OUT_DIR}/files" "${OUT_DIR}/rules"
mkdir -p "${OUT_DIR}/files" "${OUT_DIR}/rules"

LINT_OUTPUT="$(pnpm oxlint -f unix 2>&1 || true)"

# Strip the summary line (e.g. "662 problems")
RESULTS="$(echo "${LINT_OUTPUT}" | grep -E '^\S+:\d+:\d+:' || true)"

if [ -z "${RESULTS}" ]; then
  echo "No lint issues found."
  exit 0
fi

split_by_files() {
  echo "${RESULTS}" | while IFS= read -r line; do
    filepath="$(echo "${line}" | cut -d: -f1)"
    # Replace / with __ for a flat filename
    safe_name="$(echo "${filepath}" | sed 's|/|__|g')"
    echo "${line}" >> "${OUT_DIR}/files/${safe_name}.txt"
  done
}

split_by_rules() {
  echo "${RESULTS}" | while IFS= read -r line; do
    # Extract rule name from [Severity/rule-plugin(rule-name)] or [Severity/rule]
    rule_raw="$(echo "${line}" | grep -oE '\[[A-Za-z]+/[^]]+\]$' | tr -d '[]')"
    # e.g. "Error/eslint(func-style)" -> "eslint--func-style"
    rule_name="$(echo "${rule_raw}" | cut -d/ -f2- | sed 's/[()]/-/g; s/-$//')"
    if [ -n "${rule_name}" ]; then
      echo "${line}" >> "${OUT_DIR}/rules/${rule_name}.txt"
    fi
  done
}

case "${MODE}" in
  files)
    split_by_files
    ;;
  rules)
    split_by_rules
    ;;
  all)
    split_by_files
    split_by_rules
    ;;
  *)
    echo "Usage: $0 [files|rules|all]"
    exit 1
    ;;
esac

file_count="$(find "${OUT_DIR}/files" -name '*.txt' 2>/dev/null | wc -l | tr -d ' ')"
rule_count="$(find "${OUT_DIR}/rules" -name '*.txt' 2>/dev/null | wc -l | tr -d ' ')"
total="$(echo "${RESULTS}" | wc -l | tr -d ' ')"

echo "Split ${total} issues -> ${file_count} file(s), ${rule_count} rule(s) in ${OUT_DIR}"
