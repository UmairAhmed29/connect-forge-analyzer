import { NextRequest, NextResponse } from 'next/server';
import { lookup } from 'dns/promises';

export const runtime = 'nodejs';

const MAX_BYTES = 2 * 1024 * 1024; // descriptors are small; 2 MB is already generous
const TIMEOUT_MS = 10_000;

/**
 * Blocks addresses that must never be reachable from a public fetch proxy:
 * loopback, RFC1918 private ranges, link-local (including cloud metadata at
 * 169.254.169.254), CGNAT and unique-local IPv6.
 */
function isBlockedAddress(ip: string): boolean {
  if (ip.includes(':')) {
    const v6 = ip.toLowerCase();
    if (v6 === '::1' || v6 === '::') return true;
    if (v6.startsWith('fc') || v6.startsWith('fd')) return true; // unique-local
    if (v6.startsWith('fe80')) return true; // link-local
    // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
    const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
    if (mapped) return isBlockedAddress(mapped[1]);
    return false;
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  if (a === 127 || a === 0 || a === 10) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** Marks errors that are safe to show a user verbatim. */
class UserFacingError extends Error {}

async function assertPublicHost(hostname: string) {
  // A literal IP can be checked directly; a name must be resolved first so we
  // reject things like a domain deliberately pointing at 169.254.169.254.
  let records;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    // Node surfaces DNS failures as getaddrinfo ENOTFOUND / EAI_AGAIN / EBUSY.
    // None of that means anything to someone who simply mistyped their domain.
    throw new UserFacingError(`We couldn't find the domain "${hostname}". Check the URL and try again.`);
  }
  if (!records.length) {
    throw new UserFacingError(`We couldn't find the domain "${hostname}". Check the URL and try again.`);
  }
  for (const r of records) {
    if (isBlockedAddress(r.address)) {
      throw new UserFacingError('That host resolves to a private or internal address.');
    }
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'Missing ?url parameter.' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'That is not a valid URL.' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return NextResponse.json({ error: 'Only http and https URLs are supported.' }, { status: 400 });
  }

  try {
    await assertPublicHost(parsed.hostname);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'application/json, text/plain, */*', 'User-Agent': 'connect-forge-analyzer' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `The server returned HTTP ${res.status}. Check the URL is publicly reachable.` },
        { status: 502 }
      );
    }

    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_BYTES) {
      return NextResponse.json({ error: 'That file is too large to be a descriptor.' }, { status: 413 });
    }

    const text = (await res.text()).slice(0, MAX_BYTES);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'That URL did not return JSON. Point it directly at the atlassian-connect.json file.' },
        { status: 422 }
      );
    }

    if (!json || typeof json !== 'object' || !('modules' in (json as object))) {
      return NextResponse.json(
        { error: 'No "modules" object found — that does not look like a Connect descriptor.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ descriptor: json, fetchedFrom: parsed.toString() });
  } catch (e) {
    const err = e as Error;
    const msg = err.name === 'AbortError'
      ? 'That server took too long to respond (10s timeout).'
      : err instanceof UserFacingError
        ? err.message
        : "We couldn't reach that URL. Check it's publicly accessible and serving the descriptor directly.";
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
