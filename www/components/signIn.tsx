import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from 'sweetalert2'

export default function SignIn(props: any) {
  const { stateSync } = props
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false)

  const router = useRouter();
  const supabase = createClientComponentClient()

  const handleSignIn = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(true)
      Swal.fire({
        title: 'Error!',
        text: 'Incorrect Credentials',
        icon: 'error',
        confirmButtonText: 'Close'
      })
      // throw error;
    } else {
      router.push("/")
    }
  };

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
          className={`p-2 mt-1 w-full rounded-md bg-white text-sm text-gray-700 shadow-sm ${error ? 'border-2 border-red-500' : 'border-gray-200'}`}
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="col-span-6">
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
          className={`p-2 mt-1 w-full rounded-md bg-white text-sm text-gray-700 shadow-sm ${error ? 'border-2 border-red-500' : 'border-gray-200'}`}

          value={password} onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="col-span-6 sm:flex sm:items-center sm:gap-3">
        <button
          className="inline-block shrink-0 rounded-md border border-neon-green bg-neon-green px-12 py-3 text-sm font-medium transition hover:bg-transparent hover:text-blue-600 focus:outline-none focus:ring active:text-blue-500"
          onClick={handleSignIn}
        >
          Login
        </button>

        <p className="mt-4 text-sm text-gray-500 sm:mt-0">
          Don&apos;t have an account?{' '}
          <a href="#" onClick={() => stateSync("SIGNUP")} className="text-gray-700 underline">Sign Up Now</a>.
        </p>
        <p className="mt-4 text-sm text-gray-500 sm:mt-0">
          Forgot Your Password?{' '}
          <a href="#" onClick={() => stateSync("FORGOT")} className="text-gray-700 underline">Recover</a>.
        </p>
      </div>
    </form>
  )
}
