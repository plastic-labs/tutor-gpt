'use client';

import { useRouter } from 'next/navigation';

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-xl">Something went wrong!</h2>
      <p className="text-gray-600">{error.message}</p>
      <button
        onClick={() => router.push('/')}
        className="bg-neon-green px-4 py-2 rounded-lg"
      >
        Return Home
      </button>
    </div>
  );
}