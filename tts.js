(function () {
  let voices = [];

  function loadVoices() {
    voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    return voices;
  }

  function pickKoreanVoice() {
    if (!voices.length) loadVoices();
    return voices.find((v) => (v.lang || "").toLowerCase().startsWith("ko")) || voices[0] || null;
  }

  function speak(text, options = {}) {
    const { rate = 0.9, onStart, onEnd, onError, fallbackMs = 2000 } = options;
    const synth = window.speechSynthesis;

    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      if (onStart) onStart();
      setTimeout(() => onEnd && onEnd({ fallback: true }), fallbackMs);
      return { cancel: () => {} };
    }

    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.lang = "ko-KR";
    const voice = pickKoreanVoice();
    if (voice) utter.voice = voice;

    utter.onstart = () => onStart && onStart();
    utter.onend = () => onEnd && onEnd({ fallback: false });
    utter.onerror = () => {
      if (onError) onError();
      if (onStart) onStart();
      setTimeout(() => onEnd && onEnd({ fallback: true }), fallbackMs);
    };

    synth.speak(utter);
    return {
      cancel: () => synth.cancel(),
    };
  }

  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  window.AppTTS = { speak, loadVoices };
})();
