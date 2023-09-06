'use client'
import { createClient } from "@supabase/supabase-js"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState } from "react";
import { useRouter } from "next/navigation";


export default function Auth() {
  const [formType, setFormType] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient()

  const switchForm = () => {
    if (formType === 'signIn') {
      setFormType('signUp');
    } else if (formType === 'signUp') {
      setFormType('forgot');
    } else {
      setFormType('signIn');
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error(error);
      console.log(email)
      console.log(password)
      throw error;
    }
    router.push("/")
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error(error);
    } else {
      alert("Please check your email and verify")
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) console.error(error);
  }

  return (
    <div className="h-[100dvh] flex flex-col justify-center items-center">
      <div className="p-4 bg-white rounded shadow-md">
        <h3 className="text-lg font-semibold mb-4">Welcome to Bloom 🌸</h3>
        {formType === 'signIn' && (
          <form>
            <input className="border p-2 mb-4 w-full" type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="border p-2 mb-4 w-full" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="bg-neon-green text-black p-2 w-full rounded" onClick={handleSignIn}>Sign In</button>
          </form>
        )}
        {formType === 'signUp' && (
          <form>
            <input className="border p-2 mb-4 w-full" type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="border p-2 mb-4 w-full" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="bg-neon-green text-black p-2 w-full rounded" onClick={handleSignUp}>Sign Up</button>
          </form>
        )}
        {formType === 'forgot' && (
          <form>
            <input className="border p-2 mb-4 w-full" type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="bg-neon-green text-black p-2 w-full rounded" onClick={handleForgotPassword}>Reset Password</button>
          </form>
        )}
        <div className="flex flex-col pt-5 items-center">
          {formType !== 'signIn' && (
            <span className="text-blue-500 cursor-pointer mb-2" onClick={() => setFormType('signIn')}>Sign In</span>
          )}
          {formType !== 'signUp' && (
            <span className="text-blue-500 cursor-pointer mb-2" onClick={() => setFormType('signUp')}>Sign Up</span>
          )}
          {formType !== 'forgot' && (
            <span className="text-blue-500 cursor-pointer mb-2" onClick={() => setFormType('forgot')}>Forgot Password</span>
          )}
        </div>
      </div>
    </div>
  )
}
