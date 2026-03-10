// 받아쓰기 놀이터 2차
// - 정적 웹앱 + localStorage 기반
// - 아이별 기록 강화, 점수 규칙 고도화, 진행률/랭킹 강화

const STORAGE_KEY = "dictationPlayground_v2";

// 점수 규칙(상수화)
const SCORE_RULES = {
  baseCorrectScore: 10,
  streakBonus3: 2,
  streakBonus5: 5,
  replayPenaltyByCount: [0, 1, 2], // 0회, 1회, 2회
};

const MAX_REPLAY_COUNT = 2;
const SESSION_TARGET = 10;
const MOCK_PLAY_DURATION_MS = 2300;
const CHARACTER_POOL = ["🐰", "🐻", "🐥", "🐱", "🦊", "🐼"];

const PRAISE_QUOTES = [
  "천천히 해도 괜찮아, 끝까지 해보는 게 멋져!",
  "와! 집중력이 반짝반짝 빛나고 있어!",
  "한 글자씩 또박또박, 정말 잘하고 있어!",
  "오늘도 도전하는 네가 최고야!",
  "실수해도 괜찮아, 다시 하면 더 잘해!",
];

const QUESTION_SET = [
  { id: 1, word: "나무", category: "자연", difficulty: 1 },
  { id: 2, word: "바다", category: "자연", difficulty: 1 },
  { id: 3, word: "강아지", category: "동물", difficulty: 1 },
  { id: 4, word: "학교", category: "생활", difficulty: 1 },
  { id: 5, word: "별빛", category: "자연", difficulty: 1 },
  { id: 6, word: "토끼", category: "동물", difficulty: 1 },
  { id: 7, word: "우산", category: "생활", difficulty: 1 },
  { id: 8, word: "연필", category: "학교", difficulty: 1 },
  { id: 9, word: "달님", category: "자연", difficulty: 2 },
  { id: 10, word: "사과", category: "음식", difficulty: 1 },
  { id: 11, word: "무지개", category: "자연", difficulty: 2 },
  { id: 12, word: "비행기", category: "탈것", difficulty: 2 },
];

const INITIAL_DATA = {
  children: [
    createChild("하늘", "🐰", { totalScore: 34, streak: 2, bestStreak: 4, solvedCount: 5, correctCount: 3 }),
    createChild("민지", "🐻", { totalScore: 26, streak: 1, bestStreak: 3, solvedCount: 6, correctCount: 3 }),
    createChild("도윤", "🐥", { totalScore: 42, streak: 3, bestStreak: 5, solvedCount: 7, correctCount: 5 }),
  ],
  selectedChildId: null,
  gameHistory: [],
  currentSession: {
    solved: 0,
    correct: 0,
    incorrect: 0,
    bestStreak: 0,
    totalScoreGained: 0,
    isFinished: false,
  },
  settings: {
    autoNext: false,
  },
  ui: {
    currentQuestionIndex: 0,
    replayCount: 0,
    isPlaying: false,
    lastResult: null,
  },
};

function createChild(name, avatar, overrides = {}) {
  return {
    id: `child-${Math.random().toString(36).slice(2, 10)}`,
    name,
    avatar,
    totalScore: 0,
    streak: 0,
    bestStreak: 0,
    solvedCount: 0,
    correctCount: 0,
    ...overrides,
  };
}

const state = loadState();
if (!state.selectedChildId && state.children.length) {
  state.selectedChildId = state.children[0].id;
}

const $ = {
  childrenList: document.getElementById("children-list"),
  addChildBtn: document.getElementById("add-child-btn"),
  childTemplate: document.getElementById("child-card-template"),
  playBtn: document.getElementById("play-btn"),
  replayBtn: document.getElementById("replay-btn"),
  submitBtn: document.getElementById("submit-btn"),
  nextBtn: document.getElementById("next-btn"),
  answerInput: document.getElementById("answer-input"),
  autoNextToggle: document.getElementById("auto-next-toggle"),
  playStatus: document.getElementById("play-status"),
  questionProgress: document.getElementById("question-progress"),
  questionCategory: document.getElementById("question-category"),
  questionDifficulty: document.getElementById("question-difficulty"),
  replayCount: document.getElementById("replay-count"),
  sessionProgressText: document.getElementById("session-progress-text"),
  sessionProgressFill: document.getElementById("session-progress-fill"),
  feedbackBox: document.getElementById("feedback-box"),
  feedbackMain: document.getElementById("feedback-main"),
  feedbackSub: document.getElementById("feedback-sub"),
  sparkles: document.getElementById("sparkles"),
  streakBanner: document.getElementById("streak-banner"),
  championText: document.getElementById("champion-text"),
  dailyQuote: document.getElementById("daily-quote"),
  recordBanner: document.getElementById("record-banner"),
  scoreValue: document.getElementById("score-value"),
  streakValue: document.getElementById("streak-value"),
  todayCorrectValue: document.getElementById("today-correct-value"),
  accuracyValue: document.getElementById("accuracy-value"),
  leaderboardList: document.getElementById("leaderboard-list"),
  sessionResult: document.getElementById("session-result"),
  sessionResultSummary: document.getElementById("session-result-summary"),
  restartSessionBtn: document.getElementById("restart-session-btn"),
};

function init() {
  bindEvents();
  $.dailyQuote.textContent = PRAISE_QUOTES[Math.floor(Math.random() * PRAISE_QUOTES.length)];
  $.autoNextToggle.checked = Boolean(state.settings.autoNext);
  renderAll();
}

function bindEvents() {
  $.addChildBtn.addEventListener("click", handleAddChild);
  $.playBtn.addEventListener("click", handlePlay);
  $.replayBtn.addEventListener("click", handleReplay);
  $.submitBtn.addEventListener("click", handleSubmit);
  $.nextBtn.addEventListener("click", handleNextQuestion);
  $.restartSessionBtn.addEventListener("click", restartSession);

  $.answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleSubmit();
    }
  });

  $.autoNextToggle.addEventListener("change", () => {
    state.settings.autoNext = $.autoNextToggle.checked;
    saveState();
  });
}

function handleAddChild() {
  const name = prompt("친구 이름을 입력해 주세요 ✍️");
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;

  const randomAvatar = CHARACTER_POOL[Math.floor(Math.random() * CHARACTER_POOL.length)];
  const child = createChild(trimmed, randomAvatar);
  state.children.push(child);
  state.selectedChildId = child.id;

  saveState();
  renderAll();
}

function handlePlay() {
  if (state.ui.isPlaying || state.currentSession.isFinished) return;
  state.ui.replayCount = 0;
  startMockPlayback();
}

function handleReplay() {
  if (state.ui.isPlaying || state.currentSession.isFinished) return;
  if (state.ui.replayCount >= MAX_REPLAY_COUNT) {
    $.playStatus.textContent = "다시 듣기는 2번까지 가능해요!";
    return;
  }
  state.ui.replayCount += 1;
  startMockPlayback();
}

function startMockPlayback() {
  state.ui.isPlaying = true;
  syncPlayButtonState(true);
  $.playStatus.textContent = "읽는 중이야...";
  renderQuestionMeta();

  window.setTimeout(() => {
    state.ui.isPlaying = false;
    syncPlayButtonState(false);
    $.playStatus.textContent = "이제 써볼까?";
    saveState();
  }, MOCK_PLAY_DURATION_MS);
}

function syncPlayButtonState(isPlaying) {
  $.playBtn.disabled = isPlaying;
  $.replayBtn.disabled = isPlaying;
  $.playBtn.classList.toggle("is-playing", isPlaying);
  $.playBtn.textContent = isPlaying ? "읽는 중이야..." : "문제 불러줘";
}

function handleSubmit() {
  if (state.currentSession.isFinished) return;
  const child = getSelectedChild();
  if (!child) return;

  const answer = $.answerInput.value.trim();
  if (!answer) {
    showFeedback("문제를 듣고 단어를 입력해보자!", "", "neutral");
    return;
  }

  const question = getCurrentQuestion();
  const isCorrect = answer === question.word;

  child.solvedCount += 1;
  state.currentSession.solved += 1;

  if (isCorrect) {
    child.correctCount += 1;
    state.currentSession.correct += 1;
    child.streak += 1;
    child.bestStreak = Math.max(child.bestStreak, child.streak);
    state.currentSession.bestStreak = Math.max(state.currentSession.bestStreak, child.streak);

    const gained = calculateScoreGain(child.streak, state.ui.replayCount);
    child.totalScore += gained;
    state.currentSession.totalScoreGained += gained;

    showFeedback(
      "정답이야! 정말 잘했어!",
      `+${gained}점 획득! (다시듣기 ${state.ui.replayCount}회)` ,
      "correct",
    );

    maybeShowStreakBanner(child.streak);
    maybeShowRecordBanner(child);
  } else {
    state.currentSession.incorrect += 1;
    child.streak = 0;

    showFeedback(
      "아쉽지만 다시 도전해보자!",
      `정답은 "${question.word}" 였어.`,
      "incorrect",
    );
    hideStreakBanner();
  }

  appendHistory({
    childId: child.id,
    questionId: question.id,
    answer,
    correctWord: question.word,
    isCorrect,
    replayCount: state.ui.replayCount,
    scoreAfter: child.totalScore,
    playedAt: new Date().toISOString(),
  });

  $.answerInput.value = "";
  state.ui.replayCount = 0;
  state.ui.lastResult = isCorrect ? "correct" : "incorrect";

  if (state.currentSession.solved >= SESSION_TARGET) {
    finishSession();
  } else if (state.settings.autoNext) {
    handleNextQuestion();
  }

  saveState();
  renderAll();
}

function calculateScoreGain(streak, replayCount) {
  let score = SCORE_RULES.baseCorrectScore;
  if (streak >= 5) score += SCORE_RULES.streakBonus5;
  else if (streak >= 3) score += SCORE_RULES.streakBonus3;

  const penalty = SCORE_RULES.replayPenaltyByCount[Math.min(replayCount, 2)] || 0;
  score -= penalty;
  return Math.max(score, 1);
}

function maybeShowStreakBanner(streak) {
  if (streak >= 5) {
    $.streakBanner.textContent = `🔥 대단해! ${streak}연속이야!`;
    $.streakBanner.classList.remove("hidden");
  } else if (streak >= 3) {
    $.streakBanner.textContent = `⭐ ${streak}연속 성공! 멋져!`;
    $.streakBanner.classList.remove("hidden");
  } else {
    hideStreakBanner();
  }
}

function hideStreakBanner() {
  $.streakBanner.classList.add("hidden");
}

function maybeShowRecordBanner(child) {
  if (child.streak === child.bestStreak && child.bestStreak >= 3) {
    $.recordBanner.textContent = `🏆 ${child.name} 최고 기록 갱신! ${child.bestStreak}연속!`;
    $.recordBanner.classList.remove("hidden");
    window.setTimeout(() => $.recordBanner.classList.add("hidden"), 2600);
  }
}

function showFeedback(main, sub, type) {
  $.feedbackMain.textContent = main;
  $.feedbackSub.textContent = sub;

  $.feedbackBox.classList.remove("correct", "incorrect");
  $.sparkles.classList.remove("show");

  if (type === "correct") {
    $.feedbackBox.classList.add("correct");
    $.sparkles.classList.add("show");
  } else if (type === "incorrect") {
    $.feedbackBox.classList.add("incorrect");
  }
}

function handleNextQuestion() {
  if (state.currentSession.isFinished) return;
  state.ui.currentQuestionIndex = (state.ui.currentQuestionIndex + 1) % QUESTION_SET.length;
  state.ui.replayCount = 0;
  $.playStatus.textContent = "문제를 들어보세요";
  $.answerInput.value = "";
  saveState();
  renderQuestionMeta();
}

function finishSession() {
  state.currentSession.isFinished = true;
  $.sessionResult.classList.remove("hidden");

  const child = getSelectedChild();
  const praise = child
    ? `${child.name}, 집중력이 최고였어!`
    : "오늘도 정말 열심히 했어!";

  $.sessionResultSummary.textContent = [
    `총 점수: ${state.currentSession.totalScoreGained}점`,
    `맞은 개수: ${state.currentSession.correct}개`,
    `틀린 개수: ${state.currentSession.incorrect}개`,
    `최고 연속 정답: ${state.currentSession.bestStreak}회`,
    praise,
  ].join(" / ");
}

function restartSession() {
  state.currentSession = {
    solved: 0,
    correct: 0,
    incorrect: 0,
    bestStreak: 0,
    totalScoreGained: 0,
    isFinished: false,
  };
  state.ui.currentQuestionIndex = 0;
  state.ui.replayCount = 0;
  $.sessionResult.classList.add("hidden");
  $.playStatus.textContent = "문제를 들어보세요";
  saveState();
  renderAll();
}

function appendHistory(entry) {
  state.gameHistory.push(entry);
  if (state.gameHistory.length > 200) {
    state.gameHistory = state.gameHistory.slice(-200);
  }
}

function getCurrentQuestion() {
  return QUESTION_SET[state.ui.currentQuestionIndex];
}

function getSelectedChild() {
  return state.children.find((child) => child.id === state.selectedChildId) || null;
}

function getAccuracyText(child) {
  if (!child || child.solvedCount === 0) return "0%";
  return `${Math.round((child.correctCount / child.solvedCount) * 100)}%`;
}

function getSortedChildren() {
  return [...state.children].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;

    const accA = a.solvedCount ? a.correctCount / a.solvedCount : 0;
    const accB = b.solvedCount ? b.correctCount / b.solvedCount : 0;
    if (accB !== accA) return accB - accA;

    return b.bestStreak - a.bestStreak;
  });
}

function renderAll() {
  renderChildren();
  renderQuestionMeta();
  renderSummary();
  renderLeaderboard();
  renderChampion();
  renderSessionProgress();
  syncPlayButtonState(state.ui.isPlaying);
}

function renderChildren() {
  $.childrenList.innerHTML = "";

  state.children.forEach((child) => {
    const card = $.childTemplate.content.firstElementChild.cloneNode(true);
    const btn = card.querySelector(".child-select-btn");

    card.querySelector(".child-avatar").textContent = child.avatar;
    card.querySelector(".child-name").textContent = child.name;
    card.querySelector(".child-score").textContent = `누적 ${child.totalScore}점`;

    const stats = card.querySelector(".child-stats");
    stats.innerHTML = [
      `최고 연속: ${child.bestStreak}회`,
      `푼 문제: ${child.solvedCount}개 · 정답: ${child.correctCount}개`,
      `정답률: ${getAccuracyText(child)}`,
    ]
      .map((item) => `<p>${item}</p>`)
      .join("");

    if (child.id === state.selectedChildId) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      state.selectedChildId = child.id;
      saveState();
      renderAll();
    });

    $.childrenList.appendChild(card);
  });
}

function renderQuestionMeta() {
  const q = getCurrentQuestion();
  $.questionProgress.textContent = `${state.ui.currentQuestionIndex + 1} / ${QUESTION_SET.length}`;
  $.questionCategory.textContent = `카테고리: ${q.category}`;
  $.questionDifficulty.textContent = `난이도: ${"⭐".repeat(q.difficulty)}`;
  $.replayCount.textContent = `다시 듣기 ${state.ui.replayCount}/${MAX_REPLAY_COUNT}`;
}

function renderSummary() {
  const child = getSelectedChild();
  if (!child) return;

  $.scoreValue.textContent = `${child.totalScore}점`;
  $.streakValue.textContent = `${child.streak}회`;
  $.todayCorrectValue.textContent = `${state.currentSession.correct}개`;
  $.accuracyValue.textContent = getAccuracyText(child);
}

function renderLeaderboard() {
  $.leaderboardList.innerHTML = "";
  const sorted = getSortedChildren();

  sorted.forEach((child, index) => {
    const li = document.createElement("li");
    li.className = "leaderboard-item";
    if (child.id === state.selectedChildId) li.classList.add("current");

    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⭐";
    li.textContent = `${medal} ${child.avatar} ${child.name} - ${child.totalScore}점 (${getAccuracyText(child)})`;
    $.leaderboardList.appendChild(li);
  });
}

function renderChampion() {
  const top = getSortedChildren()[0];
  if (!top) {
    $.championText.textContent = "아직 친구가 없어요";
    return;
  }
  $.championText.textContent = `${top.avatar} ${top.name} (${top.totalScore}점)`;
}

function renderSessionProgress() {
  const solved = state.currentSession.solved;
  const percent = Math.min(Math.round((solved / SESSION_TARGET) * 100), 100);
  $.sessionProgressText.textContent = `오늘 진행 ${solved} / ${SESSION_TARGET}`;
  $.sessionProgressFill.style.width = `${percent}%`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeState(structuredClone(INITIAL_DATA));

    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    console.warn("저장 데이터를 읽지 못해 초기값으로 시작합니다.", error);
    return normalizeState(structuredClone(INITIAL_DATA));
  }
}

function normalizeState(data) {
  const merged = {
    ...structuredClone(INITIAL_DATA),
    ...data,
    children: Array.isArray(data.children) && data.children.length ? data.children : structuredClone(INITIAL_DATA.children),
    currentSession: { ...INITIAL_DATA.currentSession, ...(data.currentSession || {}) },
    settings: { ...INITIAL_DATA.settings, ...(data.settings || {}) },
    ui: { ...INITIAL_DATA.ui, ...(data.ui || {}) },
  };

  merged.ui.currentQuestionIndex %= QUESTION_SET.length;
  merged.ui.replayCount = Math.min(Math.max(merged.ui.replayCount || 0, 0), MAX_REPLAY_COUNT);
  merged.children = merged.children.map((child) => ({
    ...createChild(child.name || "친구", child.avatar || "🐰"),
    ...child,
  }));

  if (!merged.selectedChildId && merged.children.length) {
    merged.selectedChildId = merged.children[0].id;
  }

  return merged;
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      children: state.children,
      selectedChildId: state.selectedChildId,
      gameHistory: state.gameHistory,
      currentSession: state.currentSession,
      settings: state.settings,
      ui: state.ui,
    }),
  );
}

init();
