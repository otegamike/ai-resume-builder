import { create } from 'zustand';
import { type ResumeDocument, type ResumeContent } from '@/types/ResumeData';
import { useAlertStore } from './useAlertStore';

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred';
}

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
  fetchResumes: () => Promise<void>;
  getResumeById: (id: string) => ResumeDocument | undefined;
  createResume: (data: CreateResumePayload) => Promise<ResumeDocument>;
  updateResume: (id: string, data: UpdateResumePayload) => Promise<ResumeDocument>;
  deleteResume: (id: string) => Promise<void>;
}

let fetchResumesPromise: Promise<void> | null = null;

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: [],
  isLoading: false,
  error: null,

  fetchResumes: async () => {
    if (fetchResumesPromise) return fetchResumesPromise;

    if (get().resumes.length > 0) {
      fetchResumesPromise = (async () => {
        try {
          const response = await fetch('/api/resumes');
          if (!response.ok) throw new Error('Failed to fetch resumes');
          const data = (await response.json()) as ResumeDocument[];
          set({ resumes: data });
        } catch {
          useAlertStore.getState().addAlert('warning', 'Could not refresh your resumes. Your data may be outdated.');
        } finally {
          fetchResumesPromise = null;
        }
      })();
      return fetchResumesPromise;
    }

    set({ isLoading: true, error: null });

    fetchResumesPromise = (async () => {
      try {
        const response = await fetch('/api/resumes');
        if (!response.ok) throw new Error('Failed to fetch resumes');

        const data = (await response.json()) as ResumeDocument[];
        set({ resumes: data, isLoading: false });
      } catch {
        const message = 'Could not load your resumes. Check your connection and try again.';
        set({ error: message, isLoading: false });
        useAlertStore.getState().addAlert('error', message);
      } finally {
        fetchResumesPromise = null;
      }
    })();

    return fetchResumesPromise;
  },

  getResumeById: (id: string) => {
    return get().resumes.find((r) => r._id === id);
  },

  createResume: async (data: CreateResumePayload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create resume');

      const newResume = (await response.json()) as ResumeDocument;

      set((state) => ({
        resumes: [...state.resumes, newResume],
        isLoading: false,
      }));

      useAlertStore.getState().addAlert('success', 'Resume created successfully.');
      return newResume;
    } catch (err) {
      const error = getErrorMessage(err);
      set({ error, isLoading: false });
      useAlertStore.getState().addAlert('error', 'Failed to create resume. Please try again.');
      throw err;
    }
  },

  updateResume: async (id: string, data: UpdateResumePayload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/resumes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update resume');

      const updated = (await response.json()) as ResumeDocument;

      set((state) => ({
        resumes: state.resumes.map((r) => (r._id === id ? updated : r)),
        isLoading: false,
      }));

      useAlertStore.getState().addAlert('success', 'Resume updated successfully.');
      return updated;
    } catch (err) {
      const error = getErrorMessage(err);
      set({ error, isLoading: false });
      useAlertStore.getState().addAlert('error', 'Failed to save changes. Please try again.');
      throw err;
    }
  },

  deleteResume: async (id: string) => {
    const previous = get().resumes;
    set((state) => ({
      resumes: state.resumes.filter((r) => r._id !== id),
    }));
    try {
      const response = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete resume');
      useAlertStore.getState().addAlert('success', 'Resume deleted.');
    } catch (err) {
      set({ resumes: previous });
      useAlertStore.getState().addAlert('error', 'Failed to delete resume. Please try again.');
    }
  },
}));
