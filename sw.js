self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Share target handler - work for both /share and root POST (GitHub Pages subpath fix)
self.addEventListener('fetch', e => {
  if (e.request.method === 'POST') {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const files = fd.getAll('files');
        if (!files.length) return Response.redirect('./?share=1', 303);
        
        const db = await new Promise((res, rej) => {
          const q = indexedDB.open('OmniConvertDB', 2);
          q.onsuccess = () => res(q.result);
          q.onerror = () => rej(q.error);
          q.onupgradeneeded = () => {
            const d = q.result;
            if (!d.objectStoreNames.contains('history')) d.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
            if (!d.objectStoreNames.contains('promptHistory')) d.createObjectStore('promptHistory', { keyPath: 'id', autoIncrement: true });
            if (!d.objectStoreNames.contains('filesCache')) d.createObjectStore('filesCache', { keyPath: 'id', autoIncrement: true });
            if (!d.objectStoreNames.contains('results')) d.createObjectStore('results', { keyPath: 'id' });
          };
        });
        const tx = db.transaction('filesCache', 'readwrite');
        for (const f of files) tx.objectStore('filesCache').add({ blob: f, name: f.name, type: f.type });
        await new Promise(r => tx.oncomplete = r);
        return Response.redirect('./?share=1', 303);
      } catch (err) {
        return Response.redirect('./?share=1', 303);
      }
    })());
  }
});
