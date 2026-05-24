import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '3 projects',
      'Basic templates',
      'Standard support',
      'AI generation (limited)',
    ],
    cta: 'Get Started',
    highlighted: false,
    priceId: null,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For professionals and small teams',
    features: [
      'Unlimited projects',
      'All templates',
      'Custom domain support',
      'Unlimited AI generation',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
    priceId: 'price_pro_monthly',
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    description: 'For growing businesses',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Audit logs',
      'Dedicated success manager',
      'Custom integrations',
      '99.99% SLA',
    ],
    cta: 'Contact Sales',
    highlighted: false,
    priceId: 'price_enterprise_monthly',
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: typeof PLANS[0]) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!plan.priceId) return;

    setLoading(plan.name);
    try {
      const { data } = await api.post('/api/create-payment-intent', {
        priceId: plan.priceId,
        plan: plan.name.toLowerCase(),
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Checkout failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Pricing</h1>
          <a href="/dashboard" className="text-sm text-gray-400 hover:text-white">&larr; Dashboard</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
          <p className="text-gray-400 mt-3">Choose the plan that fits your needs. Upgrade, downgrade, or cancel anytime.</p>
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 ${
                plan.highlighted
                  ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500'
                  : 'border-gray-700 bg-gray-800'
              }`}
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-gray-400 ml-1">{plan.period}</span>}
              </div>
              <p className="text-sm text-gray-400 mt-2">{plan.description}</p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan)}
                disabled={loading === plan.name}
                className={`w-full mt-8 py-3 rounded-xl font-medium text-sm transition-all ${
                  plan.highlighted
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                } disabled:opacity-40`}
              >
                {loading === plan.name ? 'Redirecting...' : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
