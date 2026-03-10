(function () {
  let voices = [];
  let currentUtter = null;

  function supported() {
    return Boolean(window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined");
  }

  function loadVoices() {
    if (!supported()) return [];
    voices = window.speechSynthesis.getVoices() || [];
    return voices;
  }

  function pickKoreanVoice() {
    if (!voices.length) loadVoices();
    return voices.find((v) => (v.lang || "").toLowerCase().startsWith("ko")) || voices[0] || null;
  }

  function stop() {
    if (supported()) window.speechSynthesis.cancel();
    currentUtter = null;
  }

  function speak(text, options = {}) {
    const { rate = 0.9, onStart, onEnd, onError, fallbackMs = 2000 } = options;

    stop();

    if (!supported()) {
      onStart && onStart();
      const t = setTimeout(() => onEnd && onEnd({ fallback: true }), fallbackMs);
      return { cancel: () => clearTimeout(t) };
    }

    const utter = new SpeechSynthesisUtterance(text);
    currentUtter = utter;
    utter.rate = rate;
    utter.lang = "ko-KR";
    const voice = pickKoreanVoice();
    if (voice) utter.voice = voice;

    utter.onstart = () => onStart && onStart();
    utter.onend = () => {
      if (currentUtter !== utter) return;
      currentUtter = null;
      onEnd && onEnd({ fallback: false });
    };
    utter.onerror = () => {
      currentUtter = null;
      onError && onError();
      onStart && onStart();
      setTimeout(() => onEnd && onEnd({ fallback: true }), fallbackMs);
    };

    window.speechSynthesis.speak(utter);
    return { cancel: stop };
  }

  if (supported()) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  window.AppTTS = { supported, loadVoices, speak, stop };
})();
