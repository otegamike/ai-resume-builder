import { create } from 'zustand';
import { type ResumeDocument, type ResumeContent } from '@/types/ResumeData';

interface CreateResumePayload {
  title: string;
  content: ResumeContent;
  template?: string;
}

interface UpdateResumePayload {
  title: string;
  content: ResumeContent;
  template?: string;
}

interface ResumeState {
  resumes: ResumeDocument[];
  isLoading: boolean;
  error: string | null;
  wasUpdated: boolean;
  fetchResumes: () => Promise<void>;
  getResumeById: (id: string) => ResumeDocument | undefined;
  createResume: (data: CreateResumePayload) => Promise<ResumeDocument>;
  updateResume: (id: string, data: UpdateResumePayload) => Promise<ResumeDocument>;
  deleteResume: (id: string) => Promise<void>;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: [],
  isLoading: false,
  error: null,
  wasUpdated: false,

  fetchResumes: async () => {
    if (get().resumes.length > 0 && !get().wasUpdated) return;

    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/resumes');
      if (!response.ok) throw new Error('Failed to fetch resumes');

      const data = (await response.json()) as ResumeDocument[];
      set({ resumes: data, isLoading: false, wasUpdated: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  getResumeById: (id: string) => {
    return get().resumes.find((r) => r._id === id);
  },

  createResume: async (data: CreateResumePayload) => {
    const response = await fetch('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create resume');

    const result = await response.json();
    const newResume: ResumeDocument = {
      _id: result.id,
      title: data.title,
      template: data.template || 'template1',
      content: result.content,
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      resumes: [...state.resumes, newResume],
      wasUpdated: true,
    }));

    return newResume;
  },

  updateResume: async (id: string, data: UpdateResumePayload) => {
    const response = await fetch(`/api/resumes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update resume');

    const updated = (await response.json()) as ResumeDocument;

    set((state) => ({
      resumes: state.resumes.map((r) => (r._id === id ? updated : r)),
      wasUpdated: true,
    }));

    return updated;
  },

  deleteResume: async (id: string) => {
    const response = await fetch(`/api/resumes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete resume');

    set((state) => ({
      resumes: state.resumes.filter((r) => r._id !== id),
      wasUpdated: true,
    }));
  },
}));
