// 캐릭터 이동/충돌. q(tx, ty)는 이 캐릭터가 보는 "실제 지형" 문자를 돌려준다.
import { T, PHYS as P } from './config.js';

const EPS = 0.01;
export const isSolid = c => c === '#';
export const isFluid = c => c === '~' || c === '|';

const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));

export function makeBody(world, tx, ty) {
  return {
    world,
    x: tx * T + T / 2, y: (ty + 1) * T - P.h / 2,
    vx: 0, vy: 0, face: 1,
    grounded: false, coyote: 0, buffer: 0, jumping: false,
    prevJump: false, prevProj: false,
    wasFluid: false, wasWater: false,
    proj: false, dead: false, deadT: 0,
    atExit: false, landT: 0, jumpT: 0, fallV: 0,
  };
}

// 한 틱 이동. 발생한 이벤트 이름 배열을 돌려준다.
export function physStep(p, inp, q, dt) {
  const ev = [];
  const hw = P.w / 2, hh = P.h / 2;

  // 지형이 갑자기 몸 위로 생겼을 때 끼지 않도록, 이미 겹친 벽은 이번 틱에 무시한다
  const ghost = new Set();
  {
    const x0 = Math.floor((p.x - hw) / T), x1 = Math.floor((p.x + hw - EPS) / T);
    const y0 = Math.floor((p.y - hh) / T), y1 = Math.floor((p.y + hh - EPS) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(q(tx, ty))) ghost.add(tx * 4096 + ty);
    }
  }
  const solid = (tx, ty) => isSolid(q(tx, ty)) && !ghost.has(tx * 4096 + ty);

  const ct = q(Math.floor(p.x / T), Math.floor(p.y / T));
  const inWater = ct === '~', inWind = ct === '|';
  const fluid = inWater || inWind;

  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  const jumpPressed = !!inp.jump && !p.prevJump;
  p.prevJump = !!inp.jump;
  p.buffer = jumpPressed ? P.buffer : Math.max(0, p.buffer - dt);

  const target = dir * P.run * (fluid ? P.fluidRun : 1);
  p.vx = approach(p.vx, target, (p.grounded ? P.accG : P.accA) * dt);
  if (dir) p.face = dir;

  if (inWater) {
    p.vy += P.swimGrav * dt;
    if (inp.jump) p.vy = approach(p.vy, -P.swimUp, 2400 * dt);
    p.vy = Math.max(-P.swimUp - 40, Math.min(P.waterMaxFall, p.vy));
    p.coyote = 0; p.jumping = false;
  } else if (inWind) {
    p.vy = approach(p.vy, -P.windUp, P.windAcc * dt);
    p.coyote = 0; p.jumping = false;
  } else {
    p.vy = Math.min(P.maxFall, p.vy + P.grav * dt);
    p.coyote = p.grounded ? P.coyote : Math.max(0, p.coyote - dt);
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -P.jumpV; p.buffer = 0; p.coyote = 0; p.grounded = false; p.jumping = true;
      p.jumpT = 0.18;
      ev.push('jump');
    }
    if (p.jumping && !inp.jump && p.vy < 0) { p.vy *= P.cut; p.jumping = false; }
    if (p.vy >= 0) p.jumping = false;
  }
  if (p.wasFluid && !fluid && inp.jump && p.vy < 0) { p.vy = -P.fluidHop; ev.push('hop'); }
  if (inWater && !p.wasWater) ev.push('splash');
  p.wasFluid = fluid; p.wasWater = inWater;

  // X 이동
  p.x += p.vx * dt;
  {
    const y0 = Math.floor((p.y - hh) / T), y1 = Math.floor((p.y + hh - EPS) / T);
    if (p.vx > 0) {
      const tx = Math.floor((p.x + hw - EPS) / T);
      for (let ty = y0; ty <= y1; ty++) if (solid(tx, ty)) { p.x = tx * T - hw; p.vx = 0; break; }
    } else if (p.vx < 0) {
      const tx = Math.floor((p.x - hw) / T);
      for (let ty = y0; ty <= y1; ty++) if (solid(tx, ty)) { p.x = (tx + 1) * T + hw; p.vx = 0; break; }
    }
  }
  // Y 이동
  const wasGrounded = p.grounded;
  const fallV = p.vy;
  p.grounded = false;
  p.y += p.vy * dt;
  {
    const x0 = Math.floor((p.x - hw) / T), x1 = Math.floor((p.x + hw - EPS) / T);
    if (p.vy > 0) {
      const ty = Math.floor((p.y + hh - EPS) / T);
      for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) { p.y = ty * T - hh; p.vy = 0; p.grounded = true; break; }
    } else if (p.vy < 0) {
      const ty = Math.floor((p.y - hh) / T);
      for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) { p.y = (ty + 1) * T + hh; p.vy = 0; break; }
    }
  }
  if (p.grounded && !wasGrounded && fallV > 260) { ev.push('land'); p.landT = 0.14; p.fallV = fallV; }
  p.landT = Math.max(0, p.landT - dt);
  p.jumpT = Math.max(0, p.jumpT - dt);
  return ev;
}

// 가시 판정: 가시 타일의 아래쪽 부분과 몸이 겹치면 사망
export function touchesSpike(p, q) {
  const hw = P.w / 2 - 2, hh = P.h / 2 - 1;
  const x0 = Math.floor((p.x - hw) / T), x1 = Math.floor((p.x + hw) / T);
  const y0 = Math.floor((p.y - hh) / T), y1 = Math.floor((p.y + hh) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (q(tx, ty) !== '^') continue;
    const sx0 = tx * T + 5, sx1 = tx * T + T - 5, sy0 = ty * T + 14, sy1 = ty * T + T;
    if (p.x + hw > sx0 && p.x - hw < sx1 && p.y + hh > sy0 && p.y - hh < sy1) return true;
  }
  return false;
}
