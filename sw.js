self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Fix Share Target for Cloudflare Pages + GitHub Pages
self.addEventListener('fetch', e => {
  if (e.request.method === 'POST') {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        let files = fd.getAll('files');
        // Fallback: some browsers send as 'file' or single file
        if (!files.length) {
          const single = fd.get('files') || fd.get('file') || fd.get('image') || fd.get('video');
          if (single) files = [single];
        }
        // Filter only File objects
        files = files.filter(f => f && f instanceof File && f.size > 0);
        if (!files.length) {
          return Response.redirect('./?share=1&empty=1', 303);
        }
        
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
        
        // Clear old cache first
        await new Promise((res, rej) => {
          const tx = db.transaction('filesCache', 'readwrite');
          tx.objectStore('filesCache').clear();
          tx.oncomplete = res;
          tx.onerror = () => rej(tx.error);
        });
        
        // Save new files
        await new Promise((res, rej) => {
          const tx = db.transaction('filesCache', 'readwrite');
          const store = tx.objectStore('filesCache');
          for (const f of files) {
            store.add({ blob: f, name: f.name || 'shared-'+Date.now(), type: f.type });
          }
          tx.oncomplete = res;
          tx.onerror = () => rej(tx.error);
        });
        
        db.close();
        return Response.redirect('./?share=1', 303);
      } catch (err) {
        console.error('Share failed', err);
        return Response.redirect('./?share=1&error=1', 303);
      }
    })());
  }
});
