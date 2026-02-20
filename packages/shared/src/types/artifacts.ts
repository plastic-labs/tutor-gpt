export interface Artifact {
  id: string;
  userId: string;
  title: string;
  contentType: string;
  currentVersion: number;
  storagePath: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactVersion {
  id: string;
  artifactId: string;
  version: number;
  storagePath: string;
  changeSummary: string | null;
  createdAt: string;
}
