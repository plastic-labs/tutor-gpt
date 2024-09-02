'use client'
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import Swal from 'sweetalert2'

export default function Forgot(props: any) {
  const { stateSync } = props
  const [email, setEmail] = useState('')
  const supabase = createClient()

  const handleForgotPassword = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email,
      {
        redirectTo: `${location.origin}/auth/reset`
      }
    );
    if (error) {
      console.error(error);
      Swal.fire({
        title: "Error!",
        text: "Something went wrong",
        icon: "error",
        confirmButtonText: "Close"
      })
      return
    }
    Swal.fire({
      title: "Success!",
      text: "Please check your email for a password reset link",
      icon: "success",
      confirmButtonText: "Close"
    })
  }

  return (
    <form action="#" className="mt-8 grid grid-cols-6 gap-6">

      <div className="col-span-6">
        <label htmlFor="Email" className="block text-sm font-medium text-gray-700">
          Email
        </label>

        <input
          type="email"
          id="Email"
          name="email"
          className="p-2 mt-1 w-full rounded-md border-gray-200 bg-white text-sm text-gray-700 shadow-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="col-span-6 sm:flex sm:items-center sm:gap-4">
        <button
          className="inline-block shrink-0 rounded-md border border-neon-green bg-neon-green px-12 py-3 text-sm font-medium transition hover:bg-transparent hover:text-blue-600 focus:outline-none focus:ring active:text-blue-500"
          onClick={handleForgotPassword}
        >
          Send Recovery Email
        </button>

        <p className="mt-4 text-sm text-gray-500 sm:mt-0">
          Don&apos;t have an account?{' '}
          <a href="#" onClick={() => stateSync("SIGNUP")} className="text-gray-700 underline">Sign up</a>.
        </p>
      </div>
    </form>
  )
}
