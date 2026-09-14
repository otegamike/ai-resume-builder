import { create } from "zustand";
import { useAlertStore } from "./useAlertStore";

interface UserState {
  pinnedResumeId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchPinnedResume: () => Promise<void>;
  setPinnedResume: (resumeId: string | null) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  pinnedResumeId: null,
  isLoading: false,
  error: null,

  fetchPinnedResume: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/user/pinned-resume");
      if (!response.ok) throw new Error("Failed to fetch pinned resume");
      const data = (await response.json()) as { pinnedResume: string | null };
      set({ pinnedResumeId: data.pinnedResume || null, isLoading: false });
    } catch {
      const message = "Could not load pinned resume.";
      set({ error: message, isLoading: false });
      useAlertStore.getState().addAlert("warning", message);
    }
  },

  setPinnedResume: async (resumeId: string | null) => {
    const previous = get().pinnedResumeId;
    const next = resumeId || null;
    set({ pinnedResumeId: next });
    try {
      const response = await fetch("/api/user/pinned-resume", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: next }),
      });
      if (!response.ok) throw new Error("Failed to update pinned resume");
      const data = (await response.json()) as { pinnedResume: string | null };
      set({ pinnedResumeId: data.pinnedResume || null });
    } catch (err) {
      set({ pinnedResumeId: previous });
      useAlertStore.getState().addAlert("error", "Failed to update pinned resume. Please try again.");
      throw err;
    }
  },
}));
