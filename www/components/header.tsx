'use client';
// import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { DarkModeSwitch } from 'react-toggle-dark-mode';
import { useEffect, useState } from 'react';
import bloomIcon from '@/public/bloom_icon_large.jpg';
import { departureMono } from '@/utils/fonts';
// import lightBanner from '@/public/bloom2x1.svg';
// import darkBanner from '@/public/bloom2x1dark.svg';

export function Header() {
  // const { theme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = (checked: boolean) => {
    document.documentElement.classList.toggle('dark');
    setIsDark(checked);
  };

  if (!mounted) {
    return (
      <header className="sticky top-0 z-10 bg-background border-b border-gray-200 dark:border-gray-700">
        <nav className="flex justify-between items-center p-4">
          <div className="h-10 w-40 bg-gray-200 animate-pulse"></div>
          <div className="h-6 w-6 bg-gray-200 animate-pulse rounded-full"></div>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 bg-background border-b border-gray-200 dark:border-gray-700">
      <nav className="flex justify-between items-center p-4">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <Image
            src={bloomIcon}
            alt="Bloom Logo"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span
            className={`text-foreground text-xl font-departure ${departureMono.className}`}
          >
            BLOOM
          </span>
        </Link>
        <div className="flex justify-between items-center gap-4">
          <DarkModeSwitch
            checked={isDark}
            onChange={toggleDarkMode}
            size={24}
          />
        </div>
      </nav>
    </header>
  );
}
