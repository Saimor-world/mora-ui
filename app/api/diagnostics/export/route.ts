import { promises as fs } from 'fs';
import path from 'path';

interface DiagnosticsEntry {
  timestamp?: string;
  endpoint?: string;
  status?: string;
  latency_ms?: number | null;
  environment?: string;
  details?: Record<string, unknown>;
  note?: string;
}

function getRelativePath(fileName: string) {
  return path.posix.join('logs', 'diagnostics', fileName);
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Diagnostics export disabled in production' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { entry?: DiagnosticsEntry };

    if (!body?.entry || typeof body.entry !== 'object') {
      return Response.json({ error: 'Missing diagnostics entry' }, { status: 400 });
    }

    const entry: DiagnosticsEntry = {
      note: '',
      ...body.entry,
    };

    const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();
    if (Number.isNaN(timestamp.getTime())) {
      return Response.json({ error: 'Invalid timestamp' }, { status: 400 });
    }

    const dateSlug = timestamp.toISOString().split('T')[0];
    const fileName = `diagnostics-${dateSlug}.jsonl`;
    const rootDir = process.cwd();
    const dirPath = path.join(rootDir, 'logs', 'diagnostics');
    const filePath = path.join(dirPath, fileName);

    await fs.mkdir(dirPath, { recursive: true });
    await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, 'utf8');

    return Response.json({
      ok: true,
      filePath: getRelativePath(fileName),
    });
  } catch (error) {
    console.error('[Diagnostics Export] Failed to persist log', error);
    return Response.json({ error: 'Failed to persist diagnostics log' }, { status: 500 });
  }
}
