import { create } from 'zustand';
import { type TemplateDefinition, type TemplateId } from '@/lib/templateCatalog';

interface TemplateState {
  templates: TemplateDefinition[];
  isLoading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  getTemplateById: (id: TemplateId) => TemplateDefinition | undefined;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = (await response.json()) as TemplateDefinition[];
      set({ templates: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  getTemplateById: (id: TemplateId) => {
    return get().templates.find((t) => t.id === id);
  },
}));
