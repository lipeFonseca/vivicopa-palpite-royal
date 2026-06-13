export const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;
export const INTERNAL_AUTH_DOMAIN = "vivicopa.internal";
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type UserRole = "admin" | "user";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(username);
}

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(normalizeEmail(email));
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${INTERNAL_AUTH_DOMAIN}`;
}
