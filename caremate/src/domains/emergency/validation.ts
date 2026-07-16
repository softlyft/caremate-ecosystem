import type { EmergencyContact } from '@/types';

/** ICE contact is usable when name, phone, and relationship are all present. */
export function isCompleteIceContact(
  contact: Pick<EmergencyContact, 'name' | 'phone' | 'relationship'>,
): boolean {
  return Boolean(contact.name.trim() && contact.phone.trim() && contact.relationship.trim());
}

/** Profiles must keep at least one complete ICE contact (matches post-signup setup). */
export function hasRequiredIceContact(contacts: EmergencyContact[]): boolean {
  return contacts.some(isCompleteIceContact);
}
