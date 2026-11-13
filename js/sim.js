// 스테이지 진행 상태. 온라인/혼자 테스트/봇 시연 모두 같은 코드를 쓴다.
import { T, PHYS, FIXED_DT, PROJ } from './config.js';
import { STAGES } from './levels.js';
import { makeBody, physStep, touchesSpike, isSolid } from './physics.js';

const NONE = { left: false, right: false, jump: false, proj: false };

export class Sim {
  // local[i]: 이 기기에서 i번 캐릭터를 직접 움직이는가, authority: 클리어/실패 판정을 내리는가
  constructor(stageIdx, { local = [true, true], authority = true } = {}) {
    this.stageIdx = stageIdx;
    this.stage = STAGES[stageIdx];
    this.local = local;
    this.authority = authority;
    this.acc = 0;
    this.reset();
  }

  reset() {
    const s = this.stage;
    this.players = [0, 1].map(w => {
      const b = makeBody(w, s.spawn[w].tx, s.spawn[w].ty);
      b.respawn = { ...s.spawn[w] };
      b.deaths = 0;
      return b;
    });
    this.time = 0;
    this.cleared = false;
    this.failed = false;
    this.exitHold = 0;
    this.events = [];
    this.wallX = -9999;
  }

  // 원래 세계의 지형
  raw(w, tx, ty) {
    const s = this.stage;
    if (tx < 0 || tx >= s.W) return '#';
    if (ty < 0 || ty >= s.H) return '.';
    return s.worlds[w][ty][tx];
  }

  // 상대가 간섭 중이면 상대 주변 원 안의 칸은 상대 세계의 지형으로 바뀐다
  projOf(w) {
    const o = this.players[1 - w];
    return o && o.proj && !o.dead ? o : null;
  }
  inCircle(o, tx, ty) {
    const cx = tx * T + T / 2 - o.x, cy = ty * T + T / 2 - o.y, r = this.stage.R * T;
    return cx * cx + cy * cy <= r * r;
  }
  tileFor(w, tx, ty) {
    if (tx < 0 || tx >= this.stage.W) return '#';
    const o = this.projOf(w);
    if (o && this.inCircle(o, tx, ty)) return this.raw(1 - w, tx, ty);
    return this.raw(w, tx, ty);
  }
  // 그리기용: 이 칸이 어느 세계에서 왔는지
  sourceOf(w, tx, ty) {
    const o = this.projOf(w);
    return o && this.inCircle(o, tx, ty) ? 1 - w : w;
  }

  projEnd(i) {
    const p = this.players[i];
    p.proj = false; p.projT = 0; p.projCd = PROJ.cd;
    this.emit('projOff', i);
  }

  emit(type, i, extra) { this.events.push({ type, i, ...extra }); }

  kill(i, cause) {
    const p = this.players[i];
    if (p.dead) return;
    p.dead = true; p.deadT = 0.75; p.deaths++;
    p.deathX = p.x; p.deathY = p.y;
    p.proj = false;
    this.emit('death', i, { cause });
  }

  respawnPlayer(i) {
    const p = this.players[i], r = p.respawn;
    const nb = makeBody(i, r.tx, r.ty);
    Object.assign(p, nb, { respawn: r, deaths: p.deaths });
    this.emit('respawn', i);
    if (this.stage.collapse && p.x - PHYS.w / 2 < this.wallX + 24) this.fail(i);
  }

  fail(i) {
    if (this.failed) return;
    this.failed = true;
    this.emit('fail', i);
  }

  // 원격 캐릭터 상태 반영
  // lead: 이 상태가 도착하기까지 걸린 시간(초). 그만큼 앞으로 예측해서 늦게 보이는 것을 줄인다
  setRemote(i, st, lead = 0) {
    const p = this.players[i];
    const wasDead = p.dead;
    const L = Math.min(0.15, Math.max(0, lead));
    p.x = st.x + (st.d ? 0 : st.vx * L); p.y = st.y;
    p._rt = L; p.vx = st.vx; p.vy = st.vy; p.face = st.f;
    p.proj = !!st.p; p.projT = st.pt || 0; p.projCd = st.pc || 0; p.dead = !!st.d; p.atExit = !!st.e; p.grounded = !!st.g;
    p.landT = st.l || 0; p.jumpT = st.j || 0;
    if (!wasDead && p.dead) { p.deathX = p.x; p.deathY = p.y; this.emit('death', i, { remote: true }); }
  }
  remoteState(i) {
    const p = this.players[i];
    const r = v => Math.round(v * 10) / 10;
    return { x: r(p.x), y: r(p.y), vx: r(p.vx), vy: r(p.vy), f: p.face, p: p.proj ? 1 : 0, pt: r(p.projT), pc: r(p.projCd), d: p.dead ? 1 : 0,
      e: p.atExit ? 1 : 0, g: p.grounded ? 1 : 0, l: r(p.landT), j: r(p.jumpT) };
  }

  step(frameDt, inputs) {
    this.acc += Math.min(frameDt, 0.1);
    while (this.acc >= FIXED_DT) {
      this.acc -= FIXED_DT;
      this.tick(FIXED_DT, inputs);
    }
  }

  tick(dt, inputs) {
    if (this.cleared || this.failed) return;
    this.time += dt;
    const s = this.stage;
    if (s.collapse) this.wallX = this.time < s.collapse.delay ? -9999 : (this.time - s.collapse.delay) * s.collapse.speed - 40;

    for (let i = 0; i < 2; i++) {
      if (!this.local[i]) {
        // 원격 캐릭터: 다음 상태가 올 때까지 가로 속도로 잠깐 예측
        const p = this.players[i];
        if (!p.dead && (p._rt || 0) < 0.15) { p.x += p.vx * dt; p._rt = (p._rt || 0) + dt; }
        if (p.proj) p.projT = Math.max(0, p.projT - dt); else p.projCd = Math.max(0, p.projCd - dt);
        continue;
      }
      const p = this.players[i];
      const inp = (inputs && inputs[i]) || NONE;
      // 내 캐릭터만 리셋(K): 마지막 체크포인트에서 다시 시작
      const killPressed = !!inp.kill && !p.prevKill;
      p.prevKill = !!inp.kill;
      if (killPressed && !p.dead) { this.kill(i, 'self'); continue; }
      if (p.dead) {
        p.deadT -= dt;
        if (p.deadT <= 0) this.respawnPlayer(i);
        continue;
      }
      // 간섭: 누르면 일정 시간 켜짐, 켜져 있을 때 다시 누르면 일찍 끔, 꺼진 뒤에는 재충전 시간
      if (inp.proj && !p.prevProj) {
        if (p.proj) this.projEnd(i);
        else if (p.projCd <= 0) { p.proj = true; p.projT = PROJ.dur; this.emit('projOn', i); }
        else this.emit('projDeny', i);
      }
      p.prevProj = !!inp.proj;
      if (p.proj) { p.projT -= dt; if (p.projT <= 0) this.projEnd(i); }
      else p.projCd = Math.max(0, p.projCd - dt);
      const q = (tx, ty) => this.tileFor(i, tx, ty);
      const ev = physStep(p, inp, q, dt);
      for (const e of ev) this.emit(e, i);

      if (touchesSpike(p, q)) { this.kill(i, 'spike'); continue; }
      if (p.y > s.H * T + 48) { this.kill(i, 'fall'); continue; }
      if (s.collapse && p.x - PHYS.w / 2 < this.wallX) { this.kill(i, 'wall'); this.fail(i); continue; }

      // 체크포인트
      for (const f of s.flags) {
        if (Math.abs(p.x - (f.tx * T + T / 2)) < 20 && Math.abs(p.y - (f.ty * T + T / 2)) < 30 && f.tx > p.respawn.tx) {
          p.respawn = { tx: f.tx, ty: f.ty };
          this.emit('flag', i);
        }
      }
      const ex = s.exit;
      const was = p.atExit;
      p.atExit = p.x > ex.tx * T && p.x < (ex.tx + ex.tw) * T && p.y > ex.ty * T && p.y < (ex.ty + ex.th) * T;
      if (p.atExit && !was) this.emit('exitIn', i);
    }

    if (this.authority) {
      const [a, b] = this.players;
      if (a.atExit && b.atExit && !a.dead && !b.dead) {
        this.exitHold += dt;
        if (this.exitHold >= 0.35) { this.cleared = true; this.emit('clear', -1, { time: this.time }); }
      } else this.exitHold = 0;
    }
  }

  takeEvents() { const e = this.events; this.events = []; return e; }
}

export { isSolid };
