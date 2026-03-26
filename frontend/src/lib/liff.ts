import type Liff from '@line/liff';

// LIFF instance (lazy init)
let _liff: typeof Liff | null = null;
let _idToken: string | null = null;

export async function initLiff(): Promise<typeof Liff> {
  if (_liff) return _liff;

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) throw new Error('NEXT_PUBLIC_LIFF_ID is not set');

  const { default: liff } = await import('@line/liff');
  await liff.init({ liffId });

  _liff = liff;
  return liff;
}

export function getLiff(): typeof Liff | null {
  return _liff;
}

export function getLiffIdToken(): string | null {
  if (_liff) {
    _idToken = _liff.getIDToken();
  }
  return _idToken;
}

export async function getLiffProfile() {
  const liff = await initLiff();
  if (!liff.isLoggedIn()) return null;
  return liff.getProfile();
}

export function isInLineClient(): boolean {
  return _liff?.isInClient() ?? false;
}

export function isLiffLoggedIn(): boolean {
  return _liff?.isLoggedIn() ?? false;
}

export function liffLogin(): void {
  _liff?.login();
}

export function liffLogout(): void {
  _liff?.logout();
  _idToken = null;
}
