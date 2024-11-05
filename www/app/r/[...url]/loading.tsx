// loading.tsx - Shown while the server component is loading
export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-neon-green" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}