import type { BaseEntity } from '@/types';

export type FamilyMemberKind = 'self' | 'spouse' | 'child';

export type FamilyMemberGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type FamilyConnectionStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface FamilyHousehold extends BaseEntity {
  createdByUserId: string;
  name: string | null;
}

export interface FamilyMember extends BaseEntity {
  householdId: string;
  kind: FamilyMemberKind;
  linkedUserId: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: FamilyMemberGender | null;
  notes: string | null;
}

export interface FamilyConnectionRequest extends BaseEntity {
  householdId: string;
  fromUserId: string;
  toUserId: string | null;
  toEmail: string | null;
  toPhone: string | null;
  status: FamilyConnectionStatus;
  inviteToken: string | null;
}

export interface FamilyLookupUser {
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  countryCode: string | null;
  state: string | null;
  avatarUrl: string | null;
}

export interface ChildProfileDraft {
  fullName: string;
  dateOfBirth: string;
  gender: FamilyMemberGender;
  notes?: string;
}

export const FAMILY_GENDERS: { value: FamilyMemberGender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];
