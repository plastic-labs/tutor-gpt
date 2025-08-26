'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState<boolean>(true)
  const router = useRouter()

  useEffect(() => {
    const storedConsent = localStorage.getItem('cookieConsent')
    if (storedConsent !== null) {
      setIsVisible(false)
    }
  }, [])

  const acceptCookies = () => {
    setIsVisible(false)
    localStorage.setItem('cookieConsent', JSON.stringify(true))
    // TODO: Log file or sentry record
    // onAccept();
  }

  const declineCookies = () => {
    router.push('https://bloombot.ai')
    // setIsVisible(false);
    // localStorage.setItem("cookieConsent", JSON.stringify(false));
    // Log file or sentry record
    // onDecline();
  }

  const closeBanner = () => {
    setIsVisible(false)
    // TODO: Log file or sentry record
    // onDecline();
  }

  if (!isVisible) return null

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 flex items-center justify-center p-4">
      <div className="w-full rounded-lg bg-gray-100 p-4 shadow-lg md:w-[70%] dark:bg-gray-800">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-semibold text-lg dark:text-white">
            We Value Your Privacy
          </h3>
          <button
            onClick={closeBanner}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <p className="mb-4 text-sm dark:text-white">
          {`We use cookies to create the Bloom experience. These cookies are essential for our website to function properly and help us analyze how you interact with our services. By clicking "Accept All," you consent to our use of cookies. `}
          <a
            href="https://app.termly.io/policy-viewer/policy.html?policyUUID=028f5251-5858-4799-bffa-26a9709b3fed"
            className="text-blue-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cookie Policy
          </a>
        </p>
        <div className="flex flex-row gap-2">
          <button
            onClick={acceptCookies}
            className="w-full rounded bg-neon-green px-4 py-2 text-black"
          >
            Accept All
          </button>
          <button
            onClick={declineCookies}
            className="w-full rounded bg-gray-300 px-4 py-2 text-black dark:bg-gray-600 dark:text-white"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
