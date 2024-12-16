"use client"
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const storedConsent = localStorage.getItem("cookieConsent");
    if (storedConsent !== null) {
      setIsVisible(false);
    }
  }, []);

  const acceptCookies = () => {
    setIsVisible(false);
    localStorage.setItem("cookieConsent", JSON.stringify(true));
    // TODO: Log file or sentry record
    // onAccept();
  };

  const declineCookies = () => {
    router.push("https://bloombot.ai");
    // setIsVisible(false);
    // localStorage.setItem("cookieConsent", JSON.stringify(false));
    // Log file or sentry record
    // onDecline();
  };

  const closeBanner = () => {
    setIsVisible(false);
    // TODO: Log file or sentry record
    // onDecline();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center items-center p-4 z-50">
      <div className="w-full md:w-[70%] bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold dark:text-white">
            We Value Your Privacy
          </h3>
          <button
            onClick={closeBanner}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm dark:text-white mb-4">
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
            className="bg-neon-green text-black px-4 py-2 rounded w-full"
          >
            Accept All
          </button>
          <button
            onClick={declineCookies}
            className="bg-gray-300 dark:bg-gray-600 text-black dark:text-white px-4 py-2 rounded w-full"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
