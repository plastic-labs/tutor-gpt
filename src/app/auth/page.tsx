'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// import { useTheme } from 'next-themes';

import { useRouter } from 'next/navigation'
import { Forgot, SignIn, SignUp } from '@/components/auth'
import { login, signup } from './actions'

export default function Auth() {
  const [formType, setFormType] = useState('LOGIN')
  const supabase = createClient()
  // const { theme } = useTheme();
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Can't access this page if you're logged in
        router.push('/')
      }
    })
  }, [
    supabase, // Can't access this page if you're logged in
    router.push,
  ])

  return (
    <section
      className="h-[calc(100vh-72px)] w-full bg-background"
      suppressHydrationWarning={true}
    >
      <div className="flex h-full w-full flex-col lg:flex-row">
        <aside className="relative h-48 lg:order-last lg:h-full lg:flex-1">
          <Image
            alt="Pattern"
            src="/auth_banner.jpg"
            className="absolute inset-0 h-full w-full object-cover"
            fill={true}
            priority
          />
        </aside>

        <main
          className={`} flex flex-1 items-center justify-center bg-background' px-4 py-8 sm:px-6 lg:px-8`}
        >
          <div className="w-full max-w-xl">
            <a className="block text-blue-600" href="/">
              <span className="sr-only">Home</span>
              <Image
                src="/bloomicon.jpg"
                alt="banner"
                width={40}
                height={40}
                className="h-10 w-auto rounded-full sm:h-10"
              />
            </a>
            <h1
              className={`mt-6 font-bold text-2xl text-foreground sm:text-3xl md:text-4xl`}
            >
              Welcome to Bloom 🌱
            </h1>

            <p className={`mt-4 text-foreground leading-relaxed`}>
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
  )
}
