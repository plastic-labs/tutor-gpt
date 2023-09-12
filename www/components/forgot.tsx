export default function Forgot(props: any) {    
    const { handler, stateSync } = props
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
                    className="p-2 mt-1 w-full rounded-md border-gray-200 bg-white text-sm text-gray-700 shadow-sm"
                />
            </div>

            <div className="col-span-6 sm:flex sm:items-center sm:gap-4">
                <button
                    className="inline-block shrink-0 rounded-md border border-neon-green bg-neon-green px-12 py-3 text-sm font-medium transition hover:bg-transparent hover:text-blue-600 focus:outline-none focus:ring active:text-blue-500"
                    onClick={handler}
                >
                    Recover
                </button>

                <p className="mt-4 text-sm text-gray-500 sm:mt-0">
                    Don't have an account?{' '}
                    <a href="#" onClick={() => stateSync("signUp")} className="text-gray-700 underline">Sign up</a>.
                </p>
            </div>
        </form>
    )
}