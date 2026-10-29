// Screen orientation locking utility for web and mobile browsers

export async function requestAutoLandscape() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Try Screen Orientation API lock directly if supported
    const orientation = window.screen?.orientation as any;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape').catch(() => {
        return orientation.lock('landscape-primary').catch(() => {});
      });
    }
  } catch {}

  // 2. Many mobile browsers require entering fullscreen first before locking orientation
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
      const orientation = window.screen?.orientation as any;
      if (orientation && typeof orientation.lock === 'function') {
        await orientation.lock('landscape').catch(() => {});
      }
    }
  } catch {}
}

export function setupAutoLandscapeOnFirstTouch() {
  if (typeof window === 'undefined') return () => {};

  const handleFirstInteraction = () => {
    requestAutoLandscape();
    window.removeEventListener('pointerdown', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
  };

  window.addEventListener('pointerdown', handleFirstInteraction, { passive: true, once: true });
  window.addEventListener('touchstart', handleFirstInteraction, { passive: true, once: true });

  // Also attempt immediately in case permissions are already granted (like in PWA or WebView)
  requestAutoLandscape();

  return () => {
    window.removeEventListener('pointerdown', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
  };
}
