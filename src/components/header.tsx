'use client'
// import { useTheme } from 'next-themes';
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DarkModeSwitch } from 'react-toggle-dark-mode'
import bloomIcon from '@/public/bloom_icon_large.jpg'
import { departureMono } from '@/utils/fonts'
// import lightBanner from '@/public/bloom2x1.svg';
// import darkBanner from '@/public/bloom2x1dark.svg';

export function Header() {
  // const { theme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleDarkMode = (checked: boolean) => {
    document.documentElement.classList.toggle('dark')
    setIsDark(checked)
  }

  if (!mounted) {
    return (
      <header className="border-gray-200 border-b bg-background dark:border-gray-700">
        <nav className="flex items-center justify-between p-4">
          <div className="h-10 w-40 animate-pulse bg-gray-200"></div>
          <div className="h-6 w-6 animate-pulse rounded-full bg-gray-200"></div>
        </nav>
      </header>
    )
  }

  return (
    <header className="border-gray-200 border-b bg-background dark:border-gray-700">
      <nav className="flex items-center justify-between p-4">
        <Link href="/" className="flex cursor-pointer items-center gap-2">
          <Image
            src={bloomIcon}
            alt="Bloom Logo"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span
            className={`font-departure text-foreground text-xl ${departureMono.className}`}
          >
            BLOOM
          </span>
        </Link>
        <div className="flex items-center justify-between gap-4">
          <DarkModeSwitch
            checked={isDark}
            onChange={toggleDarkMode}
            size={24}
          />
        </div>
      </nav>
    </header>
  )
}
