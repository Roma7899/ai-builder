import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_SRC = resolve(import.meta.dirname, '../apps/api/src');

const FORBIDDEN_PATTERNS = [
  { pattern: /\.\$queryRawUnsafe\(/g, label: '$queryRawUnsafe' },
  { pattern: /\.\$executeRawUnsafe\(/g, label: '$executeRawUnsafe' },
  { pattern: /this\.prisma\.\w+\.(findUnique|findMany|findFirst|create|update|updateMany|delete|deleteMany|upsert|count|aggregate|groupBy)\s*\(/g, label: 'this.prisma.*' },
  { pattern: /\bprisma\.\w+\.(findUnique|findMany|findFirst|create|update|updateMany|delete|deleteMany|upsert|count|aggregate|groupBy)\s*\(/g, label: 'prisma.* (outside withRls)' },
];

const ALLOWED_FILES = [
  'lib/withRls.ts',
  'plugins/prisma.ts',
  'lib/createWorker.ts',
  'server.ts',
  'app.ts',
  'modules/auth/auth.service.ts',
];

class PrismaGuardError extends Error {
  constructor(public violations: Array<{ file: string; line: number; content: string; label: string }>) {
    super(`PrismaGuard: ${violations.length} violation(s) found`);
    this.name = 'PrismaGuardError';
  }
}

async function scan(): Promise<Array<{ file: string; line: number; content: string; label: string }>> {
  const violations: Array<{ file: string; line: number; content: string; label: string }> = [];
  const tsFiles: string[] = [];
  for await (const file of glob('**/*.ts', { cwd: API_SRC })) {
    tsFiles.push(file);
  }

  for (const file of tsFiles) {
    if (ALLOWED_FILES.includes(file)) continue;

    const content = readFileSync(resolve(API_SRC, file), 'utf-8');
    const lines = content.split('\n');

    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        const lineContent = lines[lineNum - 1]?.trim() || '';
        violations.push({ file, line: lineNum, content: lineContent, label });
      }
    }
  }

  return violations;
}

async function main(): Promise<void> {
  console.log('[prisma-guard] Scanning for forbidden Prisma usage...');

  const violations = await scan();

  if (violations.length === 0) {
    console.log('[prisma-guard] PASS: No forbidden Prisma usage detected');
    process.exit(0);
  }

  console.error(`[prisma-guard] FAIL: ${violations.length} violation(s) found:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} - [${v.label}] ${v.content}`);
  }
  console.error('\n[prisma-guard] All Prisma operations must go through withRls(). Fix violations before deploying.');
  process.exit(1);
}

main().catch((err) => {
  console.error('[prisma-guard] Error:', err.message);
  process.exit(1);
});
