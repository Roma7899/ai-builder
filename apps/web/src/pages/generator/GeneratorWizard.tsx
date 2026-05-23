import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BusinessTypeStep from './steps/BusinessTypeStep';
import BusinessDetailsStep from './steps/BusinessDetailsStep';
import StylePreferencesStep from './steps/StylePreferencesStep';
import GeneratingStep from './steps/GeneratingStep';
import { useAuth } from '../../context/AuthContext';

interface WizardState {
  businessType: string;
  businessName: string;
  tagline: string;
  description: string;
  location: string;
  phone: string;
  email: string;
  colorPalette: string;
  fontPair: string;
  tone: string;
}

const STEPS = [
  'Business Type',
  'Business Details',
  'Style Preferences',
  'Generating',
];

const TONE_PROMPTS: Record<string, string> = {
  professional: 'Use a clean, corporate, and trust-focused design tone.',
  friendly: 'Use a warm, approachable, and inviting design tone.',
  bold: 'Use a modern, striking, and eye-catching design tone.',
};

export default function GeneratorWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    businessType: '',
    businessName: '',
    tagline: '',
    description: '',
    location: '',
    phone: '',
    email: '',
    colorPalette: '',
    fontPair: 'inter',
    tone: 'professional',
  });

  const update = useCallback(<K extends keyof WizardState>(
    key: K,
    value: WizardState[K],
  ) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const buildPrompt = useCallback((): string => {
    const parts: string[] = [];

    if (state.businessType) parts.push(`Business type: ${state.businessType}`);
    if (state.businessName) parts.push(`Business name: ${state.businessName}`);
    if (state.tagline) parts.push(`Tagline: ${state.tagline}`);
    if (state.description) parts.push(`Description: ${state.description}`);
    if (state.location) parts.push(`Location: ${state.location}`);
    if (state.phone) parts.push(`Phone: ${state.phone}`);
    if (state.email) parts.push(`Email: ${state.email}`);

    const tonePrompt = TONE_PROMPTS[state.tone] ?? '';
    if (tonePrompt) parts.push(`Design tone: ${tonePrompt}`);

    return parts.join('\n');
  }, [state]);

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <BusinessTypeStep
            value={state.businessType}
            onChange={(v) => update('businessType', v)}
          />
        );
      case 1:
        return (
          <BusinessDetailsStep
            name={state.businessName}
            tagline={state.tagline}
            description={state.description}
            location={state.location}
            phone={state.phone}
            email={state.email}
            onChange={update as any}
          />
        );
      case 2:
        return (
          <StylePreferencesStep
            colorPalette={state.colorPalette}
            fontPair={state.fontPair}
            tone={state.tone}
            onChange={update as any}
          />
        );
      case 3:
        return (
          <GeneratingStep
            prompt={buildPrompt()}
            stylePreferences={{
              colorPalette: state.colorPalette,
              fontPair: state.fontPair,
              industryType: state.businessType,
            }}
            projectId={projectId}
            onProjectReady={(id, version) => {
              navigate(`/editor/${id}?version=${version}`);
            }}
            onProjectCreated={setProjectId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">
            Generate Your Website
          </h1>
        </div>
      </header>

      {/* Progress stepper */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <nav aria-label="Progress" className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0 ${
                  i < step
                    ? 'bg-blue-600 text-white'
                    : i === step
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < step ? '\u2713' : i + 1}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  i <= step ? 'text-gray-900 font-medium' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    i < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Step content */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8">
          {renderStep()}

          {/* Navigation buttons (hidden on generating step) */}
          {step < 3 && (
            <div className="flex justify-between mt-8 pt-6 border-t">
              <button
                onClick={back}
                disabled={step === 0}
                className="px-5 py-2 text-sm font-medium border rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={next}
                disabled={
                  (step === 0 && !state.businessType) ||
                  (step === 1 && !state.businessName)
                }
                className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700"
              >
                {step === STEPS.length - 2 ? 'Generate' : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
