import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from '../config.js';
import { PROJECTS } from '../data.js';

export class InteractionManager {
  constructor(camera, renderer, scene, avatar, panels, dialogue, cinematic, perfSettings) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.avatar = avatar;
    this.panels = panels;
    this.dialogue = dialogue;
    this.cinematic = cinematic;
    this.perfSettings = perfSettings;

    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.keys = {};
    this.moveSpeed = 5.0;
    this.isPointerLocked = false;
    this.useFirstPerson = !perfSettings.isMobile && navigator.hardwareConcurrency > 4;
    this.lastPanelClick = 0;
    this.idleTimer = 0;
    this.lastInteraction = Date.now();
    this.freeRoam = false;
    this.isDragging = false;
    this.joystickActive = null;
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickVector = { x: 0, y: 0 };
  }

  init() {
    this.setupControls();
    this.setupEvents();
    this.setupPointerLock();
    this.setupJoystick();
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.8;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 25;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minPolarAngle = 0.1;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.5;
    this.controls.target.set(0, 1.5, 0);
    this.camera.position.set(8, 5, 14);
  }

  setupEvents() {
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('mousedown', () => { this.isDragging = false; });
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  setupPointerLock() {
    this.renderer.domElement.addEventListener('click', async () => {
      if (this.useFirstPerson && !this.isPointerLocked) {
        try {
          await this.renderer.domElement.requestPointerLock();
        } catch (e) {
          console.log('Pointer lock failed');
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
      if (this.isPointerLocked) {
        this.controls.enabled = false;
      } else {
        this.controls.enabled = true;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.handlePointerLockMove(e);
      }
    });
  }

  setupJoystick() {
    this.joystickEl = document.getElementById('joystick');
    if (!this.joystickEl) return;
    this.joystickKnob = this.joystickEl.querySelector('.joystick-knob');

    const onTouch = (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      this.lastInteraction = Date.now();

      const rect = this.joystickEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxR = rect.width / 2 - 12;

      let dx = touch.clientX - cx;
      let dy = touch.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }

      this.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joystickVector.x = dx / maxR;
      this.joystickVector.y = -dy / maxR;
    };

    const endTouch = () => {
      this.joystickKnob.style.transform = 'translate(0, 0)';
      this.joystickVector.x = 0;
      this.joystickVector.y = 0;
    };

    this.joystickEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.joystickActive = true;
      onTouch(e);
    }, { passive: false });

    this.joystickEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      onTouch(e);
    }, { passive: false });

    this.joystickEl.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.joystickActive = false;
      endTouch();
    }, { passive: false });

    this.joystickEl.addEventListener('touchcancel', () => {
      this.joystickActive = false;
      endTouch();
    });
  }

  handleJoystickMovement() {
    if (!this.freeRoam || !this.joystickActive) return;
    const jv = this.joystickVector;

    // Pure rotation (horizontal only, no forward/back)
    if (Math.abs(jv.y) < 0.1 && Math.abs(jv.x) > 0.1) {
      this.avatar.rotateYaw(jv.x * 0.04);
      this.avatar.setFreeRoamDirection(new THREE.Vector3());
      const avatarPos = this.avatar.getPosition();
      this.controls.target.copy(avatarPos.clone().setY(1.5));
      return;
    }

    if (Math.abs(jv.x) < 0.05 && Math.abs(jv.y) < 0.05) {
      this.avatar.setFreeRoamDirection(new THREE.Vector3());
      return;
    }

    // Avatar-relative: forward = avatar facing direction
    const fwd = this.avatar.getFacingDirection();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    const dir = new THREE.Vector3()
      .addScaledVector(fwd, jv.y)
      .addScaledVector(right, jv.x * 0.6);
    this.avatar.setFreeRoamDirection(dir.length() > 0.01 ? dir : new THREE.Vector3());

    const avatarPos = this.avatar.getPosition();
    this.controls.target.copy(avatarPos.clone().setY(1.5));
  }

  handlePointerLockMove(e) {
    const sensitivity = 0.002;
    const yaw = new THREE.Object3D();
    yaw.rotation.y = -e.movementX * sensitivity;
    const pitch = new THREE.Object3D();
    pitch.rotation.x = -e.movementY * sensitivity;

    const quat = new THREE.Quaternion();
    quat.multiplyQuaternions(yaw.quaternion, pitch.quaternion);
    this.camera.quaternion.premultiply(quat);
  }

  onClick(e) {
    if (this.isPointerLocked) return;
    if (this.isDragging) return;

    this.lastInteraction = Date.now();
    const rect = this.renderer.domElement.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const panelKey = this.panels.handleClick(clientX, clientY);
    if (panelKey) {
      this.handlePanelClick(panelKey);
      return;
    }

    this.handleWorldClick(clientX, clientY);
  }

  onMouseMove(e) {
    if (e.buttons > 0) this.isDragging = true;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onKeyDown(e) {
    this.keys[e.code] = true;

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'Escape') {
      if (this.isPointerLocked) {
        document.exitPointerLock();
      }
      this.panels.closePanelContent();
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
  }

  onWheel(e) {
    if (this.panels.openPanel) {
      e.preventDefault();
    }
  }

  handlePanelClick(key) {
    const now = Date.now();
    if (now - this.lastPanelClick < 500) return;
    this.lastPanelClick = now;

    this.panels.openPanelContent(key);
    this.playDialogueForPanel(key);
  }

  playDialogueForPanel(key) {
    switch (key) {
      case 'about': this.dialogue.sayAbout(); break;
      case 'skills': this.dialogue.saySkills(); break;
      case 'projects': this.dialogue.sayProjects(); break;
      case 'contact': this.dialogue.sayContact(); break;
    }
  }

  handleWorldClick(clientX, clientY) {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check building hits
    const buildingMeshes = [];
    this.scene.children.forEach(child => {
      if (child.name === 'building' || (child.userData && child.userData.type === 'building')) {
        child.traverse(mesh => {
          if (mesh.isMesh) buildingMeshes.push(mesh);
        });
      }
    });

    const buildingHits = this.raycaster.intersectObjects(buildingMeshes);
    if (buildingHits.length > 0) {
      const hit = buildingHits[0];
      // Walk up to find the group with userData.label
      let group = hit.object;
      while (group && !group.userData?.label) {
        group = group.parent;
      }
      if (!group) return;

      const label = group.userData.label || '';
      const labelLower = label.toLowerCase();
      let panelKey = 'about';
      if (labelLower.includes('frontend') || labelLower.includes('backend') || labelLower.includes('cloud') || labelLower.includes('tools') || labelLower.includes('skill')) {
        panelKey = 'skills';
      } else if (labelLower.includes('contact') || labelLower.includes('available') || labelLower.includes('connect')) {
        panelKey = 'contact';
      } else if (labelLower.includes('project') || labelLower.includes('📁') || PROJECTS.some(p => labelLower.includes(p.name.toLowerCase()))) {
        panelKey = 'projects';
      }

      // Walk avatar to a spot in front of the billboard
      const billPos = new THREE.Vector3();
      group.getWorldPosition(billPos);
      const front = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion);
      front.y = 0;
      front.normalize();
      const walkTarget = billPos.clone().add(front.multiplyScalar(4));
      walkTarget.y = 0;
      this.avatar.walkTo(walkTarget);

      // Zoom camera to face the billboard clearly
      const billCenter = billPos.clone().setY(1.8);
      this.controls.target.copy(billCenter);
      this.camera.position.copy(billPos.clone().add(new THREE.Vector3(
        front.x * 4,
        2.5,
        front.z * 4
      )));
      this.camera.lookAt(billCenter);
      this.controls.update();

      // Open panel content so user can read
      this.handlePanelClick(panelKey);
      return;
    }

    // Walk to clicked ground point
    const floorIntersects = this.raycaster.intersectObject(this.scene.getObjectByName('floor'));
    if (floorIntersects.length > 0) {
      const point = floorIntersects[0].point;
      if (this.freeRoam) {
        this.avatar.walkTo(point);
      } else {
        this.controls.target.lerp(point.setY(1.5), 0.1);
      }
    }
  }

  update(delta) {
    if (this.cinematic.isTransitioning) {
      this.cinematic.update(delta);
      this.controls.enabled = false;
    } else {
      this.controls.enabled = !this.isPointerLocked;
    }

    if (this.freeRoam && !this.cinematic.isTransitioning && !this.panels.openPanel && !this.dialogue.isSpeaking) {
      this.handleFreeRoamMovement(delta);
      this.handleJoystickMovement();
    } else if (this.useFirstPerson && this.isPointerLocked && !this.cinematic.isTransitioning) {
      this.handleFirstPersonMovement(delta);
    }

    this.controls.update();

    this.idleTimer += delta;
    if (this.idleTimer > 15 && !this.panels.openPanel && !this.dialogue.isSpeaking) {
      this.dialogue.sayIdle();
      this.idleTimer = 0;
    }
  }

  handleFreeRoamMovement(delta) {
    const rotateSpeed = 2.5;
    if (this.keys['ArrowLeft']) this.avatar.rotateYaw(rotateSpeed * delta);
    if (this.keys['ArrowRight']) this.avatar.rotateYaw(-rotateSpeed * delta);

    const moveDir = new THREE.Vector3();

    // Arrow keys: avatar-relative (forward/back in facing direction)
    if (this.keys['ArrowUp']) {
      const fwd = this.avatar.getFacingDirection();
      moveDir.add(fwd);
    }
    if (this.keys['ArrowDown']) {
      const fwd = this.avatar.getFacingDirection();
      moveDir.sub(fwd);
    }

    // WASD: camera-relative strafe
    const wasd = new THREE.Vector3();
    if (this.keys['KeyW']) wasd.z -= 1;
    if (this.keys['KeyS']) wasd.z += 1;
    if (this.keys['KeyA']) wasd.x -= 1;
    if (this.keys['KeyD']) wasd.x += 1;

    if (wasd.length() > 0) {
      wasd.normalize();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      right.y = 0;
      right.normalize();
      moveDir.addScaledVector(forward, -wasd.z);
      moveDir.addScaledVector(right, wasd.x);
    }

    this.avatar.setFreeRoamDirection(moveDir.length() > 0.01 ? moveDir : new THREE.Vector3());

    // OTS: orbit controls target follows avatar directly
    const avatarPos = this.avatar.getPosition();
    this.controls.target.copy(avatarPos.clone().setY(1.5));
    this.controls.enabled = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 16;
  }

  setFreeRoam(enabled) {
    this.freeRoam = enabled;
    this.avatar.setFreeRoam(enabled);
    if (enabled) {
      this.useFirstPerson = false;
      if (this.isPointerLocked) document.exitPointerLock();
      this.controls.enabled = true;
      this.controls.minDistance = 4;
      this.controls.maxDistance = 16;
      this.controls.target.set(0, 1.5, 0);
      // Position camera behind avatar for OTS view
      this.camera.position.set(5, 3.5, 8);
      this.camera.lookAt(0, 1.5, 0);
    }
  }

  handleFirstPersonMovement(delta) {
    const direction = new THREE.Vector3();
    const speed = this.moveSpeed * delta;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) direction.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) direction.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) direction.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize();
      direction.applyQuaternion(this.camera.quaternion);
      direction.y = 0;

      const newPos = this.camera.position.clone().addScaledVector(direction, speed);
      newPos.y = 1.6;
      newPos.x = THREE.MathUtils.clamp(newPos.x, -35, 35);
      newPos.z = THREE.MathUtils.clamp(newPos.z, -35, 35);

      this.camera.position.copy(newPos);
      this.controls.target.copy(newPos).add(new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion));
    }
  }

  setFirstPerson(enabled) {
    this.useFirstPerson = enabled;
    if (!enabled && this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  dispose() {
    this.controls.dispose();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.handlePointerLockMove);
  }
}