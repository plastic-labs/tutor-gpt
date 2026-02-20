import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/auth/')({
  beforeLoad: () => {
    const { user, loading } = useAuthStore.getState();
    if (!loading && user) {
      throw redirect({ to: '/' });
    }
  },
  component: AuthPage,
});

type FormType = 'LOGIN' | 'SIGNUP' | 'FORGOT';

function AuthPage() {
  const [formType, setFormType] = useState<FormType>('LOGIN');
  const { signIn, signUp, signInWithOAuth, resetPassword } = useAuthStore();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (formType === 'LOGIN') {
        const result = await signIn(email, password);
        if (result.error) setError(result.error);
      } else if (formType === 'SIGNUP') {
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          setMessage('Check your email to confirm your account.');
        }
      } else {
        const result = await resetPassword(email);
        if (result.error) {
          setError(result.error);
        } else {
          setMessage('Check your email for password reset instructions.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Bloombot</h1>
          <p className="text-muted-foreground">
            {formType === 'LOGIN'
              ? 'Sign in to your account'
              : formType === 'SIGNUP'
                ? 'Create a new account'
                : 'Reset your password'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              required
            />
          </div>

          {formType !== 'FORGOT' && (
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                required
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {message && (
            <p className="text-sm text-green-600">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? 'Loading...'
              : formType === 'LOGIN'
                ? 'Sign In'
                : formType === 'SIGNUP'
                  ? 'Sign Up'
                  : 'Send Reset Link'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => signInWithOAuth('google')}
            className="w-full py-2 border border-input rounded-md hover:bg-accent"
          >
            Continue with Google
          </button>
          <button
            onClick={() => signInWithOAuth('github')}
            className="w-full py-2 border border-input rounded-md hover:bg-accent"
          >
            Continue with GitHub
          </button>
        </div>

        <div className="text-center text-sm">
          {formType === 'LOGIN' ? (
            <>
              <button
                onClick={() => setFormType('FORGOT')}
                className="text-muted-foreground hover:underline"
              >
                Forgot password?
              </button>
              <span className="mx-2 text-muted-foreground">|</span>
              <button
                onClick={() => setFormType('SIGNUP')}
                className="text-muted-foreground hover:underline"
              >
                Create account
              </button>
            </>
          ) : (
            <button
              onClick={() => setFormType('LOGIN')}
              className="text-muted-foreground hover:underline"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
