/** Shared password rules for sign-up and password change. */
export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'tooShort';
  }
  if (!/[A-Z]/.test(password)) {
    return 'needsUpper';
  }
  if (!/[0-9]/.test(password)) {
    return 'needsNumber';
  }
  return null;
}
