import { create } from "zustand";
import type { Activity } from "@/types/ActivityData";
import { useAlertStore } from "./useAlertStore";

interface ActivityState {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  fetchActivities: (opts?: { cursor?: string | null; reset?: boolean; type?: string | null; entityType?: string | null }) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  isLoading: false,
  error: null,
  hasMore: true,
  nextCursor: null,

  fetchActivities: async (opts) => {
    const reset = opts?.reset ?? !opts?.cursor;
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (opts?.cursor) params.set("cursor", opts.cursor);
      else if (get().nextCursor && !reset) params.set("cursor", get().nextCursor as string);
      if (opts?.type) params.set("type", opts.type as string);
      if (opts?.entityType) params.set("entityType", opts.entityType as string);

      const res = await fetch(`/api/activities?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      const data = await res.json();
      const list: Activity[] = data.activities || [];
      if (reset) {
        set({
          activities: list,
          hasMore: data.hasMore ?? false,
          nextCursor: data.nextCursor ?? null,
          isLoading: false,
        });
      } else {
        set((s) => ({
          activities: [...s.activities, ...list],
          hasMore: data.hasMore ?? false,
          nextCursor: data.nextCursor ?? null,
          isLoading: false,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch activities";
      set({ error: message, isLoading: false });
      useAlertStore.getState().addAlert("error", message);
    }
  },
}));
