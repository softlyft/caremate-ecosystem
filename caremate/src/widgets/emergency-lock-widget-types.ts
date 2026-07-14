export type EmergencyLockWidgetProps = {
  hasProfile: boolean;
  fullName: string;
  bloodGroup: string;
  genotype: string;
  allergies: string;
  contactName: string;
  contactPhone: string;
  contactRelationship: string;
};

export type EmergencyLockWidgetApi = {
  updateSnapshot: (props: EmergencyLockWidgetProps) => void;
  reload: () => void;
};
