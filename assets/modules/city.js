import * as THREE from 'three';
import { SKILLS, PROJECTS } from '../data.js';

export class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.colliders = [];
    this.fountainParticles = null;
    this.fountainVelocities = [];
  }

  build() {
    this.buildGround();
    this.buildRoads();
    this.buildPlaza();
    this.buildFountain();
    this.buildBuildings();
    this.buildHeroSigns();
    this.buildDistrictSigns();
    this.buildPoliceBillboard();
    this.buildAboutDistrict();
    this.buildSkillsDistrict();
    this.buildProjectsDistrict();
    this.buildContactDistrict();
  }

  getColliders() { return this.colliders; }

  buildGround() {
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x7a9a6a, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    ground.name = 'floor';
    this.scene.add(ground);
  }

  buildRoads() {
    const makeRoad = (x, z, w, h) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0, z);
      m.receiveShadow = true;
      this.scene.add(m);
    };
    makeRoad(0, 0, 6, 60);
    makeRoad(0, 0, 60, 6);

    // Lane dashes
    const d = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    for (let i = -25; i <= 25; i += 4) {
      if (Math.abs(i) < 3) continue;
      const a = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.2), d);
      a.rotation.x = -Math.PI / 2;
      a.position.set(0, 0.01, i);
      this.scene.add(a);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.15), d);
      b.rotation.x = -Math.PI / 2;
      b.position.set(i, 0.01, 0);
      this.scene.add(b);
    }
  }

  buildPlaza() {
    const p = new THREE.Mesh(
      new THREE.CircleGeometry(5, 32),
      new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.8 })
    );
    p.rotation.x = -Math.PI / 2;
    p.position.set(0, 0.01, 0);
    p.receiveShadow = true;
    this.scene.add(p);
  }

  buildFountain() {
    // Basin
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.3, metalness: 0.4 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.4, 24), basinMat);
    basin.position.set(0, 0.2, 0);
    basin.castShadow = true;
    basin.receiveShadow = true;
    this.scene.add(basin);

    // Water surface
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x4a9eff, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.6,
    });
    const water = new THREE.Mesh(new THREE.CircleGeometry(2.0, 24), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.4, 0);
    this.scene.add(water);

    // Center pillar
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc, roughness: 0.4, metalness: 0.3 });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.2, 8), pillarMat);
    pillar.position.set(0, 0.8, 0);
    pillar.castShadow = true;
    this.scene.add(pillar);

    // Water particles
    const count = 250;
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.2 + Math.random() * 0.1;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      velocities.push({
        x: (Math.random() - 0.5) * 0.4,
        y: 1.5 + Math.random() * 2.0,
        z: (Math.random() - 0.5) * 0.4,
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x87ceeb, size: 0.12, transparent: true, opacity: 0.7,
    });
    this.fountainParticles = new THREE.Points(geo, mat);
    this.fountainParticles.position.y = 0.4;
    this.fountainVelocities = velocities;
    this.scene.add(this.fountainParticles);
  }

  buildHeroSigns() {
    // Large rooftop billboards on perimeter buildings, one per side
    const makeSign = (x, z, rotY, title, subtitle, accent) => {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = 384;
      const cx = c.getContext('2d');

      const g = cx.createLinearGradient(0, 0, 0, 384);
      g.addColorStop(0, '#0a0f1a');
      g.addColorStop(0.5, '#0d1525');
      g.addColorStop(1, '#080c18');
      cx.fillStyle = g;
      cx.fillRect(0, 0, 1024, 384);

      cx.shadowColor = accent;
      cx.shadowBlur = 30;
      cx.strokeStyle = accent;
      cx.lineWidth = 5;
      cx.strokeRect(12, 12, 1000, 360);
      cx.shadowBlur = 0;

      cx.textAlign = 'center';
      cx.textBaseline = 'middle';

      // Accent top bar
      const ab = cx.createLinearGradient(200, 0, 824, 0);
      ab.addColorStop(0, 'transparent');
      ab.addColorStop(0.5, accent);
      ab.addColorStop(1, 'transparent');
      cx.fillStyle = ab;
      cx.fillRect(200, 45, 624, 2);

      cx.font = 'bold 58px Arial, sans-serif';
      cx.fillStyle = '#ffffff';
      cx.shadowColor = accent;
      cx.shadowBlur = 15;
      cx.fillText(title, 512, 140);
      cx.shadowBlur = 0;

      cx.font = '28px Arial, sans-serif';
      cx.fillStyle = accent;
      cx.fillText(subtitle, 512, 220);

      const ab2 = cx.createLinearGradient(200, 0, 824, 0);
      ab2.addColorStop(0, 'transparent');
      ab2.addColorStop(0.5, accent);
      ab2.addColorStop(1, 'transparent');
      cx.fillStyle = ab2;
      cx.fillRect(200, 260, 624, 2);

      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.MeshStandardMaterial({
        map: tex, emissive: accent, emissiveIntensity: 0.12, side: THREE.DoubleSide,
      });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.8), mat);
      sign.position.set(x, 7.5, z);
      sign.rotation.y = rotY;
      sign.castShadow = true;
      this.scene.add(sign);

      // Frame
      const fm = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.1 });
      for (let py of [-0.04, 2.84]) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 0.06), fm);
        f.position.set(x, 7.5 + py, z);
        f.rotation.y = rotY;
        this.scene.add(f);
      }
      for (let px of [-3.6, 3.6]) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.9, 0.06), fm);
        const fx = x + Math.cos(rotY) * px;
        const fz = z + Math.sin(rotY) * px;
        f.position.set(fx, 7.5 + 1.4, fz);
        f.rotation.y = rotY;
        this.scene.add(f);
      }
    };

    // One sign per side, placed on perimeter buildings
    // North (-z side) — facing south toward districts
    makeSign(0, -24, 0, 'DARPAN ADHIKARI', 'Full Stack Developer & AI Engineer', '#00f5d4');
    // South (+z side) — facing north toward districts
    makeSign(0, 28, Math.PI, 'DARPAN ADHIKARI', 'Full Stack Developer & AI Engineer', '#8b5cf6');
    // West (-x side) — facing east
    makeSign(-24, -10, Math.PI / 2, 'DARPAN ADHIKARI', 'Full Stack Developer & AI Engineer', '#f472b6');
    // East (+x side) — facing west
    makeSign(26, -10, -Math.PI / 2, 'DARPAN ADHIKARI', 'Full Stack Developer & AI Engineer', '#fbbf24');
  }

  buildBuildings() {
    const blockMat = (color) => new THREE.MeshStandardMaterial({
      color, roughness: 0.6, metalness: 0.2,
    });

    const addBlock = (x, z, w, h, d, color) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), blockMat(color));
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.colliders.push({
        min: new THREE.Vector3(x - w / 2, 0, z - d / 2),
        max: new THREE.Vector3(x + w / 2, h, z + d / 2),
      });
    };

    // Window texture generator
    const makeWinTex = (baseColor = '#4a5568') => {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 256;
      const cx = c.getContext('2d');
      cx.fillStyle = baseColor;
      cx.fillRect(0, 0, 128, 256);
      const cols = 4, rows = 6;
      const gw = 128 / cols, gh = 256 / rows;
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          cx.fillStyle = Math.random() > 0.35 ? '#ffe8b0' : '#2d3748';
          cx.fillRect(col * gw + 4, r * gh + 4, gw - 8, gh - 8);
          // Window frame
          cx.strokeStyle = '#2d3748';
          cx.lineWidth = 1;
          cx.strokeRect(col * gw + 4, r * gh + 4, gw - 8, gh - 8);
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    const windowMat = (base) => new THREE.MeshStandardMaterial({
      map: makeWinTex(base), roughness: 0.7, metalness: 0.1,
    });

    // Perimeter buildings
    const bldgs = [
      // North edge (z = -26..-20)
      { x: -20, z: -24, w: 8, h: 6, d: 4, c: '#3d4a5c' },
      { x: -10, z: -24, w: 8, h: 8, d: 4, c: '#4a5568' },
      { x: 0, z: -24, w: 6, h: 10, d: 4, c: '#5a6a7c' },
      { x: 10, z: -24, w: 8, h: 7, d: 4, c: '#3d4a5c' },
      { x: 20, z: -24, w: 8, h: 9, d: 4, c: '#4a5568' },
      // South edge (z = 26..32)
      { x: -20, z: 28, w: 8, h: 7, d: 4, c: '#4a5568' },
      { x: -10, z: 28, w: 8, h: 5, d: 4, c: '#3d4a5c' },
      { x: 10, z: 28, w: 8, h: 8, d: 4, c: '#5a6a7c' },
      { x: 20, z: 28, w: 8, h: 6, d: 4, c: '#3d4a5c' },
      // West edge (x = -26..-20)
      { x: -24, z: -20, w: 4, h: 8, d: 8, c: '#4a5568' },
      { x: -24, z: -10, w: 4, h: 6, d: 8, c: '#3d4a5c' },
      { x: -24, z: 0, w: 4, h: 10, d: 6, c: '#5a6a7c' },
      { x: -24, z: 10, w: 4, h: 7, d: 8, c: '#4a5568' },
      { x: -24, z: 20, w: 4, h: 5, d: 8, c: '#3d4a5c' },
      // East edge (x = 22..28)
      { x: 26, z: -20, w: 4, h: 7, d: 8, c: '#4a5568' },
      { x: 26, z: -10, w: 4, h: 9, d: 8, c: '#5a6a7c' },
      { x: 26, z: 10, w: 4, h: 6, d: 8, c: '#3d4a5c' },
      { x: 26, z: 20, w: 4, h: 8, d: 8, c: '#4a5568' },
    ];

    bldgs.forEach(b => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), windowMat(b.c));
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.colliders.push({
        min: new THREE.Vector3(b.x - b.w / 2, 0, b.z - b.d / 2),
        max: new THREE.Vector3(b.x + b.w / 2, b.h, b.z + b.d / 2),
      });
    });
  }

  // ── Billboard helper ──────────────────────────────────────────────
  createBillboard(x, z, rotY, width, height, bgColor, accentColor, title, lines, icon) {
    const group = new THREE.Group();

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, this.darken(bgColor, 40));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Border glow
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 1004, 492);
    ctx.shadowBlur = 0;

    // Inner border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, 984, 472);

    // Icon
    if (icon) {
      ctx.font = '72px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = accentColor;
      ctx.fillText(icon, 512, 90);
    }

    // Title — large and bold
    ctx.font = 'bold 56px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 15;
    const titleY = icon ? 200 : 140;
    ctx.fillText(title, 512, titleY);
    ctx.shadowBlur = 0;

    // Bottom accent line
    const grad2 = ctx.createLinearGradient(200, 0, 824, 0);
    grad2.addColorStop(0, 'transparent');
    grad2.addColorStop(0.5, accentColor);
    grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2;
    ctx.fillRect(200, titleY + 30, 624, 3);

    // Lines — with auto-truncation
    ctx.font = 'bold 34px Arial, sans-serif';
    ctx.textAlign = 'center';
    const lineStartY = titleY + 80;
    lines.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? '#ffffff' : '#d0d0ff';
      const display = this.truncateText(ctx, line, 920);
      ctx.fillText(display, 512, lineStartY + i * 48);
    });

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0x222244, emissiveIntensity: 0.2,
    });
    const bill = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    bill.position.y = height / 2;
    bill.castShadow = true;
    group.add(bill);

    // Frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: accentColor, emissive: accentColor, emissiveIntensity: 0.15,
    });
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.2, 0.08, 0.08),
      frameMat
    );
    frame.position.y = height + 0.04;
    group.add(frame);
    const frameB = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.2, 0.08, 0.08),
      frameMat
    );
    frameB.position.y = -0.04;
    group.add(frameB);

    // Poles
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.4, roughness: 0.5 });
    for (let px of [-width / 2 + 0.15, width / 2 - 0.15]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, height + 0.5, 6), poleMat);
      pole.position.set(px, (height + 0.5) / 2 - 0.25, 0);
      group.add(pole);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    group.userData = { label: title, type: 'building' };
    group.name = 'building';
    this.scene.add(group);
    this.buildings.push(group);

    // Collider — thin box at billboard plane
    const halfW = width / 2;
    const col = {
      min: new THREE.Vector3(x - halfW, 0, z - 0.2),
      max: new THREE.Vector3(x + halfW, height, z + 0.2),
    };
    this.colliders.push(col);

    return group;
  }

  truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) t = t.slice(0, -1);
    return t + '...';
  }

  darken(hex, amount) {
    let c = parseInt(hex.slice(1), 16);
    let r = Math.max(0, (c >> 16) - amount);
    let g = Math.max(0, ((c >> 8) & 0xff) - amount);
    let b = Math.max(0, (c & 0xff) - amount);
    return `rgb(${r},${g},${b})`;
  }

  // ── District entrance signs ──────────────────────────────────────
  buildDistrictSigns() {
    const signs = [
      { x: 0, z: -7, rot: 0, text: '⬆ ABOUT DISTRICT', color: '#4a8af5' },
      { x: -7, z: 0, rot: Math.PI / 2, text: '⬅ SKILLS DISTRICT', color: '#8b5cf6' },
      { x: 0, z: 7, rot: Math.PI, text: '⬇ PROJECTS GALLERY', color: '#00f5d4' },
      { x: 7, z: 0, rot: -Math.PI / 2, text: '➡ CONTACT DISTRICT', color: '#fbbf24' },
    ];
    signs.forEach(s => {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 128;
      const cx = c.getContext('2d');
      cx.fillStyle = 'rgba(0,0,0,0.7)';
      cx.fillRect(0, 0, 512, 128);
      cx.strokeStyle = s.color;
      cx.lineWidth = 3;
      cx.strokeRect(3, 3, 506, 122);
      cx.fillStyle = s.color;
      cx.font = 'bold 36px Arial, sans-serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(s.text, 256, 64);
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(4, 1, 1);
      sprite.position.set(s.x, 3.5, s.z);
      this.scene.add(sprite);
    });
  }

  // ── Districts ────────────────────────────────────────────────────

  buildPoliceBillboard() {
    this.createBillboard(4, 0, -Math.PI / 4, 4, 3.5, '#1a0505', '#ff3333',
      '🚨 POLICE LINE', ['DO NOT CROSS', '— Security Zone —',
       'Violators will be reported'], '👮');
  }

  buildAboutDistrict() {
    this.createBillboard(-6, -22, 0, 6, 4, '#0a1a4a', '#4a8af5',
      '🚀 DARPAN ADHIKARI',
      ['Full Stack Developer & AI Engineer', '5+ Years · 50+ Projects · 30+ Clients',
       'React · TypeScript · Node.js · Python · Three.js'],
      '👨‍💻'
    );
    this.createBillboard(6, -22, 0, 3.5, 3, '#0a1a3a', '#6a9af5',
      '💼 EXPERIENCE', ['Full-Stack Systems', 'AI Tools', 'Mobile Apps', 'Desktop Software'], null);
    this.createBillboard(0, -24, 0, 3.5, 3, '#0a1a3a', '#6a9af5',
      '🌍 CLIENTS', ['Worldwide · Remote', 'Startups to Enterprises', '30+ Delivered'], null);
  }

  buildSkillsDistrict() {
    const cats = ['FRONTEND', 'BACKEND', 'CLOUD', 'TOOLS'];
    const colors = ['#8b5cf6', '#00d4aa', '#f5c842', '#f472b6'];
    const icons = ['⚛', '⚙', '☁', '🔧'];

    cats.forEach((cat, i) => {
      const skills = (SKILLS[cat.toLowerCase()] || []).slice(0, 5).map(s => s.name).join(' · ');
      this.createBillboard(-22, -5 + i * 4, Math.PI / 2, 4, 3.5, '#1a0a3a', colors[i],
        `${icons[i]} ${cat}`, [skills || 'Various technologies'], null);
    });
  }

  buildProjectsDistrict() {
    // 5 columns, 5 rows — all 23 projects in a walkable grid
    // Columns at x=-9,-4.5,0,4.5,9; rows at z=14,18.5,23,27.5,32
    // Even rows face south, odd rows face north
    PROJECTS.forEach((p, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = -9 + col * 4.5;
      const z = 14 + row * 4.5;
      const rotY = row % 2 === 0 ? Math.PI : 0;
      this.createProjectBillboard(x, z, rotY, p);
    });
  }

  createProjectBillboard(x, z, rotY, p) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0a1a1a');
    grad.addColorStop(1, '#0a2a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Draw text overlay (no image yet)
    this.drawProjectText(ctx, p);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0x112222, emissiveIntensity: 0.2,
    });

    const group = new THREE.Group();
    const bill = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.5), mat);
    bill.position.y = 1.25;
    bill.castShadow = true;
    group.add(bill);

    // Frame
    const fm = new THREE.MeshStandardMaterial({ color: '#00f5d4', emissive: '#00f5d4', emissiveIntensity: 0.1 });
    for (let py of [-0.04, 2.54]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 0.06), fm);
      f.position.y = py;
      group.add(f);
    }
    for (let px of [-1.5, 1.5]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.06), fm);
      f.position.set(px, 1.25, 0);
      group.add(f);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    group.userData = { label: p.name, type: 'building' };
    group.name = 'building';
    this.scene.add(group);
    this.buildings.push(group);

    // Collider
    const col = {
      min: new THREE.Vector3(x - 1.5, 0, z - 0.2),
      max: new THREE.Vector3(x + 1.5, 2.5, z + 0.2),
    };
    this.colliders.push(col);

    // Load project screenshot — cover-fit crop to 2:1
    const img = new Image();
    img.src = p.image;
    img.onload = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      // cover-fit to 1024×512 (2:1)
      const cw = 1024, ch = 512;
      const targetRatio = cw / ch;
      const imgRatio = iw / ih;
      let sx, sy, sw, sh;
      if (imgRatio > targetRatio) {
        // image wider → crop sides
        sh = ih;
        sw = ih * targetRatio;
        sx = (iw - sw) / 2;
        sy = 0;
      } else {
        // image taller → crop top/bottom
        sw = iw;
        sh = iw / targetRatio;
        sx = 0;
        sy = (ih - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
      this.drawProjectText(ctx, p);
      tex.needsUpdate = true;
    };
  }

  drawProjectText(ctx, p) {
    // Semi-transparent bars for readability
    ctx.fillStyle = 'rgba(10,26,26,0.65)';
    ctx.fillRect(0, 0, 1024, 190);
    ctx.fillRect(0, 320, 1024, 192);

    // Accent border
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 1004, 492);

    // Project emoji
    ctx.font = '42px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(p.emoji || '📁', 512, 18);

    // Project name
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.truncateText(ctx, p.name, 900), 512, 80);

    // Separator
    const sg = ctx.createLinearGradient(200, 0, 824, 0);
    sg.addColorStop(0, 'transparent');
    sg.addColorStop(0.5, '#00f5d4');
    sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg;
    ctx.fillRect(200, 120, 624, 2);

    // Description
    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = '#d0eeee';
    const desc = p.desc.length > 60 ? p.desc.substring(0, 60) + '...' : p.desc;
    ctx.fillText(this.truncateText(ctx, desc, 920), 512, 145);

    // Tags
    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = '#00f5d4';
    const tags = p.tags.slice(0, 3).join(' · ');
    ctx.fillText(tags, 512, 190);

    // Bottom section — tech stack + lang
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#88aaaa';
    const stack = (p.stack || []).slice(0, 3).join(' · ');
    if (stack) ctx.fillText(stack, 512, 470);

    if (p.lang) {
      ctx.font = '15px Arial, sans-serif';
      ctx.fillStyle = p.color || '#666';
      ctx.fillText('⚡ ' + p.lang, 512, 440);
    }
  }

  buildContactDistrict() {
    this.createBillboard(22, -2, -Math.PI / 2, 5, 4, '#1a0a0a', '#fbbf24',
      '📬 LET\'S CONNECT', ['darpand263@gmail.com', 'LinkedIn · GitHub',
       'Available for Freelance & Remote'], '✉');
    this.createBillboard(22, 5, -Math.PI / 2, 3.5, 3, '#1a0a0a', '#fbbf24',
      '✅ AVAILABLE', ['Freelance', 'Remote Roles', 'Reply < 24h'], null);
  }

  updateFountain(time) {
    if (!this.fountainParticles) return;
    const pos = this.fountainParticles.geometry.attributes.position.array;
    const vel = this.fountainVelocities;
    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3] += vel[i].x * 0.02;
      pos[i * 3 + 1] += vel[i].y * 0.02;
      pos[i * 3 + 2] += vel[i].z * 0.02;
      vel[i].y -= 0.06;
      if (pos[i * 3 + 1] < 0) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.5;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = 0.1;
        pos[i * 3 + 2] = Math.sin(a) * r;
        vel[i].x = (Math.random() - 0.5) * 0.4;
        vel[i].y = 1.5 + Math.random() * 2.0;
        vel[i].z = (Math.random() - 0.5) * 0.4;
      }
    }
    this.fountainParticles.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.buildings.forEach(g => {
      this.scene.remove(g);
      g.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    });
  }
}