import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import type { AnalyticsData } from '../../types/site.types';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    api.get<AnalyticsData>('/api/analytics').then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!user) return null;

  const stats = data || {
    pageViews: 0,
    uniqueVisitors: 0,
    bounceRate: 0,
    avgTimeOnPage: 0,
    dailyViews: [],
    pages: [],
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Analytics</h1>
          <a href="/dashboard" className="text-sm text-gray-400 hover:text-white">&larr; Dashboard</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Page Views', value: stats.pageViews.toLocaleString() },
            { label: 'Unique Visitors', value: stats.uniqueVisitors.toLocaleString() },
            { label: 'Bounce Rate', value: `${stats.bounceRate}%` },
            { label: 'Avg Time on Page', value: `${stats.avgTimeOnPage}s` },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="font-semibold text-sm text-gray-400 mb-4">Daily Views (Last 7 Days)</h2>
            {stats.dailyViews.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                <div className="text-center">
                  <div className="text-3xl mb-2">{'\u{1F4CA}'}</div>
                  <p>Mock data — integrate your analytics provider</p>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {stats.dailyViews.map((d, i) => {
                  const max = Math.max(...stats.dailyViews.map((x) => x.views));
                  const h = max > 0 ? (d.views / max) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-blue-500 rounded-t" style={{ height: `${h}%`, minHeight: '4px' }} />
                      <span className="text-xs text-gray-500">{d.date.slice(-5)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="font-semibold text-sm text-gray-400 mb-4">Top Pages</h2>
            {stats.pages.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">No page data yet</div>
            ) : (
              <div className="space-y-2">
                {stats.pages.map((p, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">{p.path}</span>
                    <span className="text-sm text-gray-400">{p.views.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
