// PeerJS 기반 2인 연결. 방장이 방 코드(4자리)로 피어를 열고, 참가자가 그 코드로 접속한다.
import { NET_PREFIX } from './config.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

// 테스트용으로 ?ph=localhost&pp=9000 처럼 PeerJS 서버를 바꿀 수 있다
function peerOptions() {
  const q = new URLSearchParams(location.search);
  const o = { debug: 0 };
  if (q.get('ph')) {
    o.host = q.get('ph');
    o.port = +(q.get('pp') || 9000);
    o.path = q.get('ppath') || '/myapp';
    o.secure = q.get('psecure') === '1';
  }
  if (q.get('ice') === 'none') o.config = { iceServers: [] };
  return o;
}

function PeerCls() {
  return window.Peer || (window.peerjs && window.peerjs.Peer);
}

export class Net {
  constructor(handlers) {
    this.h = handlers;           // { open(), msg(m), close(reason) }
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.code = '';
    this.rtt = 0;
    this.pingTimer = null;
    this.closed = false;
    this.lastRecv = 0;
  }

  host() {
    this.isHost = true;
    return new Promise((resolve, reject) => {
      const attempt = n => {
        const code = makeCode();
        const Peer = PeerCls();
        const peer = new Peer(NET_PREFIX + code, peerOptions());
        let opened = false;
        peer.on('open', () => { opened = true; this.peer = peer; this.code = code; resolve(code); });
        peer.on('connection', c => {
          // 이미 상대가 있어도, 그 연결이 몇 초째 조용하면 끊긴 것으로 보고 새 연결을 받는다
          if (this.conn && this.conn.open && performance.now() - this.lastRecv < 2500) {
            c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); });
            return;
          }
          if (this.conn) this.drop('replaced');
          this.attach(c);
        });
        peer.on('error', err => {
          if (!opened && err.type === 'unavailable-id' && n < 6) { peer.destroy(); attempt(n + 1); return; }
          if (!opened) { reject(err); return; }
          if (err.type === 'network' || err.type === 'server-error') this.h.close && this.h.close('server');
        });
        peer.on('disconnected', () => { if (!this.closed && peer && !peer.destroyed) peer.reconnect(); });
      };
      attempt(0);
    });
  }

  join(code) {
    this.isHost = false;
    code = code.trim().toUpperCase();
    return new Promise((resolve, reject) => {
      const Peer = PeerCls();
      const peer = new Peer(peerOptions());
      this.peer = peer;
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; reject(new Error('timeout')); } }, 12000);
      peer.on('open', () => {
        const c = peer.connect(NET_PREFIX + code, { reliable: true, serialization: 'json' });
        c.on('open', () => { if (done) return; done = true; clearTimeout(timer); this.code = code; this.attach(c); resolve(); });
      });
      peer.on('error', err => {
        if (!done) { done = true; clearTimeout(timer); reject(err); return; }
        if (err.type === 'network' || err.type === 'server-error') this.h.close && this.h.close('server');
      });
    });
  }

  attach(c) {
    this.conn = c;
    this.lastRecv = performance.now();
    const ready = () => {
      this.lastRecv = performance.now();
      this.h.open && this.h.open();
      clearInterval(this.pingTimer);
      // 1초마다 생존 신호. 창을 내려 둔 탭은 브라우저가 타이머를 늦추므로,
      // 끊김 판정은 아주 길게(75초) 잡고, 빠른 처리는 bye 신호와 재접속 교체로 한다
      this.pingTimer = setInterval(() => {
        if (this.conn !== c) return;
        this.send({ t: 'png', ts: performance.now() });
        if (performance.now() - this.lastRecv > 75000) this.drop('timeout');
      }, 1000);
    };
    c.on('data', d => {
      if (this.conn !== c) return;
      this.lastRecv = performance.now();
      if (!d || typeof d !== 'object') return;
      if (d.t === 'png') { this.send({ t: 'pnr', ts: d.ts }); return; }
      if (d.t === 'pnr') { this.rtt = performance.now() - d.ts; return; }
      if (d.t === 'bye') { this.drop('peer'); return; }
      this.h.msg && this.h.msg(d);
    });
    c.on('close', () => {
      if (this.conn !== c) return;      // 이미 정리한 연결
      clearInterval(this.pingTimer);
      this.conn = null;
      if (!this.closed) this.h.close && this.h.close('peer');
    });
    c.on('error', () => {});
    if (c.open) ready(); else c.on('open', ready);
  }

  // 현재 연결을 정리하고 끊김을 알린다
  drop(reason) {
    const c = this.conn;
    if (!c) return;
    this.conn = null;
    clearInterval(this.pingTimer);
    try { c.close(); } catch (e) {}
    if (!this.closed) this.h.close && this.h.close(reason);
  }

  // 창을 닫거나 새로고침할 때 상대에게 바로 알린다
  bye() {
    this.send({ t: 'bye' });
    this.destroy();
  }

  get connected() { return !!(this.conn && this.conn.open); }

  send(m) {
    if (this.conn && this.conn.open) {
      try { this.conn.send(m); } catch (e) { /* 연결이 막 끊긴 경우 */ }
    }
  }

  destroy() {
    this.closed = true;
    clearInterval(this.pingTimer);
    try { this.conn && this.conn.close(); } catch (e) {}
    try { this.peer && this.peer.destroy(); } catch (e) {}
    this.conn = null; this.peer = null;
  }
}
