import type { FastifyRequest, FastifyReply } from 'fastify';
import { GenerationService } from './generation.service';
import { generateRequestSchema } from './generation.schema';
import { AppError } from '../auth/auth.service';
import { withRls } from '../../lib/withRls';
import { sseManager } from '../../lib/sse/sse.manager';
import { SSEConnectionTracker } from '../../lib/monitoring/sse';

export class GenerationController {
  constructor(private generationService: GenerationService) {}

  startGeneration = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = generateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      const result = await this.generationService.startGeneration(
        request.userId,
        parsed.data.projectId,
        parsed.data.prompt,
        parsed.data.stylePreferences,
        request.requestId,
      );
      return reply.status(201).send(result);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  stream = async (request: FastifyRequest, reply: FastifyReply) => {
    const { jobId } = request.params as { jobId: string };
    const userId = request.userId;

    const job = await withRls(request.server.prisma, userId, async (tx) =>
      tx.generationJob.findUnique({
        where: { id: jobId },
        select: { userId: true, projectId: true },
      })
    );
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }
    if (job.userId !== userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    reply.hijack();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      try { reply.raw.end(); } catch { /* ignore */ }
    };

    const sendEvent = (data: unknown) => {
      if (ended) return;
      try {
        reply.raw.write(`event: status\ndata: ${JSON.stringify(data)}\n\n`);
      } catch { /* ignore */ }
    };

    const initialRaw = await request.server.redis.get(`job:status:${jobId}`);
    if (initialRaw) {
      const initial = JSON.parse(initialRaw);
      sendEvent(initial);
      if (initial.status === 'done' || initial.status === 'failed') {
        end();
        return;
      }
    }

    SSEConnectionTracker.onConnect(request.server.redis, userId).catch(() => {});

    let unsub: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const channel = `job:events:${jobId}`;

    sseManager.subscribe(channel, (message) => {
      if (ended) return;
      sendEvent(JSON.parse(message));
      const parsed = JSON.parse(message);
      if (parsed.status === 'done' || parsed.status === 'failed') {
        cleanup();
      }
    }).then((fn) => { unsub = fn; }).catch(() => { /* pub/sub best-effort — polling fallback */ });

    pollTimer = setInterval(async () => {
      if (ended) return;
      try {
        const raw = await request.server.redis.get(`job:status:${jobId}`);
        if (raw) {
          const data = JSON.parse(raw);
          sendEvent(data);
          if (data.status === 'done' || data.status === 'failed') {
            cleanup();
          }
        }
      } catch { /* best-effort */ }
    }, 500);

    const forceTimeout = setTimeout(() => cleanup(), 600000); // 10min max

    function cleanup() {
      if (ended) return;
      end();
      SSEConnectionTracker.onDisconnect(request.server.redis, userId).catch(() => {});
      if (pollTimer) clearInterval(pollTimer);
      clearTimeout(forceTimeout);
      if (unsub) {
        unsub();
        unsub = null;
      }
    }

    request.raw.on('close', cleanup);
    request.raw.on('error', cleanup);
  };

  private handleError(reply: FastifyReply, err: unknown) {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    return reply.status(500).send({ error: 'Internal server error' });
  }
}
