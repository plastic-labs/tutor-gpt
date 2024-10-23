'use client';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { DarkModeSwitch } from 'react-toggle-dark-mode';
import banner from '@/public/bloom2x1.svg';
import darkBanner from '@/public/bloom2x1dark.svg';

export function Header() {
  const { theme, setTheme } = useTheme();

  const toggleDarkMode = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow">
      <nav className="flex justify-between items-center p-4">
        <Link href="/" passHref>
          <Image
            src={theme === 'dark' ? darkBanner : banner}
            alt="banner"
            className="h-10 w-auto cursor-pointer"
          />
        </Link>
        <div className="flex justify-between items-center gap-4">
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
