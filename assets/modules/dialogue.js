import { CONFIG } from '../config.js';

export class DialogueManager {
  constructor() {
    this.dialogueQueue = [];
    this.currentDialogue = null;
    this.isSpeaking = false;
    this.subtitleBar = null;
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.typewriterSpeed = 30;
    this.autoAdvanceDelay = 3000;
    this.lastAutoAdvance = 0;
    this.onDialogueStart = null;
    this.onDialogueEnd = null;
  }

  init(onDialogueStart, onDialogueEnd) {
    this.onDialogueStart = onDialogueStart;
    this.onDialogueEnd = onDialogueEnd;
    this.createSubtitleBar();
  }

  createSubtitleBar() {
    this.subtitleBar = document.createElement('div');
    this.subtitleBar.className = 'subtitle-bar-3d';
    this.subtitleBar.innerHTML = '<span class="subtitle-text"></span>';
    document.body.appendChild(this.subtitleBar);
  }

  speak(lines, options = {}) {
    if (!Array.isArray(lines)) lines = [lines];
    this.dialogueQueue = [...lines];
    this.currentDialogue = null;
    this.typewriterIndex = 0;
    this.isSpeaking = true;
    if (this.onDialogueStart) this.onDialogueStart();
    this.processQueue(options);
  }

  processQueue(options = {}) {
    if (this.dialogueQueue.length === 0) {
      this.finishSpeaking();
      return;
    }

    this.currentDialogue = this.dialogueQueue.shift();
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;

    this.showSubtitle(this.currentDialogue);

    const advanceDelay = options.advanceDelay || this.autoAdvanceDelay;
    this.lastAutoAdvance = Date.now() + advanceDelay + this.currentDialogue.length * this.typewriterSpeed;

    const animateTypewriter = () => {
      if (!this.isSpeaking) return;

      const now = Date.now();
      const elapsed = now - (this.lastAutoAdvance - advanceDelay - this.currentDialogue.length * this.typewriterSpeed);

      if (this.typewriterIndex < this.currentDialogue.length) {
        this.typewriterIndex = Math.min(this.currentDialogue.length, Math.floor(elapsed / this.typewriterSpeed));
        this.updateSubtitleText(this.currentDialogue.substring(0, this.typewriterIndex));
        requestAnimationFrame(animateTypewriter);
      } else {
        setTimeout(() => this.processQueue(options), advanceDelay);
      }
    };
    animateTypewriter();
  }

  showSubtitle(text) {
    if (this.subtitleBar) {
      this.subtitleBar.classList.add('visible');
      this.updateSubtitleText(text);
    }
  }

  updateSubtitleText(text) {
    if (this.subtitleBar) {
      const textEl = this.subtitleBar.querySelector('.subtitle-text');
      if (textEl) textEl.textContent = text;
    }
  }

  finishSpeaking() {
    this.isSpeaking = false;
    this.currentDialogue = null;

    if (this.subtitleBar) {
      this.subtitleBar.classList.remove('visible');
    }

    if (this.onDialogueEnd) this.onDialogueEnd();
  }

  skip() {
    if (this.isSpeaking && this.currentDialogue) {
      this.typewriterIndex = this.currentDialogue.length;
      this.updateSubtitleText(this.currentDialogue);
    }
  }

  update(delta, time) {
    // subtitle bar is static, no update needed
  }

  sayWelcome() {
    this.speak(CONFIG.dialogue.welcome, { advanceDelay: 4000 });
  }

  sayAbout() {
    this.speak(CONFIG.dialogue.about, { advanceDelay: 3500 });
  }

  saySkills() {
    this.speak(CONFIG.dialogue.skills, { advanceDelay: 3500 });
  }

  sayProjects() {
    this.speak(CONFIG.dialogue.projects, { advanceDelay: 3500 });
  }

  sayContact() {
    this.speak(CONFIG.dialogue.contact, { advanceDelay: 3500 });
  }

  sayIdle() {
    this.speak(CONFIG.dialogue.idle, { advanceDelay: 4000 });
  }

  dispose() {
    if (this.subtitleBar && this.subtitleBar.parentNode) {
      this.subtitleBar.parentNode.removeChild(this.subtitleBar);
    }
  }
}