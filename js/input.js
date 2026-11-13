// 키보드 + 터치 입력
const held = new Set();
const pressedOnce = new Set();
const touch = { left: false, right: false, jump: false, proj: false, kill: false };

const typing = () => {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
};

const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab']);

export function initInput() {
  window.addEventListener('keydown', e => {
    if (typing()) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!held.has(e.code) && !e.repeat) pressedOnce.add(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', e => { held.delete(e.code); });
  window.addEventListener('blur', () => held.clear());

  document.querySelectorAll('[data-touch]').forEach(el => {
    const k = el.dataset.touch;
    const on = e => { e.preventDefault(); touch[k] = true; el.classList.add('on'); if (k === 'ping') pressedOnce.add('KeyQ'); if (k === 'swap') pressedOnce.add('Tab'); };
    const off = e => { e.preventDefault(); touch[k] = false; el.classList.remove('on'); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  });
}

export function readMove() {
  if (typing()) return { left: false, right: false, jump: false, proj: false, kill: false };
  return {
    left: held.has('ArrowLeft') || held.has('KeyA') || touch.left,
    right: held.has('ArrowRight') || held.has('KeyD') || touch.right,
    jump: held.has('Space') || held.has('ArrowUp') || held.has('KeyW') || touch.jump,
    proj: held.has('KeyE') || held.has('ShiftLeft') || held.has('ShiftRight') || touch.proj,
    kill: held.has('KeyK') || touch.kill,
  };
}

// 한 번 눌림 확인(프레임마다 비움)
export function took(code) {
  if (pressedOnce.has(code)) { pressedOnce.delete(code); return true; }
  return false;
}
export function clearPressed() { pressedOnce.clear(); }
export function releaseAll() { held.clear(); for (const k in touch) touch[k] = false; }

export function isHeld(code) { return held.has(code); }
