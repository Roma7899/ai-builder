import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate';

export default async function (fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [authenticate] }, async (_request, reply) => {
    // Mock analytics data — replace with real tracking integration
    return reply.send({
      pageViews: 1247,
      uniqueVisitors: 893,
      bounceRate: 34,
      avgTimeOnPage: 142,
      dailyViews: [
        { date: '2026-05-18', views: 145 },
        { date: '2026-05-19', views: 203 },
        { date: '2026-05-20', views: 178 },
        { date: '2026-05-21', views: 256 },
        { date: '2026-05-22', views: 312 },
        { date: '2026-05-23', views: 289 },
        { date: '2026-05-24', views: 264 },
      ],
      pages: [
        { path: '/', views: 521 },
        { path: '/pricing', views: 234 },
        { path: '/features', views: 189 },
        { path: '/about', views: 156 },
        { path: '/contact', views: 147 },
      ],
    });
  });
}
