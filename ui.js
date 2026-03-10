(function () {
  const { BOOKS, MODES, ACHIEVEMENTS, DAILY_QUESTS, WEEKLY_QUESTS, MAX_REPLAY, SPEED_LIMIT_SEC } = window.AppData;

  const viewNames = ["home", "books", "play", "result", "ranking", "achievements", "report", "settings"];
  const el = {
    navBtns: document.querySelectorAll(".nav-btn"),
    views: viewNames.reduce((acc, v) => ({ ...acc, [v]: document.getElementById(`view-${v}`) }), {}),
    toast: document.getElementById("toast"),
    childTemplate: document.getElementById("child-item-template"),

    homeChampion: document.getElementById("home-champion"),
    homeSelectedChild: document.getElementById("home-selected-child"),
    homeSelectedLevel: document.getElementById("home-selected-level"),
    homeLevelFill: document.getElementById("home-level-fill"),
    dailyQuestList: document.getElementById("daily-quest-list"),
    weeklyQuestList: document.getElementById("weekly-quest-list"),
    homeRecentSummary: document.getElementById("home-recent-summary"),
    childManager: document.getElementById("child-manager"),
    childList: document.getElementById("child-list"),

    bookList: document.getElementById("book-list"),
    modeList: document.getElementById("mode-list"),

    playPlayer: document.getElementById("play-player"),
    playMode: document.getElementById("play-mode"),
    playProgress: document.getElementById("play-progress"),
    playScore: document.getElementById("play-score"),
    playStreak: document.getElementById("play-streak"),
    playProgressFill: document.getElementById("play-progress-fill"),
    playBook: document.getElementById("play-book"),
    playCategory: document.getElementById("play-category"),
    playDifficulty: document.getElementById("play-difficulty"),
    playType: document.getElementById("play-type"),
    playStatus: document.getElementById("play-status"),
    playTimer: document.getElementById("play-timer"),
    playReplay: document.getElementById("play-replay"),
    playBtn: document.getElementById("play-btn"),
    replayBtn: document.getElementById("replay-btn"),
    settingAutoNextInline: document.getElementById("setting-auto-next-inline"),

    feedbackBox: document.getElementById("feedback-box"),
    feedbackMain: document.getElementById("feedback-main"),
    feedbackSub: document.getElementById("feedback-sub"),
    sparkles: document.getElementById("sparkles"),

    resultPlayer: document.getElementById("result-player"),
    resultStars: document.getElementById("result-stars"),
    resultStats: document.getElementById("result-stats"),
    resultPraise: document.getElementById("result-praise"),
    resultRewards: document.getElementById("result-rewards"),

    rankingList: document.getElementById("ranking-list"),
    recentSessionList: document.getElementById("recent-session-list"),
    reviewWordList: document.getElementById("review-word-list"),

    achievementOwner: document.getElementById("achievement-owner"),
    achievementGrid: document.getElementById("achievement-grid"),

    reportChildSelect: document.getElementById("report-child-select"),
    reportScore: document.getElementById("report-score"),
    reportAccuracy: document.getElementById("report-accuracy"),
    reportAccuracyFill: document.getElementById("report-accuracy-fill"),
    reportStreak: document.getElementById("report-streak"),
    reportLast: document.getElementById("report-last"),
    reportWeak: document.getElementById("report-weak"),
    reportRecent: document.getElementById("report-recent"),
    reportComment: document.getElementById("report-comment"),

    settingAutoNext: document.getElementById("setting-auto-next"),
    settingVoiceRate: document.getElementById("setting-voice-rate"),
    settingEffects: document.getElementById("setting-effects"),
    settingDefaultPlayer: document.getElementById("setting-default-player"),
  };

  function showView(state, view) {
    viewNames.forEach((v) => el.views[v].classList.toggle("hidden", v !== view));
    state.ui.currentView = view;
    el.navBtns.forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  }

  function renderHome(state) {
    const sorted = window.AppGame.sortedChildren(state);
    const child = window.AppGame.selectedChild(state);
    const level = child ? window.AppGame.childLevel(child.totalScore) : null;

    el.homeChampion.textContent = sorted[0]
      ? `${sorted[0].avatar} ${sorted[0].name} (${sorted[0].totalScore}점)`
      : "첫 플레이어가 챔피언이 될 수 있어요!";

    el.homeSelectedChild.textContent = child ? `${child.avatar} ${child.name}` : "친구를 선택해 주세요";
    el.homeSelectedLevel.textContent = child ? `${child.title || level.current.title} · 누적 ${child.totalScore}점` : "-";
    el.homeLevelFill.style.width = `${level ? level.progress : 0}%`;

    el.dailyQuestList.innerHTML = DAILY_QUESTS.map((q) => {
      const item = state.quests.daily.items.find((x) => x.id === q.id);
      return `<li>${item?.completed ? "✅" : "⬜"} ${q.text} (${item?.progress || 0}/${q.target})</li>`;
    }).join("");

    el.weeklyQuestList.innerHTML = WEEKLY_QUESTS.map((q) => {
      const item = state.quests.weekly.items.find((x) => x.id === q.id);
      return `<li>${item?.completed ? "✅" : "⬜"} ${q.text} (${item?.progress || 0}/${q.target})</li>`;
    }).join("");

    const recent = state.recentSessions.slice(0, 3);
    el.homeRecentSummary.innerHTML = recent.length
      ? recent.map((s) => `<li>${s.childName} · ${s.score}점 · ${"⭐".repeat(s.stars || 1)}</li>`).join("")
      : "<li>아직 플레이 기록이 없어요. 첫 세션을 시작해 보세요!</li>";

    el.childList.innerHTML = "";
    state.children.forEach((c) => {
      const node = el.childTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector(".avatar").textContent = c.avatar;
      node.querySelector(".name").textContent = c.name;
      node.querySelector(".meta").textContent = `${c.totalScore}점 · 정답률 ${window.AppGame.accuracy(c)}%`;
      if (c.id === state.selectedChildId) node.classList.add("active");
      node.addEventListener("click", () => {
        state.selectedChildId = c.id;
        window.AppStorage.saveState(state);
        renderAll(state);
      });
      el.childList.appendChild(node);
    });
    el.childManager.classList.toggle("hidden", !state.ui.childManagerOpen);
  }

  function renderBooks(state) {
    const child = window.AppGame.selectedChild(state);
    const weakCount = (state.weakWords[child?.id] || []).length;
    const reviewDisabled = weakCount === 0;

    const bookCards = [
      `<button class="book-item ${state.selectedBookId === "review" ? "active" : ""} ${reviewDisabled ? "disabled" : ""}" data-book="review" ${reviewDisabled ? "disabled" : ""}>
        📝 복습 모드
        <small>약한 단어 ${weakCount}개</small>
      </button>`,
      ...BOOKS.map(
        (b) => `<button class="book-item ${state.selectedBookId === b.id ? "active" : ""}" data-book="${b.id}">
          ${b.icon} ${b.title}
          <small>${b.description}</small>
          <small>난이도 ${"⭐".repeat(Math.max(...b.problems.map((p) => p.difficulty || 1)))} · ${b.problems.length}문제 · 추천 ${b.recommended}</small>
        </button>`,
      ),
    ];
    el.bookList.innerHTML = bookCards.join("");

    el.modeList.innerHTML = MODES.map(
      (m) => `<button class="book-item ${state.selectedMode === m.id ? "active" : ""}" data-mode="${m.id}">${m.icon} ${m.name}<small>${m.description}</small></button>`,
    ).join("");
  }

  function renderPlay(state) {
    const session = state.currentSession;
    const child = window.AppGame.selectedChild(state);
    const mode = window.AppGame.selectedMode(state);
    const book = window.AppGame.selectedBook(state);
    const p = window.AppGame.currentProblem(state);

    el.playPlayer.textContent = `플레이어: ${child ? `${child.avatar} ${child.name}` : "-"}`;
    el.playMode.textContent = `모드: ${mode.name}`;
    el.playProgress.textContent = `문제 ${session.currentIndex + 1}/${Math.max(1, session.problems.length)}`;
    el.playScore.textContent = `세션 점수 ${session.scoreGained}점`;
    el.playStreak.textContent = `연속 ${session.streak}회`;
    el.playProgressFill.style.width = `${Math.round((session.solved / Math.max(1, session.problems.length)) * 100)}%`;

    el.playBook.textContent = `${book.icon} ${book.title}`;
    el.playCategory.textContent = `카테고리 ${p?.category || "-"}`;
    el.playDifficulty.textContent = `난이도 ${"⭐".repeat(p?.difficulty || 1)}`;
    el.playType.textContent = `유형 ${p?.type === "sentence" ? "문장" : "단어"}`;

    el.playReplay.textContent = `다시 듣기 ${state.ui.replayCount}/${MAX_REPLAY}`;
    el.playTimer.textContent = mode.id === "speed" ? `남은 시간 ${session.speedLeft || SPEED_LIMIT_SEC}초` : "";
    el.playBtn.textContent = state.ui.isPlaying ? "읽는 중이야..." : "문제 불러줘";
    el.playBtn.classList.toggle("is-playing", state.ui.isPlaying);
    el.playBtn.disabled = state.ui.isPlaying;
    el.replayBtn.disabled = state.ui.isPlaying;
    el.settingAutoNextInline.checked = !!state.settings.autoNext;
  }

  function renderResult(state) {
    const s = state.recentSessions[0];
    if (!s) {
      el.resultPlayer.textContent = "아직 결과가 없어요";
      el.resultStars.textContent = "";
      el.resultStats.innerHTML = "<li>세션을 먼저 시작해 주세요.</li>";
      el.resultPraise.textContent = "";
      el.resultRewards.innerHTML = "";
      return;
    }

    el.resultPlayer.textContent = `${s.childName}의 결과`;
    el.resultStars.textContent = "⭐".repeat(s.stars || 1);
    el.resultStats.innerHTML = [
      `획득 점수 ${s.score}점`,
      `정답 ${s.correct} / 오답 ${s.incorrect}`,
      `최고 연속 ${s.bestStreak}회`,
    ]
      .map((x) => `<li>${x}</li>`)
      .join("");
    el.resultPraise.textContent = s.praise;
    el.resultRewards.innerHTML = (state.currentSession.rewards || []).map((r) => `<span class="reward-chip">${r}</span>`).join("");
  }

  function renderRanking(state) {
    const sorted = window.AppGame.sortedChildren(state);
    el.rankingList.innerHTML = sorted.length
      ? sorted
          .map((c, i) => `<li class="${c.id === state.selectedChildId ? "current" : ""}">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐"} ${c.avatar} ${c.name} · ${c.totalScore}점 · ${window.AppGame.accuracy(c)}%</li>`)
          .join("")
      : "<li>아직 친구가 없어요.</li>";

    el.recentSessionList.innerHTML = state.recentSessions.length
      ? state.recentSessions.slice(0, 5).map((s) => `<li>${s.childName} · ${s.mode} · ${s.score}점 (${s.finishedAt.slice(5, 10)})</li>`).join("")
      : "<li>최근 세션이 아직 없어요.</li>";

    const child = window.AppGame.selectedChild(state);
    const weak = (state.weakWords[child?.id] || []).slice().sort((a, b) => b.count - a.count).slice(0, 5);
    el.reviewWordList.innerHTML = weak.length ? weak.map((w) => `<li>${w.word} · ${w.count}회 틀림</li>`).join("") : "<li>복습 단어가 없어요. 아주 잘하고 있어요!</li>";
  }

  function renderAchievements(state) {
    const child = window.AppGame.selectedChild(state);
    const unlocked = state.achievements[child?.id] || [];
    el.achievementOwner.textContent = child ? `${child.avatar} ${child.name}의 스티커북` : "친구를 먼저 선택해 주세요";
    el.achievementGrid.innerHTML = ACHIEVEMENTS.map((a) => `<article class="achievement-card ${unlocked.includes(a.id) ? "unlocked" : "locked"}"><h4>${a.name}</h4><p>${a.desc}</p><p>${unlocked.includes(a.id) ? "획득 완료" : "잠김"}</p></article>`).join("");
  }

  function renderReport(state) {
    el.reportChildSelect.innerHTML = state.children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    el.reportChildSelect.value = state.selectedChildId;
    const rep = window.AppGame.parentReport(state, state.selectedChildId);

    el.reportScore.textContent = `${rep.totalScore}점`;
    el.reportAccuracy.textContent = `${rep.accuracy}%`;
    el.reportAccuracyFill.style.width = `${rep.accuracy}%`;
    el.reportStreak.textContent = `최고 연속 ${rep.bestStreak}회`;
    el.reportLast.textContent = `최근 학습: ${rep.lastDate}`;
    el.reportComment.textContent = rep.comment;

    el.reportWeak.innerHTML = rep.weakTop.length ? rep.weakTop.map((w) => `<li>${w.word} · ${w.count}회</li>`).join("") : "<li>약한 단어가 아직 없어요.</li>";
    el.reportRecent.innerHTML = rep.recent.length
      ? rep.recent.map((r) => `<li>${r.finishedAt.slice(5, 10)} · ${r.mode} · ${r.score}점 · ${"⭐".repeat(r.stars || 1)}</li>`).join("")
      : "<li>세션 기록이 아직 없어요.</li>";
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
    renderResult(state);
    renderRanking(state);
    renderAchievements(state);
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
