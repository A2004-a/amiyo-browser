/**
 * AETHER Browser — Microsoft Edge-style Read Aloud (Text-to-Speech) Engine
 * Reads distraction-free reader articles or web pages aloud with natural voice synthesis,
 * live paragraph highlighting, adjustable playback speed, and voice selection.
 */

const SpeechEngine = {
  synth: typeof window !== 'undefined' ? window.speechSynthesis : null,
  voices: [],
  selectedVoice: null,
  rate: 1.0,
  isPlaying: false,
  isPaused: false,
  currentIndex: 0,
  paragraphs: [],
  highlightElements: [],
  onStateChange: null,

  init() {
    if (!this.synth) return;

    const loadVoices = () => {
      this.voices = this.synth.getVoices();
      if (!this.selectedVoice && this.voices.length > 0) {
        // Prefer natural English voices (e.g. Edge Natural, Google US English, Samantha, etc.)
        this.selectedVoice = this.voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online'))) ||
                             this.voices.find(v => v.lang.startsWith('en')) ||
                             this.voices[0];
      }
      if (this.onStateChange) this.onStateChange();
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  },

  getVoices() {
    if (!this.voices || this.voices.length === 0) {
      if (this.synth) this.voices = this.synth.getVoices();
    }
    return this.voices || [];
  },

  setVoice(voiceName) {
    const v = this.voices.find(voice => voice.name === voiceName);
    if (v) {
      this.selectedVoice = v;
      if (this.isPlaying && !this.isPaused) {
        // Restart current paragraph with new voice
        const idx = this.currentIndex;
        this.stop(false);
        this.currentIndex = idx;
        this.speakCurrent();
      }
    }
  },

  setRate(newRate) {
    this.rate = Math.max(0.5, Math.min(3.0, parseFloat(newRate) || 1.0));
    if (this.isPlaying && !this.isPaused) {
      const idx = this.currentIndex;
      this.stop(false);
      this.currentIndex = idx;
      this.speakCurrent();
    }
  },

  start(containerEl) {
    if (!this.synth) return;
    this.stop(true);

    if (!containerEl) {
      containerEl = document.getElementById('reader-article-content');
    }
    if (!containerEl) return;

    // Collect readable paragraph elements: h1, h2, h3, p, li, blockquote
    const elements = Array.from(containerEl.querySelectorAll('h1, h2, h3, h4, p, li, blockquote'))
      .filter(el => (el.textContent || '').trim().length > 0);

    if (elements.length === 0) {
      const fullText = (containerEl.textContent || '').trim();
      if (!fullText) return;
      this.paragraphs = [fullText];
      this.highlightElements = [containerEl];
    } else {
      this.paragraphs = elements.map(el => el.textContent.trim());
      this.highlightElements = elements;
    }

    this.currentIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.speakCurrent();

    if (this.onStateChange) this.onStateChange();
  },

  speakCurrent() {
    if (!this.synth || this.currentIndex >= this.paragraphs.length) {
      this.stop(true);
      return;
    }

    const text = this.paragraphs[this.currentIndex];
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) utterance.voice = this.selectedVoice;
    utterance.rate = this.rate;

    // Highlight current reading element
    this.clearHighlights();
    const curEl = this.highlightElements[this.currentIndex];
    if (curEl) {
      curEl.classList.add('reader-speech-active');
      curEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    utterance.onend = () => {
      if (this.isPlaying && !this.isPaused) {
        this.currentIndex++;
        this.speakCurrent();
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      if (this.isPlaying && !this.isPaused) {
        this.currentIndex++;
        this.speakCurrent();
      }
    };

    this.synth.speak(utterance);
    this.isPlaying = true;
    this.isPaused = false;
    if (this.onStateChange) this.onStateChange();
  },

  pause() {
    if (!this.synth || !this.isPlaying) return;
    this.synth.pause();
    this.isPaused = true;
    if (this.onStateChange) this.onStateChange();
  },

  resume() {
    if (!this.synth || !this.isPlaying) return;
    this.synth.resume();
    this.isPaused = false;
    if (this.onStateChange) this.onStateChange();
  },

  togglePlayPause() {
    if (!this.isPlaying) {
      this.start();
    } else if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  },

  stop(clearState = true) {
    if (this.synth) {
      this.synth.cancel();
    }
    this.clearHighlights();
    if (clearState) {
      this.isPlaying = false;
      this.isPaused = false;
      this.currentIndex = 0;
      this.paragraphs = [];
      this.highlightElements = [];
    }
    if (this.onStateChange) this.onStateChange();
  },

  clearHighlights() {
    document.querySelectorAll('.reader-speech-active').forEach(el => {
      el.classList.remove('reader-speech-active');
    });
  }
};

if (typeof window !== 'undefined') {
  window.SpeechEngine = SpeechEngine;
}

