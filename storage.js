(function () {
  const { STORAGE_KEYS, AVATARS, BOOKS, MODES, DAILY_QUESTS, WEEKLY_QUESTS } = window.AppData;

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function weekKey(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().slice(0, 10);
  }

  function createChild(name, avatar, override = {}) {
    return {
      id: `child-${Math.random().toString(36).slice(2, 10)}`,
      name,
      avatar,
      totalScore: 0,
      streak: 0,
      bestStreak: 0,
      solvedCount: 0,
      correctCount: 0,
      xp: 0,
      title: "🌱 새싹 탐험가",
      ...override,
    };
  }

  function defaultSession() {
    return {
      active: false,
      bookId: BOOKS[0].id,
      mode: MODES[1].id,
      problems: [],
      currentIndex: 0,
      solved: 0,
      correct: 0,
      incorrect: 0,
      scoreGained: 0,
      bestStreak: 0,
      streak: 0,
      rewards: [],
      speedLeft: 0,
      stars: 0,
      completedBook: false,
    };
  }

  function makeDefaultState() {
    const children = [
      createChild("하늘", "🐰", { totalScore: 40, solvedCount: 8, correctCount: 6, bestStreak: 3, xp: 64 }),
      createChild("민지", "🐻", { totalScore: 35, solvedCount: 7, correctCount: 5, bestStreak: 2, xp: 56 }),
      createChild("도윤", "🐥", { totalScore: 52, solvedCount: 9, correctCount: 7, bestStreak: 4, xp: 72 }),
    ];
    return {
      version: 5,
      children,
      selectedChildId: children[0].id,
      selectedBookId: BOOKS[0].id,
      selectedMode: "challenge",
      gameHistory: [],
      currentSession: defaultSession(),
      settings: {
        autoNext: false,
        voiceRate: 0.9,
        effects: true,
        defaultPlayerId: children[0].id,
      },
      ui: {
        currentView: "home",
        isPlaying: false,
        replayCount: 0,
        childManagerOpen: false,
      },
      achievements: {},
      unlockedBadges: {},
      weakWords: {},
      reviewWords: {},
      recentSessions: [],
      reports: { updatedAt: null },
      unlockedBooks: BOOKS.map((b) => b.id),
      quests: {
        daily: { date: todayKey(), items: DAILY_QUESTS.map((q) => ({ id: q.id, progress: 0, completed: false })) },
        weekly: { weekStart: weekKey(), items: WEEKLY_QUESTS.map((q) => ({ id: q.id, progress: 0, completed: false })) },
      },
    };
  }

  function normalize(s) {
    const base = makeDefaultState();
    const out = {
      ...base,
      ...s,
      currentSession: { ...base.currentSession, ...(s.currentSession || {}) },
      settings: { ...base.settings, ...(s.settings || {}) },
      ui: { ...base.ui, ...(s.ui || {}) },
      children: Array.isArray(s.children) && s.children.length ? s.children : base.children,
      gameHistory: Array.isArray(s.gameHistory) ? s.gameHistory : [],
      recentSessions: Array.isArray(s.recentSessions) ? s.recentSessions : [],
      unlockedBooks: Array.isArray(s.unlockedBooks) && s.unlockedBooks.length ? s.unlockedBooks : base.unlockedBooks,
      achievements: s.achievements || {},
      unlockedBadges: s.unlockedBadges || {},
      weakWords: s.weakWords || s.reviewWords || {},
      reviewWords: s.reviewWords || s.weakWords || {},
      reports: s.reports || { updatedAt: null },
      quests: s.quests || base.quests,
    };

    out.children = out.children.map((c) => ({ ...createChild(c.name || "친구", c.avatar || AVATARS[0]), ...c }));
    if (!out.selectedChildId) out.selectedChildId = out.settings.defaultPlayerId || out.children[0]?.id;
    if (!out.selectedBookId) out.selectedBookId = BOOKS[0].id;
    if (!out.selectedMode) out.selectedMode = MODES[1].id;

    if (!out.quests.daily || out.quests.daily.date !== todayKey()) {
      out.quests.daily = { date: todayKey(), items: DAILY_QUESTS.map((q) => ({ id: q.id, progress: 0, completed: false })) };
    }
    if (!out.quests.weekly || out.quests.weekly.weekStart !== weekKey()) {
      out.quests.weekly = { weekStart: weekKey(), items: WEEKLY_QUESTS.map((q) => ({ id: q.id, progress: 0, completed: false })) };
    }

    out.recentSessions = out.recentSessions
      .sort((a, b) => new Date(b.finishedAt || 0) - new Date(a.finishedAt || 0))
      .slice(0, 30);

    return out;
  }

  function migrateFromLegacy(v) {
    const s = makeDefaultState();
    s.children = v.children || s.children;
    s.selectedChildId = v.selectedChildId || s.selectedChildId;
    s.gameHistory = v.gameHistory || [];
    s.currentSession = { ...s.currentSession, ...(v.currentSession || {}) };
    s.settings = { ...s.settings, ...(v.settings || {}) };
    s.ui = { ...s.ui, ...(v.ui || {}), currentView: "home", isPlaying: false };
    s.achievements = v.achievements || {};
    s.unlockedBadges = v.unlockedBadges || {};
    s.recentSessions = v.recentSessions || [];
    s.reviewWords = v.reviewWords || {};
    s.weakWords = v.weakWords || v.reviewWords || {};
    s.selectedBookId = v.selectedBookId || BOOKS[0].id;
    s.selectedMode = v.selectedMode || MODES[1].id;
    return normalize(s);
  }

  function loadState() {
    try {
      const raw5 = localStorage.getItem(STORAGE_KEYS.v5);
      if (raw5) return normalize(JSON.parse(raw5));

      for (const key of [STORAGE_KEYS.v4, STORAGE_KEYS.v3, STORAGE_KEYS.v2]) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const migrated = migrateFromLegacy(JSON.parse(raw));
          saveState(migrated);
          return migrated;
        }
      }

      const fresh = makeDefaultState();
      saveState(fresh);
      return fresh;
    } catch (e) {
      console.warn("storage load failed", e);
      return makeDefaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEYS.v5, JSON.stringify(state));
  }

  function resetAll() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    const fresh = makeDefaultState();
    saveState(fresh);
    return fresh;
  }

  window.AppStorage = { loadState, saveState, defaultSession, todayKey, weekKey, resetAll };
})();
