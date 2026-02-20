import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useArtifactStore } from '@/stores/artifactStore';
import { api } from '@/lib/api';
import { MarkdownWrapper } from '@/components/chat/MarkdownWrapper';
import { X, History, Save } from 'lucide-react';

export function ArtifactPanel() {
  const activeArtifactId = useArtifactStore((s) => s.activeArtifactId);
  const editorContent = useArtifactStore((s) => s.editorContent);
  const isDirty = useArtifactStore((s) => s.isDirty);
  const setEditorContent = useArtifactStore((s) => s.setEditorContent);
  const setPanelOpen = useArtifactStore((s) => s.setPanelOpen);
  const setIsDirty = useArtifactStore((s) => s.setIsDirty);

  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch artifact content
  const { data: artifact } = useQuery({
    queryKey: ['artifact', activeArtifactId],
    queryFn: async () => {
      if (!activeArtifactId) return null;
      // Get artifact versions to find current content
      const { data } = await api.artifacts({ id: activeArtifactId }).versions.get();
      return data;
    },
    enabled: !!activeArtifactId,
  });

  // Fetch artifact list for display
  const { data: artifacts } = useQuery({
    queryKey: ['artifacts'],
    queryFn: async () => {
      const { data, error } = await api.artifacts.get();
      if (error) throw error;
      return data;
    },
  });

  const currentArtifact = artifacts?.find(
    (a: any) => a.id === activeArtifactId
  );

  // Load content when artifact changes
  useEffect(() => {
    if (activeArtifactId && !isDirty) {
      // TODO: Load actual content from storage
      setEditorContent('');
      setIsDirty(false);
    }
  }, [activeArtifactId, isDirty, setEditorContent, setIsDirty]);

  const handleSave = async () => {
    if (!activeArtifactId || !isDirty) return;
    setSaving(true);
    try {
      await api.artifacts({ id: activeArtifactId }).put({
        content: editorContent,
        changeSummary: 'Manual edit',
      });
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  };

  if (!activeArtifactId) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          No artifact selected. Ask Bloom to create a document.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-medium truncate">
            {currentArtifact?.title ?? 'Document'}
          </h3>
          {isDirty && (
            <span className="text-xs text-muted-foreground">(unsaved)</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 hover:bg-accent rounded-md"
              aria-label="Save"
            >
              <Save className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-2 py-1 text-xs border border-input rounded hover:bg-accent"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={() => setPanelOpen(false)}
            className="p-1.5 hover:bg-accent rounded-md"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <div className="h-full overflow-y-auto p-4 prose prose-sm dark:prose-invert max-w-none">
            <MarkdownWrapper text={editorContent || '*Empty document*'} />
          </div>
        ) : (
          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            className="w-full h-full p-4 bg-background resize-none text-sm font-mono focus:outline-none"
            placeholder="Start writing..."
          />
        )}
      </div>

      {/* Version info */}
      {artifact && Array.isArray(artifact) && artifact.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-t text-xs text-muted-foreground">
          <History className="h-3 w-3" />
          <span>
            Version {artifact[0]?.version ?? 1}
            {artifact[0]?.changeSummary ? ` - ${artifact[0].changeSummary}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
