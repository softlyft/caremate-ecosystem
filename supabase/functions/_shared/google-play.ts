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

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

function readServiceAccount(): ServiceAccount {
  const raw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')?.trim();
  if (!raw) {
    throw new Error('Google Play is not configured (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)');
  }
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing client_email or private_key');
  }
  return parsed;
}

async function googleAccessToken(): Promise<string> {
  const account = readServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        iss: account.client_email,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    decodePemToPkcs8(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data));
  const assertion = `${header}.${payload}.${base64UrlEncode(signature)}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = await tokenRes.json();
  if (!tokenRes.ok || typeof json.access_token !== 'string') {
    throw new Error(String(json.error_description ?? json.error ?? 'Google OAuth failed'));
  }
  return json.access_token;
}

export type GoogleSubscription = {
  productId: string;
  purchaseToken: string;
  expiryTime: string | null;
};

export async function verifyGoogleSubscription(input: {
  productId: string;
  purchaseToken: string;
}): Promise<GoogleSubscription> {
  const packageName = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME')?.trim() || 'com.softlyft.caremate';
  const token = await googleAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}` +
    `/purchases/subscriptionsv2/tokens/${encodeURIComponent(input.purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(String(json.error?.message ?? json.error ?? 'Google Play lookup failed'));
  }

  const lineItems = Array.isArray(json.lineItems) ? json.lineItems : [];
  const matched =
    lineItems.find((item: { productId?: string }) => item.productId === input.productId) ?? lineItems[0];
  const expiry =
    typeof matched?.expiryTime === 'string'
      ? matched.expiryTime
      : typeof json.expiryTime === 'string'
        ? json.expiryTime
        : null;

  return {
    productId: String(matched?.productId ?? input.productId),
    purchaseToken: input.purchaseToken,
    expiryTime: expiry,
  };
}
