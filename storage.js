(function () {
  const { STORAGE_KEYS, AVATARS, MISSION_DEFS, BOOKS, MODES } = window.AppData;

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
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
    };
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
      ...override,
    };
  }

  function makeDefaultState() {
    const children = [
      createChild("하늘", "🐰", { totalScore: 40, solvedCount: 8, correctCount: 6, bestStreak: 3, streak: 1 }),
      createChild("민지", "🐻", { totalScore: 35, solvedCount: 7, correctCount: 5, bestStreak: 2 }),
      createChild("도윤", "🐥", { totalScore: 52, solvedCount: 9, correctCount: 7, bestStreak: 4, streak: 2 }),
    ];
    return {
      version: 4,
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
      missions: {
        date: todayKey(),
        items: MISSION_DEFS.map((m) => ({ id: m.id, progress: 0, completed: false })),
      },
      childLevels: {},
      recentSessions: [],
      unlockedBadges: {},
      weakWords: {},
      reviewWords: {},
      reports: { updatedAt: null },
      unlockedBooks: BOOKS.map((b) => b.id),
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
      missions: s.missions || base.missions,
      recentSessions: Array.isArray(s.recentSessions) ? s.recentSessions : [],
      children: Array.isArray(s.children) && s.children.length ? s.children : base.children,
      unlockedBooks: Array.isArray(s.unlockedBooks) && s.unlockedBooks.length ? s.unlockedBooks : base.unlockedBooks,
    };

    out.children = out.children.map((c) => ({ ...createChild(c.name || "친구", c.avatar || AVATARS[0]), ...c }));
    if (!out.selectedChildId) out.selectedChildId = out.settings.defaultPlayerId || out.children[0]?.id;
    if (!out.selectedBookId) out.selectedBookId = BOOKS[0].id;
    if (!out.selectedMode) out.selectedMode = "challenge";

    if (!out.missions.date || out.missions.date !== todayKey()) {
      out.missions = {
        date: todayKey(),
        items: MISSION_DEFS.map((m) => ({ id: m.id, progress: 0, completed: false })),
      };
    }

    return out;
  }

  function migrateFromV3(v3) {
    const s = makeDefaultState();
    s.children = v3.children || s.children;
    s.selectedChildId = v3.selectedChildId || s.selectedChildId;
    s.gameHistory = v3.gameHistory || [];
    s.currentSession = { ...s.currentSession, ...(v3.currentSession || {}) };
    s.settings = { ...s.settings, ...(v3.settings || {}) };
    s.ui = { ...s.ui, ...(v3.ui || {}), currentView: "home" };
    s.achievements = v3.achievements || {};
    s.missions = v3.missions || s.missions;
    s.childLevels = v3.childLevels || {};
    s.recentSessions = v3.recentSessions || [];
    s.unlockedBadges = v3.unlockedBadges || {};
    s.reviewWords = v3.reviewWords || {};
    s.weakWords = v3.reviewWords || {};
    s.selectedBookId = BOOKS[0].id;
    s.selectedMode = "challenge";
    return normalize(s);
  }

  function migrateFromV2(v2) {
    const s = makeDefaultState();
    s.children = v2.children || s.children;
    s.selectedChildId = v2.selectedChildId || s.selectedChildId;
    s.gameHistory = v2.gameHistory || [];
    s.settings = { ...s.settings, ...(v2.settings || {}) };
    s.ui = { ...s.ui, ...(v2.ui || {}), currentView: "home" };
    return normalize(s);
  }

  function loadState() {
    try {
      const raw4 = localStorage.getItem(STORAGE_KEYS.v4);
      if (raw4) return normalize(JSON.parse(raw4));

      const raw3 = localStorage.getItem(STORAGE_KEYS.v3);
      if (raw3) {
        const migrated3 = migrateFromV3(JSON.parse(raw3));
        saveState(migrated3);
        return migrated3;
      }

      const raw2 = localStorage.getItem(STORAGE_KEYS.v2);
      if (raw2) {
        const migrated2 = migrateFromV2(JSON.parse(raw2));
        saveState(migrated2);
        return migrated2;
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
    localStorage.setItem(STORAGE_KEYS.v4, JSON.stringify(state));
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEYS.v4);
    localStorage.removeItem(STORAGE_KEYS.v3);
    localStorage.removeItem(STORAGE_KEYS.v2);
    const fresh = makeDefaultState();
    saveState(fresh);
    return fresh;
  }

  window.AppStorage = { loadState, saveState, defaultSession, todayKey, resetAll };
})();
