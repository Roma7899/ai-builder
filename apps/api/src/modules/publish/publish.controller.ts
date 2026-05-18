import type { FastifyRequest, FastifyReply } from 'fastify';
import { PublishService } from './publish.service';
import { AppError } from '../auth/auth.service';
import { withRls } from '../../lib/withRls';
import { sseManager } from '../../lib/sse/sse.manager';
import { SSEConnectionTracker } from '../../lib/monitoring/sse';

export class PublishController {
  constructor(private publishService: PublishService) {}

  startDeployment = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await this.publishService.startDeployment(id, request.userId, request.requestId);
      return reply.status(201).send(result);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  stream = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.userId;

    const projectId = await withRls(request.server.prisma, userId, async (tx) => {
      const deployment = await tx.publishDeployment.findUnique({
        where: { id },
        select: { projectId: true },
      });
      if (!deployment) return null;
      const project = await tx.project.findUnique({
        where: { id: deployment.projectId },
        select: { userId: true },
      });
      if (!project || project.userId !== userId) return null;
      return deployment.projectId;
    });
    if (!projectId) {
      return reply.status(404).send({ error: 'Deployment not found' });
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

    const deploymentId = id;

    const initialRaw = await request.server.redis.get(`deploy:status:${deploymentId}`);
    if (initialRaw) {
      sendEvent(JSON.parse(initialRaw));
    }

    SSEConnectionTracker.onConnect(request.server.redis, userId).catch(() => {});

    let unsub: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const channel = `deploy:events:${deploymentId}`;

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
        const raw = await request.server.redis.get(`deploy:status:${deploymentId}`);
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
