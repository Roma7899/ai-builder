import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Project {
  id: string;
  userId: string;
  name: string;
  slug: string;
  status: string;
  currentVersion: number;
  domainCustom: string | null;
  domainSub: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useProjects() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get<Project[]>('/api/projects');
      return data;
    },
  });

  const createProject = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<Project>('/api/projects', { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data } = await api.put<Project>(`/api/projects/${id}`, { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return { query, createProject, updateProject, deleteProject };
}
