import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import type { QueryClient } from '@tanstack/react-query';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: ErrorBoundary,
});

function RootLayout() {
  return (
    <div className="h-full flex flex-col">
      <Outlet />
      <Toaster position="top-center" />
    </div>
  );
}

function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
