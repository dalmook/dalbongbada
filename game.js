(function () {
  const {
    SCORE_RULES,
    MAX_REPLAY,
    SESSION_SIZE,
    QUESTIONS,
    ACHIEVEMENTS,
    LEVELS,
    MISSION_DEFS,
    PRAISE,
  } = window.AppData;

  function getSelectedChild(state) {
    return state.children.find((c) => c.id === state.selectedChildId) || null;
  }

  function getChildAccuracy(child) {
    if (!child || !child.solvedCount) return 0;
    return Math.round((child.correctCount / child.solvedCount) * 100);
  }

  function getChildLevel(score) {
    let current = LEVELS[0];
    let next = null;
    for (let i = 0; i < LEVELS.length; i += 1) {
      if (score >= LEVELS[i].score) current = LEVELS[i];
      if (score < LEVELS[i].score) {
        next = LEVELS[i];
        break;
      }
    }
    if (!next && LEVELS.length > 1) next = LEVELS[LEVELS.length - 1];
    const span = Math.max((next?.score || current.score + 100) - current.score, 1);
    const progress = Math.min(100, Math.round(((score - current.score) / span) * 100));
    return { current, next, progress };
  }

  function getSortedChildren(state) {
    return [...state.children].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      const aAcc = getChildAccuracy(a);
      const bAcc = getChildAccuracy(b);
      if (bAcc !== aAcc) return bAcc - aAcc;
      return b.bestStreak - a.bestStreak;
    });
  }

  function buildSessionQuestionIds(randomMode) {
    const ids = QUESTIONS.map((q) => q.id);
    if (!randomMode) return ids.slice(0, SESSION_SIZE);
    const shuffled = ids.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, SESSION_SIZE);
  }

  function getQuestionById(id) {
    return QUESTIONS.find((q) => q.id === id);
  }

  function sessionQuestion(state) {
    const id = state.currentSession.questionIds[state.currentSession.currentIndex];
    return getQuestionById(id);
  }

  function startSession(state) {
    state.currentSession = {
      ...window.AppStorage.defaultSession(),
      active: true,
      questionIds: buildSessionQuestionIds(state.settings.randomMode),
    };
    state.ui.currentView = "play";
    state.ui.replayCount = 0;
    state.ui.isPlaying = false;
  }

  function calcScore(streak, replayCount) {
    let score = SCORE_RULES.base;
    if (streak >= 5) score += SCORE_RULES.streak5Bonus;
    else if (streak >= 3) score += SCORE_RULES.streak3Bonus;
    score -= SCORE_RULES.replayPenalty[Math.min(replayCount, 2)] || 0;
    return Math.max(1, score);
  }

  function updateReviewWords(state, childId, wrongWord) {
    state.reviewWords[childId] = state.reviewWords[childId] || [];
    const found = state.reviewWords[childId].find((w) => w.word === wrongWord);
    if (found) {
      found.count += 1;
      found.lastWrongAt = new Date().toISOString();
    } else {
      state.reviewWords[childId].push({ word: wrongWord, count: 1, lastWrongAt: new Date().toISOString() });
    }
  }

  function completeQuestion(state, answer) {
    const child = getSelectedChild(state);
    const q = sessionQuestion(state);
    const isCorrect = q && answer === q.word;
    const replayCount = state.ui.replayCount;
    const rewards = [];

    child.solvedCount += 1;
    state.currentSession.solved += 1;

    let gained = 0;
    if (isCorrect) {
      child.correctCount += 1;
      state.currentSession.correct += 1;
      child.streak += 1;
      state.currentSession.streak += 1;
      child.bestStreak = Math.max(child.bestStreak, child.streak);
      state.currentSession.bestStreak = Math.max(state.currentSession.bestStreak, child.streak);
      gained = calcScore(child.streak, replayCount);
      child.totalScore += gained;
      state.currentSession.scoreGained += gained;
      if (replayCount === 0) rewards.push("집중 정답!");
    } else {
      child.streak = 0;
      state.currentSession.incorrect += 1;
      state.currentSession.streak = 0;
      updateReviewWords(state, child.id, q.word);
    }

    const beforeLevel = getChildLevel(child.totalScore - gained);
    const afterLevel = getChildLevel(child.totalScore);
    if (afterLevel.current.score > beforeLevel.current.score) {
      rewards.push(`레벨업! ${afterLevel.current.title}`);
    }

    state.gameHistory.push({
      childId: child.id,
      questionId: q.id,
      answer,
      correctWord: q.word,
      isCorrect,
      replayCount,
      scoreAfter: child.totalScore,
      playedAt: new Date().toISOString(),
    });
    if (state.gameHistory.length > 250) state.gameHistory = state.gameHistory.slice(-250);

    refreshMissions(state, child.id);
    const unlocked = evaluateAchievements(state, child);
    if (unlocked.length) rewards.push(...unlocked.map((a) => `배지 획득: ${a.name}`));

    state.ui.replayCount = 0;
    return { isCorrect, gained, answer: q.word, rewards };
  }

  function nextQuestion(state) {
    state.currentSession.currentIndex += 1;
    const done = state.currentSession.currentIndex >= state.currentSession.questionIds.length;
    if (done) finishSession(state);
    return done;
  }

  function finishSession(state) {
    const child = getSelectedChild(state);
    const champion = getSortedChildren(state)[0];
    const session = {
      id: `session-${Date.now()}`,
      childId: child.id,
      childName: child.name,
      score: state.currentSession.scoreGained,
      correct: state.currentSession.correct,
      incorrect: state.currentSession.incorrect,
      bestStreak: state.currentSession.bestStreak,
      finishedAt: new Date().toISOString(),
      praise: PRAISE[Math.floor(Math.random() * PRAISE.length)],
    };
    state.recentSessions.unshift(session);
    state.recentSessions = state.recentSessions.slice(0, 12);
    state.currentSession.active = false;
    state.ui.currentView = "result";

    if (champion && champion.id === child.id) {
      unlockAchievement(state, child.id, "champion");
    }
  }

  function refreshMissions(state, childId) {
    const today = window.AppStorage.todayKey();
    const todays = state.gameHistory.filter((h) => h.playedAt.slice(0, 10) === today && h.childId === childId);
    const streakNow = getSelectedChild(state).streak;
    const solvedToday = todays.length;
    const noReplayCorrectToday = todays.filter((h) => h.isCorrect && h.replayCount === 0).length;

    state.missions.items = MISSION_DEFS.map((def) => {
      let progress = 0;
      if (def.type === "streak") progress = Math.min(def.target, streakNow);
      if (def.type === "solvedToday") progress = Math.min(def.target, solvedToday);
      if (def.type === "noReplayCorrectToday") progress = Math.min(def.target, noReplayCorrectToday);
      return { id: def.id, progress, completed: progress >= def.target };
    });
  }

  function unlockAchievement(state, childId, achievementId) {
    state.achievements[childId] = state.achievements[childId] || [];
    if (state.achievements[childId].includes(achievementId)) return false;
    state.achievements[childId].push(achievementId);
    state.unlockedBadges[childId] = state.unlockedBadges[childId] || [];
    state.unlockedBadges[childId].push(achievementId);
    return true;
  }

  function evaluateAchievements(state, child) {
    const unlocked = [];
    const safePush = (id) => {
      if (unlockAchievement(state, child.id, id)) unlocked.push(ACHIEVEMENTS.find((a) => a.id === id));
    };

    if (child.correctCount >= 1) safePush("first_correct");
    if (child.bestStreak >= 3) safePush("streak3");
    if (child.solvedCount >= 10) safePush("solve10");
    if (child.solvedCount >= 5 && getChildAccuracy(child) >= 80) safePush("accuracy80");

    const latest = state.gameHistory[state.gameHistory.length - 1];
    if (latest && latest.childId === child.id && latest.isCorrect && latest.replayCount === 0) safePush("no_replay");

    return unlocked.filter(Boolean);
  }

  window.AppGame = {
    getSelectedChild,
    getChildAccuracy,
    getChildLevel,
    getSortedChildren,
    sessionQuestion,
    startSession,
    completeQuestion,
    nextQuestion,
    refreshMissions,
    evaluateAchievements,
  };
})();
