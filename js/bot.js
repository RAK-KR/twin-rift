// 봇: 스테이지별 협동 계획을 따라 두 캐릭터를 조작한다 (테스트와 봇 시연에 사용)
import { T, PHYS } from './config.js';
import { isSolid, isFluid } from './physics.js';

// 행동 필드
//  x: 목표 x(칸 단위, 캐릭터 중심)   follow: 상대 x를 따라감(off 만큼 앞)
//  y: 물/바람 안에서 유지할 높이(칸)  jump: 'auto' | 'no' | 'hold'
//  proj: 간섭 상태 맞추기             tol: 도착 허용 오차(칸)
// 단계 필드: a(AQUA), b(DUNE), until(sim)=>bool, min(초), t(제한 시간)

export const PLANS = {
  s1: [
    { a: { x: 15, proj: true, tol: 0.15 } },
    { a: { x: 15 }, b: { x: 19.5 } },
    { a: { x: 18, proj: false }, b: { x: 22, proj: true } },
    { a: { x: 27.5 }, b: { x: 22 } },
    { a: { x: 31, proj: true, jump: 'no' }, b: { x: 26 , proj: false } },
    { a: { x: 31, jump: 'no' }, b: { x: 30.3, jump: 'no' }, min: 0.4 },
    { a: { x: 31, y: 6.4 }, b: { x: 30.3, y: 6.4 }, until: s => s.players.every(p => p.y < 6.7 * T), min: 0.3 },
    { a: { x: 36, jump: 'hold' }, b: { x: 35, jump: 'hold' } },
    { a: { x: 37, proj: false }, b: { x: 38 } },
    { a: { x: 45.2 }, b: { x: 42.5, proj: true } },
    { a: { x: 45.2 }, b: { x: 45.6 }, until: s => s.players.every(p => p.y < 4.2 * T), t: 12 },
    { a: { x: 51, jump: 'hold' }, b: { x: 50, jump: 'hold' } },
    { a: { x: 54.7, proj: false }, b: { x: 55.4, proj: false }, until: s => s.cleared, t: 8 },
  ],
  s2: [
    { a: { x: 8.5 }, b: { x: 8.8, proj: true } },
    { a: { follow: true, off: -0.4, max: 18.9, jump: 'no' }, b: { x: 19.4, lead: 1.0 }, t: 12 },
    { a: { x: 18.9 }, b: { x: 19.4, proj: false } },
    { a: { x: 23.5 }, b: { x: 26.5, proj: false } },
    { a: { x: 23.5 }, b: { x: 26.5, proj: true } },
    { a: { x: 32.5 }, b: { x: 26.5 } },
    { a: { x: 32.5, proj: true }, b: { x: 26.5, proj: false }, min: 0.2 },
    { a: { x: 32.5 }, b: { x: 37 } },
    { a: { x: 38.5, proj: false }, b: { x: 37.5 } },
    { a: { x: 40, proj: true, jump: 'no' }, b: { x: 38 } },
    { a: { x: 40, jump: 'no' }, b: { x: 40.2, jump: 'no' }, min: 0.4 },
    { a: { x: 49, jump: 'no', lead: 1.0 }, b: { follow: true, off: 0.2, max: 48.6, jump: 'no' }, t: 12 },
    { a: { x: 50, proj: false }, b: { x: 50 } },
    { a: { x: 52.6 }, b: { x: 53.4 }, until: s => s.cleared, t: 6 },
  ],
  s3: [
    { a: { x: 10.6, proj: true }, b: { x: 9.6 } },
    { a: { follow: true, off: 0.15, max: 18 }, b: { x: 19, lead: 0.7 }, t: 12 },
    { a: { x: 19, proj: false }, b: { x: 22.5, proj: true } },
    { a: { x: 27 }, b: { x: 22.5 } },
    { a: { x: 31.5 }, b: { x: 28, proj: false } },
    { a: { x: 31.5 }, b: { x: 28, proj: true }, min: 0.2 },
    { a: { x: 31.5 }, b: { x: 31.6 }, until: s => s.players.every(p => p.y < 4.2 * T), t: 12 },
    { a: { x: 35, jump: 'hold' }, b: { x: 31.6, jump: 'hold' } },
    { a: { x: 37 }, b: { x: 35.5, jump: 'hold' } },
    { a: { x: 41, proj: false }, b: { x: 41, proj: false } },
    { a: { x: 48.6 }, b: { x: 49.3 }, until: s => s.cleared, t: 8 },
  ],
  s4: [
    { a: { x: 12, proj: true, tol: 0.15 }, b: { x: 7.5 } },
    { a: { x: 12 }, b: { x: 16.5 } },
    { a: { x: 16, proj: false }, b: { x: 19.5, proj: true } },
    { a: { x: 24 }, b: { x: 19.5 } },
    { a: { x: 28, proj: true, jump: 'no' }, b: { x: 23.5, proj: false } },
    { a: { x: 28, jump: 'no' }, b: { x: 27.3, jump: 'no' }, min: 0.3 },
    { a: { x: 28, y: 6.4 }, b: { x: 27.3, y: 6.4 }, until: s => s.players.every(p => p.y < 6.7 * T), min: 0.2 },
    { a: { x: 33, jump: 'hold' }, b: { x: 32, jump: 'hold' } },
    { a: { x: 39.5, proj: false }, b: { x: 40, proj: true } },
    { a: { follow: true, off: -0.4, max: 47.4, jump: 'no' }, b: { x: 47.8, lead: 1.0 }, t: 12 },
    { a: { x: 53.2 }, b: { x: 50.5 } },
    { a: { x: 53.2 }, b: { x: 53.6 }, until: s => s.players.every(p => p.y < 4.2 * T), t: 12 },
    { a: { x: 59, jump: 'hold' }, b: { x: 58, jump: 'hold' } },
    { a: { x: 73, proj: true, tol: 0.15 }, b: { x: 67.5, proj: false } },
    { a: { x: 73 }, b: { x: 77 } },
    { a: { x: 80.6, proj: false }, b: { x: 81.4 }, until: s => s.cleared, t: 8 },
  ],
  s5: [
    { a: { x: 12, proj: true, tol: 0.2 }, b: { x: 7.5 } },
    { a: { x: 12 }, b: { x: 24 } },
    { a: { x: 12, proj: false }, b: { x: 24, proj: true, tol: 0.2 } },
    { a: { x: 30 }, b: { x: 24 } },
    { a: { x: 36, proj: true, tol: 0.2 }, b: { x: 24, proj: false } },
    { a: { x: 36 }, b: { x: 48 } },
    { a: { x: 36, proj: false }, b: { x: 48, proj: true, tol: 0.2 } },
    { a: { x: 54 }, b: { x: 48 } },
    { a: { x: 60, proj: true, tol: 0.2 }, b: { x: 48, proj: false } },
    { a: { x: 60 }, b: { x: 65 } },
    { a: { x: 66.6, proj: false }, b: { x: 67.4 }, until: s => s.cleared, t: 8 },
  ],
  s6: [
    { a: { x: 10, proj: true, jump: 'no' }, b: { x: 7 } },
    { a: { x: 10, jump: 'no' }, b: { x: 9.6, jump: 'no' }, min: 0.4 },
    { a: { x: 10, y: 22.4 }, b: { x: 9.6, y: 22.4 }, until: s => s.players.every(p => p.y < 22.7 * T), min: 0.3 },
    { a: { x: 14, jump: 'hold' }, b: { x: 13.2, jump: 'hold' } },
    { a: { x: 19.4, proj: false }, b: { x: 18.8 } },
    { a: { x: 19.4 }, b: { x: 18.8, proj: true }, min: 0.2 },
    { a: { x: 21.0 }, b: { x: 21.2 }, until: s => s.players.every(p => p.y < 13.2 * T), t: 12 },
    { a: { x: 15, jump: 'hold' }, b: { x: 16, jump: 'hold' } },
    { a: { x: 3, proj: true, jump: 'no' }, b: { x: 6, proj: false } },
    { a: { x: 3, jump: 'no' }, b: { x: 3.6, jump: 'no' }, min: 0.4 },
    { a: { x: 3, y: 4.4 }, b: { x: 3.6, y: 4.4 }, until: s => s.players.every(p => p.y < 4.7 * T), min: 0.3 },
    { a: { x: 8, jump: 'hold' }, b: { x: 7, jump: 'hold' } },
    { a: { x: 28.6, proj: false }, b: { x: 29.4 }, until: s => s.cleared, t: 10 },
  ],
  s7: [
    { a: { x: 8.6, proj: true }, b: { x: 8.0 } },
    { a: { x: 21.5, lead: 1.0 }, b: { follow: true, off: -0.5, max: 20.7, jump: 'no' }, t: 10 },
    { a: { x: 22, proj: false }, b: { x: 22.6 } },
    { a: { x: 23.4 }, b: { x: 24.0, proj: true } },
    { a: { follow: true, off: -0.5, jump: 'no', max: 36.0 }, b: { x: 36.5, lead: 1.0 }, t: 10 },
    { a: { x: 37.5 }, b: { x: 37.4, proj: false } },
    { a: { x: 40.5, proj: true, jump: 'no' }, b: { x: 39.0 } },
    { a: { x: 40.5, jump: 'no' }, b: { x: 40.6, jump: 'no' }, min: 0.4 },
    { a: { x: 53, jump: 'no', lead: 1.0 }, b: { follow: true, off: -0.3, max: 52.5, jump: 'no' }, t: 10 },
    { a: { x: 54, proj: false }, b: { x: 54.5 } },
    { a: { x: 58.6 }, b: { x: 59.4 }, until: s => s.cleared, t: 8 },
  ],
  s8: [
    { a: { x: 11.2, proj: true }, b: { x: 10.6 } },
    { a: { x: 21.5, lead: 1.0 }, b: { follow: true, off: -0.3, max: 20.7, jump: 'no', jumpWith: true }, t: 10 },
    { a: { x: 22, proj: false }, b: { x: 22.6 } },
    { a: { x: 26.6 }, b: { x: 27.2, proj: true } },
    { a: { follow: true, off: -0.3, jump: 'no', jumpWith: true, max: 37 }, b: { x: 37.5, lead: 1.0 }, t: 10 },
    { a: { x: 38.5 }, b: { x: 38, proj: false } },
    { a: { x: 42.5, proj: true }, b: { x: 40 } },
    { a: { x: 42.5 }, b: { x: 49 } },
    { a: { x: 51.6, proj: false }, b: { x: 52.4 }, until: s => s.cleared, t: 8 },
  ],
  s9: [
    { a: { x: 9, jump: 'no' }, b: { x: 8 } },
    { a: { x: 10.6, proj: true, jump: 'no' }, b: { x: 10.0 } },
    { a: { x: 21, jump: 'no', lead: 0.9 }, b: { follow: true, off: -0.4, max: 20.6, jump: 'no' }, t: 12 },
    { a: { x: 22.8, jump: 'no' }, b: { x: 22.2, jump: 'no' }, min: 0.3 },
    { a: { x: 22.8, y: 5.4 }, b: { x: 22.2, y: 5.4 }, until: s => s.players.every(p => p.y < 5.7 * T), min: 0.3 },
    { a: { x: 26, jump: 'hold' }, b: { x: 25.4, jump: 'hold' } },
    { a: { x: 26, proj: false }, b: { x: 26.4, proj: true } },
    { a: { follow: true, off: -0.4, jump: 'no', max: 32.8 }, b: { x: 33.2, lead: 0.9 }, t: 10 },
    { a: { x: 36.5 }, b: { x: 36, proj: false } },
    { a: { x: 38, proj: true, jump: 'no' }, b: { x: 37.2 } },
    { a: { x: 38, jump: 'no' }, b: { x: 38.3, jump: 'no' }, min: 0.4 },
    { a: { x: 47, jump: 'no', lead: 0.9 }, b: { follow: true, off: -0.2, max: 46.5, jump: 'no' }, t: 10 },
    { a: { x: 48.5, proj: false }, b: { x: 49 } },
    { a: { x: 52.6 }, b: { x: 53.4 }, until: s => s.cleared, t: 8 },
  ],
  s10: [
    { a: { x: 7.6, proj: true }, b: { x: 6.6 } },
    { a: { follow: true, off: 0.15, max: 16 }, b: { x: 16, lead: 0.7 }, t: 10 },
    { a: { x: 16.5, proj: false }, b: { x: 21.0, proj: true } },
    { a: { x: 25 }, b: { x: 21.0 } },
    { a: { x: 26.0 }, b: { x: 24.0, proj: false } },
    { a: { x: 26.0 }, b: { x: 25.5, proj: true }, min: 0.2 },
    { a: { x: 27.6 }, b: { x: 27.8 }, until: s => s.players.every(p => p.y < 4.2 * T), t: 12 },
    { a: { x: 30.0, jump: 'hold' }, b: { x: 29.6, jump: 'hold' } },
    { a: { follow: true, off: -0.4, jump: 'no', max: 36.8 }, b: { x: 37.2, lead: 0.8 }, t: 10 },
    { a: { x: 39.5 }, b: { x: 39, proj: false } },
    { a: { x: 41.6, proj: true }, b: { x: 41.0 } },
    { a: { follow: true, off: 0.15, max: 49.5 }, b: { x: 49.0, lead: 0.7 }, t: 10 },
    { a: { x: 52.4, jump: 'no' }, b: { x: 51.8, jump: 'no' }, min: 0.3 },
    { a: { x: 52.4, y: 4.4 }, b: { x: 51.8, y: 4.4 }, until: s => s.players.every(p => p.y < 4.7 * T), min: 0.3 },
    { a: { x: 56, jump: 'hold' }, b: { x: 55.4, jump: 'hold' } },
    { a: { x: 66, proj: false }, b: { x: 66.6 } },
    { a: { x: 66 }, b: { x: 67.0, proj: true } },
    { a: { follow: true, off: -0.3, jump: 'no', max: 75 }, b: { x: 75.5, lead: 0.8 }, t: 10 },
    { a: { x: 78.6 }, b: { x: 79.4, proj: false }, until: s => s.cleared, t: 8 },
  ],
};

export class BotDriver {
  // mine: 온라인에서 이 기기가 맡은 캐릭터. 지정하면 상대 봇과 단계를 맞춰 진행한다
  constructor(sim, plan, mine) {
    this.sim = sim;
    this.mine = mine;
    this.peer = { i: 0, ready: false };
    this.ready = false;
    this.plan = plan;
    this.i = 0;
    this.t = 0;
    this.jumpHold = [0, 0];
    this.projSent = [false, false];
    this.want = [false, false];
    this.error = null;
    this.log = [];
  }

  get done() { return this.i >= this.plan.length; }

  targetX(step, idx) {
    const act = idx ? step.b : step.a;
    if (!act) return null;
    if (act.follow) {
      const o = this.sim.players[1 - idx];
      const fx = o.x + (act.off || 0) * T;
      return act.max !== undefined ? Math.min(fx, act.max * T) : fx;
    }
    return act.x === undefined ? null : act.x * T;
  }

  reached(step, idx) {
    const act = idx ? step.b : step.a;
    const p = this.sim.players[idx];
    if (!act) return true;
    if (p.dead) return false;
    if (act.proj !== undefined && p.proj !== act.proj) return false;
    if (act.follow) return act.max === undefined || Math.abs(p.x - act.max * T) < (act.tol || 0.3) * T;
    const ct = this.sim.tileFor(idx, Math.floor(p.x / T), Math.floor(p.y / T));
    if (!p.grounded && !isFluid(ct) && !act.air) return false;
    const tx = this.targetX(step, idx);
    if (tx !== null && Math.abs(p.x - tx) > (act.tol || 0.3) * T) return false;
    return true;
  }

  inputs(dt) {
    const sim = this.sim;
    if (this.done || this.error) return [null, null];
    const step = this.plan[this.i];
    this.t += dt;

    let ok;
    if (this.mine === undefined) {
      ok = (step.until ? step.until(sim) : (this.reached(step, 0) && this.reached(step, 1))) && this.t >= (step.min || 0);
    } else {
      this.ready = (step.until ? step.until(sim) : this.reached(step, this.mine)) && this.t >= (step.min || 0);
      const peerOk = this.peer.i > this.i || (this.peer.i === this.i && this.peer.ready);
      ok = this.ready && peerOk;
    }
    if (ok) {
      this.log.push(`step ${this.i} done @${sim.time.toFixed(2)}s`);
      this.i++; this.t = 0; this.ready = false;
      return this.inputs(0);
    }
    if (this.t > (step.t || 15)) {
      this.error = `step ${this.i} timeout`;
      return [null, null];
    }
    return [this.drive(step, 0, dt), this.drive(step, 1, dt)];
  }

  drive(step, idx, dt) {
    const sim = this.sim, p = sim.players[idx];
    const act = (idx ? step.b : step.a) || {};
    const inp = { left: false, right: false, jump: false, proj: false };
    if (p.dead) return inp;

    if (act.proj !== undefined) this.want[idx] = act.proj;
    const want = this.want[idx];
    const canToggle = want ? p.projCd <= 0 : true;
    if (p.proj !== want && canToggle && !this.projSent[idx]) { inp.proj = true; this.projSent[idx] = true; }
    else this.projSent[idx] = false;

    const q = (tx, ty) => sim.tileFor(idx, tx, ty);
    const tx = this.targetX(step, idx);
    let dir = 0;
    if (tx !== null) {
      const dx = tx - p.x;
      if (Math.abs(dx) > 3) dir = Math.sign(dx);
      // 따라가는 중에는 목표에 거의 붙어도 상대가 움직이는 방향으로 계속 간다 (공중에서 속도가 죽지 않게)
      if (act.follow && Math.abs(dx) <= 10) {
        const o = sim.players[1 - idx];
        const atMax = act.max !== undefined && Math.abs(p.x - act.max * T) < 6;
        if (Math.abs(o.vx) > 60 && !atMax) dir = Math.sign(o.vx);
      }
    }
    if (act.lead && dir) {
      const o = sim.players[1 - idx];
      if (Math.abs(o.x - p.x) > act.lead * T && Math.sign(p.x - o.x) === dir) dir = 0;
    }
    inp.left = dir < 0; inp.right = dir > 0;

    const ct = q(Math.floor(p.x / T), Math.floor(p.y / T));
    const mode = act.jump || 'auto';
    if (mode === 'hold') { inp.jump = true; return inp; }
    this.jumpHold[idx] = Math.max(0, this.jumpHold[idx] - dt);
    if (this.jumpHold[idx] > 0) { inp.jump = true; return inp; }
    // 상대가 막 뛰었으면 같이 뛴다
    if (act.jumpWith && p.grounded && !p.prevJump) {
      const o = sim.players[1 - idx];
      if (!o.grounded && o.vy < -250) { inp.jump = true; this.jumpHold[idx] = 0.4; return inp; }
    }
    if (isFluid(ct)) {
      if (act.y !== undefined) inp.jump = p.y > act.y * T;
      else inp.jump = mode !== 'no' && ct === '|';
      return inp;
    }
    if (mode === 'no') return inp;

    if (p.grounded && dir && tx !== null && Math.abs(tx - p.x) > T * 0.8) {
      const hw = PHYS.w / 2, hh = PHYS.h / 2;
      const col = Math.floor((p.x + dir * (hw + 8)) / T);
      const rowBody = Math.floor((p.y + hh - 2) / T);
      const rowMid = Math.floor(p.y / T);
      const rowFoot = Math.floor((p.y + hh + 4) / T);
      const wall = isSolid(q(col, rowBody)) || isSolid(q(col, rowMid));
      const spike = q(col, rowBody) === '^' || q(col + dir, rowBody) === '^';
      const gap = !isSolid(q(col, rowFoot)) && !isFluid(q(col, rowFoot)) && !isFluid(q(col, rowBody));
      if ((wall || spike || gap) && !p.prevJump) { inp.jump = true; this.jumpHold[idx] = 0.4; }
    }
    return inp;
  }
}
