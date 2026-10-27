self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method==='POST'&&u.pathname.endsWith('/share')){
    e.respondWith((async()=>{
      const fd=await e.request.formData();
      const files=fd.getAll('files');
      const db=await new Promise(r=>{const q=indexedDB.open('OmniConvertDB',2);q.onsuccess=()=>r(q.result)});
      const tx=db.transaction('filesCache','readwrite');
      for(const f of files)tx.objectStore('filesCache').add({blob:f,name:f.name,type:f.type});
      await new Promise(r=>tx.oncomplete=r);
      return Response.redirect('/?share=1',303);
    })());
  }
});