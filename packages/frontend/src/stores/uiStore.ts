import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  isMobile: boolean;
  darkMode: boolean;

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setIsMobile: (isMobile: boolean) => void;
  setDarkMode: (dark: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  darkMode:
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setIsMobile: (isMobile) =>
    set({ isMobile, sidebarOpen: isMobile ? false : true }),
  setDarkMode: (dark) => {
    set({ darkMode: dark });
    document.documentElement.classList.toggle('dark', dark);
  },
}));
