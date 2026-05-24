import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { TEMPLATES } from '../data/templates';
import api from '../lib/api';

export default function TemplatesModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(TEMPLATES.map((t) => t.category))];

  const createMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = TEMPLATES.find((t) => t.id === templateId);
      if (!template) throw new Error('Template not found');
      const { data: project } = await api.post('/api/projects', {
        name: template.name,
      });
      const { data } = await api.patch(`/api/editor/projects/${project.id}`, {
        siteJson: template.siteJson,
      });
      return { id: project.id, version: data.version };
    },
    onSuccess: (result) => {
      onClose();
      navigate(`/editor/${result.id}?version=${result.version}`);
    },
  });

  const filtered = category === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl mx-4 max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Templates</h2>
              <p className="text-sm text-gray-400 mt-1">Choose a professionally designed template to get started quickly</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">&#x2715;</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
                  category === cat ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-130px)]">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template) => (
              <button
                key={template.id}
                onClick={() => createMutation.mutate(template.id)}
                disabled={createMutation.isPending}
                className="text-left bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/10 disabled:opacity-50"
              >
                <div className="h-32 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                  <div className="text-4xl opacity-30">
                    {template.id === 'saas' ? '\u2601\uFE0F' : template.id === 'agency' ? '\u{1F3A8}' : template.id === 'restaurant' ? '\u{1F372}' : template.id === 'portfolio' ? '\u{1F5BC}\uFE0F' : template.id === 'ecommerce' ? '\u{1F6CD}\uFE0F' : template.id === 'consulting' ? '\u{1F4CA}' : template.id === 'health' ? '\u{1F4AA}' : '\u{1F393}'}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white">{template.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.description}</p>
                  <div className="mt-2">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{template.category}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
