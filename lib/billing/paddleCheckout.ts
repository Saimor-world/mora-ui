import { initializePaddle, type Environments, type Paddle } from '@paddle/paddle-js';
import type { WorkspaceCheckoutIntent } from '@/lib/api/workspaceClient';

let paddlePromise: Promise<Paddle | undefined> | null = null;

export function isPaddleCheckoutConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN);
}

async function getPaddle(): Promise<Paddle | undefined> {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) return undefined;
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      token,
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox') as Environments,
    });
  }
  return paddlePromise;
}

export async function openWorkspaceCheckout(intent: WorkspaceCheckoutIntent): Promise<boolean> {
  const paddle = await getPaddle();
  if (!paddle) return false;
  paddle.Checkout.open({
    items: intent.paddle_checkout.items,
    customData: intent.paddle_checkout.custom_data,
    settings: { variant: 'one-page' },
  });
  return true;
}
