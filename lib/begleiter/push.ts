// Web Push – Stub. Abo wird nur angelegt, wenn ein VAPID-Schlüssel gesetzt ist;
// an CORE gesendet wird es erst, wenn dort /v3/begleiter/push existiert (noch nicht gebaut).
export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function registerWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try { return await navigator.serviceWorker.register('/begleiter-sw.js', { scope: '/begleiter' }); } catch { return null; }
}

export async function subscribePush(reg: ServiceWorkerRegistration | null): Promise<{ state: 'ok' | 'no-key' | 'unsupported' | 'denied'; subscription?: PushSubscriptionJSON }> {
  const key = process.env.NEXT_PUBLIC_BEGLEITER_VAPID_KEY;
  if (!reg || !pushSupported()) return { state: 'unsupported' };
  if (!key) return { state: 'no-key' };
  if ((await Notification.requestPermission()) !== 'granted') return { state: 'denied' };
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  return { state: 'ok', subscription: sub.toJSON() };
}
