/** Currents API region codes used for news targeting. */
export const NEWS_COUNTRIES = [
  { name: 'Nigeria', code: 'NG' },
  { name: 'Ghana', code: 'GH' },
  { name: 'Kenya', code: 'KE' },
  { name: 'Egypt', code: 'EG' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'United States', code: 'US' },
  { name: 'Canada', code: 'CA' },
  { name: 'India', code: 'IN' },
] as const;

export const INTERNATIONAL_COUNTRY_CODE = 'INT';

export const NIGERIA_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT - Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

export function resolveNewsCountryCode(options: {
  isGuest: boolean;
  countryCode: string | null | undefined;
}): string {
  if (options.isGuest) {
    return INTERNATIONAL_COUNTRY_CODE;
  }

  const code = options.countryCode?.trim().toUpperCase();
  if (!code) {
    return INTERNATIONAL_COUNTRY_CODE;
  }

  return code;
}

export function getCountryName(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  return NEWS_COUNTRIES.find((country) => country.code === code)?.name ?? code;
}
