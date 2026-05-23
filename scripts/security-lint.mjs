import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const RULES = [
  {
    name: 'no-wildcard-postmessage',
    pattern: /\.postMessage\([^,]+,\s*['"]\*['"]\)/g,
    message: 'Wildcard origin "*" in postMessage — must use specific origin',
    extensions: ['.ts', '.tsx'],
  },
  {
    name: 'no-token-in-url',
    pattern: /\btoken\s*=\s*["'`][^"'`]*\$\{/g,
    message: 'Token in URL template string — must use postMessage or secure exchange',
    extensions: ['.ts', '.tsx'],
  },
  {
    name: 'no-unsafe-url-construction',
    pattern: /window\.location\.search|URLSearchParams/g,
    message: 'Reading tokens/credentials from URL params — use postMessage auth handshake',
    extensions: ['.ts', '.tsx'],
    excludePaths: ['apps/renderer/src/App.tsx'],
  },
  {
    name: 'no-dual-metrics-namespace',
    pattern: /['"`]llm:(cost|tokens):/g,
    message: 'Using llm:* namespace for cost/tokens — use budget:* for budget tracking and metrics:* for observability',
    extensions: ['.ts'],
    includePaths: ['apps/api/src/lib/llmBudget.ts'],
  },
];

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git']);

function walkFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkFile(filePath, rule) {
  const content = readFileSync(filePath, 'utf-8');
  const violations = [];
  let match;
  while ((match = rule.pattern.exec(content)) !== null) {
    const lineNum = content.slice(0, match.index).split('\n').length;
    const lines = content.split('\n');
    const lineContent = lines[lineNum - 1]?.trim() || '';
    violations.push({ file: filePath, line: lineNum, content: lineContent, rule: rule.name });
  }
  return violations;
}

function main() {
  console.log('[security-lint] Scanning for security violations...\n');
  let allViolations = [];
  let totalFiles = 0;

  for (const rule of RULES) {
    const dirs = rule.includePaths
      ? rule.includePaths.map((p) => resolve(ROOT, p))
      : [resolve(ROOT, 'apps')];

    for (const dir of dirs) {
      const allFiles = walkFiles(dir);
      const matching = allFiles.filter((f) => {
        const ext = extname(f);
        return rule.extensions.includes(ext);
      });

      const excludeSet = rule.excludePaths
        ? new Set(rule.excludePaths.map((p) => resolve(ROOT, p)))
        : null;

      for (const fullPath of matching) {
        if (excludeSet && excludeSet.has(fullPath)) continue;
        totalFiles++;
        try {
          const violations = checkFile(fullPath, rule);
          allViolations.push(...violations);
        } catch { /* skip unreadable files */ }
      }
    }
  }

  if (allViolations.length === 0) {
    console.log(`[security-lint] PASS: No security violations detected (${totalFiles} files scanned)`);
    process.exit(0);
  }

  console.error(`[security-lint] FAIL: ${allViolations.length} violation(s) found:\n`);
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line} - [${v.rule}] ${v.content}`);
  }
  console.error('\nFix violations before deploying.');
  process.exit(1);
}

main();
