import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
}

export interface ConfirmDialog {
  id: string;
  message: string;
}

interface AlertState {
  alerts: Alert[];
  confirmDialog: ConfirmDialog | null;
  confirmResolver: ((value: boolean) => void) | null;
  addAlert: (type: AlertType, message: string) => void;
  removeAlert: (id: string) => void;
  showConfirmDialog: (message: string) => Promise<boolean>;
  confirmDialogResponse: (confirmed: boolean) => void;
}

let nextId = 0;

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  confirmDialog: null,
  confirmResolver: null,

  addAlert: (type, message) => {
    const id = String(++nextId);
    set((state) => ({
      alerts: [...state.alerts, { id, type, message }],
    }));
  },

  removeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    }));
  },

  showConfirmDialog: (message) => {
    return new Promise<boolean>((resolve) => {
      set({
        confirmDialog: { id: String(++nextId), message },
        confirmResolver: resolve,
      });
    });
  },

  confirmDialogResponse: (confirmed) => {
    set((state) => {
      state.confirmResolver?.(confirmed);
      return { confirmDialog: null, confirmResolver: null };
    });
  },
}));
