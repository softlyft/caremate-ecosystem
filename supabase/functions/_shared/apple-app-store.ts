function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodePemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export type AppleTransaction = {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  expiresDate: string | null;
  environment: string;
};

export function decodeAppleJwsPayload(jws: string): Record<string, unknown> | null {
  const parts = jws.split('.');
  if (parts.length < 2) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((parts[1].length + 3) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function appleSessionJwt(): Promise<string> {
  const keyId = Deno.env.get('APPLE_IAP_KEY_ID')?.trim();
  const issuer = Deno.env.get('APPLE_IAP_ISSUER_ID')?.trim();
  const pem = Deno.env.get('APPLE_IAP_PRIVATE_KEY')?.trim();
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID')?.trim() || 'com.softlyft.caremate';
  if (!keyId || !issuer || !pem) {
    throw new Error('Apple IAP is not configured (APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_IAP_PRIVATE_KEY)');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })),
  );
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        iss: issuer,
        iat: now,
        exp: now + 300,
        aud: 'appstoreconnect-v1',
        bid: bundleId,
      }),
    ),
  );
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    decodePemToPkcs8(pem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data));
  return `${header}.${payload}.${base64UrlEncode(signature)}`;
}

function mapAppleTransaction(raw: Record<string, unknown>): AppleTransaction {
  const expires =
    typeof raw.expiresDate === 'number'
      ? new Date(raw.expiresDate).toISOString()
      : typeof raw.expiresDate === 'string'
        ? new Date(Number(raw.expiresDate) || Date.parse(raw.expiresDate)).toISOString()
        : null;
  return {
    transactionId: String(raw.transactionId ?? ''),
    originalTransactionId: String(raw.originalTransactionId ?? raw.transactionId ?? ''),
    productId: String(raw.productId ?? ''),
    expiresDate: expires && !Number.isNaN(Date.parse(expires)) ? expires : null,
    environment: String(raw.environment ?? ''),
  };
}

export async function verifyAppleTransaction(input: {
  transactionId?: string | null;
  signedTransaction?: string | null;
}): Promise<AppleTransaction> {
  const jwt = await appleSessionJwt();
  const transactionId =
    input.transactionId?.trim() ||
    (input.signedTransaction ? String(decodeAppleJwsPayload(input.signedTransaction)?.transactionId ?? '') : '');
  if (!transactionId) {
    throw new Error('Missing Apple transaction id');
  }

  const hosts = ['https://api.storekit.itunes.apple.com', 'https://api.storekit-sandbox.itunes.apple.com'];
  let lastError = 'Apple transaction lookup failed';
  for (const host of hosts) {
    const res = await fetch(`${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.status === 404) {
      lastError = 'Apple transaction not found';
      continue;
    }
    const json = await res.json();
    if (!res.ok) {
      lastError = String(json?.errorMessage ?? json?.error ?? lastError);
      continue;
    }
    const signed = typeof json.signedTransactionInfo === 'string' ? json.signedTransactionInfo : input.signedTransaction;
    const payload = signed ? decodeAppleJwsPayload(signed) : null;
    if (!payload) {
      throw new Error('Apple transaction payload missing');
    }
    const mapped = mapAppleTransaction(payload);
    if (!mapped.transactionId) {
      throw new Error('Apple transaction id missing');
    }
    return mapped;
  }
  throw new Error(lastError);
}
