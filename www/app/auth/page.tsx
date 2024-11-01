'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

import { SignIn, SignUp, Forgot } from '@/components/auth';

import { login, signup } from './actions';
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

  return (
    <section
      className={'dark:bg-gray bg-white overflow-y-auto'}
      suppressHydrationWarning={true}
    >
      <div className="flex flex-col lg:flex-row min-h-screen w-full">
        {/*<aside className="relative block h-16 lg:order-last lg:col-span-5 lg:h-full xl:col-span-6">*/}
        <aside className="relative h-24 lg:h-auto lg:flex-1 lg:order-last">
          <Image
            alt="Pattern"
            src="/auth_banner.jpg"
            className="absolute inset-0 h-full w-full object-cover"
            fill={true}
          />
        </aside>

        {/*
        <main
          className={`flex items-center justify-center px-8 py-8 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12 xl:col-span-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
        >*/}
        <main className={`flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
          <div className="w-full max-w-xl">
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
