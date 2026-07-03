import * as THREE from 'three';

export class CinematicCamera {
  constructor(camera) {
    this.camera = camera;
    this.isTransitioning = false;
    this.transitionStart = 0;
    this.transitionDuration = 0;
    this.startPosition = new THREE.Vector3();
    this.startTarget = new THREE.Vector3();
    this.endPosition = new THREE.Vector3();
    this.endTarget = new THREE.Vector3();
    this.easing = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    this.onComplete = null;
    this.timeScale = 1;
  }

  transitionTo(position, target, duration = 1.2, onComplete = null) {
    if (this.isTransitioning) return false;

    this.startPosition.copy(this.camera.position);
    this.startTarget.copy(this.getLookTarget());
    this.endPosition.copy(position);
    this.endTarget.copy(target);
    this.transitionDuration = duration;
    this.transitionStart = performance.now() / 1000;
    this.isTransitioning = true;
    this.onComplete = onComplete;
    this.timeScale = 0.3;

    return true;
  }

  getLookTarget() {
    const target = new THREE.Vector3();
    this.camera.getWorldDirection(target);
    target.multiplyScalar(10).add(this.camera.position);
    return target;
  }

  update(delta) {
    if (!this.isTransitioning) return false;

    const now = performance.now() / 1000;
    const elapsed = (now - this.transitionStart) * (1 / this.timeScale);
    const progress = Math.min(elapsed / this.transitionDuration, 1);
    const eased = this.easing(progress);

    this.camera.position.lerpVectors(this.startPosition, this.endPosition, eased);

    const currentTarget = new THREE.Vector3().lerpVectors(this.startTarget, this.endTarget, eased);
    this.camera.lookAt(currentTarget);

    if (progress >= 1) {
      this.isTransitioning = false;
      this.timeScale = 1;
      this.camera.position.copy(this.endPosition);
      this.camera.lookAt(this.endTarget);
      if (this.onComplete) {
        this.onComplete();
        this.onComplete = null;
      }
      return true;
    }
    return false;
  }

  setTimeScale(scale) {
    this.timeScale = scale;
  }

  getState() {
    return {
      isTransitioning: this.isTransitioning,
      progress: this.isTransitioning ? Math.min((performance.now() / 1000 - this.transitionStart) / this.transitionDuration, 1) : 0,
    };
  }

  cancel() {
    this.isTransitioning = false;
    this.timeScale = 1;
    this.onComplete = null;
  }
}