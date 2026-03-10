// 받아쓰기 놀이터 1차 프로토타입
// - localStorage 기반 데이터 저장
// - 아이 선택/추가
// - 듣기(모의 재생) → 입력 → 제출 흐름
// - 점수, 연속 정답, 친구 랭킹 간단 구현

const STORAGE_KEY = "dictationPlayground_v1";

const QUESTION_SET = [
  { id: 1, answer: "나무" },
  { id: 2, answer: "바다" },
  { id: 3, answer: "강아지" },
  { id: 4, answer: "학교" },
  { id: 5, answer: "별빛" },
];

const INITIAL_STATE = {
  kids: [
    { id: "kid-1", name: "하늘", score: 20, streak: 1 },
    { id: "kid-2", name: "민지", score: 10, streak: 0 },
  ],
  selectedKidId: "kid-1",
  currentQuestionIndex: 0,
  playCount: 0,
  isPlaying: false,
};

const state = loadState();

// DOM 요소 캐시
const kidsListEl = document.getElementById("kids-list");
const addKidBtn = document.getElementById("add-kid-btn");
const progressEl = document.getElementById("question-progress");
const playCountEl = document.getElementById("play-count");
const playStatusEl = document.getElementById("play-status");
const mainPlayBtn = document.getElementById("main-play-btn");
const replayBtn = document.getElementById("replay-btn");
const inputEl = document.getElementById("dictation-input");
const submitBtn = document.getElementById("submit-answer-btn");
const feedbackEl = document.getElementById("answer-feedback");
const scoreValueEl = document.getElementById("score-value");
const streakValueEl = document.getElementById("streak-value");
const rankingListEl = document.getElementById("ranking-list");
const kidTemplate = document.getElementById("kid-item-template");

/**
 * 앱 시작
 */
function init() {
  bindEvents();
  renderAll();
}

/**
 * 이벤트 바인딩
 */
function bindEvents() {
  addKidBtn.addEventListener("click", onAddKid);
  mainPlayBtn.addEventListener("click", onPlayQuestion);
  replayBtn.addEventListener("click", onReplayQuestion);
  submitBtn.addEventListener("click", onSubmitAnswer);

  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      onSubmitAnswer();
    }
  });
}

/**
 * 새 친구 추가
 */
function onAddKid() {
  const name = prompt("새 친구 이름을 입력해 주세요 ✍️");
  if (!name) return;

  const trimmed = name.trim();
  if (!trimmed) return;

  const newKid = {
    id: `kid-${Date.now()}`,
    name: trimmed,
    score: 0,
    streak: 0,
  };

  state.kids.push(newKid);
  state.selectedKidId = newKid.id;
  saveState();
  renderAll();
}

/**
 * 메인 재생 버튼 클릭 처리
 */
function onPlayQuestion() {
  if (state.isPlaying) return;
  state.playCount = 0;
  startMockPlayback();
}

/**
 * 다시 듣기 버튼 클릭 처리
 */
function onReplayQuestion() {
  if (state.isPlaying) return;
  if (state.playCount >= 2) {
    playStatusEl.textContent = "다시 듣기는 2번까지 가능해요!";
    return;
  }

  state.playCount += 1;
  startMockPlayback();
}

/**
 * 2.3초 모의 재생 로직
 */
function startMockPlayback() {
  state.isPlaying = true;
  setPlayUiWhilePlaying(true);
  playStatusEl.textContent = "읽는 중이야...";

  window.setTimeout(() => {
    state.isPlaying = false;
    setPlayUiWhilePlaying(false);
    playStatusEl.textContent = "이제 써볼까?";
    renderPlayInfo();
    saveState();
  }, 2300);
}

/**
 * 재생 중 버튼 상태/문구/중복 클릭 제어
 */
function setPlayUiWhilePlaying(isPlaying) {
  mainPlayBtn.disabled = isPlaying;
  replayBtn.disabled = isPlaying;
  mainPlayBtn.textContent = isPlaying ? "읽는 중이야..." : "문제 불러줘";
  mainPlayBtn.classList.toggle("is-playing", isPlaying);
}

/**
 * 답 제출 처리
 */
function onSubmitAnswer() {
  const selectedKid = getSelectedKid();
  if (!selectedKid) {
    feedbackEl.textContent = "먼저 친구를 선택해 주세요!";
    return;
  }

  const userAnswer = inputEl.value.trim();
  if (!userAnswer) {
    feedbackEl.textContent = "정답을 입력해 주세요!";
    return;
  }

  const currentQuestion = QUESTION_SET[state.currentQuestionIndex];
  const isCorrect = userAnswer === currentQuestion.answer;

  if (isCorrect) {
    selectedKid.score += 10;
    selectedKid.streak += 1;
    feedbackEl.textContent = `정답! 🎉 "${currentQuestion.answer}" 맞아요!`;
  } else {
    selectedKid.streak = 0;
    feedbackEl.textContent = `아쉬워요! 정답은 "${currentQuestion.answer}" 였어요.`;
  }

  moveToNextQuestion();
  inputEl.value = "";
  state.playCount = 0;
  playStatusEl.textContent = "문제를 들어보세요";

  saveState();
  renderAll();
}

/**
 * 다음 문제로 이동 (끝까지 풀면 처음으로 순환)
 */
function moveToNextQuestion() {
  state.currentQuestionIndex = (state.currentQuestionIndex + 1) % QUESTION_SET.length;
}

/**
 * 선택된 친구 반환
 */
function getSelectedKid() {
  return state.kids.find((kid) => kid.id === state.selectedKidId);
}

/**
 * 전체 렌더링
 */
function renderAll() {
  renderKids();
  renderPlayInfo();
  renderSummary();
}

/**
 * 친구 선택 영역 렌더링
 */
function renderKids() {
  kidsListEl.innerHTML = "";

  state.kids.forEach((kid) => {
    const template = kidTemplate.content.firstElementChild.cloneNode(true);
    const button = template.querySelector(".kid-chip");

    button.textContent = `${kid.name} (${kid.score}점)`;
    if (kid.id === state.selectedKidId) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      state.selectedKidId = kid.id;
      saveState();
      renderAll();
    });

    kidsListEl.appendChild(template);
  });
}

/**
 * 문제 카드 상태 텍스트 렌더링
 */
function renderPlayInfo() {
  progressEl.textContent = `${state.currentQuestionIndex + 1} / ${QUESTION_SET.length}`;
  playCountEl.textContent = `다시 듣기 ${state.playCount}/2`;
}

/**
 * 점수/연속 정답/랭킹 렌더링
 */
function renderSummary() {
  const selectedKid = getSelectedKid();
  scoreValueEl.textContent = selectedKid ? `${selectedKid.score}점` : "0점";
  streakValueEl.textContent = selectedKid ? `${selectedKid.streak}회` : "0회";

  rankingListEl.innerHTML = "";
  const sortedKids = [...state.kids].sort((a, b) => b.score - a.score);

  sortedKids.forEach((kid, index) => {
    const li = document.createElement("li");
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⭐";
    li.textContent = `${medal} ${kid.name} - ${kid.score}점`;
    rankingListEl.appendChild(li);
  });
}

/**
 * 저장된 state 불러오기
 */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_STATE };

    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_STATE,
      ...parsed,
      kids: parsed.kids?.length ? parsed.kids : INITIAL_STATE.kids,
    };
  } catch (error) {
    console.warn("상태를 불러오지 못해 초기값을 사용합니다.", error);
    return { ...INITIAL_STATE };
  }
}

/**
 * state 저장
 */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

init();
