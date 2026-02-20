import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useArtifactStore } from '@/stores/artifactStore';
import { api } from '@/lib/api';
import { ArrowLeft, FileText, Plus } from 'lucide-react';

export const Route = createFileRoute('/artifacts/')({
  beforeLoad: () => {
    const { user, loading } = useAuthStore.getState();
    if (!loading && !user) {
      throw redirect({ to: '/auth' });
    }
  },
  component: ArtifactsPage,
});

function ArtifactsPage() {
  const navigate = useNavigate();
  const setActiveArtifact = useArtifactStore((s) => s.setActiveArtifact);
  const setPanelOpen = useArtifactStore((s) => s.setPanelOpen);

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: ['artifacts'],
    queryFn: async () => {
      const { data, error } = await api.artifacts.get();
      if (error) throw error;
      return data;
    },
  });

  const openArtifact = (id: string) => {
    setActiveArtifact(id);
    setPanelOpen(true);
    navigate({ to: '/' });
  };

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center gap-4 p-4 border-b">
        <button onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Documents</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : artifacts.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No documents yet.</p>
              <p className="text-sm text-muted-foreground">
                Ask Bloom to help you write something!
              </p>
            </div>
          ) : (
            artifacts.map((artifact: any) => (
              <button
                key={artifact.id}
                onClick={() => openArtifact(artifact.id)}
                className="w-full flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/50 text-left transition-colors"
              >
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {artifact.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    v{artifact.currentVersion} - Updated{' '}
                    {new Date(artifact.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
