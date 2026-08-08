export const PASSWORD_MIN_LENGTH = 8;

/** Returns an API error message, or null when valid. */
export function validatePassword(password) {
  if (!password || String(password).length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one capital letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number';
  }
  return null;
}
