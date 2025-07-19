'use client'
import { useTheme } from 'next-themes'
import { useRef, useState } from 'react'
import Swal from 'sweetalert2'
import DiscordSignIn from './discord'
import GoogleSignIn from './google'

export default function SignUp(props: {
  stateSync: (state: string) => void
  handler: (formData: FormData) => Promise<any>
}) {
  const { stateSync, handler } = props
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [opt, setOpt] = useState<boolean>(true)
  const [age, setAge] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!formRef.current) return
    setIsLoading(true)
    try {
      const formData = new FormData(formRef.current)
      if (!age) {
        await Swal.fire({
          title: 'Age Verification Required',
          icon: 'error',
          text: 'Please confirm that you are 13 years or older',
          confirmButtonText: 'Close',
          confirmButtonColor: '#3085d6',
        })
        return
      }
      if (password !== passwordConfirmation) {
        await Swal.fire({
          title: "Passwords don't match",
          icon: 'error',
          text: 'Re-confirm your password and try again',
          confirmButtonText: 'Close',
          confirmButtonColor: '#3085d6',
        })
        return
      }
      if (password.length < 6) {
        await Swal.fire({
          title: 'Insufficient Password',
          icon: 'error',
          text: 'Make sure the password is at least 6 characters long',
          confirmButtonText: 'Close',
          confirmButtonColor: '#3085d6',
        })
        return
      }

      const error = await handler(formData)
      if (error) {
        Swal.fire({
          title: 'Something went wrong',
          icon: 'error',
          text: 'Please try again and make sure the password is at least 6 characters long',
          confirmButtonText: 'Close',
          confirmButtonColor: '#3085d6',
        })
        console.error(error)
      } else {
        Swal.fire({
          title: 'Success',
          icon: 'success',
          text: 'Please check your email for a verification link',
          confirmButtonText: 'Close',
          confirmButtonColor: '#3085d6',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <form
        action="#"
        ref={formRef}
        onSubmit={handleSignUp}
        className={`mt-8 space-y-6 text-foreground`}
      >
        <div>
          <label htmlFor="Email" className={`block font-medium text-sm`}>
            Email
          </label>

          <input
            type="email"
            id="Email"
            name="email"
            className={`mt-1 w-full rounded-md bg-accent p-2 text-foreground text-sm shadow-xs`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex-1">
            <label
              htmlFor="Password"
              className={`block font-medium text-foreground text-sm`}
            >
              Password
            </label>

            <input
              type="password"
              id="Password"
              name="password"
              className={`mt-1 w-full rounded-md bg-accent p-2 text-foreground text-sm shadow-xs`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="PasswordConfirmation"
              className={`block font-medium text-foreground text-sm`}
            >
              Password Confirmation
            </label>

            <input
              type="password"
              id="PasswordConfirmation"
              name="password_confirmation"
              className={`mt-1 w-full rounded-md bg-accent p-2 text-foreground text-sm shadow-xs`}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="MarketingAccept" className="flex gap-4">
            <input
              type="checkbox"
              id="MarketingAccept"
              name="marketing_accept"
              className={`h-5 w-5 rounded-md bg-accent shadow-xs`}
              checked={opt}
              onChange={(_e) => setOpt(!opt)}
            />

            <span className={`text-foreground text-sm`}>
              I want to receive emails about events, product updates and company
              announcements.
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="AgeAccept" className="flex gap-4">
            <input
              type="checkbox"
              id="AgeAccept"
              name="age_accept"
              className={`h-5 w-5 rounded-md bg-accent shadow-xs`}
              checked={age}
              onChange={(_e) => setAge(!age)}
              required
            />

            <span className={`text-foreground text-sm`}>
              I am confirming that I am at least 13 years old.
            </span>
          </label>
        </div>

        <div>
          <p className={`text-foreground text-sm`}>
            By creating an account, you agree to our{' '}
            <a
              href="https://app.termly.io/document/terms-of-service/ba5ac452-fdd6-4746-8b31-973351d05008"
              target="_blank"
              className={`text-foreground underline`}
              rel="noreferrer"
            >
              Terms and Conditions
            </a>{' '}
            and{' '}
            <a
              href="https://app.termly.io/document/privacy-policy/29672110-b634-40ae-854d-ebaf55e8fa75"
              target="_blank"
              className={`text-foreground underline`}
              rel="noreferrer"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>

        <div className="sm:flex sm:items-center sm:gap-4">
          <button
            className={`inline-block w-full shrink-0 rounded-md border px-12 py-3 font-medium text-gray-800 text-sm transition focus:outline-hidden focus:ring-3 sm:w-auto ${
              theme === 'dark'
                ? 'border-neon-green bg-neon-green hover:bg-transparent hover:text-neon-green'
                : 'border-neon-green bg-neon-green hover:bg-transparent hover:text-blue-600'
            }`}
          >
            {isLoading ? (
              <svg className="mx-auto h-5 w-5 animate-spin" viewBox="0 0 24 24">
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
              'Create an account'
            )}
          </button>

          <p
            className={`mt-4 text-center text-foreground text-sm sm:mt-0 sm:text-left`}
          >
            Already have an account?{' '}
            <a
              href="#"
              onClick={() => stateSync('LOGIN')}
              className={`text-foreground underline`}
            >
              Log in
            </a>
          </p>
        </div>
      </form>
      <div className="mt-6 space-y-4">
        <GoogleSignIn text="Sign Up" />
        <DiscordSignIn text="Sign Up" />
      </div>
    </>
  )
}
