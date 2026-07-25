/** Matches Supabase `password_requirements = lower_upper_letters_digits_symbols`. */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol';

const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /\d/;
const SYMBOL = /[^A-Za-z0-9]/

export function meetsPasswordRequirements(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    LOWER.test(password) &&
    UPPER.test(password) &&
    DIGIT.test(password) &&
    SYMBOL.test(password)
  );
}

export function assertPasswordRequirements(password: string): void {
  if (!meetsPasswordRequirements(password)) {
    throw new Error(PASSWORD_REQUIREMENTS_MESSAGE);
  }
}
