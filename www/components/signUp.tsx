import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUp(props: any) {    
    const { stateSync } = props
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const supabase = createClientComponentClient()
    
    const handleSignUp = async (e: any) => {
        e.preventDefault();
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
        console.error(error);
        } else {
        alert("Please check your email and verify")
        }
    };

    return (
        <form action="#" className="mt-8 grid grid-cols-6 gap-6">
            <div className="col-span-6 sm:col-span-3">
                <label
                    htmlFor="FirstName"
                    className="block text-sm font-medium text-gray-700"
                >
                    First Name
                </label>

                <input
                    type="text"
                    id="FirstName"
                    name="first_name"
                    className="p-2 mt-1 w-full rounded-md border-gray-200 bg-white text-sm text-gray-700 shadow-sm"
                />
            </div>

            <div className="col-span-6 sm:col-span-3">
                <label
                    htmlFor="LastName"
                    className="block text-sm font-medium text-gray-700"
                >
                    Last Name
                </label>

                <input
                    type="text"
                    id="LastName"
                    name="last_name"
                    className="p-2 mt-1 w-full rounded-md border-gray-200 bg-white text-sm text-gray-700 shadow-sm"
                />
            </div>

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
                />
            </div>

            <div className="col-span-6">
                <label htmlFor="MarketingAccept" className="flex gap-4">
                    <input
                        type="checkbox"
                        id="MarketingAccept"
                        name="marketing_accept"
                        className="h-5 w-5 rounded-md border-gray-200 bg-white shadow-sm"
                    />

                    <span className="text-sm text-gray-700">
                        I want to receive emails about events, product updates and
                        company announcements.
                    </span>
                </label>
            </div>

            <div className="col-span-6">
                <p className="text-sm text-gray-500">
                    By creating an account, you agree to our{' '}
                    <a href="#" className="text-gray-700 underline">
                        {' '}terms and conditions
                    </a>
                    {' '}and{' '}
                    <a href="#" className="text-gray-700 underline">privacy policy</a>.
                </p>
            </div>

            <div className="col-span-6 sm:flex sm:items-center sm:gap-4">
                <button
                    className="inline-block shrink-0 rounded-md border border-neon-green bg-neon-green px-12 py-3 text-sm font-medium transition hover:bg-transparent hover:text-blue-600 focus:outline-none focus:ring active:text-blue-500"
                    onClick={handleSignUp}
                >
                    Create an account
                </button>

                <p className="mt-4 text-sm text-gray-500 sm:mt-0">
                    Already have an account?{' '}
                    <a href="#" onClick={() => { console.log("help");stateSync("signIn");}} className="text-gray-700 underline">Log in</a>.
                </p>
            </div>
        </form>
    )
}