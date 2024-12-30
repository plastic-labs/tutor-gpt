'use client';
import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';
import Swal from 'sweetalert2';

export default function Forgot(props: any) {
  const { stateSync } = props;
  const [email, setEmail] = useState('');
  const supabase = createClient();

  const handleForgotPassword = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset`,
    });
    if (error) {
      console.error(error);
      Swal.fire({
        title: 'Error!',
        text: 'Something went wrong',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Close',
      });
      return;
    }
    Swal.fire({
      title: 'Success!',
      text: 'Please check your email for a password reset link',
      icon: 'success',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'Close',
    });
  };

  return (
    <form action="#" className="mt-8 space-y-6 text-foreground">
      <div>
        <label htmlFor="Email" className="block text-sm font-medium">
          Email
        </label>

        <input
          type="email"
          id="Email"
          name="email"
          className="p-2 mt-1 w-full rounded-md border-gray-200 bg-accent text-sm text-foreground shadow-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="sm:flex sm:items-center sm:gap-4">
        <button
          className="inline-block w-full sm:w-auto shrink-0 rounded-md border px-12 py-3 text-sm font-medium transition focus:outline-none focus:ring text-black bg-accent hover:border-neon-green hover:bg-neon-green dark:hover:text-neon-green dark:border-neon-green dark:bg-neon-green dark:hover:bg-transparent"
          onClick={handleForgotPassword}
        >
          Send Recovery Email
        </button>

        <p className="mt-4 text-sm text-foreground sm:mt-0">
          Don&apos;t have an account?{' '}
          <a
            href="#"
            onClick={() => stateSync('SIGNUP')}
            className="text-foreground underline"
          >
            Sign up
          </a>
          .
        </p>
      </div>
    </form>
  );
}
