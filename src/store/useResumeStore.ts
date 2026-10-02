import { create } from 'zustand';
import { type ResumeDocument, type ResumeContent, type UploadedResumeClient } from '@/types/ResumeData';
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

interface ResumeListResponse {
  resumes?: ResumeDocument[];
  uploadedResumes?: UploadedResumeClient[];
}

function readResumeList(data: unknown): { resumes: ResumeDocument[]; uploadedResumes: UploadedResumeClient[] } {
  if (Array.isArray(data)) {
    return { resumes: data as ResumeDocument[], uploadedResumes: [] };
  }
  const record = (data ?? {}) as ResumeListResponse;
  return {
    resumes: Array.isArray(record.resumes) ? record.resumes : [],
    uploadedResumes: Array.isArray(record.uploadedResumes) ? record.uploadedResumes : [],
  };
}

function mergeUploadedResumes(
  previous: UploadedResumeClient[],
  incoming: UploadedResumeClient[]
): UploadedResumeClient[] {
  const fullById = new Map<string, UploadedResumeClient>();
  for (const item of previous) {
    if (item._id && item.parsedResume) fullById.set(item._id, item);
  }
  return incoming.map((item) => {
    const full = item._id ? fullById.get(item._id) : undefined;
    if (full && !item.parsedResume) return { ...item, parsedResume: full.parsedResume };
    return item;
  });
}

const initialResumeState = {
  resumes: [] as ResumeDocument[],
  uploadedResumes: [] as UploadedResumeClient[],
  isLoading: false,
  isLoadingUploaded: false,
  error: null as string | null,
};

interface ResumeState {
  resumes: ResumeDocument[];
  uploadedResumes: UploadedResumeClient[];
  isLoading: boolean;
  isLoadingUploaded: boolean;
  error: string | null;
  fetchResumes: () => Promise<void>;
  fetchUploadedResumes: () => Promise<void>;
  getResumeById: (id: string) => ResumeDocument | undefined;
  getUploadedResumeById: (id: string) => UploadedResumeClient | undefined;
  upsertUploadedResume: (item: UploadedResumeClient) => void;
  removeUploadedResume: (id: string) => void;
  deleteUploadedResume: (id: string) => Promise<void>;
  reset: () => void;
  createResume: (data: CreateResumePayload) => Promise<ResumeDocument>;
  updateResume: (id: string, data: UpdateResumePayload) => Promise<ResumeDocument>;
  deleteResume: (id: string) => Promise<void>;
}

let fetchResumesPromise: Promise<void> | null = null;
let fetchUploadedResumesPromise: Promise<void> | null = null;

export const useResumeStore = create<ResumeState>((set, get) => ({
  ...initialResumeState,

  fetchResumes: async () => {
    if (fetchResumesPromise) return fetchResumesPromise;

    if (get().resumes.length > 0) {
      fetchResumesPromise = (async () => {
        try {
          const response = await fetch('/api/resumes');
          if (!response.ok) throw new Error('Failed to fetch resumes');
          const data = readResumeList(await response.json());
          set({ resumes: data.resumes });
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

        const data = readResumeList(await response.json());
        set({ resumes: data.resumes, isLoading: false });
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

  fetchUploadedResumes: async () => {
    if (fetchUploadedResumesPromise) return fetchUploadedResumesPromise;

    const showLoader = get().uploadedResumes.length === 0;
    if (showLoader) set({ isLoadingUploaded: true });

    fetchUploadedResumesPromise = (async () => {
      try {
        const response = await fetch('/api/resumes?type=uploaded');
        if (!response.ok) throw new Error('Failed to fetch uploaded resumes');

        const data = readResumeList(await response.json());
        set((state) => ({
          uploadedResumes: mergeUploadedResumes(state.uploadedResumes, data.uploadedResumes),
          isLoadingUploaded: false,
        }));
      } catch {
        set({ isLoadingUploaded: false });
        if (showLoader) {
          useAlertStore.getState().addAlert('error', 'Could not load your uploaded resumes. Check your connection and try again.');
        } else {
          useAlertStore.getState().addAlert('warning', 'Could not refresh your uploaded resumes. Your data may be outdated.');
        }
      } finally {
        fetchUploadedResumesPromise = null;
      }
    })();

    return fetchUploadedResumesPromise;
  },

  upsertUploadedResume: (item: UploadedResumeClient) => {
    set((state) => {
      if (!item._id) return { uploadedResumes: [item, ...state.uploadedResumes] };
      const exists = state.uploadedResumes.some((r) => r._id === item._id);
      return {
        uploadedResumes: exists
          ? state.uploadedResumes.map((r) => (r._id === item._id ? item : r))
          : [item, ...state.uploadedResumes],
      };
    });
  },

  removeUploadedResume: (id: string) => {
    set((state) => ({
      uploadedResumes: state.uploadedResumes.filter((r) => r._id !== id),
    }));
  },

  deleteUploadedResume: async (id: string) => {
    const previous = get().uploadedResumes;
    set((state) => ({
      uploadedResumes: state.uploadedResumes.filter((r) => r._id !== id),
    }));
    try {
      const response = await fetch(`/api/resume/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete uploaded resume');
      useAlertStore.getState().addAlert('success', 'Uploaded resume deleted.');
    } catch {
      set({ uploadedResumes: previous });
      useAlertStore.getState().addAlert('error', 'Failed to delete uploaded resume. Please try again.');
    }
  },

  reset: () => {
    fetchResumesPromise = null;
    fetchUploadedResumesPromise = null;
    set({ ...initialResumeState });
  },

  getResumeById: (id: string) => {
    return get().resumes.find((r) => r._id === id);
  },

  getUploadedResumeById: (id: string) => {
    return get().uploadedResumes.find((r) => r._id === id);
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
