import { useArtifactStore } from '../../src/stores/artifactStore';

describe('artifactStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useArtifactStore.setState({
      activeArtifactId: null,
      editorContent: '',
      isDirty: false,
      panelOpen: false,
    });
  });

  it('has correct initial state', () => {
    const state = useArtifactStore.getState();
    expect(state.activeArtifactId).toBeNull();
    expect(state.editorContent).toBe('');
    expect(state.isDirty).toBe(false);
    expect(state.panelOpen).toBe(false);
  });

  it('setActiveArtifact updates activeArtifactId and resets isDirty', () => {
    // First make it dirty
    useArtifactStore.getState().setEditorContent('some content');
    expect(useArtifactStore.getState().isDirty).toBe(true);

    // Setting active artifact should reset isDirty
    useArtifactStore.getState().setActiveArtifact('artifact-1');
    expect(useArtifactStore.getState().activeArtifactId).toBe('artifact-1');
    expect(useArtifactStore.getState().isDirty).toBe(false);
  });

  it('setActiveArtifact to null works', () => {
    useArtifactStore.getState().setActiveArtifact('artifact-1');
    expect(useArtifactStore.getState().activeArtifactId).toBe('artifact-1');

    useArtifactStore.getState().setActiveArtifact(null);
    expect(useArtifactStore.getState().activeArtifactId).toBeNull();
  });

  it('setEditorContent updates content and marks isDirty', () => {
    expect(useArtifactStore.getState().isDirty).toBe(false);

    useArtifactStore.getState().setEditorContent('new content');
    expect(useArtifactStore.getState().editorContent).toBe('new content');
    expect(useArtifactStore.getState().isDirty).toBe(true);
  });

  it('setPanelOpen updates panelOpen', () => {
    useArtifactStore.getState().setPanelOpen(true);
    expect(useArtifactStore.getState().panelOpen).toBe(true);

    useArtifactStore.getState().setPanelOpen(false);
    expect(useArtifactStore.getState().panelOpen).toBe(false);
  });
});
