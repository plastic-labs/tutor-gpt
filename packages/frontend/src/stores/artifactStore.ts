import { create } from 'zustand';

interface ArtifactState {
  activeArtifactId: string | null;
  editorContent: string;
  isDirty: boolean;
  panelOpen: boolean;

  setActiveArtifact: (id: string | null) => void;
  setEditorContent: (content: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setPanelOpen: (open: boolean) => void;
}

export const useArtifactStore = create<ArtifactState>((set) => ({
  activeArtifactId: null,
  editorContent: '',
  isDirty: false,
  panelOpen: false,

  setActiveArtifact: (id) => set({ activeArtifactId: id, isDirty: false }),
  setEditorContent: (content) => set({ editorContent: content, isDirty: true }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setPanelOpen: (open) => set({ panelOpen: open }),
}));
