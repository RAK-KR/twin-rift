// 스테이지 데이터
// 지형 문자: '.' 빈칸  '#' 벽/바닥  '^' 가시  '~' 물(AQUA)  '|' 상승 바람(DUNE)
// worlds[0] = AQUA 세계, worlds[1] = DUNE 세계. 두 세계는 같은 좌표를 공유한다.

const H = 16;

function grid(W) {
  return Array.from({ length: H }, () => Array(W).fill('.'));
}
function fill(g, x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y >= 0 && y < H && x >= 0 && x < g[0].length) g[y][x] = c;
  }
}
function base(W) {
  const g = grid(W);
  fill(g, 0, 13, W - 1, 15, '#');
  return g;
}
// 바닥에 구멍을 내고 밑에 가시를 깐다
function pit(g, x0, x1) {
  fill(g, x0, 13, x1, 14, '.');
  fill(g, x0, 14, x1, 14, '^');
}

function stage1() {
  const W = 58, a = base(W), b = base(W);
  pit(b, 12, 17);                                   // DUNE: 건널 수 없는 구덩이 -> AQUA 다리
  fill(a, 21, 0, 22, 12, '#');                      // AQUA: 막힌 벽 -> DUNE 빈 공간
  fill(a, 29, 6, 32, 12, '~');                      // AQUA: 물기둥 -> 같이 헤엄쳐 오르기
  fill(a, 33, 7, 40, 12, '#'); fill(b, 33, 7, 40, 12, '#');
  fill(b, 44, 3, 46, 12, '|');                      // DUNE: 바람 기둥 -> 같이 날아오르기
  fill(a, 48, 6, 57, 12, '#'); fill(b, 48, 6, 57, 12, '#');
  return {
    id: 's1', name: '1. 첫 간섭', sub: 'E로 간섭을 켜면 내 세계가 내 주변에서 상대 세계로 넘어갑니다',
    W, R: 2.8, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 26, ty: 12 }, { tx: 42, ty: 12 }],
    exit: { tx: 54, ty: 4, tw: 2, th: 2 },
  };
}

function stage2() {
  const W = 56, a = base(W), b = base(W);
  fill(a, 10, 12, 17, 12, '^');                     // AQUA: 가시밭
  fill(b, 20, 12, 21, 12, '^');                     // DUNE 가시: 간섭을 켠 채 지나가면 AQUA에게 넘어간다
  fill(a, 26, 0, 27, 12, '#');                      // 서로 엇갈린 벽
  fill(b, 33, 0, 34, 12, '#');
  fill(a, 39, 9, 47, 12, '~');                      // AQUA: 수영장
  pit(b, 39, 47);                                   // DUNE: 긴 구덩이
  return {
    id: 's2', name: '2. 따라오는 가시', sub: '간섭은 길만 넘기지 않습니다. 위험도 같이 넘어갑니다',
    W, R: 2.8, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 22, ty: 12 }, { tx: 37, ty: 12 }],
    exit: { tx: 52, ty: 11, tw: 2, th: 2 },
  };
}

function stage3() {
  const W = 51, a = base(W), b = base(W);
  pit(b, 11, 17);                                   // 좁은 간섭으로 바짝 붙어 건너기
  fill(a, 22, 0, 23, 12, '#');
  fill(b, 31, 3, 32, 12, '|');
  fill(a, 33, 5, 42, 12, '#'); fill(b, 33, 5, 42, 12, '#');
  fill(a, 45, 12, 46, 12, '^');
  return {
    id: 's3', name: '3. 좁아진 틈', sub: '간섭 범위가 줄었습니다. 바짝 붙어서 움직이세요',
    W, R: 2.0, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 20, ty: 12 }, { tx: 28, ty: 12 }],
    exit: { tx: 48, ty: 11, tw: 2, th: 2 },
  };
}

function stage4() {
  const W = 84, a = base(W), b = base(W);
  pit(b, 9, 14);
  fill(a, 19, 0, 20, 12, '#');
  fill(a, 26, 6, 29, 12, '~');
  fill(a, 30, 7, 37, 12, '#'); fill(b, 30, 7, 37, 12, '#');
  fill(a, 41, 12, 46, 12, '^');
  fill(b, 52, 3, 54, 12, '|');
  fill(a, 56, 6, 66, 12, '#'); fill(b, 56, 6, 66, 12, '#');
  pit(b, 70, 75);
  return {
    id: 's4', name: '4. 붕괴', sub: '두 세계가 무너지고 있습니다. 멈추지 말고 달리세요',
    W, R: 2.8, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 24, ty: 12 }, { tx: 39, ty: 12 }, { tx: 68, ty: 12 }],
    exit: { tx: 80, ty: 11, tw: 2, th: 2 },
    collapse: { delay: 4, speed: 46 },
  };
}

export const STAGES = [stage1(), stage2(), stage3(), stage4()].map(s => ({ ...s, H }));

// 디버그용 ASCII 출력
export function dump(stage) {
  return stage.worlds.map((g, i) => `--- ${i ? 'DUNE' : 'AQUA'} ---\n` + g.map(r => r.join('')).join('\n')).join('\n');
}
