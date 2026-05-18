import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ENDPOINT = process.env.R2_ENDPOINT ?? '';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY ?? '';
const R2_SECRET_KEY = process.env.R2_SECRET_KEY ?? '';
const R2_BUCKET = process.env.R2_BUCKET ?? '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? '';
const CF_API_TOKEN = process.env.CF_API_TOKEN ?? '';
const CF_ZONE_ID = process.env.CF_ZONE_ID ?? '';

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('Unreachable');
}

/**
 * Uploads a file to Cloudflare R2 with automatic retry (3 attempts).
 */
export async function uploadFile(
  key: string,
  content: string | Buffer | Uint8Array,
  contentType: string,
  cacheControl = 'public, max-age=300'
): Promise<void> {
  await withRetry(() =>
    s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: content,
        ContentType: contentType,
        CacheControl: cacheControl,
      })
    )
  );
}

/**
 * Generates a presigned download URL valid for the given duration.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 300
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn }
  );
}

/**
 * Returns the public CDN URL for a given R2 key.
 */
export function getPublicUrl(key: string): string {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
  }
  return `${R2_ENDPOINT.replace(/\/+$/, '')}/${R2_BUCKET}/${key}`;
}

/**
 * Purges Cloudflare cache for the given URLs.
 */
export async function purgeCache(urls: string[]): Promise<void> {
  if (!CF_API_TOKEN || !CF_ZONE_ID) return;
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudflare cache purge failed: ${response.status} ${body}`);
  }
}

/**
 * Creates a DNS CNAME record in Cloudflare.
 */
export async function addDnsRecord(
  domain: string,
  target: string,
  proxied = true
): Promise<{ id: string }> {
  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    throw new Error('Cloudflare credentials not configured');
  }
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'CNAME',
        name: domain,
        content: target,
        proxied,
        ttl: 120,
      }),
    }
  );
  const data = await response.json();
  if (!data.success) {
    throw new Error(
      `Cloudflare DNS record creation failed: ${JSON.stringify(data.errors)}`
    );
  }
  return data.result;
}
