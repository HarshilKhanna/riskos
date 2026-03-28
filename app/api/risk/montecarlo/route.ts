import { auth } from '@clerk/nextjs/server';
import { runMonteCarloSimulation } from '@/lib/risk/calculations';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

type MonteCarloPayload = {
  currentValue: number;
  dailyReturns: number[];
  days?: number;
  simulations?: number;
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function stableHash(payload: unknown) {
  const str = JSON.stringify(payload);
  return createHash('sha256').update(str).digest('hex');
}

// Keep it simple: stream-only. (If you want caching like the risk/calculate route,
// tell me and I’ll add it.)
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: MonteCarloPayload;
  try {
    body = (await req.json()) as MonteCarloPayload;
  } catch {
    return new Response(JSON.stringify({ message: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { currentValue, dailyReturns } = body;
  const days = body.days ?? 30;
  const simulations = body.simulations ?? 1000;

  if (!isFiniteNumber(currentValue) || currentValue <= 0) {
    return new Response(
      JSON.stringify({
        message: '`currentValue` must be a positive number.',
      }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  if (!Array.isArray(dailyReturns) || dailyReturns.length < 2) {
    return new Response(
      JSON.stringify({
        message: '`dailyReturns` must be an array of numbers (minimum length: 2).',
      }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  if (!dailyReturns.every((r) => isFiniteNumber(r))) {
    return new Response(
      JSON.stringify({
        message: '`dailyReturns` must only contain finite numbers.',
      }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  if (!Number.isFinite(days) || days <= 0 || days > 365) {
    return new Response(
      JSON.stringify({ message: '`days` must be between 1 and 365.' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  if (!Number.isFinite(simulations) || simulations <= 0 || simulations > 100000) {
    return new Response(
      JSON.stringify({ message: '`simulations` must be between 1 and 100000.' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  // For observability and deterministic hashing, even though the simulation itself is stochastic.
  const requestHash = stableHash({ userId, currentValue, dailyReturnsLen: dailyReturns.length, days, simulations });
  void requestHash;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const writeLine = (obj: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      };

      writeLine({ type: 'meta', days, simulations });

      try {
        // Use the library's GBM simulation.
        const result = runMonteCarloSimulation(currentValue, dailyReturns, days, simulations, (batchPaths, completed, total) => {
          // Stream batches as NDJSON so the client can incrementally build chart bands.
          writeLine({ type: 'batch', paths: batchPaths, completed, total });
        });

        writeLine({
          type: 'done',
          summary: {
            mean: result.mean,
            upper95: result.upper95,
            lower95: result.lower95,
            range: result.range,
          },
        });
        writeLine({ type: 'end' });
      } catch (err) {
        writeLine({
          type: 'error',
          message:
            err instanceof Error ? err.message : 'Monte Carlo simulation failed.',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

