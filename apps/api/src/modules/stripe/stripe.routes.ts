import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate';

export default async function (fastify: FastifyInstance) {
  fastify.post('/create-payment-intent', { preHandler: [authenticate] }, async (request, reply) => {
    const { priceId, plan } = request.body as { priceId?: string; plan?: string };
    if (!priceId || !plan) {
      return reply.status(400).send({ error: 'Missing priceId or plan' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      // No Stripe configured — return mock redirect
      return reply.send({
        url: `/pricing?plan=${plan}&checkout=mock`,
        message: 'Stripe not configured. In production, this redirects to Stripe Checkout.',
      });
    }

    try {
      const stripe = require('stripe')(stripeKey);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${request.protocol}://${request.hostname}/dashboard?upgrade=success`,
        cancel_url: `${request.protocol}://${request.hostname}/pricing`,
        client_reference_id: request.userId,
        metadata: { plan, userId: request.userId },
      });
      return reply.send({ url: session.url });
    } catch (err: any) {
      return reply.status(500).send({ error: `Stripe checkout failed: ${err.message}` });
    }
  });

  fastify.post('/stripe/webhook', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return reply.status(200).send({ received: true });
    }
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const event = stripe.webhooks.constructEvent(request.body as any, sig, webhookSecret);
      // Handle checkout.session.completed, invoice.paid, etc.
      return reply.send({ received: true });
    } catch {
      return reply.status(400).send({ error: 'Webhook signature verification failed' });
    }
  });
}
