// Footsteps, background music and the Mixer that holds their shared volume and mute switch.
// Browsers only allow sound after a click or key press, so unlock() is called on the first one (main.js).
const SOUND_KEY = 'museum-sound';
const VOLUME_KEY = 'museum-volume';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// volume (0 to 1) and mute, both saved in localStorage
export class Mixer {
  constructor() {
    this.volume = 0.7;
    this.listeners = new Set();
    try {
      this.on = localStorage.getItem(SOUND_KEY) !== 'off';
      const saved = parseFloat(localStorage.getItem(VOLUME_KEY));
      if (saved >= 0 && saved <= 1) this.volume = saved;
    } catch { this.on = true; }
  }

  save(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
  }

  setVolume(v) {
    this.volume = clamp01(v);
    this.save(VOLUME_KEY, String(this.volume));
    this.listeners.forEach((fn) => fn());
  }

  toggle() {
    this.on = !this.on;
    this.save(SOUND_KEY, this.on ? 'on' : 'off');
    this.listeners.forEach((fn) => fn());
    return this.on;
  }

  onChange(fn) {
    this.listeners.add(fn);
  }

  get audible() {
    return this.on && this.volume > 0;
  }
}

// Plays assets/audio/step.ogg, with a synthesized step as the fallback (Safari can't decode Ogg Vorbis).
export class Footsteps {
  constructor(url, mixer) {
    this.url = url;
    this.mixer = mixer;
    this.ctx = null;
    this.buffer = null;
  }

  get on() {
    return this.mixer.on;
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.load();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  async load() {
    try {
      const data = await (await fetch(this.url)).arrayBuffer();
      this.buffer = await this.ctx.decodeAudioData(data);
    } catch {
      this.buffer = this.synthesize();
    }
  }

  // short low-passed noise burst, like a soft sole
  synthesize() {
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.floor(rate * 0.14), rate);
    const data = buffer.getChannelData(0);
    let low = 0;
    for (let i = 0; i < data.length; i++) {
      low += ((Math.random() * 2 - 1) - low) * 0.12;
      data[i] = low * Math.exp(-i / (rate * 0.03)) * 2.2;
    }
    return buffer;
  }

  toggle() {
    return this.mixer.toggle();
  }

  // running is louder, pitch varies slightly per step
  step(running = false) {
    if (!this.mixer.audible || !this.buffer || this.ctx?.state !== 'running') return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = 0.92 + Math.random() * 0.16;
    const gain = this.ctx.createGain();
    gain.gain.value = this.mixer.volume * 0.7 * (running ? 1.2 : 1) * (0.85 + Math.random() * 0.3);
    source.connect(gain).connect(this.ctx.destination);
    source.start();
  }
}

// Plays the `music` tracks from content.js, looping one or cycling several. Fades in, pauses while the tab
// is hidden and follows the Mixer. Tracks that fail to load are skipped.
export class Soundtrack {
  constructor(mixer, { tracks = [], level = 0.55 } = {}) {
    this.mixer = mixer;
    this.tracks = tracks.filter((t) => t?.src);
    this.level = level;
    this.index = 0;
    this.failures = 0;
    this.audio = null;
    this.fade = 0; // fade-in progress, 0 to 1
    this.fadeTimer = 0;
    mixer.onChange(() => this.sync());
    document.addEventListener('visibilitychange', () => this.sync());
  }

  get available() {
    return this.tracks.length > 0 && this.failures < this.tracks.length;
  }

  // safe to call repeatedly, it retries a play the browser refused
  unlock() {
    if (!this.available) return;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.addEventListener('ended', () => this.load(this.index + 1));
      this.audio.addEventListener('error', () => this.fail());
      this.audio.addEventListener('playing', () => { this.failures = 0; });
      this.load(0);
    }
    this.sync();
  }

  load(i) {
    this.index = i % this.tracks.length;
    const track = this.tracks[this.index];
    this.audio.loop = this.tracks.length === 1;
    this.audio.src = track.src;
    this.sync();
  }

  fail() {
    this.failures++;
    console.warn(`[museum] Could not play the music "${this.tracks[this.index]?.src}".`);
    if (this.available) this.load(this.index + 1);
  }

  sync() {
    const a = this.audio;
    if (!a) return;
    a.volume = clamp01(this.mixer.volume * this.level * this.fade);
    const wanted = this.mixer.audible && document.visibilityState === 'visible';
    if (wanted && a.paused) {
      this.startFade();
      a.play()?.catch(() => {}); // refused before the first interaction, unlock() retries
    } else if (!wanted && !a.paused) {
      a.pause();
      this.fade = 0;
    }
  }

  startFade() {
    if (this.fadeTimer || this.fade >= 1) return;
    this.fadeTimer = setInterval(() => {
      this.fade = Math.min(1, this.fade + 0.05);
      if (this.audio) this.audio.volume = clamp01(this.mixer.volume * this.level * this.fade);
      if (this.fade >= 1) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = 0;
      }
    }, 100);
  }
}
