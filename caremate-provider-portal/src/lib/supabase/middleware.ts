import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path.startsWith('/login') || path.startsWith('/claim') || path.startsWith('/forgot-password');
  const isProviderProtected = path.startsWith('/app');
  const isPayerProtected = path.startsWith('/payer');

  let hasProviderMembership = false;
  let hasPayerMembership = false;
  if (user) {
    const [{ count: providerCount }, { count: payerCount }] = await Promise.all([
      supabase
        .from('provider_org_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null),
      supabase
        .from('payer_org_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null),
    ]);
    hasProviderMembership = (providerCount ?? 0) > 0;
    hasPayerMembership = (payerCount ?? 0) > 0;
  }

  const hasAnyMembership = hasProviderMembership || hasPayerMembership;

  if (isProviderProtected && (!user || !hasProviderMembership)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (isPayerProtected && (!user || !hasPayerMembership)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user && hasAnyMembership) {
    const url = request.nextUrl.clone();
    const kindCookie = request.cookies.get('care_active_kind')?.value;
    if (hasProviderMembership && hasPayerMembership) {
      url.pathname = kindCookie === 'payer' ? '/payer/dashboard' : '/app/dashboard';
    } else if (hasPayerMembership) {
      url.pathname = '/payer/dashboard';
    } else {
      url.pathname = '/app/dashboard';
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
