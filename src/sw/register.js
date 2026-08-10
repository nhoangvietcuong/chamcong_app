export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js?v=38')
        .then((reg) => {
          console.log('Service Worker registered v12:', reg.scope);
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
