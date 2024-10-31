'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

import { SignIn, SignUp, Forgot } from '@/components/auth';

import { login, signup } from './actions';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

export default function Auth() {
  const [formType, setFormType] = useState('LOGIN');
  const supabase = createClient();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Can't access this page if you're logged in
        router.push('/');
      }
    });
  }, [supabase]);

  useEffect(() => {
    const handleAuthResult = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const discordAuthPending = urlParams.get('discord_auth') === 'pending';
      const errorMessage = urlParams.get('error_description');

      if (errorMessage) {
        console.error('Auth error:', errorMessage);
        Swal.fire({
          title: 'Error',
          text: decodeURIComponent(errorMessage),
          icon: 'error',
          confirmButtonColor: '#3085d6',
        });
        router.push('/auth');
        return;
      }
      if (discordAuthPending) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error('Session error:', sessionError);
          Swal.fire({
            title: 'Error',
            text: 'Authentication failed. Please try again.',
            icon: 'error',
            confirmButtonColor: '#3085d6',
          });
          router.push('/settings');
        } else {
          // Refresh the session to include the new Discord identity
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            console.error('Error refreshing session:', error);
            Swal.fire({
              title: 'Error',
              text: 'Failed to update account. Please try again.',
              icon: 'error',
              confirmButtonColor: '#3085d6',
            });
            router.push('/settings');
          } else {
            router.push('/settings?discord_auth=success');
          }
        }
      }
    };

    handleAuthResult();
  }, [router, supabase.auth]);

  return (
    <section
      className={'dark:bg-gray bg-white'}
      suppressHydrationWarning={true}
    >
      <div className="lg:grid lg:min-h-screen lg:grid-cols-12">
        <aside className="relative block h-16 lg:order-last lg:col-span-5 lg:h-full xl:col-span-6">
          <Image
            alt="Pattern"
            src="/auth_banner.jpg"
            className="absolute inset-0 h-full w-full object-cover"
            fill={true}
          />
        </aside>

        <main
          className={`flex items-center justify-center px-8 py-8 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12 xl:col-span-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
        >
          <div className="max-w-xl lg:max-w-3xl">
            <a className="block text-blue-600" href="/">
              <span className="sr-only">Home</span>
              <Image
                src="/bloomicon.jpg"
                alt="banner"
                width={40}
                height={40}
                className="h-10 sm:h-10 w-auto rounded-full"
              />
            </a>
            <h1
              className={`mt-6 text-2xl font-bold sm:text-3xl md:text-4xl ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              Welcome to Bloom 🌱
            </h1>

            <p
              className={`mt-4 leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}
            >
              Your Aristotelian learning companion — here to help you follow
              your curiosity in whatever direction you like.
            </p>
            <div suppressHydrationWarning>
              {formType === 'LOGIN' && (
                <SignIn stateSync={setFormType} handler={login} />
              )}
              {formType === 'SIGNUP' && (
                <SignUp stateSync={setFormType} handler={signup} />
              )}
              {formType === 'FORGOT' && <Forgot stateSync={setFormType} />}
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}
