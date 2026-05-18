import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
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
  },
  {
    name: 'no-dual-metrics-namespace',
    pattern: /['"`]llm:(cost|tokens):/g,
    message: 'Using llm:* namespace for cost/tokens — use budget:* for budget tracking and metrics:* for observability',
    extensions: ['.ts'],
    includePaths: ['apps/api/src/lib/llmBudget.ts'],
  },
];

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
      const files = globSync(`**/*${rule.extensions.map((e) => `*${e}`).join(',')}`, {
        cwd: dir,
        nodir: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      for (const file of files) {
        totalFiles++;
        const fullPath = resolve(dir, file);
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
