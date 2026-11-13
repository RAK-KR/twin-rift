// 실시간 채팅 UI
// 중복 방지 규칙
//  1) 한글 조합 중(isComposing / keyCode 229)에 눌린 Enter는 전송하지 않는다
//  2) 입력창을 먼저 비운 뒤 전송한다 (같은 내용이 두 번 읽힐 수 없음)
//  3) 화면에는 "ID가 붙은 메시지"만 표시하고, 이미 본 ID는 무시한다
export class Chat {
  constructor({ log, input, wrap, onSend }) {
    this.log = log;
    this.input = input;
    this.wrap = wrap;
    this.onSend = onSend;
    this.seen = new Set();
    this.inGame = false;

    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        if (e.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        this.submit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.value = '';
        input.blur();
      }
    });
    input.addEventListener('focus', () => this.wrap.classList.add('typing'));
    input.addEventListener('blur', () => this.wrap.classList.remove('typing'));
  }

  submit() {
    const text = this.input.value.replace(/\s+/g, ' ').trim().slice(0, 120);
    this.input.value = '';
    if (this.inGame) this.input.blur();
    if (!text) return;
    this.onSend(text);
  }

  // m: { id, name, color, text, sys }
  add(m) {
    if (m.id !== undefined) {
      if (this.seen.has(m.id)) return false;
      this.seen.add(m.id);
    }
    const row = document.createElement('div');
    row.className = 'msg' + (m.sys ? ' sys' : '');
    if (!m.sys) {
      const n = document.createElement('b');
      n.textContent = m.name;
      if (m.color) n.style.color = m.color;
      row.appendChild(n);
    }
    const t = document.createElement('span');
    t.textContent = m.text;
    row.appendChild(t);
    row.dataset.t = String(performance.now());
    this.log.appendChild(row);
    while (this.log.children.length > 60) this.log.removeChild(this.log.firstChild);
    this.log.scrollTop = this.log.scrollHeight;
    return true;
  }

  sys(text) { this.add({ sys: true, text }); }

  clear() { this.log.innerHTML = ''; this.seen.clear(); }

  open() { this.input.focus(); }

  get typing() { return document.activeElement === this.input; }

  // 게임 중에는 오래된 메시지를 흐리게 만든다
  tick() {
    if (!this.inGame || this.typing) {
      for (const r of this.log.children) r.classList.remove('old');
      return;
    }
    const now = performance.now();
    for (const r of this.log.children) r.classList.toggle('old', now - +r.dataset.t > 9000);
  }
}
