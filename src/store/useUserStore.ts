import { create } from "zustand";
import { useAlertStore } from "./useAlertStore";

interface UserState {
  pinnedResumeId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchPinnedResume: () => Promise<void>;
  ensurePinnedResume: () => Promise<void>;
  setPinnedResume: (resumeId: string | null) => Promise<void>;
}

let pinnedFetchPromise: Promise<void> | null = null;
let hasFetchedPinned = false;

export const useUserStore = create<UserState>((set, get) => ({
  pinnedResumeId: null,
  isLoading: false,
  error: null,

  fetchPinnedResume: async () => {
    if (pinnedFetchPromise) return pinnedFetchPromise;
    set({ isLoading: true, error: null });
    pinnedFetchPromise = (async () => {
      try {
        const response = await fetch("/api/user/pinned-resume");
        if (!response.ok) throw new Error("Failed to fetch pinned resume");
        const data = (await response.json()) as { pinnedResume: string | null };
        hasFetchedPinned = true;
        set({ pinnedResumeId: data.pinnedResume || null, isLoading: false });
      } catch {
        const message = "Could not load pinned resume.";
        set({ error: message, isLoading: false });
        useAlertStore.getState().addAlert("warning", message);
      } finally {
        pinnedFetchPromise = null;
      }
    })();
    return pinnedFetchPromise;
  },

  ensurePinnedResume: async () => {
    if (hasFetchedPinned) return;
    if (pinnedFetchPromise) return pinnedFetchPromise;
    return get().fetchPinnedResume();
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
      hasFetchedPinned = true;
      set({ pinnedResumeId: data.pinnedResume || null });
    } catch (err) {
      set({ pinnedResumeId: previous });
      useAlertStore.getState().addAlert("error", "Failed to update pinned resume. Please try again.");
      throw err;
    }
  },
}));
