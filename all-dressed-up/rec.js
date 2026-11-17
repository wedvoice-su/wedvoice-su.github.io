// 드레스 투어 기록 카드 · 녹음 (사이트 안에서 녹음해요. 녹음하는 동안에도 화면을 눌러 적을 수 있어요)
// - 폰 녹음 앱을 켜면 메모를 같이 못 써서, 브라우저 녹음(MediaRecorder)을 써요.
// - 녹음 한 번 = 여러 조각(clip). 드레스를 추가하면 그 자리에서 조각을 나눠서, 조각마다 "어느 드레스 때 녹음인지"가 붙어요.
// - 4초마다 이 기기(IndexedDB)에 바로 써 둬요. 화면이 꺼져서 녹음이 끊겨도 그때까지는 남아요.
// - 녹음 파일은 이 기기에만 있어요. 어디로도 보내지 않아요.
const REC = (() => {
  const DB = "allDressedUp.rec", VER = 1;
  let db = null;
  function idb(){
    if(db) return Promise.resolve(db);
    return new Promise((ok, no) => {
      let r;
      try { r = indexedDB.open(DB, VER); } catch (e) { no(e); return; }
      r.onupgradeneeded = () => {
        const d = r.result;
        if(!d.objectStoreNames.contains("clips")) d.createObjectStore("clips", { keyPath: "id" });
        if(!d.objectStoreNames.contains("chunks")) d.createObjectStore("chunks", { keyPath: ["clip", "i"] });
      };
      r.onsuccess = () => { db = r.result; ok(db); };
      r.onerror = () => no(r.error);
    });
  }
  function tx(store, mode, fn){
    return idb().then(d => new Promise((ok, no) => {
      const t = d.transaction(store, mode), s = t.objectStore(store);
      let out; const res = fn(s); if(res) res.onsuccess = () => { out = res.result; };
      t.oncomplete = () => ok(out); t.onerror = () => no(t.error); t.onabort = () => no(t.error);
    }));
  }
  const putClip = c => tx("clips", "readwrite", s => s.put(c));
  const allClips = () => tx("clips", "readonly", s => s.getAll()).then(a => a || []);
  async function blobOf(id){
    const c = await tx("clips", "readonly", s => s.get(id));
    if(!c) return null;
    const parts = await tx("chunks", "readonly", s => s.getAll(IDBKeyRange.bound([id, 0], [id, Infinity])));
    return new Blob((parts || []).sort((a, b) => a.i - b.i).map(p => p.blob), { type: (c.mime || "audio/mp4").split(";")[0] });
  }
  async function del(id){
    await tx("chunks", "readwrite", s => s.delete(IDBKeyRange.bound([id, 0], [id, Infinity])));
    await tx("clips", "readwrite", s => s.delete(id));
  }

  // ===== 녹음 =====
  let stream = null, mr = null, cur = null, n = 0, wake = null, hooks = {}, ending = null, CLIPS = [];
  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  function pickMime(){
    const L = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm"];
    try { return L.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || ""; } catch (e) { return ""; }
  }
  const extOf = mime => /mp4|aac|m4a/.test(mime || "") ? "m4a" : /webm/.test(mime || "") ? "webm" : /ogg/.test(mime || "") ? "ogg" : "m4a";
  async function keepAwake(){
    try { if("wakeLock" in navigator && !wake && !document.hidden) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch (e) { wake = null; }
  }
  function letSleep(){ try { if(wake) wake.release(); } catch (e) {} wake = null; }
  function newId(){ return "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  function begin(to){
    const mime = pickMime();
    let r;
    try { r = new MediaRecorder(stream, Object.assign(mime ? { mimeType: mime } : {}, { audioBitsPerSecond: 48000 })); }
    catch (e) { r = new MediaRecorder(stream); }
    const c = { id: newId(), shop: to.shop, dress: to.dress || null, at: Date.now(), dur: 0, mime: r.mimeType || mime || "audio/mp4", cut: false, open: true };
    cur = c; mr = r; n = 0;
    CLIPS.push(c); putClip(c).catch(() => {});
    r.ondataavailable = e => {
      if(!e.data || !e.data.size) return;
      const i = n++, now = Date.now();
      c.dur = Math.round((now - c.at) / 1000);
      tx("chunks", "readwrite", s => s.put({ clip: c.id, i, blob: e.data })).catch(() => {});
      putClip(c).catch(() => {});
    };
    r.onerror = () => cutOff();
    r.start(4000);
    hooks.change && hooks.change();
  }
  // 지금 조각을 닫아요 (마지막 4초 조각까지 받은 뒤)
  function close(){
    const r = mr, c = cur;
    mr = null; cur = null;
    if(!r || !c) return Promise.resolve();
    return new Promise(ok => {
      let done = false;
      const fin = () => { if(done) return; done = true; c.open = false; c.dur = Math.max(c.dur, Math.round((Date.now() - c.at) / 1000)); putClip(c).catch(() => {}).then(ok); };
      r.onstop = () => setTimeout(fin, 60);
      try { if(r.state !== "inactive") r.stop(); else fin(); } catch (e) { fin(); }
      setTimeout(fin, 1500);
    });
  }
  async function start(to){
    if(!supported()) throw Object.assign(new Error("support"), { kind: "support" });
    if(!stream || !stream.getAudioTracks().some(t => t.readyState === "live")){
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } }); }
      catch (e) { try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e2) { throw Object.assign(e2, { kind: "perm" }); } }
      stream.getAudioTracks().forEach(t => { t.onended = () => cutOff(); });
    }
    try { if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    keepAwake();
    begin(to);
  }
  // 드레스를 추가하면 조각을 나눠요 (녹음은 끊기지 않게 바로 다음 조각 시작)
  async function split(to){
    if(!mr) return;
    const old = close();
    begin(to);
    await old;
  }
  async function stop(){
    await close();
    if(stream){ stream.getTracks().forEach(t => { t.onended = null; try { t.stop(); } catch (e) {} }); stream = null; }
    letSleep();
    hooks.change && hooks.change();
  }
  // 화면이 꺼지거나 다른 앱으로 가서 마이크가 끊겼을 때
  function cutOff(){
    if(!cur || ending) return;
    const c = cur;
    c.cut = true;
    ending = stop().then(() => { ending = null; hooks.cut && hooks.cut(c); });
  }
  document.addEventListener("visibilitychange", () => {
    if(document.hidden || !mr) return;
    const live = stream && stream.getAudioTracks().some(t => t.readyState === "live");
    if(!live || mr.state === "inactive") cutOff(); else keepAwake();
  });
  window.addEventListener("pagehide", () => { if(mr) try { mr.requestData(); } catch (e) {} });

  // 지난번에 열린 채로 남은 조각(앱이 꺼진 경우) → 끊김으로 닫아요
  const ready = allClips().then(list => {
    CLIPS = list;
    list.filter(c => c.open).forEach(c => { c.open = false; c.cut = true; putClip(c).catch(() => {}); });
    return list;
  }).catch(() => { CLIPS = []; return []; });

  return {
    supported, start, split, stop, ready, blobOf, extOf,
    on(h){ hooks = h || {}; },
    get active(){ return !!mr; },
    get cur(){ return cur; },
    clips(){ return CLIPS.slice(); },
    clipsOf(f){ return CLIPS.filter(f).sort((a, b) => a.at - b.at); },
    async remove(ids){ for(const id of ids){ CLIPS = CLIPS.filter(c => c.id !== id); try { await del(id); } catch (e) {} } },
    // 지울 때 바로 지우지 않고 잠깐 숨겨 둬요 (되돌리기)
    hide(ids){ const out = CLIPS.filter(c => ids.includes(c.id)); CLIPS = CLIPS.filter(c => !ids.includes(c.id)); return out; },
    unhide(list){ CLIPS = CLIPS.concat(list); },
    reset(){ CLIPS = []; }
  };
})();
