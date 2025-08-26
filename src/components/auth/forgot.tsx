'use client'
import { useState } from 'react'
import Swal from 'sweetalert2'
import { createClient } from '@/utils/supabase/client'

export default function Forgot(props: any) {
  const { stateSync } = props
  const [email, setEmail] = useState('')
  const supabase = createClient()

  const handleForgotPassword = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset`,
    })
    if (error) {
      console.error(error)
      Swal.fire({
        title: 'Error!',
        text: 'Something went wrong',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Close',
      })
      return
    }
    Swal.fire({
      title: 'Success!',
      text: 'Please check your email for a password reset link',
      icon: 'success',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'Close',
    })
  }

  return (
    <form action="#" className="mt-8 space-y-6 text-foreground">
      <div>
        <label htmlFor="Email" className="block font-medium text-sm">
          Email
        </label>

        <input
          type="email"
          id="Email"
          name="email"
          className="mt-1 w-full rounded-md border-gray-200 bg-accent p-2 text-foreground text-sm shadow-xs"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="sm:flex sm:items-center sm:gap-4">
        <button
          className="inline-block w-full shrink-0 rounded-md border bg-accent px-12 py-3 font-medium text-black text-sm transition hover:border-neon-green hover:bg-neon-green focus:outline-hidden focus:ring-3 sm:w-auto dark:border-neon-green dark:bg-neon-green dark:hover:bg-transparent dark:hover:text-neon-green"
          onClick={handleForgotPassword}
        >
          Send Recovery Email
        </button>

        <p className="mt-4 text-foreground text-sm sm:mt-0">
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
  )
}
