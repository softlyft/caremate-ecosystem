export { profileRepository } from '@/domains/profile/repository';
export { useSettingsStore } from '@/domains/profile/store';
export {
  formatPatientId,
  generatePatientIdDigits,
  isValidPatientId,
} from '@/domains/profile/patient-id';
export {
  emailLocalPart,
  isWeakDisplayName,
  preferDisplayName,
  resolveAccountDisplayName,
  resolveAccountFirstName,
} from '@/domains/profile/display-name';
