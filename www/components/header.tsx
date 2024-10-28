'use client';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { DarkModeSwitch } from 'react-toggle-dark-mode';
import { useEffect, useState } from 'react';
import lightBanner from '@/public/bloom2x1.svg';
import darkBanner from '@/public/bloom2x1dark.svg';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleDarkMode = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  if (!mounted) {
    return (
      <header className="sticky top-0 z-10 bg-white shadow dark:bg-gray-800">
        <nav className="flex items-center justify-between p-4">
          <div className="h-10 w-40 animate-pulse bg-gray-200"></div>
          <div className="h-6 w-6 animate-pulse rounded-full bg-gray-200"></div>
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 bg-white shadow dark:bg-gray-800">
      <nav className="flex items-center justify-between p-4">
        <Link href="/" passHref>
          <Image
            src={theme === 'dark' ? darkBanner : lightBanner}
            alt="Bloom Logo"
            className="h-10 w-auto cursor-pointer"
            priority={true}
          />
        </Link>
        <div className="flex items-center justify-between gap-4">
          <DarkModeSwitch
            checked={theme === 'dark'}
            onChange={toggleDarkMode}
            size={24}
          />
        </div>
      </nav>
    </header>
  );
}
