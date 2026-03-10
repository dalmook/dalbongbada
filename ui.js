(function () {
  const { ACHIEVEMENTS, MISSION_DEFS, MAX_REPLAY, PLAYBACK_MS } = window.AppData;

  const el = {
    navBtns: document.querySelectorAll(".nav-btn"),
    views: {
      home: document.getElementById("view-home"),
      play: document.getElementById("view-play"),
      result: document.getElementById("view-result"),
      ranking: document.getElementById("view-ranking"),
      achievements: document.getElementById("view-achievements"),
    },
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
    playProgress: document.getElementById("play-progress"),
    playScore: document.getElementById("play-score"),
    playStreak: document.getElementById("play-streak"),
    playRemaining: document.getElementById("play-remaining"),
    playProgressFill: document.getElementById("play-progress-fill"),
    playCategory: document.getElementById("play-category"),
    playDifficulty: document.getElementById("play-difficulty"),
    playStatus: document.getElementById("play-status"),
    playReplay: document.getElementById("play-replay"),
    playBtn: document.getElementById("play-btn"),
    replayBtn: document.getElementById("replay-btn"),
    answerInput: document.getElementById("answer-input"),
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
    resultStats: document.getElementById("result-stats"),
    resultPraise: document.getElementById("result-praise"),
    resultRewards: document.getElementById("result-rewards"),
  };

  function showView(state, viewName) {
    Object.entries(el.views).forEach(([name, node]) => node.classList.toggle("hidden", name !== viewName));
    state.ui.currentView = viewName;
  }

  function renderHome(state) {
    const sorted = window.AppGame.getSortedChildren(state);
    const selected = window.AppGame.getSelectedChild(state);
    const level = selected ? window.AppGame.getChildLevel(selected.totalScore) : null;

    el.homeChampion.textContent = sorted[0] ? `${sorted[0].avatar} ${sorted[0].name} (${sorted[0].totalScore}점)` : "-";
    el.homeSelectedChild.textContent = selected ? `${selected.avatar} ${selected.name}` : "친구를 선택해 주세요";
    el.homeSelectedLevel.textContent = selected ? `${level.current.title} · 누적 ${selected.totalScore}점` : "-";
    el.homeLevelFill.style.width = `${level ? level.progress : 0}%`;

    el.missionList.innerHTML = "";
    MISSION_DEFS.forEach((def) => {
      const current = state.missions.items.find((m) => m.id === def.id) || { progress: 0, completed: false };
      const li = document.createElement("li");
      li.textContent = `${current.completed ? "✅" : "⬜"} ${def.text} (${current.progress}/${def.target})`;
      el.missionList.appendChild(li);
    });

    const recent = state.recentSessions.slice(0, 3);
    el.homeRecentSummary.innerHTML = "";
    if (!recent.length) {
      el.homeRecentSummary.innerHTML = "<li>아직 플레이 기록이 없어요.</li>";
    } else {
      recent.forEach((r) => {
        const li = document.createElement("li");
        li.textContent = `${r.childName} · ${r.score}점 · 정답 ${r.correct}개`;
        el.homeRecentSummary.appendChild(li);
      });
    }
  }

  function renderChildManager(state) {
    el.childList.innerHTML = "";
    state.children.forEach((child) => {
      const btn = el.childTemplate.content.firstElementChild.cloneNode(true);
      btn.querySelector(".avatar").textContent = child.avatar;
      btn.querySelector(".name").textContent = child.name;
      btn.querySelector(".meta").textContent = `${child.totalScore}점 · 정답률 ${window.AppGame.getChildAccuracy(child)}%`;
      if (child.id === state.selectedChildId) btn.classList.add("active");
      btn.addEventListener("click", () => {
        state.selectedChildId = child.id;
        window.AppStorage.saveState(state);
        renderHome(state);
        renderChildManager(state);
      });
      el.childList.appendChild(btn);
    });

    el.childManager.classList.toggle("hidden", !state.ui.childManagerOpen);
  }

  function renderPlay(state) {
    const session = state.currentSession;
    const q = window.AppGame.sessionQuestion(state);
    const solved = session.solved;

    el.playProgress.textContent = `${session.currentIndex + 1} / ${session.questionIds.length || 10}`;
    el.playScore.textContent = `세션 점수 ${session.scoreGained}점`;
    el.playStreak.textContent = `연속 ${session.streak}회`;
    el.playRemaining.textContent = `남은 문제 ${Math.max(0, session.questionIds.length - session.currentIndex)}`;
    el.playProgressFill.style.width = `${Math.round((solved / (session.questionIds.length || 10)) * 100)}%`;
    if (q) {
      el.playCategory.textContent = `카테고리 ${q.category}`;
      el.playDifficulty.textContent = `난이도 ${"⭐".repeat(q.difficulty)}`;
    }
    el.playReplay.textContent = `다시 듣기 ${state.ui.replayCount}/${MAX_REPLAY}`;
    el.playBtn.textContent = state.ui.isPlaying ? "읽는 중이야..." : "문제 불러줘";
    el.playBtn.classList.toggle("is-playing", state.ui.isPlaying);
    el.playBtn.disabled = state.ui.isPlaying;
    el.replayBtn.disabled = state.ui.isPlaying;
  }

  function showFeedback(type, main, sub) {
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

  function setPlayStatus(text) {
    el.playStatus.textContent = text;
  }

  function playMock(state) {
    if (state.ui.isPlaying) return;
    state.ui.isPlaying = true;
    setPlayStatus("읽는 중이야...");
    renderPlay(state);
    setTimeout(() => {
      state.ui.isPlaying = false;
      setPlayStatus("이제 써볼까?");
      renderPlay(state);
      window.AppStorage.saveState(state);
    }, PLAYBACK_MS);
  }

  function renderRanking(state) {
    const sorted = window.AppGame.getSortedChildren(state);
    el.rankingList.innerHTML = "";
    sorted.forEach((child, index) => {
      const li = document.createElement("li");
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⭐";
      li.textContent = `${medal} ${child.avatar} ${child.name} · ${child.totalScore}점 · 정답률 ${window.AppGame.getChildAccuracy(child)}% · 최고연속 ${child.bestStreak}`;
      if (child.id === state.selectedChildId) li.classList.add("current");
      el.rankingList.appendChild(li);
    });

    el.recentSessionList.innerHTML = "";
    (state.recentSessions.slice(0, 6)).forEach((r) => {
      const li = document.createElement("li");
      li.textContent = `${r.childName} · ${r.score}점 · 정답 ${r.correct}/${r.correct + r.incorrect} (${r.finishedAt.slice(5, 10)})`;
      el.recentSessionList.appendChild(li);
    });
    if (!state.recentSessions.length) el.recentSessionList.innerHTML = "<li>최근 기록이 아직 없어요.</li>";

    const selected = window.AppGame.getSelectedChild(state);
    const review = (selected && state.reviewWords[selected.id]) || [];
    el.reviewWordList.innerHTML = review.length
      ? review.slice(-8).reverse().map((w) => `<li>${w.word} · ${w.count}회 틀림</li>`).join("")
      : "<li>복습 단어가 아직 없어요.</li>";
  }

  function renderAchievements(state) {
    const selected = window.AppGame.getSelectedChild(state);
    const unlocked = (selected && state.achievements[selected.id]) || [];
    el.achievementOwner.textContent = selected ? `${selected.avatar} ${selected.name}의 스티커북` : "친구를 선택해 주세요";

    el.achievementGrid.innerHTML = "";
    ACHIEVEMENTS.forEach((a) => {
      const card = document.createElement("article");
      card.className = `achievement-card ${unlocked.includes(a.id) ? "unlocked" : "locked"}`;
      card.innerHTML = `<h4>${a.name}</h4><p>${a.desc}</p><p>${unlocked.includes(a.id) ? "획득 완료" : "잠김"}</p>`;
      el.achievementGrid.appendChild(card);
    });
  }

  function renderResult(state) {
    const last = state.recentSessions[0];
    if (!last) return;
    el.resultPlayer.textContent = `${last.childName}의 결과`;
    el.resultStats.innerHTML = [
      `획득 점수: ${last.score}점`,
      `정답/오답: ${last.correct}/${last.incorrect}`,
      `최고 연속 정답: ${last.bestStreak}회`,
    ]
      .map((t) => `<li>${t}</li>`)
      .join("");
    el.resultPraise.textContent = last.praise;

    const rewards = state.currentSession.rewards || [];
    el.resultRewards.innerHTML = rewards.length ? rewards.map((r) => `<span class="reward-chip">${r}</span>`).join("") : "";
  }

  function renderAll(state) {
    showView(state, state.ui.currentView || "home");
    renderHome(state);
    renderChildManager(state);
    renderPlay(state);
    renderRanking(state);
    renderAchievements(state);
    renderResult(state);

    el.navBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === state.ui.currentView);
    });
  }

  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.remove("hidden");
    setTimeout(() => el.toast.classList.add("hidden"), 1700);
  }

  window.AppUI = { el, showView, renderAll, renderPlay, showFeedback, setPlayStatus, playMock, toast };
})();
