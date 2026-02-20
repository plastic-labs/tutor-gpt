import { useUIStore } from '../../src/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUIStore.setState({
      sidebarOpen: true,
      isMobile: false,
      darkMode: false,
    });
  });

  it('has correct initial defaults', () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(typeof state.isMobile).toBe('boolean');
    expect(typeof state.darkMode).toBe('boolean');
  });

  it('toggleSidebar flips sidebarOpen', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('setDarkMode updates darkMode', () => {
    useUIStore.getState().setDarkMode(true);
    expect(useUIStore.getState().darkMode).toBe(true);

    useUIStore.getState().setDarkMode(false);
    expect(useUIStore.getState().darkMode).toBe(false);
  });

  it('setIsMobile updates isMobile and adjusts sidebar', () => {
    useUIStore.getState().setIsMobile(true);
    expect(useUIStore.getState().isMobile).toBe(true);
    // On mobile, sidebar should close
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().setIsMobile(false);
    expect(useUIStore.getState().isMobile).toBe(false);
    // On desktop, sidebar should open
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });
});
