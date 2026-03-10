(function () {
  const { BOOKS, MODES, ACHIEVEMENTS, MAX_REPLAY, SPEED_LIMIT_SEC } = window.AppData;
  const el = {
    navBtns: document.querySelectorAll(".nav-btn"),
    views: ["home", "books", "play", "result", "ranking", "achievements", "report", "settings"].reduce((a, v) => ({ ...a, [v]: document.getElementById(`view-${v}`) }), {}),
    toast: document.getElementById("toast"),
    homeChampion: document.getElementById("home-champion"),
    homeSelectedChild: document.getElementById("home-selected-child"),
    homeSelectedLevel: document.getElementById("home-selected-level"),
    homeLevelFill: document.getElementById("home-level-fill"),
    missionList: document.getElementById("mission-list"),
    homeRecentSummary: document.getElementById("home-recent-summary"),
    childManager: document.getElementById("child-manager"),
    childList: document.getElementById("child-list"),
    childTemplate: document.getElementById("child-item-template"),
    bookList: document.getElementById("book-list"),
    modeList: document.getElementById("mode-list"),
    playMode: document.getElementById("play-mode"),
    playProgress: document.getElementById("play-progress"),
    playScore: document.getElementById("play-score"),
    playStreak: document.getElementById("play-streak"),
    playProgressFill: document.getElementById("play-progress-fill"),
    playBook: document.getElementById("play-book"),
    playCategory: document.getElementById("play-category"),
    playDifficulty: document.getElementById("play-difficulty"),
    playStatus: document.getElementById("play-status"),
    playTimer: document.getElementById("play-timer"),
    playReplay: document.getElementById("play-replay"),
    playBtn: document.getElementById("play-btn"),
    replayBtn: document.getElementById("replay-btn"),
    feedbackBox: document.getElementById("feedback-box"),
    feedbackMain: document.getElementById("feedback-main"),
    feedbackSub: document.getElementById("feedback-sub"),
    sparkles: document.getElementById("sparkles"),
    rankingList: document.getElementById("ranking-list"),
    recentSessionList: document.getElementById("recent-session-list"),
    reviewWordList: document.getElementById("review-word-list"),
    achievementOwner: document.getElementById("achievement-owner"),
    achievementGrid: document.getElementById("achievement-grid"),
    resultPlayer: document.getElementById("result-player"),
    resultStars: document.getElementById("result-stars"),
    resultStats: document.getElementById("result-stats"),
    resultPraise: document.getElementById("result-praise"),
    resultRewards: document.getElementById("result-rewards"),
    reportChildSelect: document.getElementById("report-child-select"),
    reportScore: document.getElementById("report-score"),
    reportAccuracy: document.getElementById("report-accuracy"),
    reportAccuracyFill: document.getElementById("report-accuracy-fill"),
    reportStreak: document.getElementById("report-streak"),
    reportLast: document.getElementById("report-last"),
    reportWeak: document.getElementById("report-weak"),
    reportRecent: document.getElementById("report-recent"),
    settingAutoNext: document.getElementById("setting-auto-next"),
    settingVoiceRate: document.getElementById("setting-voice-rate"),
    settingEffects: document.getElementById("setting-effects"),
    settingDefaultPlayer: document.getElementById("setting-default-player"),
  };

  function showView(state, view) {
    Object.entries(el.views).forEach(([k, node]) => node.classList.toggle("hidden", k !== view));
    state.ui.currentView = view;
    el.navBtns.forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  }

  function renderHome(state) {
    const sorted = window.AppGame.sortedChildren(state);
    const child = window.AppGame.selectedChild(state);
    const lv = child ? window.AppGame.childLevel(child.totalScore) : null;
    el.homeChampion.textContent = sorted[0] ? `${sorted[0].avatar} ${sorted[0].name} (${sorted[0].totalScore}점)` : "-";
    el.homeSelectedChild.textContent = child ? `${child.avatar} ${child.name}` : "-";
    el.homeSelectedLevel.textContent = child ? `${lv.current.title} · 누적 ${child.totalScore}점` : "-";
    el.homeLevelFill.style.width = `${lv ? lv.progress : 0}%`;

    el.missionList.innerHTML = state.missions.items.map((m) => `<li>${m.completed ? "✅" : "⬜"} ${m.id.replace("mission_", "")} (${m.progress})</li>`).join("");
    el.homeRecentSummary.innerHTML = state.recentSessions.slice(0, 3).map((s) => `<li>${s.childName} · ${s.score}점 · ${"⭐".repeat(s.stars || 1)}</li>`).join("") || "<li>아직 세션 기록이 없어요.</li>";

    el.childList.innerHTML = "";
    state.children.forEach((c) => {
      const item = el.childTemplate.content.firstElementChild.cloneNode(true);
      item.querySelector(".avatar").textContent = c.avatar;
      item.querySelector(".name").textContent = c.name;
      item.querySelector(".meta").textContent = `${c.totalScore}점 · 정답률 ${window.AppGame.accuracy(c)}%`;
      if (c.id === state.selectedChildId) item.classList.add("active");
      item.addEventListener("click", () => {
        state.selectedChildId = c.id;
        window.AppStorage.saveState(state);
        renderAll(state);
      });
      el.childList.appendChild(item);
    });
    el.childManager.classList.toggle("hidden", !state.ui.childManagerOpen);
  }

  function renderBooks(state) {
    el.bookList.innerHTML = `
      <button class="book-item ${state.selectedBookId === "review" ? "active" : ""}" data-book="review">📝 복습 모드<br/><small>틀린 단어 복습</small></button>
      ${BOOKS.map((b) => `<button class="book-item ${state.selectedBookId === b.id ? "active" : ""}" data-book="${b.id}">${b.icon} ${b.title}<br/><small>${b.description}</small></button>`).join("")}
    `;
    el.modeList.innerHTML = MODES.map((m) => `<button class="book-item ${state.selectedMode === m.id ? "active" : ""}" data-mode="${m.id}">${m.icon} ${m.name}<br/><small>${m.description}</small></button>`).join("");
  }

  function renderPlay(state) {
    const s = state.currentSession;
    const p = window.AppGame.currentProblem(state);
    const mode = window.AppGame.selectedMode(state);
    const book = window.AppGame.selectedBook(state);

    el.playMode.textContent = `모드: ${mode.name}`;
    el.playProgress.textContent = `${s.currentIndex + 1} / ${Math.max(1, s.problems.length)}`;
    el.playScore.textContent = `세션 점수 ${s.scoreGained}점`;
    el.playStreak.textContent = `연속 ${s.streak}회`;
    el.playProgressFill.style.width = `${Math.round((s.solved / Math.max(1, s.problems.length)) * 100)}%`;
    el.playBook.textContent = `${book.icon} ${book.title}`;
    el.playCategory.textContent = `카테고리 ${p?.category || "-"}`;
    el.playDifficulty.textContent = `난이도 ${"⭐".repeat(p?.difficulty || 1)}`;
    el.playReplay.textContent = `다시 듣기 ${state.ui.replayCount}/${MAX_REPLAY}`;
    el.playTimer.textContent = mode.id === "speed" ? `남은 시간 ${s.speedLeft || SPEED_LIMIT_SEC}초` : "";
    el.playBtn.textContent = state.ui.isPlaying ? "읽는 중이야..." : "문제 불러줘";
    el.playBtn.classList.toggle("is-playing", state.ui.isPlaying);
    el.playBtn.disabled = state.ui.isPlaying;
    el.replayBtn.disabled = state.ui.isPlaying;
  }

  function renderRanking(state) {
    const sorted = window.AppGame.sortedChildren(state);
    el.rankingList.innerHTML = sorted.map((c, i) => `<li class="${c.id === state.selectedChildId ? "current" : ""}">${i===0?"🥇":i===1?"🥈":i===2?"🥉":"⭐"} ${c.avatar} ${c.name} · ${c.totalScore}점</li>`).join("");
    el.recentSessionList.innerHTML = state.recentSessions.slice(0, 5).map((s) => `<li>${s.childName} · ${s.mode} · ${s.score}점 (${s.finishedAt.slice(5,10)})</li>`).join("") || "<li>최근 세션 없음</li>";
    const child = window.AppGame.selectedChild(state);
    const weak = (state.weakWords[child?.id] || []).slice().sort((a, b) => b.count - a.count).slice(0, 5);
    el.reviewWordList.innerHTML = weak.map((w) => `<li>${w.word} · ${w.count}회</li>`).join("") || "<li>약한 단어 없음</li>";
  }

  function renderAchievements(state) {
    const child = window.AppGame.selectedChild(state);
    const unlocked = (state.achievements[child?.id] || []);
    el.achievementOwner.textContent = child ? `${child.avatar} ${child.name}의 업적` : "-";
    el.achievementGrid.innerHTML = ACHIEVEMENTS.map((a) => `<article class="achievement-card ${unlocked.includes(a.id) ? "unlocked" : "locked"}"><h4>${a.name}</h4><p>${a.desc}</p></article>`).join("");
  }

  function renderResult(state) {
    const s = state.recentSessions[0];
    if (!s) return;
    el.resultPlayer.textContent = `${s.childName}의 결과`;
    el.resultStars.textContent = "⭐".repeat(s.stars || 1);
    el.resultStats.innerHTML = [`획득 점수 ${s.score}점`, `정답 ${s.correct} / 오답 ${s.incorrect}`, `최고 연속 ${s.bestStreak}회`].map((x) => `<li>${x}</li>`).join("");
    el.resultPraise.textContent = s.praise;
    el.resultRewards.innerHTML = (state.currentSession.rewards || []).map((r) => `<span class="reward-chip">${r}</span>`).join("");
  }

  function renderReport(state) {
    el.reportChildSelect.innerHTML = state.children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    el.reportChildSelect.value = state.selectedChildId;
    const rep = window.AppGame.parentReport(state, state.selectedChildId);
    el.reportScore.textContent = `${rep.totalScore}점`;
    el.reportAccuracy.textContent = `${rep.accuracy}%`;
    el.reportAccuracyFill.style.width = `${rep.accuracy}%`;
    el.reportStreak.textContent = `최고 연속 ${rep.bestStreak}회`;
    el.reportLast.textContent = `최근 학습 ${rep.lastDate}`;
    el.reportWeak.innerHTML = rep.weakTop.map((w) => `<li>${w.word} · ${w.count}회</li>`).join("") || "<li>약한 단어 없음</li>";
    el.reportRecent.innerHTML = rep.recent.map((r) => `<li>${r.finishedAt.slice(5,10)} · ${r.score}점 · ${"⭐".repeat(r.stars||1)}</li>`).join("") || "<li>세션 기록 없음</li>";
  }

  function renderSettings(state) {
    el.settingAutoNext.checked = !!state.settings.autoNext;
    el.settingVoiceRate.value = String(state.settings.voiceRate || 0.9);
    el.settingEffects.checked = !!state.settings.effects;
    el.settingDefaultPlayer.innerHTML = state.children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    el.settingDefaultPlayer.value = state.settings.defaultPlayerId || state.selectedChildId;
  }

  function renderAll(state) {
    showView(state, state.ui.currentView || "home");
    renderHome(state);
    renderBooks(state);
    renderPlay(state);
    renderRanking(state);
    renderAchievements(state);
    renderResult(state);
    renderReport(state);
    renderSettings(state);
  }

  function feedback(type, main, sub) {
    el.feedbackMain.textContent = main;
    el.feedbackSub.textContent = sub;
    el.feedbackBox.classList.remove("correct", "incorrect");
    el.sparkles.classList.remove("show");
    if (type === "correct") {
      el.feedbackBox.classList.add("correct");
      el.sparkles.classList.add("show");
    }
    if (type === "incorrect") el.feedbackBox.classList.add("incorrect");
  }

  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.remove("hidden");
    setTimeout(() => el.toast.classList.add("hidden"), 1800);
  }

  window.AppUI = { el, showView, renderAll, feedback, toast };
})();
