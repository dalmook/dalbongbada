# 아이들을 위한 받아쓰기 놀이터 (2차 확장 프로토타입)

GitHub Pages에서 바로 배포 가능한 **정적 웹앱(HTML/CSS/Vanilla JS)** 입니다.
백엔드 없이 `localStorage`로 아이별 기록/세션/랭킹을 저장합니다.

## 파일 구조

```bash
/
├─ index.html   # 화면 구조(헤더, 프로필, 게임, 진행률, 랭킹, 결과)
├─ style.css    # 파스텔 테마, 카드 UI, 반응형, 애니메이션
├─ app.js       # 게임 로직, 점수 규칙, 렌더링, localStorage 저장
└─ README.md    # 실행/배포/데이터 구조/확장 가이드
```

## 이번 2차에서 강화된 기능

- 아이 프로필 카드 강화
  - 이름, 누적 점수, 최고 연속 정답, 푼 문제 수, 정답 수, 정답률 표시
  - 캐릭터 배지(이모지) 표시
  - 선택된 아이 강조
- 점수 시스템 고도화
  - 기본 점수 + 연속 정답 보너스 + 다시듣기 페널티
  - 점수 규칙을 상수(`SCORE_RULES`)로 관리
- 문제 피드백 강화
  - 정답/오답 스타일 분리
  - 반짝이/흔들림 애니메이션
  - 연속 정답 축하 배너, 최고 기록 갱신 배너
- 랭킹 강화
  - 정렬 기준: 누적 점수 > 정답률 > 최고 연속 정답
  - 메달(🥇🥈🥉) 표시
  - 현재 선택된 아이 강조
- 진행 현황 강화
  - 오늘 세션 진행률(문제 수 + progress bar)
  - 세션 종료 시 요약(점수/정오답/최고연속/칭찬 문구)
- 문제 세트 확장
  - 12개 문제
  - `category`, `difficulty` 필드 포함
- UX 개선
  - Enter 키 제출
  - 다음 문제 버튼
  - 자동 다음 문제 토글

## 실행 방법

### 1) 가장 간단한 실행
- 루트의 `index.html` 파일을 브라우저로 직접 열어도 동작합니다.

### 2) 로컬 서버 실행(권장)
```bash
python3 -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속.

## GitHub Pages 배포 방법

1. 저장소에 코드 push
2. GitHub 저장소 → **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: `main`(또는 배포 브랜치), folder: `/ (root)`
5. 저장 후 발급 URL 접속

> 빌드 도구 없이 정적 파일만으로 동작합니다.

## localStorage 데이터 구조

저장 키: `dictationPlayground_v2`

```json
{
  "children": [
    {
      "id": "child-xxxx",
      "name": "하늘",
      "avatar": "🐰",
      "totalScore": 34,
      "streak": 2,
      "bestStreak": 4,
      "solvedCount": 5,
      "correctCount": 3
    }
  ],
  "selectedChildId": "child-xxxx",
  "gameHistory": [
    {
      "childId": "child-xxxx",
      "questionId": 1,
      "answer": "나무",
      "correctWord": "나무",
      "isCorrect": true,
      "replayCount": 0,
      "scoreAfter": 44,
      "playedAt": "2026-03-10T13:00:00.000Z"
    }
  ],
  "currentSession": {
    "solved": 3,
    "correct": 2,
    "incorrect": 1,
    "bestStreak": 2,
    "totalScoreGained": 21,
    "isFinished": false
  },
  "settings": {
    "autoNext": false
  },
  "ui": {
    "currentQuestionIndex": 3,
    "replayCount": 1,
    "isPlaying": false,
    "lastResult": "correct"
  }
}
```

## 확인 포인트 (GitHub Pages/정적 실행)

- 첫 실행 시 샘플 친구 데이터가 보이는지
- 친구 추가/선택 시 즉시 UI 반영 + 새로고침 후 유지되는지
- `문제 불러줘` 버튼 상태(읽는 중 → 완료)가 자연스러운지
- 다시듣기 제한(0/2)이 정확한지
- 제출 후 점수/연속정답/랭킹/진행률이 즉시 업데이트되는지
- 10문제 달성 시 세션 완료 카드가 표시되는지

## 3차 확장 아이디어

1. **실제 음성 재생(TTS/음원 파일)**
   - Web Speech API 또는 카테고리별 mp3 적용
2. **문제집 기능**
   - 주제별/난이도별 문제팩 선택
3. **복습 모드**
   - 틀린 단어 자동 모음 + 반복 학습
4. **교사용/보호자용 뷰**
   - 기간별 학습 추이, 정답률 리포트
5. **게임화 심화**
   - 스티커북/레벨/업적/주간 미션
