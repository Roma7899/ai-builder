import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';

export interface StylePreferences {
  colorPalette?: string;
  fontPair?: string;
  industryType?: string;
}

interface StartGenerationParams {
  projectId: string;
  prompt: string;
  stylePreferences?: StylePreferences;
}

interface StartGenerationResult {
  jobId: string;
}

export function useStartGeneration() {
  return useMutation({
    mutationFn: async (params: StartGenerationParams) => {
      const { data } = await api.post<StartGenerationResult>('/api/generate', params);
      return data;
    },
  });
}

export function createGenerationEventSource(jobId: string, apiBaseUrl: string, accessToken?: string): EventSource {
  const url = accessToken
    ? `${apiBaseUrl}/api/generate/${jobId}/stream?token=${encodeURIComponent(accessToken)}`
    : `${apiBaseUrl}/api/generate/${jobId}/stream`;
  return new EventSource(url, {
    withCredentials: true,
  });
}
