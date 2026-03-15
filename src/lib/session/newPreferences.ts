const SOCrATIC_KEY = "sticky_v2_socratic_enabled";
const SESSION_CATEGORY_KEY = "sticky_v2_session_category_id";
const SESSION_TAGS_KEY = "sticky_v2_session_tags";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function getSocraticEnabledDefault(): boolean {
  if (!canUseStorage()) return false;
  const stored = localStorage.getItem(SOCrATIC_KEY);
  // Default ON unless user has explicitly disabled it.
  if (stored === null) return true;
  return stored === "true";
}

export function getStoredSocraticEnabled(): boolean | null {
  if (!canUseStorage()) return null;
  const stored = localStorage.getItem(SOCrATIC_KEY);
  if (stored === null) return null;
  return stored === "true";
}

export function setSocraticEnabledDefault(enabled: boolean): void {
  if (!canUseStorage()) return;
  localStorage.setItem(SOCrATIC_KEY, String(enabled));
}

export function getSessionCategoryId(): string | null {
  if (!canUseStorage()) return null;
  return sessionStorage.getItem(SESSION_CATEGORY_KEY);
}

export function setSessionCategoryId(categoryId: string): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(SESSION_CATEGORY_KEY, categoryId);
}

export function getSessionTags(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = sessionStorage.getItem(SESSION_TAGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function setSessionTags(tags: string[]): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(SESSION_TAGS_KEY, JSON.stringify(tags));
}

export function isSingleWordInput(input: string): boolean {
  const value = input.trim();
  if (!value) return false;
  // A single lexical token with no spaces/punctuation separators.
  return /^[\p{L}\p{N}_'-]+$/u.test(value);
}

