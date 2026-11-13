// 그리기: 각 세계를 따로 그린다. 상대 세계에서 넘어온 칸은 상대 색으로 물든다.
import { T, CHARS, PHYS, PROJ } from './config.js';

const FONT = "'Do Hyeon', 'Noto Sans KR', sans-serif";

export const THEME = [
  { // AQUA: 물에 잠긴 도시
    sky: '#081d33', band: '#0b2643', far: '#0f3253', near: '#123c62', window: 'rgba(120,200,255,0.18)',
    wall: '#24527d', wallTop: '#6fb7ee', wallLine: '#1b4166', wallDark: '#173a5c',
    spike: '#ff5a6e', spikeTip: '#ffd3da',
    water: 'rgba(56,150,255,0.42)', waterTop: '#9ad8ff',
    wind: 'rgba(255,200,120,0.34)', windLine: 'rgba(255,240,205,0.95)', windEdge: 'rgba(255,225,170,0.9)',
  },
  { // DUNE: 모래에 묻힌 도시
    sky: '#3a2418', band: '#462c1d', far: '#573823', near: '#6a452b', window: 'rgba(255,200,120,0.16)',
    wall: '#b98a52', wallTop: '#f5d49b', wallLine: '#977041', wallDark: '#8a6539',
    spike: '#ff5a4a', spikeTip: '#ffe0c8',
    water: 'rgba(56,150,255,0.42)', waterTop: '#9ad8ff',
    wind: 'rgba(255,215,150,0.30)', windLine: 'rgba(255,248,225,0.95)', windEdge: 'rgba(255,240,205,0.85)',
  },
];

const hash = (a, b) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// ---------- 입자 ----------
export const particles = [];
export function burst(x, y, color, n, { speed = 160, up = 0, life = 0.6, size = 4, grav = 600 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, life, max: life, color, size: size * (0.6 + Math.random() * 0.6), grav });
  }
}
export function stepParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  }
}

// ---------- 배경 ----------
function drawBackground(ctx, w, camX, vw, vh, t) {
  const th = THEME[w];
  ctx.fillStyle = th.sky; ctx.fillRect(camX, 0, vw, vh);
  ctx.fillStyle = th.band; ctx.fillRect(camX, vh * 0.55, vw, vh * 0.45);

  // 먼 건물 실루엣 (시차)
  for (const [f, col, base, vary, step] of [[0.25, th.far, 210, 170, 70], [0.5, th.near, 290, 130, 56]]) {
    const off = camX * (1 - f);
    const i0 = Math.floor((camX - off) / step) - 1, i1 = i0 + Math.ceil(vw / step) + 3;
    for (let i = i0; i <= i1; i++) {
      const hgt = base + hash(i, w * 7 + step) * vary;
      const x = off + i * step;
      ctx.fillStyle = col;
      ctx.fillRect(x, vh - hgt, step - 6, hgt);
      if (f === 0.5) {
        ctx.fillStyle = th.window;
        for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
          if (hash(i * 13 + r, c + w * 31) > 0.62) ctx.fillRect(x + 8 + c * 15, vh - hgt + 16 + r * 22, 6, 9);
        }
      }
    }
  }

  if (w === 0) {
    // 물속 빛줄기
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#bfe7ff';
    for (let i = 0; i < 5; i++) {
      const x = camX * 0.8 + ((i * 263 + t * 12) % (vw + 300)) - 150;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 60, 0); ctx.lineTo(x + 180, vh); ctx.lineTo(x + 90, vh);
      ctx.fill();
    }
    ctx.restore();
    // 물방울
    ctx.fillStyle = 'rgba(190,230,255,0.35)';
    for (let i = 0; i < 34; i++) {
      const x = camX + ((hash(i, 3) * vw * 1.4 + Math.sin(t * 0.8 + i) * 12) % vw);
      const y = vh - ((t * (20 + hash(i, 9) * 40) + hash(i, 5) * vh) % vh);
      ctx.beginPath(); ctx.arc(x, y, 1.5 + hash(i, 1) * 2.5, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // 지는 해
    ctx.fillStyle = 'rgba(255,170,90,0.20)';
    ctx.beginPath(); ctx.arc(camX + vw * 0.72, vh * 0.32, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,0.25)';
    ctx.beginPath(); ctx.arc(camX + vw * 0.72, vh * 0.32, 44, 0, Math.PI * 2); ctx.fill();
    // 흩날리는 모래
    ctx.strokeStyle = 'rgba(255,215,160,0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 44; i++) {
      const x = camX + ((hash(i, 4) * vw + t * (60 + hash(i, 8) * 90)) % (vw + 40)) - 20;
      const y = (hash(i, 6) * vh + Math.sin(t * 1.3 + i) * 8);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + hash(i, 2) * 10, y - 1); ctx.stroke();
    }
  }
}

// ---------- 칸 ----------
function drawTile(ctx, ch, src, tx, ty, nb, t) {
  const up = nb.up;
  const th = THEME[src];
  const x = tx * T, y = ty * T;
  if (ch === '#') {
    ctx.fillStyle = th.wall; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = th.wallLine;
    const off = (ty % 2) * 16;
    ctx.fillRect(x, y + 15, T, 2);
    ctx.fillRect(x + ((off + 8) % T), y, 2, 15);
    ctx.fillRect(x + ((off + 24) % T), y + 17, 2, 15);
    if (hash(tx, ty) > 0.8) { ctx.fillStyle = th.wallDark; ctx.fillRect(x + 4, y + 20, 10, 8); }
    if (up !== '#') { ctx.fillStyle = th.wallTop; ctx.fillRect(x, y, T, 5); }
  } else if (ch === '^') {
    ctx.fillStyle = th.spike;
    for (let k = 0; k < 3; k++) {
      const bx = x + 3 + k * 9;
      ctx.beginPath(); ctx.moveTo(bx, y + T); ctx.lineTo(bx + 4.5, y + 13); ctx.lineTo(bx + 9, y + T); ctx.fill();
    }
    ctx.fillStyle = th.spikeTip;
    for (let k = 0; k < 3; k++) ctx.fillRect(x + 6.5 + k * 9, y + 13, 2, 4);
  } else if (ch === '~') {
    ctx.fillStyle = th.water; ctx.fillRect(x, y, T, T);
    if (up !== '~') {
      ctx.strokeStyle = th.waterTop; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const px = x + k * 4, py = y + 3 + Math.sin(t * 3 + (tx * 8 + k) * 0.55) * 2;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  } else if (ch === '|') {
    ctx.fillStyle = th.wind; ctx.fillRect(x, y, T, T);
    // 기둥 양옆 테두리
    ctx.fillStyle = th.windEdge;
    if (nb.left !== '|') ctx.fillRect(x, y, 2, T);
    if (nb.right !== '|') ctx.fillRect(x + T - 2, y, 2, T);
    // 위로 올라가는 화살표
    const off = (t * 70 + hash(tx, 0) * T) % T;
    ctx.strokeStyle = th.windLine; ctx.lineWidth = 2.2;
    const cy = y + T - off;
    ctx.beginPath(); ctx.moveTo(x + 9, cy + 5); ctx.lineTo(x + 16, cy - 2); ctx.lineTo(x + 23, cy + 5); ctx.stroke();
    // 가는 줄
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 2; k++) {
      const lx = x + 5 + k * 22 + Math.sin(t * 4 + ty + k) * 1.5;
      const ly = y + T - ((t * 160 + hash(tx * 3 + k, ty) * T) % (T + 14));
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 10); ctx.stroke();
    }
    if (nb.up !== '|') {   // 기둥 꼭대기 표시
      ctx.fillStyle = th.windEdge; ctx.fillRect(x, y, T, 3);
    }
  }
}

// ---------- 감정 표현 ----------
export const EMOTES = [
  { k: 'thumb', name: '따봉' }, { k: 'heart', name: '하트' }, { k: 'lol', name: 'ㅋㅋㅋ' },
  { k: 'what', name: '물음표' }, { k: 'sorry', name: '미안' }, { k: 'dance', name: '춤' },
];
export const EMO_DUR = { dance: 3.2, default: 2.6 };

// (x, y)를 중심으로 아이콘 하나를 그린다. 크기는 대략 24px
export function drawEmoteIcon(ctx, k, x, y, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  if (k === 'thumb') {
    ctx.fillStyle = '#ffd36b'; ctx.strokeStyle = '#7a4a12'; ctx.lineWidth = 1.6;
    // 엄지
    ctx.beginPath();
    ctx.moveTo(-3, -1); ctx.lineTo(-3, -9); ctx.quadraticCurveTo(-3, -12, 0, -12); ctx.quadraticCurveTo(3, -12, 3, -9); ctx.lineTo(3, -1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 주먹
    ctx.beginPath();
    ctx.moveTo(-6, -2); ctx.lineTo(7, -2); ctx.quadraticCurveTo(10, -2, 10, 1); ctx.lineTo(10, 8);
    ctx.quadraticCurveTo(10, 11, 7, 11); ctx.lineTo(-6, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    for (const yy of [2, 5, 8]) { ctx.moveTo(2, yy); ctx.lineTo(10, yy); }
    ctx.stroke();
    // 소매
    ctx.fillStyle = '#4db8ff'; ctx.fillRect(-11, -3, 5, 15); ctx.strokeRect(-11, -3, 5, 15);
  } else if (k === 'heart') {
    const b = 1 + Math.sin(t * 10) * 0.06;
    ctx.scale(b, b);
    ctx.fillStyle = '#ff4d6d'; ctx.strokeStyle = '#8a1a33'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-13, 1, -10, -11, 0, -4);
    ctx.bezierCurveTo(10, -11, 13, 1, 0, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(-5, -3, 2.2, 1.4, -0.6, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'lol' || k === 'what' || k === 'sorry') {
    const txt = k === 'lol' ? 'ㅋㅋㅋ' : k === 'what' ? '?' : '미안';
    ctx.font = `${k === 'what' ? 24 : 13}px 'Do Hyeon', 'Noto Sans KR', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = k === 'lol' ? '#e0457b' : k === 'what' ? '#3a6df0' : '#5a6478';
    const wob = k === 'lol' ? Math.sin(t * 18) * 1.2 : 0;
    ctx.fillText(txt, 0, 1 + wob);
    if (k === 'sorry') {   // 땀방울
      ctx.fillStyle = '#7cc8ff';
      ctx.beginPath(); ctx.moveTo(11, -11); ctx.quadraticCurveTo(14.5, -5.5, 11, -4); ctx.quadraticCurveTo(7.5, -5.5, 11, -11); ctx.fill();
    }
  } else if (k === 'dance') {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1a1d28'; ctx.lineWidth = 1.4;
    for (const [nx, ny] of [[-5, 4], [6, 1]]) {
      ctx.beginPath(); ctx.ellipse(nx, ny, 3.4, 2.6, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(nx + 3, ny); ctx.lineTo(nx + 3, ny - 11); ctx.stroke();
    }
    ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-2, -7); ctx.lineTo(9, -10); ctx.stroke();
  }
  ctx.restore();
}

// 말풍선 + 아이콘
function drawEmoteBubble(ctx, k, x, y, age, dur, t) {
  const pop = Math.min(1, age / 0.15);
  const fade = Math.min(1, (dur - age) / 0.35);
  const sc = 0.6 + 0.4 * pop + (pop < 1 ? 0 : Math.max(0, 0.15 - (age - 0.15)) * 0.8);
  ctx.save();
  ctx.globalAlpha *= Math.max(0, fade);
  ctx.translate(x, y - Math.min(6, age * 20));
  ctx.scale(sc, sc);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1a1d28'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, -15); ctx.lineTo(18, -15); ctx.quadraticCurveTo(22, -15, 22, -11); ctx.lineTo(22, 9);
  ctx.quadraticCurveTo(22, 13, 18, 13); ctx.lineTo(5, 13); ctx.lineTo(0, 19); ctx.lineTo(-5, 13); ctx.lineTo(-18, 13);
  ctx.quadraticCurveTo(-22, 13, -22, 9); ctx.lineTo(-22, -11); ctx.quadraticCurveTo(-22, -15, -18, -15);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  drawEmoteIcon(ctx, k, 0, -1, t);
  ctx.restore();
}

// ---------- 캐릭터 ----------
export function drawChar(ctx, p, chIdx, t, { alpha = 1, label = '', echo = false, scale = 1, outline = false } = {}) {
  if (p.dead) return;
  const c = CHARS[chIdx];
  const land = p.landT / 0.14, jump = p.jumpT / 0.18;
  let sx = 1 + land * 0.2 - jump * 0.12, sy = 1 - land * 0.18 + jump * 0.14;
  if (!p.grounded && !land) { const k = Math.min(0.07, Math.abs(p.vy) / 7000); sy *= 1 + k; sx /= 1 + k; }
  const footY = p.y + PHYS.h / 2;
  const moving = p.grounded && Math.abs(p.vx) > 20;
  const ph = t * 15 + chIdx;
  const bob = moving ? Math.abs(Math.sin(ph)) * 1.6 : Math.sin(t * 2.4 + chIdx) * 0.5;
  let lean = Math.max(-0.12, Math.min(0.12, p.vx / 210 * 0.09));
  let f = p.face || 1;
  const emo = p.emo, emoAge = emo ? t - emo.t0 : 99;
  const emoDur = emo ? (EMO_DUR[emo.k] || EMO_DUR.default) : 0;
  const dancing = emo && emo.k === 'dance' && emoAge < emoDur && p.grounded && Math.abs(p.vx) < 30;
  let hop = 0;
  if (dancing) {
    const b = emoAge * 9;
    hop = Math.abs(Math.sin(b)) * 7;
    lean = Math.sin(b) * 0.32;
    f = Math.sin(emoAge * 4.5) >= 0 ? 1 : -1;
    sx *= 1 + Math.cos(b * 2) * 0.06; sy *= 1 - Math.cos(b * 2) * 0.06;
  }
  const air = !p.grounded;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, footY);
  ctx.scale(scale, scale);

  // 그림자
  if (!echo) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 0.5, 12 * sx, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  }

  // 발
  const footCol = c.dark;
  const fA = moving ? Math.sin(ph) : 0;
  const feet = air ? [[-5, -3.5], [5, -3.5]] : [[-6 + fA * 1.6, -2 - Math.max(0, fA) * 2.2], [6 - fA * 1.6, -2 - Math.max(0, -fA) * 2.2]];
  ctx.fillStyle = footCol;
  for (const [fx, fy] of feet) { ctx.beginPath(); ctx.ellipse(fx, fy, 4.6, 2.8, 0, 0, Math.PI * 2); ctx.fill(); }

  ctx.translate(0, -3 - bob - hop);
  ctx.rotate(lean);
  ctx.scale(sx, sy);

  const W = 28, H = 26, top = -H;
  // 몸통 (위는 둥글고 아래는 살짝 납작한 찹쌀떡 모양)
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-W / 2, top + 13);
    ctx.bezierCurveTo(-W / 2, top - 1, W / 2, top - 1, W / 2, top + 13);
    ctx.lineTo(W / 2, -6);
    ctx.quadraticCurveTo(W / 2, 0, W / 2 - 6, 0);
    ctx.lineTo(-W / 2 + 6, 0);
    ctx.quadraticCurveTo(-W / 2, 0, -W / 2, -6);
    ctx.closePath();
  };

  // 뒤쪽 장식: DUNE 머리끈 꼬리
  if (chIdx === 1) {
    const sp = Math.min(1, Math.abs(p.vx) / 210 + (air ? 0.6 : 0));
    const bx = -f * 12, by = top + 6;
    ctx.fillStyle = '#2aa79a';
    for (const k of [0, 1]) {
      const wv = Math.sin(t * 13 + k * 1.7) * (2 + sp * 3);
      const len = 8 + sp * 6 - k * 2;
      ctx.beginPath();
      ctx.moveTo(bx, by - 1 + k * 2.5);
      ctx.quadraticCurveTo(bx - f * len * 0.6, by + wv * 0.6 + k * 3, bx - f * len, by + wv + 2 + k * 3);
      ctx.lineTo(bx - f * (len - 2.5), by + wv + 4.6 + k * 3);
      ctx.quadraticCurveTo(bx - f * len * 0.5, by + 3 + wv * 0.4 + k * 3, bx, by + 2 + k * 2.5);
      ctx.fill();
    }
  }

  const g = ctx.createLinearGradient(0, top, 0, 0);
  g.addColorStop(0, c.light);
  g.addColorStop(0.35, c.color);
  g.addColorStop(1, c.dark);
  body();
  if (!outline) { ctx.fillStyle = echo ? c.color : g; ctx.fill(); }
  ctx.lineWidth = outline ? 2.4 : 2;
  ctx.strokeStyle = outline ? c.color : c.dark;
  if (echo) ctx.setLineDash([3, 2.5]);
  ctx.stroke();
  ctx.setLineDash([]);
  if (outline) { ctx.restore(); return; }   // 겹침 표시용: 테두리만

  if (!echo) {
    // 윤기
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(-f * 6, top + 6, 4.2, 2.4, -0.5 * f, 0, Math.PI * 2); ctx.fill();
  }

  // AQUA: 머리 위 물방울
  if (chIdx === 0) {
    const sw = Math.sin(t * 5) * 0.12 - lean * 1.5;
    ctx.save();
    ctx.translate(-f * 2, top + 1);
    ctx.rotate(sw);
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.bezierCurveTo(2, -7, 5, -4, 5, -1.2);
    ctx.bezierCurveTo(5, 2.5, -5, 2.5, -5, -1.2);
    ctx.bezierCurveTo(-5, -4, -2, -7, 0, -11);
    ctx.fillStyle = echo ? c.light : '#d9f2ff';
    ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = c.dark; ctx.stroke();
    if (!echo) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-1.8, -2.5, 1.1, 1.8, 0.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  // DUNE: 이마 머리끈 + 고글
  if (chIdx === 1) {
    ctx.save();
    body(); ctx.clip();
    ctx.fillStyle = '#2aa79a';
    ctx.fillRect(-W / 2 - 2, top + 4, W + 4, 4.2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-W / 2 - 2, top + 4, W + 4, 1.2);
    ctx.restore();
    for (const s of [-1, 1]) {
      const gx = f * 2.5 + s * 5;
      ctx.fillStyle = '#5a3a1c'; ctx.beginPath(); ctx.arc(gx, top + 4.6, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = echo ? '#c9f0ff' : '#8fe0ff'; ctx.beginPath(); ctx.arc(gx, top + 4.6, 2.3, 0, Math.PI * 2); ctx.fill();
      if (!echo) { ctx.fillStyle = '#fff'; ctx.fillRect(gx - 1.3, top + 3.2, 1.2, 1.2); }
    }
  }

  // 눈
  const look = Math.max(-1.5, Math.min(1.5, p.vy / 250));
  const eyeY = top + 13.5;
  const blink = !echo && (Math.floor(t * 8 + chIdx * 23) % 41) === 0;
  for (const s of [-1, 1]) {
    const ex = s * 5.6 + f * 2.4;
    if (blink) {
      ctx.strokeStyle = '#1a1d28'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(ex, eyeY, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(ex, eyeY, 3.9, 4.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = echo ? c.dark : '#1a1d28';
    ctx.beginPath(); ctx.ellipse(ex + f * 1.2, eyeY + 0.6 + look, 2.5, 3.1, 0, 0, Math.PI * 2); ctx.fill();
    if (!echo) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex + f * 1.2 - 0.9, eyeY - 0.8 + look, 1.05, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (!echo) {
    // 볼
    ctx.fillStyle = 'rgba(255,110,140,0.42)';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 9 + f * 2, eyeY + 5.6, 2.6, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
    // 입
    ctx.strokeStyle = '#1a1d28'; ctx.fillStyle = '#5b1f2b'; ctx.lineWidth = 1.4;
    const mx = f * 2.4, my = eyeY + 6.2;
    if (air) { ctx.beginPath(); ctx.ellipse(mx, my + 0.6, 1.6, 2, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(mx, my - 1.2, 2, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
  }
  ctx.restore();

  // 감정 표현 말풍선 / 춤 음표
  if (emo && emoAge < emoDur) {
    ctx.save();
    ctx.globalAlpha = 1;   // 상대 잔상이어도 감정 표현은 또렷하게
    const by = footY - (label ? 66 : 50) * scale - hop;
    if (emo.k === 'dance') {
      for (let n = 0; n < 2; n++) {
        const a = (emoAge * 1.2 + n * 0.5) % 1;
        ctx.globalAlpha = 1 - a;
        drawEmoteIcon(ctx, 'dance', p.x + (n ? 14 : -14) * scale + Math.sin(emoAge * 6 + n) * 3, footY - (34 + a * 26) * scale, t);
      }
    } else {
      drawEmoteBubble(ctx, emo.k, p.x, by, emoAge, emoDur, t);
    }
    ctx.restore();
  }

  if (label) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `14px ${FONT}`; ctx.textAlign = 'center';
    const ly = footY - 46 * scale;
    const w = ctx.measureText(label).width + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(p.x - w / 2, ly - 14, w, 18);
    ctx.fillStyle = c.color; ctx.fillText(label, p.x, ly);
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ---------- 한 세계 그리기 ----------
// region: 캔버스 위 영역(논리 px), w: 그릴 세계(=그 세계 캐릭터), opts: { labels, pings, me }
export function drawWorld(ctx, sim, w, region, cam, t, opts = {}) {
  const st = sim.stage;
  const scale = region.h / (st.H * T);
  const vw = region.w / scale, vh = st.H * T;
  const me = sim.players[w], other = sim.players[1 - w];

  // 카메라
  const target = Math.max(0, Math.min(st.W * T - vw, me.x - vw * 0.42));
  if (cam.x === undefined || opts.snap) cam.x = target;
  cam.x += (target - cam.x) * Math.min(1, opts.dt ? opts.dt * 6 : 1);
  const camX = Math.round(cam.x * scale) / scale;
  const shake = cam.shake || 0;

  ctx.save();
  ctx.beginPath(); ctx.rect(region.x, region.y, region.w, region.h); ctx.clip();
  ctx.translate(region.x, region.y);
  ctx.scale(scale, scale);
  ctx.translate(-camX + (shake ? (Math.random() - 0.5) * shake : 0), shake ? (Math.random() - 0.5) * shake : 0);

  drawBackground(ctx, w, camX, vw, vh, t);

  // 상대 간섭 원 안: 상대 세계의 하늘을 깔아 대비를 확보
  const Rr = st.R * T;
  if (other.proj && !other.dead) {
    const oth = THEME[1 - w];
    ctx.save();
    ctx.beginPath(); ctx.arc(other.x, other.y, Rr, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = oth.sky; ctx.fillRect(other.x - Rr, other.y - Rr, Rr * 2, Rr * 2);
    ctx.restore();
  }

  // 지형
  const tx0 = Math.max(0, Math.floor(camX / T) - 1), tx1 = Math.min(st.W - 1, Math.ceil((camX + vw) / T) + 1);
  for (let ty = 0; ty < st.H; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const ch = sim.tileFor(w, tx, ty);
      if (ch === '.') continue;
      const nb = {
        up: ty > 0 ? sim.tileFor(w, tx, ty - 1) : '.',
        left: sim.tileFor(w, tx - 1, ty), right: sim.tileFor(w, tx + 1, ty),
      };
      drawTile(ctx, ch, sim.sourceOf(w, tx, ty), tx, ty, nb, t);
    }
  }

  // 상대가 내 세계에 일으키는 간섭 원
  const R = st.R * T;
  if (other.proj && !other.dead) {
    const oc = CHARS[1 - w].color;
    ctx.save();
    if (other.projT < 1.5) ctx.globalAlpha = 0.45 + 0.55 * (Math.sin(t * 22) > 0 ? 1 : 0);   // 곧 꺼짐
    ctx.beginPath(); ctx.arc(other.x, other.y, R, 0, Math.PI * 2);
    ctx.fillStyle = oc + '22'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = oc;
    ctx.setLineDash([10, 7]); ctx.lineDashOffset = -t * 40; ctx.stroke();
    ctx.restore();
  }
  // 내가 상대 세계에 일으키는 간섭 (내 세계에는 얇은 테두리만)
  if (me.proj && !me.dead) {
    const mc = CHARS[w].color;
    ctx.save();
    ctx.beginPath(); ctx.arc(me.x, me.y, R, 0, Math.PI * 2);
    ctx.lineWidth = 1.5; ctx.strokeStyle = mc + '88';
    ctx.setLineDash([3, 6]); ctx.lineDashOffset = t * 30; ctx.stroke();
    // 남은 시간 (머리 위 작은 원호)
    ctx.setLineDash([]);
    const frac = Math.max(0, Math.min(1, me.projT / PROJ.dur));
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(me.x, me.y - 30, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = frac < 0.25 ? '#ff6a6a' : mc;
    ctx.beginPath(); ctx.arc(me.x, me.y - 30, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();
    ctx.restore();
  }

  // 체크포인트
  for (const f of st.flags) {
    const fx = f.tx * T + T / 2, fy = (f.ty + 1) * T;
    const got = me.respawn && me.respawn.tx >= f.tx;
    ctx.fillStyle = '#d9dde6'; ctx.fillRect(fx - 1, fy - 40, 3, 40);
    ctx.fillStyle = got ? CHARS[w].color : 'rgba(220,225,235,0.35)';
    ctx.beginPath(); ctx.moveTo(fx + 2, fy - 40); ctx.lineTo(fx + 20, fy - 33); ctx.lineTo(fx + 2, fy - 26); ctx.fill();
  }

  // 출구
  {
    const ex = st.exit, x = ex.tx * T, y = ex.ty * T, ew = ex.tw * T, eh = ex.th * T;
    const both = sim.players.every(p => p.atExit);
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,20,0.85)'; ctx.fillRect(x + 6, y - 14, ew - 12, eh + 14);
    ctx.strokeStyle = both ? '#ffffff' : '#c9b8ff'; ctx.lineWidth = 3;
    ctx.strokeRect(x + 6, y - 14, ew - 12, eh + 14);
    const g = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(200,180,255,${0.15 + g * 0.2})`; ctx.fillRect(x + 10, y - 10, ew - 20, eh + 6);
    // 두 사람 표시등
    sim.players.forEach((p, i) => {
      ctx.fillStyle = p.atExit ? CHARS[i].color : 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 12 + i * (ew - 32), y - 24, 8, 6);
    });
    ctx.restore();
  }

  // 붕괴 벽
  if (st.collapse && sim.wallX > -2000) {
    const wx = sim.wallX;
    ctx.fillStyle = '#0a0410';
    ctx.beginPath(); ctx.moveTo(camX - 50, 0); ctx.lineTo(wx, 0);
    for (let y = 0; y <= vh; y += 24) ctx.lineTo(wx + Math.sin(y * 0.3 + t * 9) * 10 + hash(y, Math.floor(t * 12)) * 8, y);
    ctx.lineTo(camX - 50, vh); ctx.fill();
    ctx.strokeStyle = '#d14dff'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = 0; y <= vh; y += 24) {
      const xx = wx + Math.sin(y * 0.3 + t * 9) * 10 + hash(y, Math.floor(t * 12)) * 8;
      y ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y);
    }
    ctx.stroke();
  }

  // 핑
  for (const pg of opts.pings || []) {
    const age = t - pg.t0;
    if (age > 3) continue;
    const c = CHARS[pg.c].color;
    ctx.save();
    ctx.globalAlpha = 1 - age / 3;
    ctx.strokeStyle = c; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pg.x, pg.y, 10 + (age % 1) * 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = c; ctx.font = `18px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('여기!', pg.x, pg.y - 32);
    ctx.beginPath(); ctx.moveTo(pg.x - 7, pg.y - 26); ctx.lineTo(pg.x + 7, pg.y - 26); ctx.lineTo(pg.x, pg.y - 16); ctx.fill();
    ctx.restore();
  }

  // 캐릭터: 상대는 잔상, 나는 실체
  drawChar(ctx, other, 1 - w, t, { echo: true, alpha: 0.55, label: opts.labels && !opts.showMyLabel ? opts.labels[1 - w] : '' });
  drawChar(ctx, me, w, t, { label: opts.showMyLabel && opts.labels ? opts.labels[w] : '' });
  // 같은 자리에 겹쳐 있으면 상대가 내 뒤에 가려지므로, 상대 잔상을 한 번 더 위에 그린다
  if (!other.dead && !me.dead && Math.abs(other.x - me.x) < 30 && Math.abs(other.y - me.y) < 34) {
    drawChar(ctx, other, 1 - w, t, { echo: true, alpha: 0.8, outline: true });
  }

  // 입자
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // 화면 밖 상대 위치 화살표
  const ox = (other.x - camX) * scale, oy = other.y * scale;
  if (!other.dead && (ox < 0 || ox > region.w)) {
    const left = ox < 0;
    const ax = region.x + (left ? 18 : region.w - 18), ay = region.y + Math.max(30, Math.min(region.h - 30, oy));
    ctx.fillStyle = CHARS[1 - w].color;
    ctx.beginPath();
    if (left) { ctx.moveTo(ax - 10, ay); ctx.lineTo(ax + 6, ay - 10); ctx.lineTo(ax + 6, ay + 10); }
    else { ctx.moveTo(ax + 10, ay); ctx.lineTo(ax - 6, ay - 10); ctx.lineTo(ax - 6, ay + 10); }
    ctx.fill();
  }
}

// 캐릭터 선택 카드용 미리보기
export function drawPreview(canvas, chIdx, t, selected) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const th = THEME[chIdx];
  ctx.fillStyle = th.sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = th.near;
  for (let i = 0; i < 6; i++) { const h = 50 + hash(i, chIdx) * 70; ctx.fillRect(i * 46, H - 40 - h, 38, h); }
  ctx.fillStyle = chIdx === 0 ? th.water : th.wind;
  ctx.fillRect(0, H - 70, W, 30);
  ctx.fillStyle = th.wall; ctx.fillRect(0, H - 40, W, 40);
  ctx.fillStyle = th.wallTop; ctx.fillRect(0, H - 40, W, 5);
  const jump = selected ? Math.max(0, Math.sin(t * 5)) : 0;
  const p = { x: W / 2, y: H - 40 - PHYS.h / 2 - jump * 26, vx: 0, vy: 0, face: Math.sin(t * 0.7) > 0 ? 1 : -1, grounded: jump < 0.05, landT: 0, jumpT: 0, dead: false };
  ctx.save(); ctx.translate(W / 2, H - 40); ctx.scale(2, 2); ctx.translate(-W / 2, -(H - 40));
  drawChar(ctx, p, chIdx, t);
  ctx.restore();
}
