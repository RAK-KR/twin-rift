// 공통 상수
export const T = 32;            // 타일 크기(px)
export const VIEW_W = 960;      // 논리 해상도
export const VIEW_H = 540;
export const FIXED_DT = 1 / 120;

export const PHYS = {
  w: 22, h: 26,          // 충돌 박스
  run: 210,              // 달리기 속도
  accG: 2400,            // 지상 가속
  accA: 1600,            // 공중 가속
  grav: 1900,
  maxFall: 720,
  jumpV: 600,            // 점프 높이 약 3칸 미만(2칸 턱까지)
  cut: 0.45,             // 점프 키를 일찍 떼면 낮게
  coyote: 0.09,
  buffer: 0.12,
  swimGrav: 520,         // 물속 가라앉는 힘
  swimUp: 230,           // 점프 키 누르면 위로 헤엄
  waterMaxFall: 150,
  windUp: 300,           // 바람 기둥 상승 속도
  windAcc: 2600,
  fluidHop: 470,         // 물/바람 위로 빠져나올 때 튀어오르는 힘
  fluidRun: 0.8,
};

export const CHARS = [
  { id: 0, key: 'aqua', name: 'AQUA', world: '물에 잠긴 도시', color: '#4db8ff', dark: '#16486b', light: '#bfe7ff' },
  { id: 1, key: 'dune', name: 'DUNE', world: '모래에 묻힌 도시', color: '#ffa44a', dark: '#7a4413', light: '#ffe2bd' },
];

export const NET_PREFIX = 'twinrift-v1-';
export const SEND_HZ = 30;
