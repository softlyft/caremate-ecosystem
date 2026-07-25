import { NextResponse } from 'next/server';

/** Lightweight readiness probe for Amplify / uptime checks. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'caremate-provider-portal',
    time: new Date().toISOString(),
  });
}
