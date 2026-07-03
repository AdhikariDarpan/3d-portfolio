import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../config.js';

export class AvatarManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.avatar = null;
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;
    this.isLoaded = false;
    this.targetPosition = new THREE.Vector3(0, 0, 0);
    this.currentPosition = new THREE.Vector3(0, 0, 0);
    this.isMoving = false;
    this.moveSpeed = 4.0;
    this.headBone = null;
    this.lookAtTarget = null;
    this.idleActions = [];
    this.lastBlink = 0;
    this.freeRoamMove = null;
    this.freeRoam = false;
    this.freeRoamInput = null;
    this.currentSpeed = 0;
    this.maxSpeed = 4.0;
    this.acceleration = 8.0;
    this.deceleration = 12.0;
    this.colliders = [];
  }

  setColliders(colliders) { this.colliders = colliders || []; }

  checkCollision(pos) {
    const pad = 0.25;
    for (const c of this.colliders) {
      if (pos.x >= c.min.x - pad && pos.x <= c.max.x + pad &&
          pos.z >= c.min.z - pad && pos.z <= c.max.z + pad) {
        // Push out to nearest edge
        const dxL = pos.x - (c.min.x - pad);
        const dxR = (c.max.x + pad) - pos.x;
        const dzL = pos.z - (c.min.z - pad);
        const dzR = (c.max.z + pad) - pos.z;
        const minD = Math.min(dxL, dxR, dzL, dzR);
        if (minD === dxL) pos.x = c.min.x - pad;
        else if (minD === dxR) pos.x = c.max.x + pad;
        else if (minD === dzL) pos.z = c.min.z - pad;
        else pos.z = c.max.z + pad;
        return true;
      }
    }
    return false;
  }

  async load(url) {
    if (url) {
      const loader = new GLTFLoader();
      try {
        const gltf = await loader.loadAsync(url);
        this.avatar = gltf.scene;
        this.avatar.scale.setScalar(1.0);
        this.avatar.position.set(0, 0, 0);
        this.avatar.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
          }
        });
        this.setupAnimations(gltf);
        this.findHeadBone();
        this.scene.add(this.avatar);
        this.isLoaded = true;
        this.playIdle();
        console.log('[Avatar] GLB avatar loaded from:', url);
        return;
      } catch (err) {
        console.warn('[Avatar] GLB load failed, using fallback:', err);
      }
    }

    if (CONFIG.avatar.usePhotoTexture) {
      await this.createPhotoFallback();
    } else {
      this.createStylizedFallback();
    }
  }

  async createPhotoFallback() {
    const group = new THREE.Group();

    let faceTex = null;
    try {
      faceTex = await new THREE.TextureLoader().loadAsync(CONFIG.avatar.faceImage);
    } catch (e) {
      console.warn('[Avatar] Face texture failed, using stylized:', e);
      this.createStylizedFallback();
      return;
    }

    const headMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      metalness: 0.05,
      roughness: 0.7,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 32), headMat);
    head.name = 'avatar-head';
    head.position.y = 1.5;
    head.castShadow = true;
    group.add(head);

    this.headBone = new THREE.Object3D();
    this.headBone.position.copy(head.position);
    group.add(this.headBone);

    let coatTex = null;
    try {
      coatTex = await new THREE.TextureLoader().loadAsync(CONFIG.avatar.coatImage);
    } catch (e) {
      console.warn('[Avatar] Coat texture failed');
    }

    const bodyMat = new THREE.MeshStandardMaterial({
      map: coatTex || undefined,
      color: coatTex ? undefined : 0x2a3040,
      metalness: 0.2,
      roughness: 0.8,
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.1, 16), bodyMat);
    body.name = 'avatar-body';
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, metalness: 0.1, roughness: 0.8 });
    const armGeo = new THREE.CapsuleGeometry(0.08, 0.6, 4, 8);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.name = 'avatar-left-arm';
    leftArm.position.set(-0.5, 0.95, 0);
    leftArm.rotation.z = Math.PI / 6;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.name = 'avatar-right-arm';
    rightArm.position.set(0.5, 0.95, 0);
    rightArm.rotation.z = -Math.PI / 6;
    group.add(rightArm);

    const legGeo = new THREE.CapsuleGeometry(0.1, 0.7, 4, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a2035, metalness: 0.1, roughness: 0.9 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.name = 'avatar-left-leg';
    leftLeg.position.set(-0.18, 0.35, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.name = 'avatar-right-leg';
    rightLeg.position.set(0.18, 0.35, 0);
    group.add(rightLeg);

    this.avatar = group;
    this.avatar.position.set(0, 0, 0);
    this.scene.add(this.avatar);
    this.isLoaded = true;
    this.startProceduralIdle();
    console.log('[Avatar] Photo-textured avatar created');
  }

  createStylizedFallback() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: CONFIG.avatar.fallbackColor,
      metalness: 0.2,
      roughness: 0.7,
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.0, 16), bodyMat);
    body.name = 'avatar-body';
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, metalness: 0.1, roughness: 0.8 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 32), headMat);
    head.name = 'avatar-head';
    head.position.y = 1.45;
    head.castShadow = true;
    group.add(head);

    const eyeGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1f2e });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.name = 'avatar-left-eye';
    leftEye.position.set(-0.08, 1.48, 0.25);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.name = 'avatar-right-eye';
    rightEye.position.set(0.08, 1.48, 0.25);
    group.add(rightEye);

    this.headBone = new THREE.Object3D();
    this.headBone.position.copy(head.position);
    group.add(this.headBone);

    const armGeo = new THREE.CapsuleGeometry(0.08, 0.6, 4, 8);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.name = 'avatar-left-arm';
    leftArm.position.set(-0.5, 0.9, 0);
    leftArm.rotation.z = Math.PI / 6;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.name = 'avatar-right-arm';
    rightArm.position.set(0.5, 0.9, 0);
    rightArm.rotation.z = -Math.PI / 6;
    group.add(rightArm);

    const legGeo = new THREE.CapsuleGeometry(0.1, 0.8, 4, 8);
    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    leftLeg.name = 'avatar-left-leg';
    leftLeg.position.set(-0.18, 0.4, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, bodyMat);
    rightLeg.name = 'avatar-right-leg';
    rightLeg.position.set(0.18, 0.4, 0);
    group.add(rightLeg);

    this.avatar = group;
    this.avatar.position.set(0, 0, 0);
    this.scene.add(this.avatar);
    this.isLoaded = true;
    this.startProceduralIdle();
    console.log('[Avatar] Stylized avatar created');
  }

  findHeadBone() {
    if (!this.avatar) return;
    this.avatar.traverse(child => {
      if (child.name.toLowerCase().includes('head') && !this.headBone) {
        this.headBone = child;
      }
    });
  }

  setupAnimations(gltf) {
    if (gltf.animations && gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.avatar);
      gltf.animations.forEach(clip => {
        const action = this.mixer.clipAction(clip);
        this.animations[clip.name] = action;
        if (clip.name.toLowerCase().includes('idle') || clip.name.toLowerCase().includes('stand')) {
          this.idleActions.push(action);
        }
      });
    }
  }

  playAnimation(name, loop = THREE.LoopRepeat, clampWhenFinished = false) {
    if (!this.mixer || !this.animations[name]) return;
    if (this.currentAction) this.currentAction.fadeOut(0.3);
    const action = this.animations[name];
    action.reset();
    action.setLoop(loop, clampWhenFinished ? 1 : Infinity);
    action.clampWhenFinished = clampWhenFinished;
    action.fadeIn(0.3);
    action.play();
    this.currentAction = action;
  }

  playIdle() {
    if (this.idleActions.length > 0) {
      const idle = this.idleActions[Math.floor(Math.random() * this.idleActions.length)];
      if (this.currentAction) this.currentAction.fadeOut(0.3);
      idle.reset();
      idle.fadeIn(0.3);
      idle.play();
      this.currentAction = idle;
    } else if (this.animations.Idle) {
      this.playAnimation('Idle');
    } else {
      this.startProceduralIdle();
    }
  }

  startProceduralIdle() { this.proceduralIdle = true; this.idleTime = 0; }
  stopProceduralIdle() { this.proceduralIdle = false; }

  wave() {
    if (this.animations.Wave) {
      this.playAnimation('Wave', THREE.LoopOnce, true);
      setTimeout(() => this.playIdle(), 2000);
    } else {
      this.proceduralWave();
    }
  }

  pointAt(target) {
    if (this.animations.Point) {
      this.playAnimation('Point', THREE.LoopOnce, true);
      setTimeout(() => this.playIdle(), 2000);
    } else {
      this.proceduralPoint(target);
    }
  }

  walkTo(position) {
    this.targetPosition.copy(position);
    this.targetPosition.y = 0;
    this.isMoving = true;
    this.freeRoamInput = null;
    if (this.animations.Walk || this.animations.Run) {
      this.playAnimation(this.animations.Walk ? 'Walk' : 'Run');
    }
  }

  proceduralWave() { this.waveTime = 0; this.waving = true; }
  proceduralPoint(target) { this.pointTarget = target.clone(); this.pointing = true; this.pointTime = 0; }

  update(delta, time) {
    if (this.mixer) this.mixer.update(delta);

    if (this.isMoving && this.avatar) {
      const direction = new THREE.Vector3().subVectors(this.targetPosition, this.avatar.position);
      direction.y = 0;
      const distance = direction.length();
      if (distance > 0.1) {
        direction.normalize();
        const moveStep = this.moveSpeed * delta;
        const newPos = this.avatar.position.clone().addScaledVector(direction, Math.min(moveStep, distance));
        this.checkCollision(newPos);
        this.avatar.position.copy(newPos);
        this.avatar.position.y = 0;
        const m = new THREE.Matrix4().lookAt(
          this.avatar.position,
          this.avatar.position.clone().add(direction),
          new THREE.Vector3(0, 1, 0)
        );
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m);
        this.avatar.quaternion.slerp(targetQuat, 0.08);
      } else {
        this.isMoving = false;
        this.avatar.position.copy(this.targetPosition);
        this.playIdle();
      }
    }

    if (this.freeRoamInput && this.avatar) {
      const moving = this.freeRoamInput.length() > 0.01;
      if (moving) {
        this.currentSpeed = Math.min(this.currentSpeed + this.acceleration * delta, this.maxSpeed);
      } else {
        this.currentSpeed = Math.max(this.currentSpeed - this.deceleration * delta, 0);
      }

      if (this.currentSpeed > 0.01 && moving) {
        const dir = this.freeRoamInput.clone().normalize();
        const newPos = this.avatar.position.clone().addScaledVector(dir, this.currentSpeed * delta);
        this.checkCollision(newPos);
        this.avatar.position.copy(newPos);
        this.avatar.position.y = 0;

        const m = new THREE.Matrix4().lookAt(
          this.avatar.position,
          this.avatar.position.clone().add(dir),
          new THREE.Vector3(0, 1, 0)
        );
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m);
        this.avatar.quaternion.slerp(targetQuat, 0.08);
      }
    }

    this.updateProceduralAnimations(delta, time);
    this.updateHeadLook(time);
    this.updateBlink(time);
  }

  setFreeRoamDirection(direction) {
    if (!this.avatar) return;
    this.proceduralIdle = false;
    this.freeRoamInput = direction.clone();
    if (direction.length() > 0.01) {
      this.isMoving = false;
    }
  }

  rotateYaw(angle) {
    if (!this.avatar) return;
    this.proceduralIdle = false;
    this.avatar.rotation.y += angle;
  }

  getFacingDirection() {
    if (!this.avatar) return new THREE.Vector3(0, 0, -1);
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.avatar.quaternion);
    dir.y = 0;
    return dir.normalize();
  }

  setFreeRoam(enabled) {
    this.freeRoam = enabled;
  }

  updateProceduralAnimations(delta, time) {
    if (!this.avatar || this.mixer) return;

    if (this.proceduralIdle && this.currentSpeed < 0.01) {
      this.idleTime += delta;
      const body = this.avatar.getObjectByName('avatar-body');
      const head = this.avatar.getObjectByName('avatar-head');
      if (body) body.position.y = 0.5 + Math.sin(this.idleTime * 1.5) * 0.02;
      if (head) head.position.y = 1.45 + Math.sin(this.idleTime * 1.5) * 0.02;
      this.avatar.rotation.y = Math.sin(this.idleTime * 0.3) * 0.1;
    }

    if (this.waving && this.waveTime !== undefined) {
      this.waveTime += delta;
      const rightArm = this.avatar.getObjectByName('avatar-right-arm');
      if (rightArm) {
        rightArm.rotation.z = -Math.PI / 6 + Math.sin(this.waveTime * 10) * 0.8;
        rightArm.rotation.x = Math.sin(this.waveTime * 5) * 0.3;
      }
      if (this.waveTime > 2) { this.waving = false; this.waveTime = undefined; }
    }

    if (this.pointing && this.pointTarget) {
      this.pointTime += delta;
      const rightArm = this.avatar.getObjectByName('avatar-right-arm');
      if (rightArm) {
        const dir = new THREE.Vector3().subVectors(this.pointTarget, this.avatar.position).normalize();
        rightArm.lookAt(dir);
        rightArm.rotation.z -= Math.PI / 2;
      }
      if (this.pointTime > 2) { this.pointing = false; this.pointTarget = null; }
    }
  }

  updateHeadLook(time) {
    if (!this.headBone) return;
    if (this.lookAtTarget) {
      const target = new THREE.Vector3().copy(this.lookAtTarget);
      this.headBone.lookAt(target);
    } else {
      this.headBone.rotation.y = Math.sin(time * 0.5) * 0.3;
      this.headBone.rotation.x = Math.sin(time * 0.7) * 0.1;
    }
  }

  updateBlink(time) {
    if (!this.avatar) return;
    if (time - this.lastBlink > 3 + Math.random() * 4) {
      this.lastBlink = time;
      this.blinking = true;
      this.blinkStart = time;
    }
    if (this.blinking) {
      const t = (time - this.blinkStart) * 10;
      const s = t < 1 ? 1 - t : t < 2 ? t - 1 : 1;
      this.setEyeScale(s);
      if (t >= 2) this.blinking = false;
    }
  }

  setEyeScale(scale) {
    const leftEye = this.avatar?.getObjectByName('avatar-left-eye');
    const rightEye = this.avatar?.getObjectByName('avatar-right-eye');
    if (leftEye) leftEye.scale.y = scale;
    if (rightEye) rightEye.scale.y = scale;
  }

  setLookAt(target) { this.lookAtTarget = target; }
  clearLookAt() { this.lookAtTarget = null; }

  getPosition() {
    return this.avatar ? this.avatar.position.clone() : new THREE.Vector3();
  }

  dispose() {
    if (this.mixer) this.mixer.uncacheRoot(this.avatar);
    if (this.avatar) {
      this.scene.remove(this.avatar);
      this.avatar.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }
  }
}