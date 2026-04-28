/**
 * Standardizes a phone number by removing all non-digits and taking the last 10 digits.
 * This ensures consistency across Indian phone number formats (with/without country code).
 */
export const normalizePhone = (raw: string | null | undefined): string => {
  if (!raw) return '';
  const digits = raw.toString().replace(/[^\d]/g, '');
  return digits.slice(-10);
};

/**
 * Checks if two phone numbers match after normalization.
 */
export const phonesMatch = (phone1: string, phone2: string): boolean => {
  return normalizePhone(phone1) === normalizePhone(phone2) && normalizePhone(phone1) !== '';
};
