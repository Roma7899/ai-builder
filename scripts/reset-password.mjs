import pg from 'pg';
const { Client } = pg;

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL required'); process.exit(1); }

const email = process.argv[2];
const hash = process.argv[3];
if (!email || !hash) { console.error('Usage: node scripts/reset-password.mjs <email> <bcrypt_hash>'); process.exit(1); }

const client = new Client(url);
await client.connect();
const r = await client.query('UPDATE "User" SET "passwordHash" = $1 WHERE email = $2', [hash, email]);
console.log('Updated:', r.rowCount, 'rows');
await client.end();
