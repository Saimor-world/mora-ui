// Web Push für den Begleiter. Der VAPID-Public-Key kommt von CORE (/push/key);
// das Abo wird mit Face ID signiert an CORE gemeldet. Push-Texte sind inhaltsleer.
import { BASE, subscribeSigned, type StoredDevice } from '@/lib/begleiter/api';

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function registerWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try { return await navigator.serviceWorker.register('/begleiter-sw.js', { scope: '/begleiter' }); } catch { return null; }
}

export type PushState = 'ok' | 'no-key' | 'unsupported' | 'denied';

export async function subscribePush(reg: ServiceWorkerRegistration | null, dev?: StoredDevice | null): Promise<{ state: PushState }> {
  if (!reg || !pushSupported() || !dev) return { state: 'unsupported' };
  const k = await fetch(`${BASE}/push/key`).then((r) => r.json()).catch(() => ({}));
  if (!k?.enabled || !k.public_key) return { state: 'no-key' };
  if ((await Notification.requestPermission()) !== 'granted') return { state: 'denied' };
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: k.public_key });
  const j = sub.toJSON();
  await subscribeSigned(dev, { endpoint: j.endpoint!, p256dh: j.keys!.p256dh, auth: j.keys!.auth });
  return { state: 'ok' };
}
