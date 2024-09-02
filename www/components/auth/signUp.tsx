'use client';
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

import Swal from 'sweetalert2'

export default function SignUp(props: any) {
  const { stateSync, handler } = props
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [opt, setOpt] = useState<boolean>(true)
  const [age, setAge] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;
    setIsLoading(true)
    try {
      const formData = new FormData(formRef.current);
      if (!age) {
      await Swal.fire({
        title: "Age Verification Required",
        icon: 'error',
        text: 'Please confirm that you are 13 years or older',
        confirmButtonText: 'Close',
        confirmButtonColor: "#3085d6",
      })
      return
    }
    console.log(password, passwordConfirmation)
    if (password !== passwordConfirmation) {
      await Swal.fire({
        title: "Passwords don't match",
        icon: 'error',
        text: 'Re-confirm you password and try again',
        confirmButtonText: 'Close',
        confirmButtonColor: "#3085d6",
      })
      return
    }
    if (password.length < 6) {
      await Swal.fire({
        title: "Insufficient Password",
        icon: 'error',
        text: 'Make sure the password is atleast 6 characters long',
        confirmButtonText: 'Close',
        confirmButtonColor: "#3085d6",
      })
      return
    }

    const error = await handler(formData);
    if (error) {
      Swal.fire({
        title: "Something went wrong",
        icon: "error",
        text: "Please try again and make sure the password is atleast 6 characters long",
        confirmButtonText: 'Close',
        confirmButtonColor: "#3085d6",
      })
      console.error(error);
    } else {
      Swal.fire({
        title: "Success",
        icon: "success",
        text: "Please check your email for a verification link",
        confirmButtonText: 'Close',
        confirmButtonColor: "#3085d6",
      })
    }
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <form action="#" ref={formRef} onSubmit={handleSignUp} className="mt-8 grid grid-cols-6 gap-6">

      <div className="col-span-6">
        <label htmlFor="Email" className="block text-sm font-medium text-gray-700">
          Email
        </label>

        <input
          type="email"
          id="Email"
          name="email"
          className="p-2 mt-1 w-full rounded-md border-gray-200 bg-white text-sm text-gray-700 shadow-sm"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="col-span-6 sm:col-span-3">
        <label
          htmlFor="Password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>

        <input
          type="password"
          id="Password"
          name="password"
          className="p-2 mt-1 w-full rounded-md border-gray-200 bg-white text-sm text-gray-700 shadow-sm"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="col-span-6 sm:col-span-3">
        <label
          htmlFor="PasswordConfirmation"
          className="block text-sm font-medium text-gray-700"
        >
          Password Confirmation
        </label>

        <input
          type="password"
          id="PasswordConfirmation"
          name="password_confirmation"
          className="p-2 mt-1 w-full rounded-md border-gray-200 bg-white text-sm text-gray-700 shadow-sm"
          value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)}
        />
      </div>

      <div className="col-span-6">
        <label htmlFor="MarketingAccept" className="flex gap-4">
          <input
            type="checkbox"
            id="MarketingAccept"
            name="marketing_accept"
            className="h-5 w-5 rounded-md border-gray-200 bg-white shadow-sm"
            checked={opt}
            onChange={(e) => setOpt(!opt)}
          />

          <span className="text-sm text-gray-700">
            I want to receive emails about events, product updates and
            company announcements.
          </span>
        </label>
      </div>

      <div className="col-span-6">
        <label htmlFor="AgeAccept" className="flex gap-4">
          <input
            type="checkbox"
            id="MarketingAccept"
            name="marketing_accept"
            className="h-5 w-5 rounded-md border-gray-200 bg-white shadow-sm"
            checked={age}
            onChange={(e) => setAge(!age)}
            required
          />

          <span className="text-sm text-gray-700">
            I am confirming that I am atleast 13 years old.
          </span>
        </label>
      </div>


      <div className="col-span-6">
        <p className="text-sm text-gray-500">
          By creating an account, you agree to our{' '}
          <a href="https://app.termly.io/document/terms-of-service/ba5ac452-fdd6-4746-8b31-973351d05008" target="_blank" className="text-gray-700 underline">
            Terms and Conditions
          </a>
          {' '}and{' '}
          <a href="https://app.termly.io/document/privacy-policy/29672110-b634-40ae-854d-ebaf55e8fa75" target="_blank" className="text-gray-700 underline">Privacy Policy</a>.
        </p>
      </div>

      <div className="col-span-6 sm:flex sm:items-center sm:gap-4">
        <button
          className="inline-block shrink-0 rounded-md border border-neon-green bg-neon-green px-12 py-3 text-sm font-medium transition hover:bg-transparent hover:text-blue-600 focus:outline-none focus:ring active:text-blue-500"
        >
          {isLoading ? (  
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Create an account'}
        </button>

        <p className="mt-4 text-sm text-gray-500 sm:mt-0">
          Already have an account?{' '}
          <a href="#" onClick={() => stateSync("LOGIN")} className="text-gray-700 underline">Log in</a>.
        </p>
      </div>
    </form>
  )
}
