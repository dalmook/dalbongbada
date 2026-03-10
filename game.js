(function () {
  const {
    BOOKS,
    MODES,
    SCORE_RULES,
    XP_RULES,
    MAX_REPLAY,
    SESSION_SIZE,
    SPEED_LIMIT_SEC,
    LEVELS,
    ACHIEVEMENTS,
    DAILY_QUESTS,
    WEEKLY_QUESTS,
    PRAISE,
  } = window.AppData;

  function selectedChild(state) {
    return state.children.find((c) => c.id === state.selectedChildId) || null;
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
      if (totalScore < lv.score) {
        next = lv;
        break;
      }
    }
    const span = Math.max(1, next.score - current.score || 100);
    const progress = Math.min(100, Math.max(0, Math.round(((totalScore - current.score) / span) * 100)));
    return { current, next, progress };
  }

  function selectedBook(state) {
    if (state.selectedBookId === "review") {
      return {
        id: "review",
        title: "복습 모드",
        description: "틀린 단어 다시 연습",
        icon: "📝",
        recommended: "복습용",
        problems: buildReviewProblems(state),
      };
    }
    return BOOKS.find((b) => b.id === state.selectedBookId) || BOOKS[0];
  }

  function selectedMode(state) {
    return MODES.find((m) => m.id === state.selectedMode) || MODES[1];
  }

  function buildReviewProblems(state) {
    const child = selectedChild(state);
    if (!child) return [];
    const weak = state.weakWords[child.id] || [];
    return weak
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((w, i) => ({ id: `r-${i}-${w.word}`, type: "word", word: w.word, category: "복습", difficulty: 1 }));
  }

  function pickProblemsForSession(state) {
    const book = selectedBook(state);
    const problems = [...book.problems];
    if (!problems.length) return [];
    const shuffled = problems.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(SESSION_SIZE, shuffled.length));
  }

  function currentProblem(state) {
    return state.currentSession.problems[state.currentSession.currentIndex] || null;
  }

  function startSession(state) {
    const problems = pickProblemsForSession(state);
    state.currentSession = {
      ...window.AppStorage.defaultSession(),
      active: true,
      bookId: state.selectedBookId,
      mode: state.selectedMode,
      problems,
      speedLeft: state.selectedMode === "speed" ? SPEED_LIMIT_SEC : 0,
    };
    state.ui.currentView = "play";
    state.ui.replayCount = 0;
    state.ui.isPlaying = false;
    return { ok: problems.length > 0, emptyReview: state.selectedBookId === "review" && problems.length === 0 };
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
    state.reviewWords = state.weakWords;
  }

  function addHistory(state, row) {
    state.gameHistory.push(row);
    if (state.gameHistory.length > 400) state.gameHistory = state.gameHistory.slice(-400);
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

  function updateQuests(state, childId) {
    const today = window.AppStorage.todayKey();
    const week = window.AppStorage.weekKey();
    const child = selectedChild(state);

    const todayRows = state.gameHistory.filter((r) => r.childId === childId && r.playedAt.slice(0, 10) === today);
    const weekRows = state.gameHistory.filter((r) => {
      if (r.childId !== childId) return false;
      return r.playedAt.slice(0, 10) >= week;
    });

    state.quests.daily.items = DAILY_QUESTS.map((q) => {
      let progress = 0;
      if (q.type === "solvedToday") progress = todayRows.length;
      if (q.type === "streak") progress = child.streak;
      if (q.type === "reviewSolved") progress = todayRows.filter((r) => r.bookId === "review").length;
      return { id: q.id, progress: Math.min(progress, q.target), completed: progress >= q.target };
    });

    state.quests.weekly.items = WEEKLY_QUESTS.map((q) => {
      let progress = 0;
      if (q.type === "solvedWeek") progress = weekRows.length;
      if (q.type === "correctWeek") progress = weekRows.filter((r) => r.isCorrect).length;
      return { id: q.id, progress: Math.min(progress, q.target), completed: progress >= q.target };
    });
  }

  function submitAnswer(state, answer, meta = {}) {
    const child = selectedChild(state);
    const problem = currentProblem(state);
    if (!child || !problem || !state.currentSession.active) return null;

    const isCorrect = answer === problem.word;
    const replayCount = state.ui.replayCount;
    child.solvedCount += 1;
    state.currentSession.solved += 1;

    let gained = 0;
    const rewards = [];

    if (isCorrect) {
      child.correctCount += 1;
      child.streak += 1;
      state.currentSession.correct += 1;
      state.currentSession.streak += 1;
      child.bestStreak = Math.max(child.bestStreak, child.streak);
      state.currentSession.bestStreak = Math.max(state.currentSession.bestStreak, child.streak);
      gained = calcGain(state.currentSession.mode, child.streak, replayCount);
      child.totalScore += gained;
      state.currentSession.scoreGained += gained;
      child.xp = (child.xp || 0) + XP_RULES.correct;
      if (replayCount === 0) rewards.push("집중 정답!");
    } else {
      child.streak = 0;
      state.currentSession.streak = 0;
      state.currentSession.incorrect += 1;
      addWeakWord(state, child.id, problem.word);
    }

    const before = childLevel(child.totalScore - gained);
    const after = childLevel(child.totalScore);
    child.title = after.current.title;
    if (after.current.score > before.current.score) rewards.push(`레벨업! ${after.current.title}`);

    addHistory(state, {
      childId: child.id,
      bookId: state.currentSession.bookId,
      mode: state.currentSession.mode,
      problemId: problem.id,
      problemType: problem.type,
      answer,
      correctWord: problem.word,
      isCorrect,
      replayCount,
      timeUp: Boolean(meta.timeUp),
      scoreAfter: child.totalScore,
      playedAt: new Date().toISOString(),
    });

    updateQuests(state, child.id);
    const unlocked = unlockAchievements(state, child);
    if (unlocked.length) rewards.push(...unlocked.map((a) => `배지 획득: ${a.name}`));

    state.ui.replayCount = 0;
    return { isCorrect, gained, correctWord: problem.word, rewards };
  }

  function finishSession(state) {
    const child = selectedChild(state);
    const total = Math.max(1, state.currentSession.problems.length);
    const ratio = state.currentSession.correct / total;
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    const completedBook = state.currentSession.correct + state.currentSession.incorrect >= total;
    state.currentSession.stars = stars;
    state.currentSession.completedBook = completedBook;

    child.xp = (child.xp || 0) + XP_RULES.completeSession;

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
    state.recentSessions = state.recentSessions
      .sort((a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0))
      .slice(0, 30);

    if (state.currentSession.bookId === "review" && state.currentSession.incorrect === 0 && state.currentSession.correct > 0) {
      state.currentSession.rewards.push("복습 완벽 성공! 🏅");
    }

    if (completedBook) state.currentSession.rewards.push("문제집 완주 리본 획득 🎀");

    const champion = sortedChildren(state)[0];
    if (champion && champion.id === child.id) pushAchievement(state, child.id, "champion");

    state.currentSession.active = false;
    state.ui.currentView = "result";
  }

  function nextProblem(state) {
    state.currentSession.currentIndex += 1;
    const finished = state.currentSession.currentIndex >= state.currentSession.problems.length;
    if (finished) finishSession(state);
    return finished;
  }

  function parentReport(state, childId) {
    const child = state.children.find((c) => c.id === childId) || selectedChild(state);
    const rows = state.gameHistory.filter((r) => r.childId === child.id);
    const weakTop = (state.weakWords[child.id] || []).slice().sort((a, b) => b.count - a.count).slice(0, 5);
    const recent = state.recentSessions.filter((s) => s.childId === child.id).slice(0, 5);
    const lastDate = rows.length ? rows[rows.length - 1].playedAt.slice(0, 10) : "기록 없음";
    const comment = weakTop.length ? `"${weakTop[0].word}" 단어를 한 번 더 연습하면 좋아요.` : "아주 좋아요! 약한 단어가 거의 없어요.";

    return {
      child,
      totalScore: child.totalScore,
      accuracy: accuracy(child),
      bestStreak: child.bestStreak,
      lastDate,
      weakTop,
      recent,
      comment,
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
    updateQuests,
    accuracy,
  };
})();
