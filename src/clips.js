// Goal clips: records the instant replay (canvas + game audio) into a short video.

const TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
const MAX_W = 1280; // phones render at 2-3x pixel density; clips don't need that

export class ClipRecorder {
  constructor(canvas, audio) {
    this.canvas = canvas;
    this.audio = audio;
    this.clips = [];
    this.rec = null;
    this.mime = typeof MediaRecorder !== 'undefined' ? TYPES.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) : null;
  }

  get supported() { return !!(this.mime && this.canvas.captureStream); }

  start(meta) {
    if (!this.supported || this.rec) return false;
    try {
      // Record from a downscaled copy so phones aren't encoding 4K-ish frames.
      const k = Math.min(1, MAX_W / this.canvas.width);
      const out = (this.out ||= document.createElement('canvas'));
      out.width = Math.round(this.canvas.width * k) & ~1;
      out.height = Math.round(this.canvas.height * k) & ~1;
      this.octx = out.getContext('2d');
      this.frame();
      const stream = out.captureStream(30);
      const dest = this.audio.recordStream && this.audio.recordStream();
      if (dest) for (const t of dest.stream.getAudioTracks()) stream.addTrack(t);
      const chunks = [];
      const rec = new MediaRecorder(stream, { mimeType: this.mime, videoBitsPerSecond: 3_000_000 });
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getVideoTracks().forEach((t) => t.stop());
        if (!chunks.length) return;
        const type = this.mime.split(';')[0];
        const blob = new Blob(chunks, { type });
        this.clips.push({ blob, url: URL.createObjectURL(blob), meta, ext: type.includes('mp4') ? 'mp4' : 'webm' });
        if (this.clips.length > 6) { URL.revokeObjectURL(this.clips[0].url); this.clips.shift(); }
      };
      rec.start(250);
      this.rec = rec;
      return true;
    } catch {
      this.rec = null;
      return false;
    }
  }

  // Called after each rendered frame while recording.
  frame() {
    if (!this.octx) return;
    this.octx.imageSmoothingEnabled = true;
    this.octx.drawImage(this.canvas, 0, 0, this.out.width, this.out.height);
  }

  stop() {
    if (this.rec && this.rec.state !== 'inactive') this.rec.stop();
    this.rec = null;
    this.octx = null;
  }

  clear() {
    this.stop();
    for (const c of this.clips) URL.revokeObjectURL(c.url);
    this.clips = [];
  }

  fileFor(c, i) {
    const who = (c.meta.scorer || 'goal').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return new File([c.blob], `glacial-strikers-${who}-${i + 1}.${c.ext}`, { type: c.blob.type });
  }

  canShare(c) {
    try { return !!(navigator.canShare && navigator.canShare({ files: [this.fileFor(c, 0)] })); } catch { return false; }
  }

  async share(c, i) {
    const file = this.fileFor(c, i);
    await navigator.share({ files: [file], title: 'Glacial Strikers goal', text: c.meta.line || 'Goal!' });
  }
}
