export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    if (import.meta.env.DEV) {
      // In development mode, unregister old service workers to prevent cache conflict with Vite
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js?v=41')
        .then((reg) => {
          console.log('Service Worker registered:', reg.scope);
          reg.update();
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New app version detected, reloading page...');
                  window.location.reload();
                }
              };
            }
          };
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    });
  }
};

export default registerServiceWorker;
