/**
 * Approximate capital / major-city pins for Nigerian states.
 * Used only when the user chose approximate location (or GPS is unavailable)
 * so Nearby ranks facilities near the selected state — not a hard-coded Lagos pin.
 */
export const NIGERIA_STATE_FALLBACK_COORDS: Readonly<
  Record<string, { latitude: number; longitude: number }>
> = {
  Abia: { latitude: 5.5263, longitude: 7.4898 },
  Adamawa: { latitude: 9.2035, longitude: 12.4954 },
  'Akwa Ibom': { latitude: 5.0377, longitude: 7.9128 },
  Anambra: { latitude: 6.2104, longitude: 7.072 },
  Bauchi: { latitude: 10.3158, longitude: 9.8442 },
  Bayelsa: { latitude: 4.9267, longitude: 6.2676 },
  Benue: { latitude: 7.7322, longitude: 8.5391 },
  Borno: { latitude: 11.8333, longitude: 13.15 },
  'Cross River': { latitude: 4.9757, longitude: 8.3417 },
  Delta: { latitude: 6.1982, longitude: 6.7281 },
  Ebonyi: { latitude: 6.3249, longitude: 8.1137 },
  Edo: { latitude: 6.335, longitude: 5.6037 },
  Ekiti: { latitude: 7.6211, longitude: 5.2214 },
  Enugu: { latitude: 6.4584, longitude: 7.5464 },
  'FCT - Abuja': { latitude: 9.0765, longitude: 7.3986 },
  Gombe: { latitude: 10.2897, longitude: 11.171 },
  Imo: { latitude: 5.484, longitude: 7.0351 },
  Jigawa: { latitude: 11.7564, longitude: 9.3389 },
  Kaduna: { latitude: 10.5222, longitude: 7.4384 },
  Kano: { latitude: 12.0022, longitude: 8.592 },
  Katsina: { latitude: 12.9908, longitude: 7.6014 },
  Kebbi: { latitude: 12.4539, longitude: 4.1975 },
  Kogi: { latitude: 7.8023, longitude: 6.743 },
  Kwara: { latitude: 8.4966, longitude: 4.5421 },
  Lagos: { latitude: 6.5244, longitude: 3.3792 },
  Nasarawa: { latitude: 8.4984, longitude: 8.5171 },
  Niger: { latitude: 9.5833, longitude: 6.55 },
  Ogun: { latitude: 7.1475, longitude: 3.3619 },
  Ondo: { latitude: 7.2526, longitude: 5.1931 },
  Osun: { latitude: 7.7827, longitude: 4.5418 },
  Oyo: { latitude: 7.3775, longitude: 3.947 },
  Plateau: { latitude: 9.8965, longitude: 8.8583 },
  Rivers: { latitude: 4.8156, longitude: 7.0498 },
  Sokoto: { latitude: 13.0059, longitude: 5.2476 },
  Taraba: { latitude: 8.8937, longitude: 11.3596 },
  Yobe: { latitude: 11.747, longitude: 11.966 },
  Zamfara: { latitude: 12.1704, longitude: 6.6641 },
};
