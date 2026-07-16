import { create } from "zustand";

interface AiCreditState {
  credits: number | null;
  isLoading: boolean;
  error: string | null;
  fetchCredits: () => Promise<void>;
  setCredits: (credits: number) => void;
}

export const useAiCreditStore = create<AiCreditState>((set) => ({
  credits: null,
  isLoading: false,
  error: null,

  fetchCredits: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/credits");
      if (!response.ok) throw new Error("Failed to fetch credits");
      const data = (await response.json()) as { credits: number };
      set({ credits: data.credits, isLoading: false });
    } catch {
      set({ error: "Failed to fetch credits", isLoading: false });
    }
  },

  setCredits: (credits) => set({ credits }),
}));
