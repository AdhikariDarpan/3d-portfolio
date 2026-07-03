import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { CityBuilder } from './city.js';

export class SceneManager {
  constructor(canvas, perfSettings) {
    this.canvas = canvas;
    this.perfSettings = perfSettings;
    this.scene = new THREE.Scene();
    this.renderer = null;
    this.camera = null;
    this.floor = null;
    this.city = null;
    this.clock = new THREE.Clock();
    this.time = 0;
  }

  init() {
    this.setupRenderer();
    this.setupCamera();
    this.setupSky();
    this.setupLights();
    this.setupCity();
    this.setupResize();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.perfSettings.antialias,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = this.perfSettings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(10, 6, 14);
    this.camera.lookAt(0, 1.5, 0);
  }

  setupSky() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#4a90d9');
    grad.addColorStop(0.4, '#87ceeb');
    grad.addColorStop(0.7, '#b8d8f0');
    grad.addColorStop(0.85, '#d4e4e8');
    grad.addColorStop(1, '#e8e8e0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
    this.scene.fog = new THREE.FogExp2(0xb8d8f0, 0.005);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x908050, 0.9);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0dd, 1.5);
    sun.position.set(30, 25, 10);
    sun.castShadow = this.perfSettings.shadows;
    if (this.perfSettings.shadows) {
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 60;
      sun.shadow.camera.left = -25;
      sun.shadow.camera.right = 25;
      sun.shadow.camera.top = 25;
      sun.shadow.camera.bottom = -25;
      sun.shadow.bias = -0.001;
    }
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8899ff, 0.3);
    fill.position.set(-20, 10, -20);
    this.scene.add(fill);
  }

  setupCity() {
    this.city = new CityBuilder(this.scene);
    this.city.build();
  }

  setupResize() {
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update() {
    this.time = this.clock.getElapsedTime();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  setCameraPosition(pos, target) {
    if (pos) this.camera.position.copy(pos);
    if (target) this.camera.lookAt(target);
  }

  getCamera() { return this.camera; }
  getScene() { return this.scene; }
  getRenderer() { return this.renderer; }
  getColliders() { return this.city ? this.city.getColliders() : []; }
  updateFountain(time) { if (this.city && this.city.updateFountain) this.city.updateFountain(time); }

  dispose() {
    if (this.city) this.city.dispose();
    this.renderer.dispose();
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}