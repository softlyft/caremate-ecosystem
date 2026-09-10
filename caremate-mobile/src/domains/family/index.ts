export { selectActiveHouseholdId } from '@/domains/family/active-household';
export { familyRepository } from '@/domains/family/repository';
export {
  familyConnectionService,
  buildSpouseInviteMessage,
} from '@/domains/family/connection-service';
export {
  assertNotFamilySelfInvite,
  familyConnectionErrorKey,
  isFamilySelfInvite,
  CANNOT_INVITE_SELF_MESSAGE,
} from '@/domains/family/invite-guards';
export { useFamilySetupStore } from '@/domains/family/store';
export {
  createChildProfileSchema,
  DATE_OF_BIRTH_PATTERN,
  isValidPastDateOfBirth,
  validateChildNameAndDob,
} from '@/domains/family/child-validation';
export type {
  ChildProfileDraft,
  FamilyConnectionRequest,
  FamilyHousehold,
  FamilyInviteRelationship,
  FamilyLookupUser,
  FamilyMember,
  FamilyMemberGender,
  FamilyMemberKind,
} from '@/domains/family/types';
export {
  FAMILY_GENDERS,
  FAMILY_INVITE_RELATIONSHIPS,
  isFamilyInviteRelationship,
} from '@/domains/family/types';
