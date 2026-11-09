import { create } from "zustand";
import type { Project } from "../types/project";
interface State {
  project: Project | null;
  past: Project[];
  future: Project[];
  dirty: boolean;
  open: (p: Project) => void;
  change: (p: Project) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  close: () => void;
}
export const useEditor = create<State>((set) => ({
  project: null,
  past: [],
  future: [],
  dirty: false,
  open: (p) => set({ project: p, past: [], future: [], dirty: false }),
  change: (p) =>
    set((s) => ({
      project: p,
      past: s.project ? [...s.past, s.project].slice(-20) : [],
      future: [],
      dirty: true,
    })),
  undo: () =>
    set((s) =>
      s.past.length
        ? {
            project: s.past.at(-1)!,
            past: s.past.slice(0, -1),
            future: [s.project!, ...s.future],
            dirty: true,
          }
        : {},
    ),
  redo: () =>
    set((s) =>
      s.future.length
        ? {
            project: s.future[0],
            past: [...s.past, s.project!].slice(-20),
            future: s.future.slice(1),
            dirty: true,
          }
        : {},
    ),
  markSaved: () => set({ dirty: false }),
  close: () => set({ project: null, past: [], future: [], dirty: false }),
}));
