import { CONFIG } from '../config.js';

export class PerformanceDetector {
  constructor() {
    this.tier = 'high';
    this.gpuInfo = null;
  }

  async detect() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    this.gpuInfo = gl ? gl.getParameter(gl.RENDERER) : 'unknown';

    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = navigator.deviceMemory || 4;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const isLowEnd = hardwareConcurrency <= 4 || deviceMemory <= 4;

    let tier = 'high';
    if (isMobile || isLowEnd) tier = 'low';
    else if (hardwareConcurrency <= 8 || deviceMemory <= 8) tier = 'medium';

    console.log('[Performance] Detected:', { tier, hardwareConcurrency, deviceMemory, isMobile, gpu: this.gpuInfo });
    this.tier = tier;
    return tier;
  }

  getSettings() {
    return CONFIG.performance[this.tier] || CONFIG.performance.high;
  }

  getTier() {
    return this.tier;
  }

  getGPUInfo() {
    return this.gpuInfo;
  }
}

export const performanceDetector = new PerformanceDetector();