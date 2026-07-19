import type { DocumentType } from '@/types/database';

export const DOCUMENT_TYPES = [
  'prescription',
  'lab_result',
  'imaging_report',
  'referral_letter',
  'discharge_summary',
  'invoice',
] as const satisfies readonly DocumentType[];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  prescription: 'Prescription',
  lab_result: 'Lab Result',
  imaging_report: 'Imaging Report',
  referral_letter: 'Referral Letter',
  discharge_summary: 'Discharge Summary',
  invoice: 'Invoice',
};

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === 'string' && (DOCUMENT_TYPES as readonly string[]).includes(value);
}
