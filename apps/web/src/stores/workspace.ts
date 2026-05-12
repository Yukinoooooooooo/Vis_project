import { create } from "zustand";

type WorkspaceContext = {
  currentEventId: string | null;
  currentEventName: string | null;
  currentWindowId: string | null;
  currentWindowLabel: string | null;
  currentNodeId: string | null;
};

type WorkspaceStore = {
  context: WorkspaceContext;
  setContext: (context: Partial<WorkspaceContext>) => void;
};

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  context: {
    currentEventId: null,
    currentEventName: null,
    currentWindowId: null,
    currentWindowLabel: null,
    currentNodeId: null
  },
  setContext: (context) =>
    set((state) => ({
      context: {
        ...state.context,
        ...context
      }
    }))
}));

