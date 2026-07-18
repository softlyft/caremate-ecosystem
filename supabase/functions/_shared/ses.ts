/** Amazon SES SendEmail via AWS SDK v3 (Deno / Supabase Edge). */

import { SESClient, SendEmailCommand } from 'npm:@aws-sdk/client-ses@3.758.0';

export type SesSendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SesSendResult =
  | { ok: true; messageId: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

export function isSesConfigured(): boolean {
  return Boolean(
    Deno.env.get('AWS_ACCESS_KEY_ID')?.trim() &&
      Deno.env.get('AWS_SECRET_ACCESS_KEY')?.trim() &&
      Deno.env.get('AWS_REGION')?.trim() &&
      Deno.env.get('SES_FROM_EMAIL')?.trim(),
  );
}

function fromAddress(): string {
  const email = Deno.env.get('SES_FROM_EMAIL')!.trim();
  const name = Deno.env.get('SES_FROM_NAME')?.trim();
  return name ? `${name} <${email}>` : email;
}

export async function sendViaSes(input: SesSendInput): Promise<SesSendResult> {
  if (!isSesConfigured()) {
    return { ok: false, skipped: true, reason: 'SES credentials or SES_FROM_EMAIL not configured' };
  }

  const region = Deno.env.get('AWS_REGION')!.trim();
  const client = new SESClient({
    region,
    credentials: {
      accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!.trim(),
      secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!.trim(),
    },
  });

  try {
    const result = await client.send(
      new SendEmailCommand({
        Source: fromAddress(),
        Destination: { ToAddresses: [input.to] },
        Message: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: input.html, Charset: 'UTF-8' },
            Text: { Data: input.text, Charset: 'UTF-8' },
          },
        },
      }),
    );
    const messageId = result.MessageId ?? crypto.randomUUID();
    return { ok: true, messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SES send failed';
    return { ok: false, skipped: false, error: message };
  }
}
