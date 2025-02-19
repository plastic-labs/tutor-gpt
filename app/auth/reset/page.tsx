'use client';

import Image from 'next/image';
import icon from '@/public/bloomicon.jpg';
import Reset from '@/components/auth/reset';

export default function ResetPage() {
  return (
    <section className="h-[calc(100vh-72px)] w-full bg-background">
      <div className="flex flex-col lg:flex-row h-full w-full">
        <aside className="h-48 lg:h-full lg:flex-1 lg:order-last relative">
          <Image
            alt="Pattern"
            src="/auth_banner.jpg"
            className="absolute inset-0 h-full w-full object-cover"
            fill={true}
            priority
          />
        </aside>

        <main
          className={`flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 bg-background'
            }`}
        >
          <div className="w-full max-w-xl">
            <a className="block text-blue-600" href="/">
              <span className="sr-only">Home</span>
              <Image
                src="/bloomicon.jpg"
                alt="banner"
                width={40}
                height={40}
                className="h-10 sm:h-10 w-auto rounded-full"
              />
            </a>

            <h1
              className={`mt-6 text-2xl font-bold sm:text-3xl md:text-4xl text-foreground`}
            >
              Welcome to Bloom 🌱
            </h1>

            <p className="mt-4 leading-relaxed text-foreground">
              Your Aristotelian learning companion — here to help you follow
              your curiosity in whatever direction you like.
            </p>
            <Reset />
          </div>
        </main>
      </div>
    </section>
  );
}
