# 아이들을 위한 받아쓰기 놀이터 (3차 게임형 업그레이드)

정적 웹앱(HTML/CSS/Vanilla JS) 기반의 어린이 받아쓰기 게임입니다.
GitHub Pages에 그대로 배포 가능하며, 백엔드 없이 `localStorage`로 데이터가 저장됩니다.

## 1) 3차 파일 구조 제안 (적용 완료)

```bash
/
├─ index.html   # 뷰(홈/플레이/결과/랭킹/업적) 레이아웃 + 템플릿
├─ style.css    # 뷰별 분위기/게임형 HUD/애니메이션/반응형 스타일
├─ data.js      # 문제/미션/업적/레벨/점수 룰 상수
├─ storage.js   # load/save + v2→v3 마이그레이션 + 정규화
├─ game.js      # 게임 로직(세션, 점수, 업적, 미션, 랭킹)
├─ ui.js        # 렌더링/뷰 전환/피드백/토스트 UI
├─ app.js       # 이벤트 바인딩 + 앱 구동 제어
└─ README.md
```

> `index.html`에서 순서대로 script를 로드하므로 별도 빌드 없이 동작합니다.

## 2) 2차 대비 핵심 개선점

- 한 화면 몰빵에서 **뷰 전환 구조**로 개편
  - 홈 / 플레이 / 결과 / 랭킹 / 업적
- **게임 흐름 강화**
  - 시작하기 → 문제풀이 → 결과창 → 보상/랭킹/업적 확인
- **오늘의 미션 3개** 반영
  - 3연속 정답, 오늘 5문제, 다시듣기 없이 2정답
- **업적 6개** 구현
  - 첫 정답, 3연속, 10문제, 정답률80%, 무재생정답, 챔피언
- **레벨 시스템**
  - 누적 점수 기반(새싹/반짝/별님/무지개)
- **복습 기반 저장**
  - 오답 단어를 `reviewWords`에 누적
- **세션 결과 화면 분리**
  - 점수/정오답/최고연속/칭찬/보상 칩 출력
- **기존 2차 데이터 호환**
  - `dictationPlayground_v2`를 읽어 `v3` 구조로 마이그레이션

## 3) localStorage 데이터 구조 (v3)

저장 키: `dictationPlayground_v3`

```json
{
  "version": 3,
  "children": [],
  "selectedChildId": "child-xxx",
  "gameHistory": [],
  "currentSession": {
    "active": false,
    "questionIds": [],
    "currentIndex": 0,
    "solved": 0,
    "correct": 0,
    "incorrect": 0,
    "scoreGained": 0,
    "bestStreak": 0,
    "streak": 0,
    "rewards": []
  },
  "settings": { "autoNext": false, "randomMode": true },
  "ui": { "currentView": "home", "isPlaying": false, "replayCount": 0, "childManagerOpen": false },
  "achievements": { "childId": ["first_correct", "streak3"] },
  "missions": { "date": "2026-03-10", "items": [{ "id": "mission_streak3", "progress": 1, "completed": false }] },
  "childLevels": {},
  "recentSessions": [],
  "unlockedBadges": { "childId": ["first_correct"] },
  "reviewWords": { "childId": [{ "word": "도서관", "count": 2, "lastWrongAt": "..." }] }
}
```

## 4) 기존 데이터 호환/마이그레이션

- 로딩 우선순위
  1. `dictationPlayground_v3`가 있으면 그대로 로드
  2. 없고 `dictationPlayground_v2`가 있으면 v3 구조로 변환 후 저장
  3. 둘 다 없으면 샘플 데이터(친구 3명)로 초기화
- 마이그레이션 시 유지되는 핵심 데이터
  - `children`, `selectedChildId`, `gameHistory`, `currentSession`, `settings`, `ui`
- v3에 필요한 새 필드(`achievements`, `missions`, `recentSessions`, `reviewWords` 등)는 기본값으로 보정

## 5) 실행 방법

### 바로 실행
- `index.html`을 브라우저에서 열기

### 로컬 서버(권장)
```bash
python3 -m http.server 8000
```
- `http://localhost:8000`

## 6) GitHub Pages 배포 확인 포인트

1. 홈/플레이/결과/랭킹/업적 뷰 전환이 자연스러운지
2. 시작하기 후 10문제 세션 흐름이 끊기지 않는지
3. 정답 시 점수/연속정답/보상 토스트가 즉시 반영되는지
4. 오답 시 복습 단어가 랭킹 화면에 저장되는지
5. 세션 종료 시 결과 화면으로 이동하는지
6. 새로고침 후에도 업적/미션/랭킹/기록이 유지되는지
7. 기존 v2 사용자의 데이터가 초기화되지 않고 이어지는지

## 7) 4차 확장 아이디어

1. TTS/음원 재생 모드 추가 (실제 받아쓰기 듣기 강화)
2. 문제집 선택(주제/난이도/학년별) + 즐겨찾기 문제집
3. 오답 복습 라운드 자동 생성(틀린 단어 우선 출제)
4. 보호자 리포트(주간 성장 그래프, 취약 단어)
5. 업적 보상으로 아바타/스티커 커스터마이징
