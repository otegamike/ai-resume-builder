import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
}

interface AlertState {
  alerts: Alert[];
  addAlert: (type: AlertType, message: string) => void;
  removeAlert: (id: string) => void;
}

let nextId = 0;

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],

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
}));
