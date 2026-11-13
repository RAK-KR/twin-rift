# TWIN RIFT

https://rak-kr.github.io/twin-rift/

2인 온라인 협동 퍼즐 플랫포머. 두 사람이 서로 다른 평행 세계(물에 잠긴 도시 AQUA / 모래에 묻힌 도시 DUNE)를 보며 진행합니다.

## 핵심 규칙
- E로 간섭을 켜면, 내 주변 원 안에서 **상대 세계에 내 세계의 지형이 그대로 생깁니다.**
- 길(다리, 빈 통로, 물, 바람)뿐 아니라 위험(가시)도 같이 넘어갑니다.
- 두 사람이 모두 출구에 들어가야 클리어입니다.

## 조작
| 동작 | 키 |
|---|---|
| 이동 | ← → / A D |
| 점프, 물속에서 헤엄 | Space / W / ↑ |
| 간섭 켜기/끄기 | E |
| 위치 핑 | Q |
| 채팅 | Enter (닫기 Esc) |
| 다시 시작 | R |
| 메뉴 | Esc |
| 소리 | M |

## 모드
- 방 만들기 / 참가: 4자리 방 코드로 친구와 접속합니다 (PeerJS 공개 서버 사용)
- 혼자 연습: 한 화면에서 두 캐릭터를 Tab으로 번갈아 조작합니다
- 봇 시연: 봇 두 개가 스테이지를 푸는 모습을 봅니다

## 파일 구조
```
index.html
css/style.css
lib/peerjs.min.js      PeerJS (MIT)
js/config.js           상수, 캐릭터 정보
js/levels.js           스테이지 지형
js/physics.js          이동과 충돌
js/sim.js              스테이지 진행, 간섭 판정
js/bot.js              테스트용 봇
js/net.js              방 코드 접속
js/chat.js             채팅
js/render.js           그리기
js/audio.js            효과음
js/input.js            키보드, 터치
js/main.js             화면 흐름
```
