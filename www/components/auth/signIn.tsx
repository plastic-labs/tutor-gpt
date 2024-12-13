'use client';
import { useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';
import GoogleSignIn from './google';
import DiscordSignIn from './discord';

export default function SignIn(props: any) {
  const { stateSync, handler } = props;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { theme } = useTheme();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    setIsLoading(true);
    const formData = new FormData(formRef.current);
    try {
      const error = await handler(formData);
      if (error) {
        setError(true);
        Swal.fire({
          title: 'Error!',
          text: 'Incorrect Credentials',
          icon: 'error',
          confirmButtonText: 'Close',
          confirmButtonColor: '#3085d6',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form
        action="#"
        ref={formRef}
        onSubmit={handleSignIn}
        className={`mt-8 space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}
      >
        <div>
          <label
            htmlFor="email"
            className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Email
          </label>

          <input
            type="email"
            id="email"
            name="email"
            className={`p-2 mt-1 w-full rounded-md text-sm shadow-sm ${
              theme === 'dark'
                ? 'bg-gray-700 text-white border-gray-600'
                : 'bg-white text-gray-700 border-gray-200'
            } ${error ? 'border-2 border-red-500' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Password
          </label>

          <input
            type="password"
            id="password"
            name="password"
            className={`p-2 mt-1 w-full rounded-md text-sm shadow-sm ${
              theme === 'dark'
                ? 'bg-gray-700 text-white border-gray-600'
                : 'bg-white text-gray-700 border-gray-200'
            } ${error ? 'border-2 border-red-500' : ''}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="sm:flex sm:items-center sm:gap-4">
          <button
            className={`inline-block w-full sm:w-auto shrink-0 rounded-md border px-12 py-3 text-sm font-medium transition focus:outline-none focus:ring text-gray-800 ${
              theme === 'dark'
                ? 'border-neon-green bg-neon-green hover:bg-transparent hover:text-neon-green'
                : 'border-neon-green bg-neon-green hover:bg-transparent hover:text-blue-600'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              'Login'
            )}
          </button>

          <div className="mt-4 space-y-2 sm:mt-0 text-sm">
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}>
              Don&apos;t have an account?{' '}
              <a
                href="#"
                onClick={() => stateSync('SIGNUP')}
                className={`underline ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}
              >
                Sign Up Now
              </a>
            </p>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}>
              Forgot Your Password?{' '}
              <a
                href="#"
                onClick={() => stateSync('FORGOT')}
                className={`underline ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}
              >
                Recover
              </a>
            </p>
          </div>
        </div>
      </form>
      <div className="mt-6 space-y-4">
        <GoogleSignIn text="Sign In" />
        <DiscordSignIn text="Sign In" />
      </div>
    </>
  );
}
