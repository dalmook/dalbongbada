(function () {
  const { AVATARS, MAX_REPLAY } = window.AppData;

  const state = window.AppStorage.loadState();
  window.AppGame.refreshMissions(state, state.selectedChildId);

  const {
    navBtns,
    playBtn,
    replayBtn,
    answerInput,
    submitBtn,
    skipNextBtn,
    autoNextToggle,
    startSessionBtn,
    changeChildBtn,
    closeChildManager,
    addChildBtn,
    resultRetryBtn,
  } = {
    ...window.AppUI.el,
    submitBtn: document.getElementById("submit-btn"),
    skipNextBtn: document.getElementById("skip-next-btn"),
    autoNextToggle: document.getElementById("auto-next-toggle"),
    startSessionBtn: document.getElementById("start-session-btn"),
    changeChildBtn: document.getElementById("change-child-btn"),
    closeChildManager: document.getElementById("close-child-manager"),
    addChildBtn: document.getElementById("add-child-btn"),
    resultRetryBtn: document.getElementById("result-retry-btn"),
  };

  autoNextToggle.checked = Boolean(state.settings.autoNext);

  function persistAndRender() {
    window.AppStorage.saveState(state);
    window.AppUI.renderAll(state);
  }

  function switchView(view) {
    state.ui.currentView = view;
    persistAndRender();
  }

  function startSession() {
    if (!window.AppGame.getSelectedChild(state)) {
      window.AppUI.toast("먼저 친구를 선택해 주세요!");
      return;
    }
    window.AppGame.startSession(state);
    window.AppUI.setPlayStatus("문제를 들어보세요");
    window.AppUI.showFeedback("neutral", "문제를 재생하고 정답을 적어보자!", "");
    answerInput.value = "";
    persistAndRender();
  }

  function addChild() {
    const name = prompt("새 친구 이름을 입력해 주세요 ✍️");
    if (!name || !name.trim()) return;
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    state.children.push({
      id: `child-${Math.random().toString(36).slice(2, 10)}`,
      name: name.trim(),
      avatar,
      totalScore: 0,
      streak: 0,
      bestStreak: 0,
      solvedCount: 0,
      correctCount: 0,
    });
    state.selectedChildId = state.children[state.children.length - 1].id;
    window.AppGame.refreshMissions(state, state.selectedChildId);
    persistAndRender();
  }

  function onSubmit() {
    if (!state.currentSession.active) return;
    const answer = answerInput.value.trim();
    if (!answer) {
      window.AppUI.showFeedback("neutral", "단어를 입력해보자!", "");
      return;
    }

    const result = window.AppGame.completeQuestion(state, answer);
    if (result.isCorrect) {
      window.AppUI.showFeedback("correct", "정답이야! 정말 잘했어!", `+${result.gained}점`);
    } else {
      window.AppUI.showFeedback("incorrect", "아쉽지만 다시 도전해보자!", `정답은 "${result.answer}"`);
    }

    if (result.rewards.length) {
      state.currentSession.rewards = [...(state.currentSession.rewards || []), ...result.rewards];
      window.AppUI.toast(result.rewards[0]);
    }

    answerInput.value = "";

    if (state.settings.autoNext) {
      const done = window.AppGame.nextQuestion(state);
      if (!done) window.AppUI.setPlayStatus("다음 문제를 들어보세요");
    }

    persistAndRender();
  }

  function onNext() {
    if (!state.currentSession.active) return;
    const done = window.AppGame.nextQuestion(state);
    if (!done) window.AppUI.setPlayStatus("문제를 들어보세요");
    answerInput.value = "";
    persistAndRender();
  }

  function onReplay() {
    if (!state.currentSession.active || state.ui.isPlaying) return;
    if (state.ui.replayCount >= MAX_REPLAY) {
      window.AppUI.toast("다시 듣기는 2번까지 가능해요!");
      return;
    }
    state.ui.replayCount += 1;
    window.AppUI.playMock(state);
    persistAndRender();
  }

  function bindEvents() {
    navBtns.forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });
    document.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    startSessionBtn.addEventListener("click", startSession);
    resultRetryBtn.addEventListener("click", startSession);
    changeChildBtn.addEventListener("click", () => {
      state.ui.childManagerOpen = true;
      persistAndRender();
    });
    closeChildManager.addEventListener("click", () => {
      state.ui.childManagerOpen = false;
      persistAndRender();
    });
    addChildBtn.addEventListener("click", addChild);

    playBtn.addEventListener("click", () => {
      if (!state.currentSession.active) return;
      state.ui.replayCount = 0;
      window.AppUI.playMock(state);
      persistAndRender();
    });
    replayBtn.addEventListener("click", onReplay);
    submitBtn.addEventListener("click", onSubmit);
    skipNextBtn.addEventListener("click", onNext);

    answerInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") onSubmit();
    });
    autoNextToggle.addEventListener("change", () => {
      state.settings.autoNext = autoNextToggle.checked;
      persistAndRender();
    });
  }

  bindEvents();
  window.AppUI.renderAll(state);
})();
