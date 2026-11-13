// 작은 사진(긴 변 400px) + 비슷한 사진 찾기용 지문(16×16 색) 만들기 — 화면과 따로 도는 일꾼(Worker)
// 받는 것: { id, file, max, sw, sh }  (sw·sh = 원본 가로·세로, 모르면 0)
// 보내는 것: { id, blob, w, h, sig } 또는 { id, error }
self.onmessage = async (e) => {
  const { id, file, max, sw, sh } = e.data;
  try {
    if(typeof OffscreenCanvas === "undefined") throw new Error("nooffscreen");
    // 브라우저가 줄이면서 풀게 해요(빠르고 메모리를 덜 써요). 한쪽 길이만 줘서 비율은 그대로.
    const rw = sw && sh && sh > sw ? Math.max(1, Math.round(max * sw / sh)) : max;
    let bm;
    try { bm = await createImageBitmap(file, { resizeWidth: rw, resizeQuality: "medium", imageOrientation: "from-image" }); }
    catch (err) { bm = await createImageBitmap(file); }
    const s = Math.min(1, max / Math.max(bm.width, bm.height));
    const w = Math.max(1, Math.round(bm.width * s)), h = Math.max(1, Math.round(bm.height * s));
    const c = new OffscreenCanvas(w, h), x = c.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(bm, 0, 0, w, h);
    if(bm.close) bm.close();
    const blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.82 });
    const sc = new OffscreenCanvas(16, 16), sx = sc.getContext("2d", { willReadFrequently: true });
    sx.imageSmoothingQuality = "medium";
    sx.drawImage(c, 0, 0, 16, 16);
    const d = sx.getImageData(0, 0, 16, 16).data, sig = new Uint8Array(768);
    for(let i = 0, j = 0; i < d.length; i += 4){ sig[j++] = d[i]; sig[j++] = d[i + 1]; sig[j++] = d[i + 2]; }
    self.postMessage({ id, blob, w, h, sig }, [sig.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
