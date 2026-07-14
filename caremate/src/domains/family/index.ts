export { familyRepository } from '@/domains/family/repository';
export {
  familyConnectionService,
  buildSpouseInviteMessage,
} from '@/domains/family/connection-service';
export { useFamilySetupStore } from '@/domains/family/store';
export type {
  ChildProfileDraft,
  FamilyConnectionRequest,
  FamilyHousehold,
  FamilyLookupUser,
  FamilyMember,
  FamilyMemberGender,
  FamilyMemberKind,
} from '@/domains/family/types';
export { FAMILY_GENDERS } from '@/domains/family/types';
