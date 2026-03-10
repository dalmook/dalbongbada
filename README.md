# 아이들을 위한 받아쓰기 놀이터 (4차 업그레이드)

정적 웹앱(HTML/CSS/Vanilla JS) 기반의 게임형 받아쓰기 서비스입니다.
GitHub Pages에 그대로 배포 가능하며, `localStorage` 기반으로 동작합니다.

## 1) 4차 기준 최종 파일 구조

```bash
/
├─ index.html   # 홈/문제집선택/플레이/결과/랭킹/업적/리포트/설정 뷰
├─ style.css    # 파스텔톤 서비스 UI + HUD + 보상 연출
├─ data.js      # 문제집/모드/업적/미션/레벨 등 정적 데이터
├─ storage.js   # v4 저장 + v3/v2 마이그레이션 + 초기화
├─ game.js      # 세션/점수/업적/미션/리포트 계산 로직
├─ ui.js        # 렌더링과 뷰 갱신
├─ tts.js       # Web Speech API 음성 재생 + fallback
├─ app.js       # 이벤트 바인딩과 앱 흐름 제어
└─ README.md
```

## 2) 3차 대비 주요 변화

- **TTS 추가**: mock 중심에서 실제 SpeechSynthesis 재생 기반으로 업그레이드
- **문제집 선택**: 기초/동물/학교/자연 + 복습 모드
- **플레이 모드 선택**: 자유 연습 / 챌린지 / 스피드
- **학습 리포트 뷰 추가**: 보호자 관점 요약(점수/정답률/약한 단어/최근 세션)
- **설정 뷰 추가**: 자동 다음 문제, 음성 속도, 효과, 기본 플레이어, 초기화
- **데이터 구조 확장**: selectedBookId, selectedMode, weakWords, reports, settings.voiceRate 등
- **보상 강화**: 레벨업/배지 토스트, 세션 별점(1~3성), 복습 완벽 성공 메시지

## 3) 문제집/모드

### 문제집
- 기초 단어
- 동물 친구
- 학교 생활
- 자연/계절
- 복습 모드(오답 단어 기반)

### 플레이 모드
- 자유 연습: 점수 부담 낮음
- 챌린지: 점수/연속/감점 반영
- 스피드: 제한 시간(기본 8초) 내 입력

## 4) TTS fallback 방식

`tts.js`에서 다음 순서로 동작합니다.
1. `window.speechSynthesis`와 `SpeechSynthesisUtterance` 지원 확인
2. 가능하면 한국어 음성(`ko`) 우선 선택 후 재생
3. 재생 오류 또는 미지원 환경이면 fallback 타이머(약 2초)로 재생 완료 상태 처리

즉, 음성 미지원 브라우저에서도 게임 진행이 끊기지 않습니다.

## 5) localStorage 구조(v4)

저장 키: `dictationPlayground_v4`

핵심 필드:
- `children`, `selectedChildId`
- `selectedBookId`, `selectedMode`
- `currentSession`
- `gameHistory`
- `settings.autoNext`, `settings.voiceRate`, `settings.effects`, `settings.defaultPlayerId`
- `achievements`, `unlockedBadges`
- `missions`
- `weakWords`, `reviewWords`
- `recentSessions`
- `reports`
- `ui.currentView`

## 6) 마이그레이션 방식

`storage.js`에서 자동 처리:
1. v4가 있으면 그대로 사용
2. v4가 없고 v3가 있으면 v3 → v4 변환
3. v3도 없고 v2가 있으면 v2 → v4 변환
4. 아무 데이터가 없으면 샘플 데이터로 초기화

기존 사용자 데이터 손실 없이 확장 필드만 보정됩니다.

## 7) 실행 방법

### 간단 실행
- `index.html` 직접 열기

### 로컬 서버(권장)
```bash
python3 -m http.server 8000
```
- `http://localhost:8000`

## 8) GitHub Pages 테스트 체크리스트

1. 홈 → 문제집선택 → 플레이 흐름이 자연스럽다.
2. TTS가 가능한 브라우저에서 실제 음성이 나온다.
3. 음성 미지원 브라우저에서도 fallback으로 재생 상태가 정상 종료된다.
4. 자유/챌린지/스피드 모드별 동작이 다르게 반영된다.
5. 세션 결과에서 별점(1~3성)과 보상 메시지가 표시된다.
6. 복습 모드는 오답 단어가 있을 때만 문제가 생성된다.
7. 리포트 화면에서 아이별 지표/약한 단어/최근 세션이 보인다.
8. 설정 변경(음성속도/자동다음 등)이 새로고침 후에도 유지된다.
9. v3/v2 데이터가 있을 때 기존 기록이 깨지지 않고 마이그레이션된다.

## 9) 5차 확장 아이디어

1. 문장 받아쓰기(problem.type=`sentence`) 본격 활성화
2. 난이도별 자동 출제/적응형 문제 추천
3. 보호자 주간 리포트(날짜별 성장 그래프)
4. 업적 보상으로 캐릭터 스킨/스티커북 확장
5. 문제집 잠금 해제(unlockedBooks) 실제 게임화
