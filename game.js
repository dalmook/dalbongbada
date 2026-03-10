(function () {
  const { BOOKS, MODES, SCORE_RULES, MAX_REPLAY, SESSION_SIZE, SPEED_LIMIT_SEC, LEVELS, ACHIEVEMENTS, MISSION_DEFS, PRAISE } = window.AppData;

  function selectedChild(state) {
    return state.children.find((c) => c.id === state.selectedChildId) || null;
  }
  function selectedBook(state) {
    if (state.selectedBookId === "review") {
      return { id: "review", title: "복습 모드", description: "틀린 단어 다시 연습", icon: "📝", problems: buildReviewProblems(state) };
    }
    return BOOKS.find((b) => b.id === state.selectedBookId) || BOOKS[0];
  }
  function selectedMode(state) {
    return MODES.find((m) => m.id === state.selectedMode) || MODES[1];
  }
  function accuracy(child) {
    if (!child || !child.solvedCount) return 0;
    return Math.round((child.correctCount / child.solvedCount) * 100);
  }
  function sortedChildren(state) {
    return [...state.children].sort((a, b) => b.totalScore - a.totalScore || accuracy(b) - accuracy(a) || b.bestStreak - a.bestStreak);
  }

  function childLevel(totalScore) {
    let current = LEVELS[0];
    let next = LEVELS[LEVELS.length - 1];
    for (const lv of LEVELS) {
      if (totalScore >= lv.score) current = lv;
      if (totalScore < lv.score) { next = lv; break; }
    }
    const span = Math.max(1, next.score - current.score || 100);
    const progress = Math.min(100, Math.max(0, Math.round(((totalScore - current.score) / span) * 100)));
    return { current, next, progress };
  }

  function buildReviewProblems(state) {
    const child = selectedChild(state);
    if (!child) return [];
    const weak = state.weakWords[child.id] || [];
    return weak.slice(-20).reverse().map((w, i) => ({ id: `r-${i}-${w.word}`, type: "word", word: w.word, category: "복습", difficulty: 1 }));
  }

  function pickProblemsForSession(state) {
    const book = selectedBook(state);
    const problems = [...book.problems];
    if (!problems.length) return [];
    const shuffled = problems.sort(() => Math.random() - 0.5);
    const size = Math.min(SESSION_SIZE, shuffled.length);
    return shuffled.slice(0, size);
  }

  function startSession(state) {
    const problems = pickProblemsForSession(state);
    state.currentSession = {
      ...window.AppStorage.defaultSession(),
      active: true,
      bookId: state.selectedBookId,
      mode: state.selectedMode,
      problems,
      speedLeft: selectedMode(state).id === "speed" ? SPEED_LIMIT_SEC : 0,
    };
    state.ui.currentView = "play";
    state.ui.replayCount = 0;
    state.ui.isPlaying = false;
    return { ok: problems.length > 0, emptyReview: state.selectedBookId === "review" && problems.length === 0 };
  }

  function currentProblem(state) {
    return state.currentSession.problems[state.currentSession.currentIndex] || null;
  }

  function calcGain(modeId, streak, replayCount) {
    if (modeId === "free") return 0;
    let score = SCORE_RULES.base;
    if (streak >= 5) score += SCORE_RULES.streak5Bonus;
    else if (streak >= 3) score += SCORE_RULES.streak3Bonus;
    if (modeId === "challenge") score -= SCORE_RULES.replayPenalty[Math.min(replayCount, MAX_REPLAY)] || 0;
    return Math.max(1, score);
  }

  function addWeakWord(state, childId, word) {
    state.weakWords[childId] = state.weakWords[childId] || [];
    const found = state.weakWords[childId].find((w) => w.word === word);
    if (found) {
      found.count += 1;
      found.lastWrongAt = new Date().toISOString();
    } else {
      state.weakWords[childId].push({ word, count: 1, lastWrongAt: new Date().toISOString() });
    }
  }

  function addHistory(state, row) {
    state.gameHistory.push(row);
    if (state.gameHistory.length > 300) state.gameHistory = state.gameHistory.slice(-300);
  }

  function submitAnswer(state, answer, meta = {}) {
    const child = selectedChild(state);
    const problem = currentProblem(state);
    if (!child || !problem) return null;

    const correct = answer === problem.word;
    const replayCount = state.ui.replayCount;
    child.solvedCount += 1;
    state.currentSession.solved += 1;

    let gained = 0;
    const rewards = [];
    if (correct) {
      child.correctCount += 1;
      child.streak += 1;
      state.currentSession.correct += 1;
      state.currentSession.streak += 1;
      child.bestStreak = Math.max(child.bestStreak, child.streak);
      state.currentSession.bestStreak = Math.max(state.currentSession.bestStreak, child.streak);
      gained = calcGain(state.currentSession.mode, child.streak, replayCount);
      child.totalScore += gained;
      state.currentSession.scoreGained += gained;
      if (replayCount === 0) rewards.push("집중 정답!");
    } else {
      child.streak = 0;
      state.currentSession.streak = 0;
      state.currentSession.incorrect += 1;
      addWeakWord(state, child.id, problem.word);
    }

    const beforeLevel = childLevel(child.totalScore - gained);
    const afterLevel = childLevel(child.totalScore);
    if (afterLevel.current.score > beforeLevel.current.score) rewards.push(`레벨업! ${afterLevel.current.title}`);

    addHistory(state, {
      childId: child.id,
      bookId: state.currentSession.bookId,
      mode: state.currentSession.mode,
      problemId: problem.id,
      problemType: problem.type,
      answer,
      correctWord: problem.word,
      isCorrect: correct,
      replayCount,
      timeUp: Boolean(meta.timeUp),
      scoreAfter: child.totalScore,
      playedAt: new Date().toISOString(),
    });

    updateMissions(state, child.id);
    const unlocked = unlockAchievements(state, child);
    if (unlocked.length) rewards.push(...unlocked.map((a) => `배지 획득: ${a.name}`));

    state.ui.replayCount = 0;
    return { correct, gained, correctWord: problem.word, rewards };
  }

  function nextProblem(state) {
    state.currentSession.currentIndex += 1;
    const finished = state.currentSession.currentIndex >= state.currentSession.problems.length;
    if (finished) finishSession(state);
    return finished;
  }

  function finishSession(state) {
    const child = selectedChild(state);
    const total = Math.max(1, state.currentSession.problems.length);
    const ratio = state.currentSession.correct / total;
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    state.currentSession.stars = stars;

    const session = {
      id: `session-${Date.now()}`,
      childId: child.id,
      childName: child.name,
      bookId: state.currentSession.bookId,
      mode: state.currentSession.mode,
      score: state.currentSession.scoreGained,
      correct: state.currentSession.correct,
      incorrect: state.currentSession.incorrect,
      bestStreak: state.currentSession.bestStreak,
      stars,
      finishedAt: new Date().toISOString(),
      praise: PRAISE[Math.floor(Math.random() * PRAISE.length)],
    };
    state.recentSessions.unshift(session);
    state.recentSessions = state.recentSessions.slice(0, 30);

    if (state.currentSession.bookId === "review" && state.currentSession.incorrect === 0 && state.currentSession.correct > 0) {
      state.currentSession.rewards.push("복습 완벽 성공! 🏅");
    }

    const champ = sortedChildren(state)[0];
    if (champ && champ.id === child.id) pushAchievement(state, child.id, "champion");

    state.currentSession.active = false;
    state.ui.currentView = "result";
  }

  function pushAchievement(state, childId, id) {
    state.achievements[childId] = state.achievements[childId] || [];
    if (state.achievements[childId].includes(id)) return false;
    state.achievements[childId].push(id);
    state.unlockedBadges[childId] = state.unlockedBadges[childId] || [];
    state.unlockedBadges[childId].push(id);
    return true;
  }

  function unlockAchievements(state, child) {
    const added = [];
    const maybe = (id) => {
      if (pushAchievement(state, child.id, id)) added.push(ACHIEVEMENTS.find((a) => a.id === id));
    };
    if (child.correctCount >= 1) maybe("first_correct");
    if (child.bestStreak >= 3) maybe("streak3");
    if (child.solvedCount >= 10) maybe("solve10");
    if (child.solvedCount >= 5 && accuracy(child) >= 80) maybe("accuracy80");
    const latest = state.gameHistory[state.gameHistory.length - 1];
    if (latest && latest.childId === child.id && latest.isCorrect && latest.replayCount === 0) maybe("no_replay");
    return added.filter(Boolean);
  }

  function updateMissions(state, childId) {
    const today = window.AppStorage.todayKey();
    const rows = state.gameHistory.filter((r) => r.childId === childId && r.playedAt.slice(0, 10) === today);
    const child = selectedChild(state);
    state.missions.items = MISSION_DEFS.map((m) => {
      let progress = 0;
      if (m.type === "streak") progress = Math.min(m.target, child.streak);
      if (m.type === "solvedToday") progress = Math.min(m.target, rows.length);
      if (m.type === "noReplayCorrectToday") progress = Math.min(m.target, rows.filter((r) => r.isCorrect && r.replayCount === 0).length);
      return { id: m.id, progress, completed: progress >= m.target };
    });
  }

  function parentReport(state, childId) {
    const c = state.children.find((x) => x.id === childId) || selectedChild(state);
    const rows = state.gameHistory.filter((r) => r.childId === c.id);
    const lastDate = rows[rows.length - 1]?.playedAt?.slice(0, 10) || "-";
    const weak = (state.weakWords[c.id] || []).slice().sort((a, b) => b.count - a.count).slice(0, 5);
    const recent = state.recentSessions.filter((s) => s.childId === c.id).slice(0, 5);
    return {
      child: c,
      totalScore: c.totalScore,
      accuracy: accuracy(c),
      bestStreak: c.bestStreak,
      lastDate,
      weakTop: weak,
      recent,
    };
  }

  window.AppGame = {
    selectedChild,
    selectedBook,
    selectedMode,
    sortedChildren,
    childLevel,
    currentProblem,
    startSession,
    submitAnswer,
    nextProblem,
    parentReport,
    updateMissions,
    accuracy,
  };
})();
