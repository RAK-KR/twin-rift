// 화면 흐름: 타이틀 → (방 만들기/참가) 대기실 → 게임 시작 → 캐릭터 선택 → 스테이지
import { VIEW_W, VIEW_H, CHARS, SEND_HZ, T, PROJ } from './config.js';
import { STAGES } from './levels.js';
import { Sim } from './sim.js';
import { BotDriver, PLANS } from './bot.js';
import { Net } from './net.js';
import { Chat } from './chat.js';
import { initInput, readMove, took, clearPressed, releaseAll, isHeld } from './input.js';
import { drawWorld, drawPreview, particles, burst, stepParticles, EMOTES, drawEmoteIcon } from './render.js';
import { unlockAudio, sfx, setMuted, isMuted } from './audio.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const FONT = "'Do Hyeon', 'Noto Sans KR', sans-serif";
const qs = new URLSearchParams(location.search);
const HOST_COLOR = '#8fa4ff', GUEST_COLOR = '#ffcf6a';

const S = {
  mode: 'title', kind: null,
  net: null, isHost: false, myName: '', peerName: '',
  picks: { h: null, g: null }, cdOn: false, cdT: 0, cdTimer: null,
  stage: 0, sim: null, myCh: 0, active: 0,
  cams: [{}, {}], bot: null, autoBot: qs.get('bot') === '1',
  pings: [], paused: false, over: null, intro: 0,
  sendAcc: 0, chatSeq: 0, t: 0, failTimer: null,
  stats: { chatShown: 0 },
  help: true,
};
window.__twin = S;

// ---------- 저장 ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('twinrift-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('twinrift-' + k, JSON.stringify(v)); } catch (e) {} },
};
const best = store.get('best', {});
S.help = store.get('help', true);
function updateHelp() {
  const show = S.mode === 'play' && S.kind !== 'bots' && !document.body.classList.contains('touch');
  $('keyHelp').classList.toggle('hidden', !show);
  $('keyHelp').classList.toggle('mini', !S.help);
  $('helpChat').classList.toggle('hidden', S.kind !== 'online');
  $('helpTab').classList.toggle('hidden', S.kind !== 'solo');
}

// ---------- 캔버스 ----------
function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  const scale = Math.max(1, Math.round((r.width / VIEW_W) * dpr * 100) / 100);
  canvas.width = Math.round(VIEW_W * scale);
  canvas.height = Math.round(VIEW_H * scale);
  canvas._s = scale;
}
window.addEventListener('resize', fitCanvas);

// ---------- 화면 전환 ----------
const screens = ['title', 'lobby', 'pick', 'over'];
function show(name) {
  for (const s of screens) $('scr-' + s).classList.toggle('hidden', s !== name);
}
function setMode(m) {
  S.mode = m;
  const online = S.kind === 'online';
  const wrap = $('chatWrap');
  wrap.classList.toggle('hidden', !(online && (m === 'lobby' || m === 'pick' || m === 'play')));
  wrap.classList.toggle('ingame', m === 'play');
  wrap.classList.toggle('lobby', m !== 'play');
  chat.inGame = m === 'play';
  document.body.classList.toggle('chatdock', online && (m === 'lobby' || m === 'pick'));
  $('touch').classList.toggle('hidden', !(m === 'play' && document.body.classList.contains('touch')));
  $('btnChatTouch').classList.toggle('hidden', !online);
  $('btnSwapTouch').classList.toggle('hidden', S.kind !== 'solo');
  $('btnEmoTouch').classList.toggle('hidden', S.kind === 'bots');
  if (m === 'play') { show(null); document.activeElement && document.activeElement.blur && document.activeElement.blur(); }
  else if (m !== 'over') show(m);
  releaseAll(); clearPressed();
  toggleEmoBar(false);
  updateHelp();
}

let toastTimer = null;
function toast(msg, ms = 2200) {
  const el = $('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

const fmt = s => {
  if (s === undefined || s === null) return '-';
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, '0')}`;
};

// ---------- 채팅 ----------
const chat = new Chat({ log: $('chatLog'), input: $('chatInput'), wrap: $('chatWrap'), onSend: sendChat });

function sideColor(isHostSide) {
  const ch = isHostSide ? S.picks.h : S.picks.g;
  if (ch !== null && ch !== undefined) return CHARS[ch].color;
  return isHostSide ? HOST_COLOR : GUEST_COLOR;
}
function sendChat(text) {
  if (!S.net || !S.net.connected) { chat.sys('상대와 연결되어 있지 않습니다'); return; }
  if (S.isHost) {
    const m = { id: 'm' + (++S.chatSeq), name: S.myName, color: sideColor(true), text };
    if (chat.add(m)) sfx.chat();
    S.net.send({ t: 'cm', ...m });
  } else {
    S.net.send({ t: 'chat', text });   // 방장이 ID를 붙여 돌려줄 때만 화면에 표시
  }
}

// ---------- 타이틀 ----------
const nameIn = $('inName');
nameIn.value = qs.get('name') || store.get('name', '플레이어' + Math.floor(100 + Math.random() * 900));
const myName = () => {
  const n = nameIn.value.trim().slice(0, 10) || '플레이어';
  store.set('name', n);
  return n;
};
$('inCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
$('inCode').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) $('btnJoin').click(); });

function netHandlers() {
  return { open: onNetOpen, msg: onNetMsg, close: onNetClose };
}

$('btnHost').onclick = async () => {
  unlockAudio(); sfx.ui();
  S.kind = 'online'; S.isHost = true; S.myName = myName(); S.peerName = '';
  $('titleMsg').textContent = '방을 만드는 중...';
  setBusy(true);
  try {
    S.net = new Net(netHandlers());
    const code = await S.net.host();
    chat.clear();
    $('titleMsg').textContent = '';
    enterLobby();
    chat.sys(`방을 만들었습니다. 코드 ${code}를 친구에게 알려 주세요`);
  } catch (e) {
    $('titleMsg').textContent = '방을 만들지 못했습니다. 인터넷 연결을 확인해 주세요';
    S.net && S.net.destroy(); S.net = null;
  }
  setBusy(false);
};

$('btnJoin').onclick = async () => {
  unlockAudio(); sfx.ui();
  const code = $('inCode').value.trim().toUpperCase();
  if (code.length !== 4) { $('titleMsg').textContent = '4자리 방 코드를 입력해 주세요'; return; }
  S.kind = 'online'; S.isHost = false; S.myName = myName(); S.peerName = '';
  $('titleMsg').textContent = '접속하는 중...';
  setBusy(true);
  try {
    S.net = new Net(netHandlers());
    await S.net.join(code);
    chat.clear();
    $('titleMsg').textContent = '';
    S.net.send({ t: 'hello', name: S.myName });
    enterLobby();
  } catch (e) {
    $('titleMsg').textContent = '방을 찾지 못했습니다. 코드를 다시 확인해 주세요';
    S.net && S.net.destroy(); S.net = null;
  }
  setBusy(false);
};

function setBusy(b) { for (const id of ['btnHost', 'btnJoin', 'btnSolo', 'btnBots']) $(id).disabled = b; }

$('btnSolo').onclick = () => { unlockAudio(); sfx.ui(); S.kind = 'solo'; S.isHost = true; S.active = 0; startStage(0); };
$('btnBots').onclick = () => { unlockAudio(); sfx.ui(); S.kind = 'bots'; S.isHost = true; startStage(0); };

// ---------- 대기실 ----------
function enterLobby() {
  S.picks = { h: null, g: null };
  cancelCountdown();
  $('roomCode').textContent = S.net ? S.net.code : '----';
  buildStageBtns();
  updateLobby();
  setMode('lobby');
}

function buildStageBtns() {
  const box = $('stageBtns');
  box.innerHTML = '';
  STAGES.forEach((st, i) => {
    const b = document.createElement('button');
    b.innerHTML = `${i + 1}<span class="best">${best[st.id] ? fmt(best[st.id]) : '기록 없음'}</span>`;
    b.dataset.i = i;
    b.onclick = () => {
      if (!S.isHost) return;
      sfx.ui();
      S.stage = i;
      S.net && S.net.send({ t: 'stage', stage: i });
      updateLobby();
    };
    box.appendChild(b);
  });
}

function updateLobby() {
  const hostName = S.isHost ? S.myName : S.peerName;
  const guestName = S.isHost ? S.peerName : S.myName;
  $('slotHost').querySelector('b').textContent = hostName || '-';
  $('slotGuest').querySelector('b').textContent = guestName || '기다리는 중';
  $('slotHost').classList.toggle('on', !!hostName);
  $('slotGuest').classList.toggle('on', !!guestName);
  [...$('stageBtns').children].forEach((b, i) => { b.classList.toggle('sel', i === S.stage); b.disabled = !S.isHost && i !== S.stage; });
  const ready = S.net && S.net.connected && !!S.peerName;
  $('btnStart').disabled = !(S.isHost && ready);
  $('btnStart').classList.toggle('hidden', !S.isHost);
  $('lobbyMsg').textContent = S.isHost
    ? (ready ? '준비되면 게임 시작을 눌러 주세요' : '친구가 들어오기를 기다리는 중입니다')
    : '방장이 게임을 시작하기를 기다리는 중입니다';
}

$('btnCopy').onclick = () => {
  const code = S.net ? S.net.code : '';
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast('방 코드를 복사했습니다'), () => toast(code));
  else toast(code);
};
$('btnStart').onclick = () => {
  if (!S.isHost || !S.net || !S.net.connected) return;
  sfx.ui();
  S.net.send({ t: 'toPick', stage: S.stage });
  enterPick();
};
$('btnLeave').onclick = () => leaveToTitle();

function leaveToTitle(msg) {
  cancelCountdown();
  clearTimeout(S.failTimer);
  if (S.net) { S.net.destroy(); S.net = null; }
  S.kind = null; S.sim = null; S.bot = null; S.peerName = '';
  setMode('title');
  $('titleMsg').textContent = msg || '';
}

// ---------- 캐릭터 선택 ----------
function enterPick() {
  S.picks = { h: null, g: null };
  cancelCountdown();
  updatePick();
  setMode('pick');
}

document.querySelectorAll('.card').forEach(card => {
  card.onclick = () => {
    if (S.mode !== 'pick') return;
    unlockAudio();
    const ch = +card.dataset.ch;
    const mine = S.isHost ? S.picks.h : S.picks.g;
    const want = mine === ch ? null : ch;
    if (S.isHost) applyPick('h', want);
    else S.net && S.net.send({ t: 'pick', ch: want });
    sfx.ui();
  };
});

// 방장만 선택을 확정한다 (같은 캐릭터 중복 방지)
function applyPick(side, ch) {
  const other = side === 'h' ? 'g' : 'h';
  if (ch !== null && S.picks[other] === ch) {
    if (side === 'h') toast('상대가 이미 고른 캐릭터입니다');
    S.net && S.net.send({ t: 'picks', ...S.picks, deny: side === 'g' ? ch : undefined });
    return;
  }
  S.picks[side] = ch;
  S.net && S.net.send({ t: 'picks', ...S.picks });
  updatePick();
  const ok = S.picks.h !== null && S.picks.g !== null && S.picks.h !== S.picks.g;
  if (ok && !S.cdOn) startCountdown();
  else if (!ok && S.cdOn) cancelCountdown(true);
}

function startCountdown() {
  S.cdOn = true; S.cdT = 2;
  S.net && S.net.send({ t: 'cd', on: true });
  clearTimeout(S.cdTimer);
  S.cdTimer = setTimeout(() => {
    if (!S.cdOn) return;
    S.cdOn = false;
    S.net && S.net.send({ t: 'start', stage: S.stage, h: S.picks.h, g: S.picks.g });
    beginOnline(S.stage);
  }, 2000);
}
function cancelCountdown(notify) {
  S.cdOn = false;
  clearTimeout(S.cdTimer);
  if (notify && S.net) S.net.send({ t: 'cd', on: false });
}

function updatePick() {
  document.querySelectorAll('.card').forEach(card => {
    const ch = +card.dataset.ch;
    const mine = (S.isHost ? S.picks.h : S.picks.g) === ch;
    const theirs = (S.isHost ? S.picks.g : S.picks.h) === ch;
    card.classList.toggle('mine', mine);
    card.classList.toggle('taken', theirs);
    card.disabled = theirs;
    card.querySelector('.owner').textContent = mine ? `${S.myName} (나)` : theirs ? S.peerName : '';
  });
  const both = S.picks.h !== null && S.picks.g !== null;
  $('pickMsg').textContent = both ? '곧 시작합니다' : '같은 캐릭터는 고를 수 없습니다';
}

function beginOnline(stage) {
  S.myCh = S.isHost ? S.picks.h : S.picks.g;
  chat.sys(`${CHARS[S.myCh].name}로 플레이합니다. Enter로 채팅, Q로 위치 핑`);
  startStage(stage);
}

// ---------- 네트워크 ----------
function onNetOpen() {
  if (S.isHost) chat.sys('상대가 접속했습니다');
}

function onNetMsg(m) {
  switch (m.t) {
    case 'hello':
      if (!S.isHost) break;
      S.peerName = String(m.name || '친구').slice(0, 10);
      S.net.send({ t: 'welcome', name: S.myName, stage: S.stage });
      chat.sys(`${S.peerName} 님이 들어왔습니다`);
      updateLobby();
      break;
    case 'welcome':
      S.peerName = String(m.name || '방장').slice(0, 10);
      S.stage = m.stage | 0;
      chat.sys(`${S.peerName} 님의 방에 들어왔습니다`);
      updateLobby();
      break;
    case 'full':
      leaveToTitle('방이 가득 찼습니다');
      break;
    case 'stage':
      S.stage = m.stage | 0; updateLobby();
      break;
    case 'toPick':
      S.stage = m.stage | 0; enterPick();
      break;
    case 'pick':
      if (S.isHost && S.mode === 'pick') applyPick('g', m.ch === null ? null : (m.ch | 0));
      break;
    case 'picks':
      if (S.isHost) break;
      S.picks = { h: m.h, g: m.g };
      if (m.deny !== undefined && m.deny !== null) toast('상대가 이미 고른 캐릭터입니다');
      updatePick();
      break;
    case 'cd':
      S.cdOn = !!m.on; S.cdT = 2;
      break;
    case 'start':
      if (S.isHost) break;
      S.cdOn = false;
      S.picks = { h: m.h, g: m.g };
      beginOnline(m.stage | 0);
      break;
    case 'st':
      if (S.mode === 'play' && S.sim) {
        const o = S.sim.players[1 - S.myCh];
        const wasProj = o.proj;
        S.sim.setRemote(1 - S.myCh, m.s, S.net.rtt / 2000);
        if (S.bot && m.b) S.bot.peer = { i: m.b[0], ready: m.b[1] };
        if (o.proj !== wasProj) (o.proj ? sfx.projOn : sfx.projOff)();
      }
      break;
    case 'chat':
      if (!S.isHost) break;
      {
        const text = String(m.text || '').slice(0, 120);
        if (!text) break;
        const cm = { id: 'm' + (++S.chatSeq), name: S.peerName, color: sideColor(false), text };
        if (chat.add(cm)) sfx.chat();
        S.net.send({ t: 'cm', ...cm });
      }
      break;
    case 'cm':
      if (S.isHost) break;
      if (chat.add({ id: m.id, name: m.name, color: m.color, text: String(m.text) })) sfx.chat();
      break;
    case 'ping':
      addPing(m.x, m.y, m.c, false);
      break;
    case 'emo':
      if (S.sim && S.mode === 'play' && EMOTES[m.i | 0]) {
        S.sim.players[1 - S.myCh].emo = { k: EMOTES[m.i | 0].k, t0: S.t };
        sfx.emote();
      }
      break;
    case 'clear':
      if (!S.isHost && S.sim && !S.sim.cleared) { S.sim.cleared = true; onClear(m.time); }
      break;
    case 'fail':
      if (S.sim && !S.sim.failed) S.sim.fail(1 - S.myCh);
      break;
    case 'rq':
      if (S.isHost && m.a === 'restart' && S.mode === 'play') hostRestart(S.stage);
      break;
    case 'restart':
      if (!S.isHost) startStage(m.stage | 0);
      break;
    case 'lobby':
      if (!S.isHost) { S.sim = null; enterLobby(); chat.sys('대기실로 돌아왔습니다'); }
      break;
  }
}

function onNetClose(reason) {
  if (S.kind !== 'online') return;
  if (S.isHost) {
    S.peerName = '';
    chat.sys('상대의 연결이 끊어졌습니다');
    toast('상대의 연결이 끊어졌습니다');
    S.sim = null;
    enterLobby();
  } else {
    leaveToTitle(reason === 'server' ? '서버 연결이 끊어졌습니다' : '방장과의 연결이 끊어졌습니다');
  }
}

// ---------- 스테이지 ----------
function startStage(idx) {
  clearTimeout(S.failTimer);
  S.stage = idx;
  const online = S.kind === 'online';
  S.sim = new Sim(idx, online ? { local: [S.myCh === 0, S.myCh === 1], authority: S.isHost } : {});
  S.bot = (S.kind === 'bots' || S.autoBot) ? new BotDriver(S.sim, PLANS[STAGES[idx].id], online ? S.myCh : undefined) : null;
  S.cams = [{}, {}];
  particles.length = 0;
  S.pings = [];
  S.paused = false;
  S.over = null;
  S.intro = 3.2;
  S.sendAcc = 0;
  setMode('play');
}

function hostRestart(idx) {
  if (S.kind === 'online') {
    if (!S.isHost) { S.net.send({ t: 'rq', a: 'restart' }); return; }
    S.net.send({ t: 'restart', stage: idx });
  }
  startStage(idx);
}

function onClear(time) {
  const st = STAGES[S.stage];
  const prev = best[st.id];
  const isBest = !prev || time < prev;
  if (isBest) { best[st.id] = time; store.set('best', best); }
  const deaths = S.sim.players.reduce((a, p) => a + (p.deaths || 0), 0);
  openOver('클리어', `기록 ${fmt(time)}${isBest ? '  (최고 기록)' : `\n최고 기록 ${fmt(prev)}`}\n넘어진 횟수 ${deaths}`, 'clear');
}

function onFail() {
  openOver('붕괴에 휩쓸렸습니다', '잠시 후 다시 시작합니다', 'fail');
  if (S.isHost || S.kind !== 'online') {
    S.failTimer = setTimeout(() => { if (S.over === 'fail') hostRestart(S.stage); }, 2200);
  }
}

function openOver(title, text, kind) {
  S.over = kind;
  $('overTitle').textContent = title;
  $('overText').textContent = text;
  const box = $('overBtns');
  box.innerHTML = '';
  const add = (label, fn, primary) => {
    const b = document.createElement('button');
    b.textContent = label; if (primary) b.className = 'primary';
    b.onclick = () => { sfx.ui(); fn(); };
    box.appendChild(b);
  };
  const online = S.kind === 'online';
  const canControl = !online || S.isHost;
  if (kind === 'clear') {
    if (canControl) {
      if (S.stage < STAGES.length - 1) add('다음 스테이지', () => hostRestart(S.stage + 1), true);
      add('다시 하기', () => hostRestart(S.stage));
      add(online ? '대기실로' : '타이틀로', () => backToMenu());
    } else {
      $('overText').textContent += '\n\n방장이 다음 진행을 고르는 중입니다';
    }
  } else if (kind === 'pause') {
    add('계속', () => closeOver(), true);
    add('다시 시작', () => hostRestart(S.stage));
    add(online ? (S.isHost ? '대기실로' : '나가기') : '타이틀로', () => backToMenu());
  }
  show('over');
}
function closeOver() { S.over = null; S.paused = false; show(null); }

function backToMenu() {
  if (S.kind === 'online') {
    if (S.isHost) { S.net.send({ t: 'lobby' }); S.sim = null; enterLobby(); }
    else leaveToTitle();
  } else leaveToTitle();
}

// ---------- 감정 표현 휠 (G) ----------
// G를 누른 채 마우스를 원하는 방향으로 움직이고 G를 떼면 선택.
// G를 짧게 톡 누르면 휠이 열린 채로 남고, 클릭으로 고른다.
const wheel = $('emoWheel');
const wctx = wheel.getContext('2d');
const W_R1 = 72, W_R2 = 205;          // 안쪽, 바깥쪽 반지름 (캔버스 좌표)
const EW = { open: false, hold: false, t0: 0, dx: 0, dy: 0, sel: -1 };
let lastEmo = 0;

function myIdx() { return S.kind === 'online' ? S.myCh : S.active; }

function sectorOf(dx, dy) {
  if (Math.hypot(dx, dy) < 26) return -1;
  const n = EMOTES.length, step = Math.PI * 2 / n;
  const a = (Math.atan2(dy, dx) + Math.PI / 2 + step / 2 + Math.PI * 4) % (Math.PI * 2);
  return Math.floor(a / step) % n;
}
function openWheel(hold) {
  if (!S.sim || S.mode !== 'play' || S.kind === 'bots' || S.over) return;
  EW.open = true; EW.hold = hold; EW.t0 = performance.now(); EW.dx = 0; EW.dy = 0; EW.sel = -1;
  wheel.classList.remove('hidden');
}
function closeWheel() { EW.open = false; wheel.classList.add('hidden'); }
function toggleEmoBar(open) { if (open === false) closeWheel(); else if (EW.open) closeWheel(); else openWheel(false); }

window.addEventListener('mousemove', e => {
  if (!EW.open || e.target === wheel) return;
  EW.dx += e.movementX; EW.dy += e.movementY;
  const l = Math.hypot(EW.dx, EW.dy);
  if (l > 120) { EW.dx *= 120 / l; EW.dy *= 120 / l; }
  EW.sel = sectorOf(EW.dx, EW.dy);
});
function wheelLocal(e) {
  const r = wheel.getBoundingClientRect();
  return [(e.clientX - r.left - r.width / 2) * (wheel.width / r.width), (e.clientY - r.top - r.height / 2) * (wheel.height / r.height)];
}
wheel.addEventListener('pointermove', e => {
  const [x, y] = wheelLocal(e);
  EW.dx = x; EW.dy = y;
  EW.sel = Math.hypot(x, y) > W_R2 + 30 ? -1 : sectorOf(x, y);
});
wheel.addEventListener('pointerdown', e => { e.preventDefault(); const [x, y] = wheelLocal(e); EW.sel = sectorOf(x, y); });
wheel.addEventListener('pointerup', e => {
  e.preventDefault();
  const [x, y] = wheelLocal(e);
  const sel = Math.hypot(x, y) > W_R2 + 30 ? -1 : sectorOf(x, y);
  if (sel >= 0) doEmote(sel); else closeWheel();
});

function wheelUpdate() {
  if (!EW.open) return;
  if (EW.hold && !isHeld('KeyG')) {
    // G를 뗐을 때: 방향을 골랐으면 실행, 짧게 톡 눌렀으면 클릭 모드로 유지
    if (EW.sel >= 0) doEmote(EW.sel);
    else if (performance.now() - EW.t0 < 300) EW.hold = false;
    else closeWheel();
  }
  drawWheel();
}

function drawWheel() {
  const c = wctx, cx = wheel.width / 2, cy = wheel.height / 2, n = EMOTES.length, step = Math.PI * 2 / n;
  const col = CHARS[myIdx()].color;
  c.clearRect(0, 0, wheel.width, wheel.height);
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 - step / 2 + i * step + 0.02, a1 = a0 + step - 0.04;
    const on = i === EW.sel;
    c.beginPath(); c.arc(cx, cy, on ? W_R2 + 8 : W_R2, a0, a1); c.arc(cx, cy, W_R1, a1, a0, true); c.closePath();
    c.fillStyle = on ? col + 'e6' : 'rgba(10,12,20,0.78)';
    c.fill();
    c.strokeStyle = on ? '#ffffff' : 'rgba(255,255,255,0.18)'; c.lineWidth = on ? 3 : 1.5; c.stroke();
    const am = a0 + step / 2 - 0.02, r = (W_R1 + W_R2) / 2 + (on ? 4 : 0);
    const ix = cx + Math.cos(am) * r, iy = cy + Math.sin(am) * r;
    c.save(); c.translate(ix, iy - 8); c.scale(on ? 2.3 : 2, on ? 2.3 : 2);
    // 아이콘 바탕 원
    c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.arc(0, 0, 15, 0, Math.PI * 2); c.fill();
    drawEmoteIcon(c, EMOTES[i].k, 0, 0, S.t);
    c.restore();
    c.font = `${on ? 22 : 19}px 'Do Hyeon', 'Noto Sans KR', sans-serif`; c.textAlign = 'center';
    c.fillStyle = on ? '#0b0d14' : '#e9ecf3';
    c.fillText(EMOTES[i].name, ix, iy + 52);
  }
  // 가운데
  c.beginPath(); c.arc(cx, cy, W_R1 - 8, 0, Math.PI * 2);
  c.fillStyle = 'rgba(10,12,20,0.85)'; c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1.5; c.stroke();
  c.font = `20px 'Do Hyeon', 'Noto Sans KR', sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = EW.sel >= 0 ? '#ffffff' : '#8b92a6';
  c.fillText(EW.sel >= 0 ? EMOTES[EW.sel].name : (EW.hold ? '방향 선택' : '취소'), cx, cy);
  c.textBaseline = 'alphabetic';
  // 고른 방향 표시
  if (EW.sel >= 0) {
    const a = Math.atan2(EW.dy, EW.dx);
    c.fillStyle = col;
    c.beginPath(); c.arc(cx + Math.cos(a) * (W_R1 - 18), cy + Math.sin(a) * (W_R1 - 18), 6, 0, Math.PI * 2); c.fill();
  }
}

function doEmote(i) {
  closeWheel();
  if (!S.sim || S.mode !== 'play' || S.kind === 'bots') return;
  if (S.t - lastEmo < 0.6) return;
  lastEmo = S.t;
  const p = S.sim.players[myIdx()];
  p.emo = { k: EMOTES[i].k, t0: S.t };
  sfx.emote();
  if (S.kind === 'online' && S.net) S.net.send({ t: 'emo', i });
}

function addPing(x, y, c, send) {
  S.pings.push({ x, y, c, t0: S.t });
  if (S.pings.length > 6) S.pings.shift();
  sfx.ping();
  if (send && S.net) S.net.send({ t: 'ping', x: Math.round(x), y: Math.round(y), c });
}

// ---------- 매 프레임 ----------
function gatherInputs(dt) {
  const sim = S.sim;
  const move = readMove();
  if (S.kind === 'bots') return S.bot.inputs(dt);
  if (S.kind === 'solo') {
    const arr = [null, null];
    if (S.bot) return S.bot.inputs(dt);
    arr[S.active] = move;
    return arr;
  }
  const arr = [null, null];
  if (S.bot) { const b = S.bot.inputs(dt); arr[S.myCh] = b[S.myCh]; }
  else arr[S.myCh] = move;
  return arr;
}

function handleEvents() {
  const sim = S.sim;
  for (const e of sim.takeEvents()) {
    const p = e.i >= 0 ? sim.players[e.i] : null;
    const col = p ? CHARS[e.i].color : '#fff';
    const foot = p ? p.y + 13 : 0;
    switch (e.type) {
      case 'jump': sfx.jump(); burst(p.x, foot, 'rgba(255,255,255,0.5)', 5, { speed: 70, up: 30, life: 0.3, size: 3, grav: 200 }); break;
      case 'hop': sfx.hop(); break;
      case 'land': sfx.land(); burst(p.x, foot, 'rgba(255,255,255,0.45)', 7, { speed: 90, up: 20, life: 0.3, size: 3, grav: 300 }); break;
      case 'splash': sfx.splash(); burst(p.x, p.y, 'rgba(160,220,255,0.8)', 10, { speed: 120, up: 80, life: 0.5, size: 3 }); break;
      case 'death':
        sfx.death();
        burst(p.deathX, p.deathY, col, 22, { speed: 260, up: 120, life: 0.8, size: 5 });
        for (const c of S.cams) c.shake = 8;
        break;
      case 'respawn': burst(p.x, p.y, col, 10, { speed: 80, life: 0.4, size: 3, grav: 0 }); break;
      case 'projOn': sfx.projOn(); break;
      case 'projOff': sfx.projOff(); break;
      case 'projDeny': if (e.i === myIdx()) sfx.deny(); break;
      case 'flag': sfx.flag(); burst(p.x, p.y - 20, col, 12, { speed: 120, up: 60, life: 0.6, size: 3 }); break;
      case 'exitIn': sfx.exitIn(); break;
      case 'clear':
        sfx.clear();
        if (S.kind === 'online' && S.isHost) S.net.send({ t: 'clear', time: e.time });
        onClear(e.time);
        break;
      case 'fail':
        sfx.fail();
        if (S.kind === 'online' && e.i === S.myCh) S.net.send({ t: 'fail' });
        onFail();
        break;
    }
  }
}

function playUpdate(dt) {
  const sim = S.sim;
  const typing = chat.typing;
  if (!typing) {
    if (EW.open && took('Escape')) closeWheel();
    else if (took('Escape')) { if (S.over === 'pause') closeOver(); else if (!S.over) { S.paused = S.kind !== 'online'; openOver('일시정지', S.kind === 'online' ? '온라인에서는 게임이 멈추지 않습니다' : '', 'pause'); } }
    if (took('KeyR') && S.over !== 'clear') hostRestart(S.stage);
    if (took('KeyM')) { setMuted(!isMuted()); toast(isMuted() ? '소리 끔' : '소리 켬', 1000); }
    if (S.kind === 'online' && took('Enter')) chat.open();
    if (took('KeyQ') && !S.over) {
      const w = S.kind === 'online' ? S.myCh : S.active;
      const p = sim.players[w];
      if (!p.dead) addPing(p.x, p.y - 26, w, S.kind === 'online');
    }
    if (took('KeyG')) { if (EW.open && !EW.hold) closeWheel(); else if (!EW.open) openWheel(true); }
    if (took('KeyH')) { S.help = !S.help; store.set('help', S.help); updateHelp(); }
    if (S.kind === 'solo' && took('Tab')) {
      S.active = 1 - S.active; releaseAll(); toast(`${CHARS[S.active].name} 조작 중`, 900);
    }
  }
  if (S.paused) return;
  {
    const w = S.kind === 'online' ? S.myCh : S.active;
    const pb = document.querySelector('[data-touch="proj"]');
    if (pb) pb.classList.toggle('active', !!sim.players[w].proj);
  }
  const inputs = gatherInputs(dt);
  sim.step(dt, inputs);
  handleEvents();
  S.intro = Math.max(0, S.intro - dt);

  if (S.kind === 'online') {
    S.sendAcc += dt;
    if (S.sendAcc >= 1 / SEND_HZ) {
      S.sendAcc = 0;
      S.net.send({ t: 'st', s: sim.remoteState(S.myCh), b: S.bot ? [S.bot.i, S.bot.ready] : undefined });
    }
  }
}

// ---------- 그리기 ----------
function render(dt) {
  const s = canvas._s || 1;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = '#06070b';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const t = S.t;

  if (!S.sim) { drawTitleBackdrop(t); return; }
  const sim = S.sim;
  for (const c of S.cams) c.shake = Math.max(0, (c.shake || 0) - dt * 30);

  const labels = S.kind === 'online'
    ? (S.myCh === 0 ? [S.myName, S.peerName] : [S.peerName, S.myName])
    : ['AQUA', 'DUNE'];

  if (S.kind === 'online') {
    drawWorld(ctx, sim, S.myCh, { x: 0, y: 0, w: VIEW_W, h: VIEW_H }, S.cams[0], t, { dt, labels, pings: S.pings });
    drawHud(sim, S.myCh, { x: 0, y: 0, w: VIEW_W, h: VIEW_H });
  } else {
    const h = VIEW_H / 2;
    for (const w of [0, 1]) {
      const r = { x: 0, y: w * h, w: VIEW_W, h };
      drawWorld(ctx, sim, w, r, S.cams[w], t, { dt, labels, pings: S.pings, showMyLabel: true });
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(8, r.y + 8, 170, 22);
      ctx.font = `16px ${FONT}`; ctx.textAlign = 'left';
      ctx.fillStyle = CHARS[w].color;
      ctx.fillText(`${CHARS[w].name} · ${CHARS[w].world}`, 14, r.y + 25);
      if (S.kind === 'solo' && S.active === w) {
        ctx.strokeStyle = CHARS[w].color; ctx.lineWidth = 3; ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
      }
    }
    ctx.fillStyle = '#000'; ctx.fillRect(0, h - 1, VIEW_W, 2);
    drawHud(sim, S.kind === 'solo' ? S.active : 0, { x: 0, y: 0, w: VIEW_W, h: VIEW_H }, true);
  }
}

function drawHud(sim, w, r, split) {
  const st = sim.stage;
  // 기록 시간: 오른쪽 위에 작고 흐리게
  ctx.textAlign = 'right';
  ctx.font = `17px ${FONT}`;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  const tStr = fmt(sim.time);
  const tW = ctx.measureText(tStr).width + 16;
  ctx.fillRect(r.w - 8 - tW, 8, tW, 24);
  ctx.fillStyle = 'rgba(233,236,243,0.7)';
  ctx.fillText(tStr, r.w - 16, 26);

  if (!split) {
    ctx.textAlign = 'left'; ctx.font = `18px ${FONT}`;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(8, 8, ctx.measureText(st.name).width + 20, 28);
    ctx.fillStyle = '#e9ecf3'; ctx.fillText(st.name, 18, 29);
    ctx.textAlign = 'right';
    const rtt = S.net ? Math.round(S.net.rtt) : 0;
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = rtt > 180 ? '#ff8a6a' : 'rgba(139,146,166,0.8)';
    ctx.fillText(`지연 ${rtt}ms`, r.w - 16, 48);
  }

  // 간섭 상태 (터치 화면에서는 버튼과 겹치지 않게 위로)
  const touch = document.body.classList.contains('touch');
  const me = sim.players[w];
  const label = me.proj ? `간섭 ${me.projT.toFixed(1)}초` : me.projCd > 0 ? `충전 ${me.projCd.toFixed(1)}초` : '간섭 준비';
  ctx.font = `18px ${FONT}`; ctx.textAlign = 'right';
  const bx = r.w - 12, by = touch ? (split ? r.h / 2 + 30 : 66) : r.h - 14;
  ctx.fillStyle = me.proj ? CHARS[w].color : 'rgba(0,0,0,0.6)';
  const text = touch ? label : label + '  [E]';
  const tw = ctx.measureText(text).width + 20;
  const lx = touch && !split ? 8 + tw : bx;   // 터치 온라인 화면: 왼쪽 위 스테이지 이름 아래
  ctx.fillRect(lx - tw, by - 22, tw, 30);
  // 게이지
  const gFrac = me.proj ? me.projT / PROJ.dur : me.projCd > 0 ? 1 - me.projCd / PROJ.cd : 1;
  ctx.fillStyle = me.proj ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.12)';
  ctx.fillRect(lx - tw, by + 5, tw, 3);
  ctx.fillStyle = me.proj ? '#0b0d14' : me.projCd > 0 ? '#8b92a6' : CHARS[w].color;
  ctx.fillRect(lx - tw, by + 5, tw * Math.max(0, Math.min(1, gFrac)), 3);
  ctx.fillStyle = me.proj ? '#0b0d14' : me.projCd > 0 ? '#8b92a6' : '#e9ecf3';
  ctx.fillText(text, lx - 10, by);

  // 출구 대기
  const a = sim.players[0].atExit, b = sim.players[1].atExit;
  if ((a || b) && !(a && b) && !sim.cleared) {
    ctx.textAlign = 'center'; ctx.font = `18px ${FONT}`;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(r.w / 2 - 140, (split ? r.h / 2 + 22 : 46), 280, 26);
    ctx.fillStyle = '#e9ecf3';
    ctx.fillText(`출구에 ${a ? 'AQUA' : 'DUNE'} 도착, ${a ? 'DUNE' : 'AQUA'}를 기다리는 중`, r.w / 2, (split ? r.h / 2 + 41 : 65));
  }

  // 붕괴 경고
  if (st.collapse && sim.time < st.collapse.delay) {
    const left = Math.ceil(st.collapse.delay - sim.time);
    ctx.textAlign = 'center'; ctx.font = `34px ${FONT}`;
    ctx.fillStyle = '#d14dff';
    ctx.fillText(`붕괴까지 ${left}`, r.w / 2, split ? r.h / 2 - 28 : 90);
  }

  // 시작 안내
  if (S.intro > 0) {
    const a2 = Math.min(1, S.intro / 0.6);
    ctx.globalAlpha = a2;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const y = split ? r.h / 2 - 60 : r.h * 0.3;
    ctx.fillRect(0, y - 40, r.w, 78);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = `36px ${FONT}`;
    ctx.fillText(st.name, r.w / 2, y);
    ctx.fillStyle = '#b9bfd0'; ctx.font = `18px ${FONT}`;
    ctx.fillText(st.sub, r.w / 2, y + 28);
    ctx.globalAlpha = 1;
  }

  if (touch) return;
  if (S.kind === 'solo') {
    ctx.textAlign = 'left'; ctx.font = `14px ${FONT}`;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(8, r.h - 34, 250, 26);
    ctx.fillStyle = '#cfd4e2';
    ctx.fillText(`지금 조작 중: ${CHARS[S.active].name}  ·  Tab으로 전환`, 16, r.h - 16);
  } else if (S.kind === 'bots') {
    ctx.textAlign = 'left'; ctx.font = `14px ${FONT}`;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(8, r.h - 34, 260, 26);
    ctx.fillStyle = '#cfd4e2';
    ctx.fillText(`봇 시연 중${S.bot && S.bot.error ? ' (봇 막힘: R)' : ''}  ·  Esc 메뉴`, 16, r.h - 16);
  }
}

// 타이틀 뒤 배경: 두 세계가 반씩
function drawTitleBackdrop(t) {
  ctx.fillStyle = '#081d33'; ctx.fillRect(0, 0, VIEW_W / 2, VIEW_H);
  ctx.fillStyle = '#3a2418'; ctx.fillRect(VIEW_W / 2, 0, VIEW_W / 2, VIEW_H);
  for (let i = 0; i < 16; i++) {
    const hh = 80 + ((i * 97) % 160);
    ctx.fillStyle = i < 8 ? '#123c62' : '#6a452b';
    ctx.fillRect(i * 60 + 4, VIEW_H - hh, 52, hh);
  }
  ctx.fillStyle = '#d14dff';
  for (let y = 0; y < VIEW_H; y += 6) ctx.fillRect(VIEW_W / 2 - 1 + Math.sin(y * 0.2 + t * 6) * 3, y, 2, 4);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  S.t += dt;
  stepParticles(dt);
  chat.tick();
  try {
    if (S.mode === 'play' && S.sim) playUpdate(dt);
    wheelUpdate();
    if (S.mode === 'pick') {
      document.querySelectorAll('.card').forEach(c => {
        const ch = +c.dataset.ch;
        drawPreview(c.querySelector('canvas'), ch, S.t, (S.isHost ? S.picks.h : S.picks.g) === ch);
      });
      if (S.cdOn) { S.cdT = Math.max(0, S.cdT - dt); $('pickMsg').textContent = `${Math.ceil(S.cdT) || 1}초 뒤 시작합니다`; }
    }
    render(dt);
  } catch (err) {
    console.error(err);
  }
  clearPressed();
  requestAnimationFrame(frame);
}

// ---------- 시작 ----------
if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');
$('btnChatTouch').onclick = () => chat.open();
$('btnEmoTouch').onclick = () => toggleEmoBar();
$('keyHelp').onclick = () => { S.help = !S.help; store.set('help', S.help); updateHelp(); };
$('btnMenuTouch').onclick = () => {
  if (S.mode !== 'play') return;
  if (S.over === 'pause') closeOver();
  else if (!S.over) { S.paused = S.kind !== 'online'; openOver('일시정지', S.kind === 'online' ? '온라인에서는 게임이 멈추지 않습니다' : '', 'pause'); }
};
initInput();
fitCanvas();
setMode('title');
document.addEventListener('pointerdown', unlockAudio, { once: true });
requestAnimationFrame(frame);
