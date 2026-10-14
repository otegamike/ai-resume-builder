import { create } from "zustand";
import { useAlertStore } from "./useAlertStore";

export const DEFAULT_COVER_LETTER_INTRO = "Dear Hiring Manager,";

interface UserState {
  pinnedResumeId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchPinnedResume: () => Promise<void>;
  ensurePinnedResume: () => Promise<void>;
  setPinnedResume: (resumeId: string | null) => Promise<void>;
  coverLetterIntro: string;
  coverLetterOutro: string;
  prefsLoading: boolean;
  prefsError: string | null;
  fetchCoverLetterPrefs: () => Promise<void>;
  ensureCoverLetterPrefs: () => Promise<void>;
  saveCoverLetterPrefs: (intro: string, outro: string) => Promise<void>;
}

let pinnedFetchPromise: Promise<void> | null = null;
let hasFetchedPinned = false;
let prefsFetchPromise: Promise<void> | null = null;
let hasFetchedPrefs = false;

export const useUserStore = create<UserState>((set, get) => ({
  pinnedResumeId: null,
  isLoading: false,
  error: null,
  coverLetterIntro: DEFAULT_COVER_LETTER_INTRO,
  coverLetterOutro: "",
  prefsLoading: false,
  prefsError: null,

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

  fetchCoverLetterPrefs: async () => {
    if (prefsFetchPromise) return prefsFetchPromise;
    set({ prefsLoading: true, prefsError: null });
    prefsFetchPromise = (async () => {
      try {
        const response = await fetch("/api/user/cover-letter-prefs");
        if (!response.ok) throw new Error("Failed to fetch cover letter prefs");
        const data = (await response.json()) as { intro: string; outro: string };
        hasFetchedPrefs = true;
        set({
          coverLetterIntro: data.intro || DEFAULT_COVER_LETTER_INTRO,
          coverLetterOutro: data.outro || "",
          prefsLoading: false,
        });
      } catch {
        const message = "Could not load cover letter intro and outro.";
        set({ prefsError: message, prefsLoading: false });
        useAlertStore.getState().addAlert("warning", message);
      } finally {
        prefsFetchPromise = null;
      }
    })();
    return prefsFetchPromise;
  },

  ensureCoverLetterPrefs: async () => {
    if (hasFetchedPrefs) return;
    if (prefsFetchPromise) return prefsFetchPromise;
    return get().fetchCoverLetterPrefs();
  },

  saveCoverLetterPrefs: async (intro: string, outro: string) => {
    const previousIntro = get().coverLetterIntro;
    const previousOutro = get().coverLetterOutro;
    const nextIntro = intro.trim() || DEFAULT_COVER_LETTER_INTRO;
    const nextOutro = outro.trim();
    set({ coverLetterIntro: nextIntro, coverLetterOutro: nextOutro, prefsError: null });
    try {
      const response = await fetch("/api/user/cover-letter-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intro: nextIntro, outro: nextOutro }),
      });
      if (!response.ok) throw new Error("Failed to save cover letter prefs");
      const data = (await response.json()) as { intro: string; outro: string };
      hasFetchedPrefs = true;
      set({
        coverLetterIntro: data.intro || DEFAULT_COVER_LETTER_INTRO,
        coverLetterOutro: data.outro || "",
      });
      useAlertStore.getState().addAlert("success", "Cover letter intro and outro saved.");
    } catch (err) {
      set({ coverLetterIntro: previousIntro, coverLetterOutro: previousOutro });
      useAlertStore.getState().addAlert("error", "Failed to save. Please try again.");
      throw err;
    }
  },
}));
