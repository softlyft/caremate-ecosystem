import { createClient } from '@/lib/supabase/server';
import type { CommunityBadge, CommunityCertificate } from '@/types/database';

export async function listBadges(): Promise<CommunityBadge[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_badges')
    .select('*')
    .eq('is_active', true)
    .order('points_value', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CommunityBadge[];
}

export async function listCertificates(): Promise<CommunityCertificate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_certificates')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CommunityCertificate[];
}

export type UserAwards = {
  badges: Array<CommunityBadge & { awarded_at: string }>;
  certificates: Array<CommunityCertificate & { awarded_at: string; certificate_url: string | null }>;
};

export async function listUserAwards(userId: string): Promise<UserAwards> {
  const supabase = await createClient();

  const [{ data: userBadges, error: badgeError }, { data: userCerts, error: certError }] =
    await Promise.all([
      supabase
        .from('community_user_badges')
        .select('awarded_at, badge:community_badges(*)')
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false }),
      supabase
        .from('community_user_certificates')
        .select('awarded_at, certificate_url, certificate:community_certificates(*)')
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false }),
    ]);

  if (badgeError) throw badgeError;
  if (certError) throw certError;

  const badges = (userBadges ?? [])
    .map((row) => {
      const badge = row.badge as unknown as CommunityBadge | null;
      if (!badge) return null;
      return { ...badge, awarded_at: row.awarded_at };
    })
    .filter(Boolean) as UserAwards['badges'];

  const certificates = (userCerts ?? [])
    .map((row) => {
      const certificate = row.certificate as unknown as CommunityCertificate | null;
      if (!certificate) return null;
      return {
        ...certificate,
        awarded_at: row.awarded_at,
        certificate_url: row.certificate_url,
      };
    })
    .filter(Boolean) as UserAwards['certificates'];

  return { badges, certificates };
}
