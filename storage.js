(function () {
  const { STORAGE_KEYS, AVATARS, MISSION_DEFS } = window.AppData;

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

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function makeDefaultState() {
    const children = [
      createChild("하늘", "🐰", { totalScore: 40, solvedCount: 8, correctCount: 6, bestStreak: 3, streak: 1 }),
      createChild("민지", "🐻", { totalScore: 35, solvedCount: 7, correctCount: 5, bestStreak: 2, streak: 0 }),
      createChild("도윤", "🐥", { totalScore: 52, solvedCount: 9, correctCount: 7, bestStreak: 4, streak: 2 }),
    ];

    const selectedChildId = children[0].id;
    return {
      version: 3,
      children,
      selectedChildId,
      gameHistory: [],
      currentSession: defaultSession(),
      settings: { autoNext: false, randomMode: true },
      ui: { currentView: "home", isPlaying: false, replayCount: 0, childManagerOpen: false },
      achievements: {},
      missions: { date: todayKey(), items: MISSION_DEFS.map((m) => ({ id: m.id, progress: 0, completed: false })) },
      childLevels: {},
      recentSessions: [],
      unlockedBadges: {},
      reviewWords: {},
    };
  }

  function defaultSession() {
    return {
      active: false,
      questionIds: [],
      currentIndex: 0,
      solved: 0,
      correct: 0,
      incorrect: 0,
      scoreGained: 0,
      bestStreak: 0,
      streak: 0,
      rewards: [],
    };
  }

  function migrateFromV2(v2) {
    const state = makeDefaultState();
    state.children = (v2.children || state.children).map((c) => ({
      ...createChild(c.name || "친구", c.avatar || AVATARS[0]),
      ...c,
    }));
    state.selectedChildId = v2.selectedChildId || state.children[0]?.id || null;
    state.gameHistory = Array.isArray(v2.gameHistory) ? v2.gameHistory : [];
    state.currentSession = { ...defaultSession(), ...(v2.currentSession || {}) };
    state.settings = { ...state.settings, ...(v2.settings || {}) };
    state.ui = { ...state.ui, ...(v2.ui || {}), currentView: "home" };
    return normalize(state);
  }

  function normalize(input) {
    const base = makeDefaultState();
    const state = {
      ...base,
      ...input,
      currentSession: { ...defaultSession(), ...(input.currentSession || {}) },
      settings: { ...base.settings, ...(input.settings || {}) },
      ui: { ...base.ui, ...(input.ui || {}) },
      missions: input.missions || base.missions,
      achievements: input.achievements || {},
      childLevels: input.childLevels || {},
      recentSessions: Array.isArray(input.recentSessions) ? input.recentSessions : [],
      unlockedBadges: input.unlockedBadges || {},
      reviewWords: input.reviewWords || {},
    };

    state.children = (state.children || base.children).map((c) => ({
      ...createChild(c.name || "친구", c.avatar || AVATARS[0]),
      ...c,
    }));

    if (!state.selectedChildId && state.children[0]) state.selectedChildId = state.children[0].id;

    if (!state.missions.date || state.missions.date !== todayKey()) {
      state.missions = { date: todayKey(), items: MISSION_DEFS.map((m) => ({ id: m.id, progress: 0, completed: false })) };
    }

    return state;
  }

  function loadState() {
    try {
      const rawV3 = localStorage.getItem(STORAGE_KEYS.v3);
      if (rawV3) return normalize(JSON.parse(rawV3));

      const rawV2 = localStorage.getItem(STORAGE_KEYS.v2);
      if (rawV2) {
        const migrated = migrateFromV2(JSON.parse(rawV2));
        saveState(migrated);
        return migrated;
      }

      const fresh = makeDefaultState();
      saveState(fresh);
      return fresh;
    } catch (e) {
      console.warn("저장 데이터 로드 실패, 기본값 사용", e);
      return makeDefaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEYS.v3, JSON.stringify(state));
  }

  window.AppStorage = { loadState, saveState, defaultSession, todayKey };
})();
