const FREE_TRIAL_KEY = 'ziwei_free_trial_used';
const DEVICE_ID_KEY = 'ziwei_device_id';

const SALT = 'ziwei-doushu-auth-salt-v1';

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0');
}

export function hashPassword(password: string): string {
  const nodeCrypto = typeof window === 'undefined' && (globalThis as any).require;
  if (nodeCrypto) {
    try {
      const crypto = nodeCrypto('crypto');
      return crypto.createHash('sha256').update(password + SALT).digest('hex');
    } catch {}
  }
  return simpleHash(password + SALT);
}

function randomId(): string {
  try {
    return crypto.randomUUID().slice(0, 8);
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

export function generateToken(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('-');
  }
}

export function generateId(prefix: string = ''): string {
  const id = randomId();
  return prefix ? `${prefix}_${id}` : id;
}

export function generateExpiry(days: number = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function markFreeTrialUsed(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FREE_TRIAL_KEY, 'true');
}

export function hasUsedFreeTrial(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(FREE_TRIAL_KEY) === 'true';
}
