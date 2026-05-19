self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(c => c.navigate(c.url));
  });
});
