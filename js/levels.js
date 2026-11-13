// 스테이지 데이터
// 지형 문자: '.' 빈칸  '#' 벽/바닥  '^' 가시  '~' 물(AQUA)  '|' 상승 바람(DUNE)
// worlds[0] = AQUA 세계, worlds[1] = DUNE 세계. 두 세계는 같은 좌표를 공유한다.
// 화면에는 세로 16칸이 보이고, 그보다 높은 맵은 카메라가 위아래로 따라간다.

export const VIEW_ROWS = 16;

function grid(W, H) {
  return Array.from({ length: H }, () => Array(W).fill('.'));
}
function fill(g, x0, y0, x1, y1, c) {
  const H = g.length, W = g[0].length;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = c;
  }
}
// 맨 아래 3줄을 바닥으로 채운 맵 (서 있는 줄 = H-4)
function base(W, H = 16) {
  const g = grid(W, H);
  fill(g, 0, H - 3, W - 1, H - 1, '#');
  return g;
}
// 바닥에 구멍을 내고 밑에 가시를 깐다
function pit(g, x0, x1) {
  const H = g.length;
  fill(g, x0, H - 3, x1, H - 2, '.');
  fill(g, x0, H - 2, x1, H - 2, '^');
}

// ---------------- 1 ----------------
function sFirst() {
  const W = 58, a = base(W), b = base(W);
  pit(b, 12, 17);                                   // DUNE: 건널 수 없는 구덩이 -> AQUA 다리
  fill(a, 21, 0, 22, 12, '#');                      // AQUA: 막힌 벽 -> DUNE 빈 공간
  fill(a, 29, 6, 32, 12, '~');                      // AQUA: 물기둥 -> 같이 헤엄쳐 오르기
  fill(a, 33, 7, 40, 12, '#'); fill(b, 33, 7, 40, 12, '#');
  fill(b, 44, 3, 46, 12, '|');                      // DUNE: 바람 기둥 -> 같이 날아오르기
  fill(a, 48, 6, 57, 12, '#'); fill(b, 48, 6, 57, 12, '#');
  return {
    id: 's1', title: '첫 간섭', sub: 'E로 간섭을 켜면 내 세계가 내 주변에서 상대 세계로 넘어갑니다',
    W, R: 2.8, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 26, ty: 12 }, { tx: 42, ty: 12 }],
    exit: { tx: 54, ty: 4, tw: 2, th: 2 },
  };
}

// ---------------- 2 ----------------
function sSpikes() {
  const W = 56, a = base(W), b = base(W);
  fill(a, 10, 12, 17, 12, '^');                     // AQUA: 가시밭
  fill(b, 20, 12, 21, 12, '^');                     // DUNE 가시: 간섭을 켠 채 지나가면 AQUA에게 넘어간다
  fill(a, 26, 0, 27, 12, '#');                      // 서로 엇갈린 벽
  fill(b, 33, 0, 34, 12, '#');
  fill(a, 39, 9, 47, 12, '~');                      // AQUA: 수영장
  pit(b, 39, 47);                                   // DUNE: 긴 구덩이
  return {
    id: 's2', title: '따라오는 가시', sub: '간섭은 길만 넘기지 않습니다. 위험도 같이 넘어갑니다',
    W, R: 2.8, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 22, ty: 12 }, { tx: 37, ty: 12 }],
    exit: { tx: 52, ty: 11, tw: 2, th: 2 },
  };
}

// ---------------- 3 ----------------
function sNarrow() {
  const W = 51, a = base(W), b = base(W);
  pit(b, 11, 17);                                   // 좁은 간섭으로 바짝 붙어 건너기
  fill(a, 22, 0, 23, 12, '#');
  fill(b, 31, 3, 32, 12, '|');
  fill(a, 33, 5, 42, 12, '#'); fill(b, 33, 5, 42, 12, '#');
  fill(a, 45, 12, 46, 12, '^');
  return {
    id: 's3', title: '좁아진 틈', sub: '간섭 범위가 줄었습니다. 바짝 붙어서 움직이세요',
    W, R: 2.0, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 20, ty: 12 }, { tx: 28, ty: 12 }],
    exit: { tx: 48, ty: 11, tw: 2, th: 2 },
  };
}

// ---------------- 4: 징검다리 ----------------
// 두 세계의 구덩이가 번갈아 나온다. 한 사람이 다리를 놓으면 다른 사람이 건너가 다음 다리를 놓는다.
function sRelay() {
  const W = 70, a = base(W), b = base(W);
  pit(b, 9, 14);
  pit(a, 21, 26);
  pit(b, 33, 38);
  pit(a, 45, 50);
  pit(b, 57, 62);
  return {
    id: 's5', title: '징검다리', sub: '한 명이 다리를 놓으면, 건너간 사람이 다음 다리를 놓습니다',
    W, R: 3.2, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 18, ty: 12 }, { tx: 42, ty: 12 }, { tx: 54, ty: 12 }],
    exit: { tx: 66, ty: 11, tw: 2, th: 2 },
  };
}

// ---------------- 5: 위로 (세로 맵) ----------------
// 물 -> 바람 -> 물 순서로 지그재그로 올라간다.
function sUp() {
  const W = 32, H = 34, a = base(W, H), b = base(W, H);
  for (const g of [a, b]) {
    fill(g, 12, 23, 31, 30, '#');                   // 1층 선반
    fill(g, 0, 14, 19, 15, '#');                    // 2층 선반 (바람 기둥 바로 옆까지)
    fill(g, 5, 5, 31, 6, '#');                      // 꼭대기 선반
  }
  fill(a, 9, 22, 11, 30, '~');                      // AQUA 물기둥 (1층으로)
  fill(b, 20, 13, 22, 22, '|');                     // DUNE 바람 기둥 (2층으로)
  fill(a, 2, 4, 4, 13, '~');                        // AQUA 물기둥 (꼭대기로)
  return {
    id: 's6', title: '위로', sub: '물과 바람을 번갈아 타고 끝까지 올라가세요',
    W, H, R: 3.0, worlds: [a, b],
    spawn: [{ tx: 2, ty: 30 }, { tx: 4, ty: 30 }],
    flags: [{ tx: 25, ty: 22 }, { tx: 10, ty: 13 }],
    exit: { tx: 28, ty: 3, tw: 2, th: 2 },
  };
}

// ---------------- 6: 같은 걸음 ----------------
// 긴 벽 복도와 긴 가시밭, 긴 수영장. 간섭을 켠 사람이 앞장서고 다른 사람은 원 안에 붙어 따라간다.
function sTogether() {
  const W = 64, a = base(W), b = base(W);
  fill(b, 10, 0, 19, 12, '#');                      // DUNE: 10칸짜리 벽 복도
  fill(a, 25, 12, 34, 12, '^');                     // AQUA: 10칸 가시밭
  fill(a, 40, 9, 51, 12, '~');                      // AQUA: 긴 수영장
  pit(b, 40, 51);                                   // DUNE: 긴 구덩이
  return {
    id: 's7', title: '같은 걸음', sub: '간섭은 6초뿐입니다. 원 밖으로 벗어나지 말고 같이 걸으세요',
    W, R: 2.6, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 22, ty: 12 }, { tx: 37, ty: 12 }, { tx: 54, ty: 12 }],
    exit: { tx: 58, ty: 11, tw: 2, th: 2 },
  };
}

// ---------------- 7: 같이 뛰어 ----------------
// 다리를 놓는 사람이 자기 세계 가시를 넘으려고 뛰면 원도 같이 떠오른다. 건너는 사람도 같은 순간에 뛰어야 한다.
function sJump() {
  const W = 56, a = base(W), b = base(W);
  pit(b, 12, 19);                                   // DUNE 구덩이
  fill(a, 15, 12, 15, 12, '^');                     // 그 위 AQUA 가시: AQUA가 뛰어야 함
  pit(a, 28, 35);                                   // AQUA 구덩이
  fill(b, 31, 12, 31, 12, '^');                     // 그 위 DUNE 가시: DUNE이 뛰어야 함
  fill(b, 42, 0, 43, 12, '#');                      // DUNE 벽
  fill(a, 45, 12, 46, 12, '^');                     // 벽 너머 AQUA 가시 (간섭 중이면 DUNE에게도 넘어감)
  return {
    id: 's8', title: '같이 뛰어', sub: '다리를 놓은 사람이 뛰면 다리도 같이 떠오릅니다. 셋 하면 같이 뛰세요',
    W, R: 3.4, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 24, ty: 12 }, { tx: 38, ty: 12 }],
    exit: { tx: 51, ty: 11, tw: 2, th: 2 },
  };
}

// ---------------- 8: 깊은 물 ----------------
function sDeep() {
  const W = 60, a = base(W), b = base(W);
  fill(a, 6, 5, 23, 12, '~');                       // AQUA: 넓은 물웅덩이
  fill(b, 12, 0, 13, 12, '#');                      // DUNE: 벽
  fill(b, 17, 12, 18, 12, '^');                     // DUNE: 가시 (AQUA 원 안에서는 사라짐)
  fill(a, 24, 6, 34, 12, '#'); fill(b, 24, 6, 34, 12, '#');   // 높은 선반
  fill(a, 27, 5, 31, 5, '^');                       // 선반 위 AQUA 가시밭
  fill(a, 37, 9, 46, 12, '~');                      // AQUA: 수영장
  pit(b, 38, 45);                                   // DUNE: 구덩이
  return {
    id: 's9', title: '깊은 물', sub: '물속에서는 느려집니다. 서로 놓치지 마세요',
    W, R: 2.4, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 25, ty: 5 }, { tx: 36, ty: 12 }],
    exit: { tx: 52, ty: 11, tw: 2, th: 2 },
  };
}

// ---------------- 9: 마지막 시험 ----------------
function sFinal() {
  const W = 84, a = base(W), b = base(W);
  pit(b, 8, 14);                                    // 좁은 원으로 따라 건너기
  fill(a, 20, 0, 21, 12, '#');                      // AQUA 벽
  fill(b, 27, 3, 28, 12, '|');                      // DUNE 바람
  fill(a, 29, 5, 38, 12, '#'); fill(b, 29, 5, 38, 12, '#');
  fill(a, 31, 4, 35, 4, '^');                       // 선반 위 AQUA 가시밭
  pit(b, 42, 47);                                   // DUNE 구덩이: 좁은 원으로 따라 건너기
  fill(a, 51, 4, 53, 12, '~');                      // AQUA 물기둥
  fill(a, 54, 5, 63, 12, '#'); fill(b, 54, 5, 63, 12, '#');
  pit(a, 68, 73);                                   // AQUA 구덩이
  return {
    id: 's10', title: '마지막 시험', sub: '지금까지 배운 것을 전부, 더 좁은 원으로',
    W, R: 2.4, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 18, ty: 12 }, { tx: 25, ty: 12 }, { tx: 49, ty: 12 }, { tx: 66, ty: 12 }],
    exit: { tx: 78, ty: 11, tw: 2, th: 2 },
  };
}

// ---------------- 10: 붕괴 ----------------
function sCollapse() {
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
    id: 's4', title: '붕괴', sub: '두 세계가 무너지고 있습니다. 멈추지 말고 달리세요',
    W, R: 2.8, worlds: [a, b],
    spawn: [{ tx: 2, ty: 12 }, { tx: 4, ty: 12 }],
    flags: [{ tx: 24, ty: 12 }, { tx: 39, ty: 12 }, { tx: 68, ty: 12 }],
    exit: { tx: 80, ty: 11, tw: 2, th: 2 },
    collapse: { delay: 4, speed: 46 },
  };
}

// 순서가 곧 스테이지 번호. 기록은 id로 저장되므로 순서를 바꿔도 기존 기록이 유지된다.
export const STAGES = [sFirst(), sSpikes(), sNarrow(), sRelay(), sUp(), sTogether(), sJump(), sDeep(), sFinal(), sCollapse()]
  .map((s, i) => ({ H: 16, ...s, name: `${i + 1}. ${s.title}` }));

// 디버그용 ASCII 출력
export function dump(stage) {
  return stage.worlds.map((g, i) => `--- ${i ? 'DUNE' : 'AQUA'} ---\n` + g.map(r => r.join('')).join('\n')).join('\n');
}
