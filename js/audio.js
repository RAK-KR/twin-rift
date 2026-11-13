// Web Audio 효과음 (외부 파일 없음). 장난감 같지 않게 낮은 음 위주로.
let ac = null, master = null, noiseBuf = null;
let muted = false;

export function unlockAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.55;
  const comp = ac.createDynamicsCompressor();
  master.connect(comp); comp.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; }
export function isMuted() { return muted; }

function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0, attack = 0.005 } = {}) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { freq = 800, q = 1, vol = 0.3, type = 'lowpass', delay = 0, slide = 0 } = {}) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}

export const sfx = {
  jump() { tone(180, 0.12, { type: 'triangle', vol: 0.18, slide: 1.6 }); noise(0.06, { freq: 1200, vol: 0.06 }); },
  hop() { tone(160, 0.16, { type: 'triangle', vol: 0.18, slide: 1.8 }); },
  land() { noise(0.09, { freq: 380, vol: 0.22 }); tone(70, 0.08, { vol: 0.2 }); },
  splash() { noise(0.35, { freq: 1600, vol: 0.18, type: 'bandpass', q: 0.8, slide: 0.3 }); },
  death() { tone(110, 0.45, { type: 'sawtooth', vol: 0.14, slide: 0.4 }); noise(0.3, { freq: 600, vol: 0.25, slide: 0.3 }); },
  projOn() { tone(220, 0.25, { type: 'sine', vol: 0.18, slide: 1.5 }); tone(330, 0.3, { vol: 0.1, delay: 0.04, slide: 1.5 }); },
  projOff() { tone(330, 0.2, { type: 'sine', vol: 0.14, slide: 0.6 }); },
  flag() { tone(392, 0.25, { type: 'triangle', vol: 0.12 }); tone(523, 0.35, { type: 'triangle', vol: 0.12, delay: 0.09 }); },
  exitIn() { tone(294, 0.2, { type: 'triangle', vol: 0.1 }); },
  clear() { [262, 330, 392, 523].forEach((f, i) => tone(f, 0.7, { type: 'triangle', vol: 0.12, delay: i * 0.08 })); },
  fail() { tone(98, 0.8, { type: 'sawtooth', vol: 0.15, slide: 0.5 }); noise(0.8, { freq: 300, vol: 0.3, slide: 0.4 }); },
  chat() { tone(440, 0.07, { type: 'sine', vol: 0.07 }); tone(587, 0.09, { type: 'sine', vol: 0.06, delay: 0.05 }); },
  ping() { tone(660, 0.35, { type: 'sine', vol: 0.12 }); tone(880, 0.4, { type: 'sine', vol: 0.06, delay: 0.06 }); },
  deny() { tone(150, 0.12, { type: 'square', vol: 0.06 }); tone(120, 0.14, { type: 'square', vol: 0.06, delay: 0.08 }); },
  emote() { tone(520, 0.08, { type: 'triangle', vol: 0.1, slide: 1.4 }); tone(780, 0.12, { type: 'sine', vol: 0.06, delay: 0.05 }); },
  ui() { tone(300, 0.05, { type: 'triangle', vol: 0.08 }); },
  rumble() { noise(0.5, { freq: 160, vol: 0.08 }); },
};
