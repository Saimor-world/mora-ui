if (!process.env.NEXT_PUBLIC_CORE_API_URL) {
  process.env.NEXT_PUBLIC_CORE_API_URL = 'http://localhost:8081';
}

async function applyEnvToken() {
  const args = process.argv.slice(2);
  if (!args.includes('--load-env-token')) {
    return args;
  }

  try {
    const { readFileSync } = await import('fs');
    const envContent = readFileSync('.env.local', 'utf8');
    const match = envContent.match(/^NEXT_PUBLIC_JWT_TOKEN=(.*)$/m);
    if (match?.[1]) {
      process.env.NEXT_PUBLIC_JWT_TOKEN = match[1].trim();
    }
  } catch (error) {
    console.warn('[Token Flow] Failed to load token from .env.local', error);
  }

  return args.filter((arg) => arg !== '--load-env-token');
}

async function run() {
  const args = await applyEnvToken();
  const scenario = args[0] ?? 'missing';

  if (scenario === 'missing') {
    process.env.NEXT_PUBLIC_JWT_TOKEN = '';
    process.env.NEXT_PUBLIC_ADMIN_TOKEN = '';
  }

  (globalThis as any).window = {};

  const { subscribeToToasts } = await import('../lib/toast');
  const { api } = await import('../lib/api');

  const toasts: string[] = [];
  subscribeToToasts((toast) => toasts.push(toast.message));

  if (scenario === 'missing') {
    try {
      await api.getObjects();
    } catch (error) {
      console.log(
        JSON.stringify({
          scenario: 'missing',
          error: error instanceof Error ? error.name : 'Unknown',
          toasts,
        })
      );
      return;
    }

    console.log(JSON.stringify({ scenario: 'missing', error: 'none', toasts }));
    return;
  }

  const result = await api.getObjects();
  const count = Array.isArray((result as any).objects) ? (result as any).objects.length : 0;
  console.log(
    JSON.stringify({
      scenario: 'valid',
      objects: count,
      toasts,
    })
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
