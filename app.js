(function () {
  const { MAX_REPLAY, SPEED_LIMIT_SEC, AVATARS } = window.AppData;
  let state = window.AppStorage.loadState();
  window.AppGame.updateMissions(state, state.selectedChildId);
  let timerHandle = null;

  const $ = window.AppUI.el;

  function saveRender() {
    window.AppStorage.saveState(state);
    window.AppUI.renderAll(state);
  }

  function switchView(view) {
    state.ui.currentView = view;
    saveRender();
  }

  function speakCurrent(resetReplay = false) {
    if (!state.currentSession.active || state.ui.isPlaying) return;
    const p = window.AppGame.currentProblem(state);
    if (!p) return;

    if (resetReplay) state.ui.replayCount = 0;
    state.ui.isPlaying = true;
    window.AppUI.feedback("neutral", "읽는 중이야...", "잘 듣고 써보자!");
    saveRender();

    window.AppTTS.speak(p.word, {
      rate: Number(state.settings.voiceRate || 0.9),
      onStart: () => { state.ui.isPlaying = true; saveRender(); },
      onEnd: () => {
        state.ui.isPlaying = false;
        saveRender();
      },
      onError: () => window.AppUI.toast("음성 재생이 어려워서 기본 재생으로 진행해요"),
      fallbackMs: 2100,
    });
  }

  function startSpeedTimer() {
    clearInterval(timerHandle);
    if (!state.currentSession.active || state.currentSession.mode !== "speed") return;
    state.currentSession.speedLeft = SPEED_LIMIT_SEC;
    timerHandle = setInterval(() => {
      if (!state.currentSession.active) return clearInterval(timerHandle);
      state.currentSession.speedLeft -= 1;
      if (state.currentSession.speedLeft <= 0) {
        onSubmit(true);
      }
      saveRender();
    }, 1000);
  }

  function startSession() {
    const started = window.AppGame.startSession(state);
    if (started.emptyReview) {
      window.AppUI.toast("복습할 단어가 아직 없어요. 다른 문제집을 골라주세요!");
      state.ui.currentView = "books";
      return saveRender();
    }
    if (!started.ok) {
      window.AppUI.toast("문제집에 문제가 없어요.");
      return;
    }
    window.AppUI.feedback("neutral", "문제를 들어보세요", "");
    saveRender();
    startSpeedTimer();
  }

  function onSubmit(timeUp = false) {
    if (!state.currentSession.active) return;
    const ans = timeUp ? "" : $.answerInput.value.trim();
    if (!timeUp && !ans) return window.AppUI.feedback("neutral", "단어를 입력해보자!", "");

    const result = window.AppGame.submitAnswer(state, ans, { timeUp });
    if (!result) return;

    if (result.correct) {
      window.AppUI.feedback("correct", "정답이야! 정말 잘했어!", `+${result.gained}점`);
    } else {
      window.AppUI.feedback("incorrect", timeUp ? "시간이 끝났어!" : "아쉽지만 다시 도전해보자!", `정답은 "${result.correctWord}"`);
    }

    if (result.rewards.length) {
      state.currentSession.rewards = [...state.currentSession.rewards, ...result.rewards];
      window.AppUI.toast(result.rewards[0]);
    }

    $.answerInput.value = "";
    if (state.settings.autoNext) onNext();
    saveRender();
  }

  function onNext() {
    if (!state.currentSession.active) return;
    const done = window.AppGame.nextProblem(state);
    if (done) {
      clearInterval(timerHandle);
      window.AppUI.toast(`세션 완료! ${"⭐".repeat(state.currentSession.stars || 1)}`);
    } else if (state.currentSession.mode === "speed") {
      startSpeedTimer();
    }
    saveRender();
  }

  function addChild() {
    const name = prompt("새 친구 이름을 입력해 주세요 ✍️");
    if (!name || !name.trim()) return;
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    state.children.push({ id: `child-${Math.random().toString(36).slice(2, 10)}`, name: name.trim(), avatar, totalScore: 0, streak: 0, bestStreak: 0, solvedCount: 0, correctCount: 0 });
    state.selectedChildId = state.children[state.children.length - 1].id;
    state.settings.defaultPlayerId = state.selectedChildId;
    saveRender();
  }

  function bindNav() {
    $.navBtns.forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));
    document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));
  }

  function bindEvents() {
    bindNav();
    document.getElementById("go-book-btn").addEventListener("click", () => switchView("books"));
    document.getElementById("start-play-btn").addEventListener("click", startSession);
    document.getElementById("retry-btn").addEventListener("click", startSession);

    document.getElementById("toggle-child-manager").addEventListener("click", () => { state.ui.childManagerOpen = true; saveRender(); });
    document.getElementById("close-child-manager").addEventListener("click", () => { state.ui.childManagerOpen = false; saveRender(); });
    document.getElementById("add-child-btn").addEventListener("click", addChild);

    document.getElementById("play-btn").addEventListener("click", () => speakCurrent(true));
    document.getElementById("replay-btn").addEventListener("click", () => {
      if (state.ui.replayCount >= MAX_REPLAY) return window.AppUI.toast("다시 듣기는 2번까지 가능해요!");
      state.ui.replayCount += 1;
      speakCurrent(false);
    });

    document.getElementById("submit-btn").addEventListener("click", () => onSubmit(false));
    document.getElementById("next-btn").addEventListener("click", onNext);
    $.answerInput.addEventListener("keydown", (e) => e.key === "Enter" && onSubmit(false));

    // Book/Mode choose delegation
    $.bookList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-book]");
      if (!btn) return;
      state.selectedBookId = btn.dataset.book;
      saveRender();
    });
    $.modeList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-mode]");
      if (!btn) return;
      state.selectedMode = btn.dataset.mode;
      saveRender();
    });

    // Settings
    $.settingAutoNext.addEventListener("change", () => { state.settings.autoNext = $.settingAutoNext.checked; saveRender(); });
    $.settingVoiceRate.addEventListener("change", () => { state.settings.voiceRate = Number($.settingVoiceRate.value); saveRender(); });
    $.settingEffects.addEventListener("change", () => { state.settings.effects = $.settingEffects.checked; saveRender(); });
    $.settingDefaultPlayer.addEventListener("change", () => {
      state.settings.defaultPlayerId = $.settingDefaultPlayer.value;
      state.selectedChildId = $.settingDefaultPlayer.value;
      saveRender();
    });

    $.reportChildSelect.addEventListener("change", () => { state.selectedChildId = $.reportChildSelect.value; saveRender(); });

    document.getElementById("reset-sample-btn").addEventListener("click", () => {
      state = window.AppStorage.resetAll();
      window.AppUI.toast("샘플 데이터로 초기화했어요");
      saveRender();
    });
    document.getElementById("reset-all-btn").addEventListener("click", () => {
      if (!confirm("정말 전체 기록을 초기화할까요?")) return;
      state = window.AppStorage.resetAll();
      window.AppUI.toast("전체 기록을 초기화했어요");
      saveRender();
    });
  }

  bindEvents();
  saveRender();
})();
