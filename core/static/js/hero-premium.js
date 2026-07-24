 /**
 * ============================================================
 * PREMIUM AI HERO - Three.js 3D Scene + GSAP Animations
 * AI Image Text to PDF Generator
 * Orange + Purple | Dark Futuristic | Glassmorphism
 * ============================================================
 */

(function() {
  'use strict';

  // ===== STATE =====
  const state = {
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
    scroll: { current: 0, target: 0 },
    time: 0,
    clock: new THREE.Clock(),
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth < 1024,
    isReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isInitialized: false,
    sceneReady: false,
    countersAnimated: false
  };

  // ===== COLORS =====
  const COLORS = {
    orange: 0xFF6A00,
    orangeLight: 0xFF8C38,
    purple: 0x8B5CF6,
    purpleLight: 0xA78BFA,
    white: 0xFFFFFF,
    bg: 0x05070D,
    glow: 0xFF6A00,
  };

  // ===== THREE.JS SCENE =====
  let scene, camera, renderer;
  let documentGroup, platformGroup, rings = [], icons = [], particles = [];
  let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
  let canvasContainer, canvas;

  function initThreeJS() {
    canvasContainer = document.getElementById('hero-3d-container');
    if (!canvasContainer) return;

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(COLORS.bg, 0.0025);

    // Camera
    const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 0.5, 8);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !state.isMobile,
      powerPreference: 'high-performance'
    });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = false; // performance

    canvas = renderer.domElement;
    canvas.id = 'hero-3d-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvasContainer.appendChild(canvas);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
    scene.add(ambientLight);

    // Orange rim light
    const rimLight = new THREE.DirectionalLight(COLORS.orange, 1.5);
    rimLight.position.set(3, 2, 4);
    scene.add(rimLight);

    // Purple fill light
    const fillLight = new THREE.DirectionalLight(COLORS.purple, 1.0);
    fillLight.position.set(-3, 1, -2);
    scene.add(fillLight);

    // White top light
    const topLight = new THREE.DirectionalLight(0xffffff, 0.6);
    topLight.position.set(0, 4, 0);
    scene.add(topLight);

    // Bottom glow light
    const bottomLight = new THREE.PointLight(COLORS.orange, 0.5, 10);
    bottomLight.position.set(0, -3, 1);
    scene.add(bottomLight);

    // Build scene objects
    createPlatform();
    createDocumentCard();
    createFloatingIcons();
    createParticles();
    createHolographicRings();

    state.sceneReady = true;

    // Start render loop
    animate();

    // Events
    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
  }

  // ===== CREATE HOLOGRAPHIC PLATFORM =====
  function createPlatform() {
    platformGroup = new THREE.Group();

    // Main circular platform
    const platformGeom = new THREE.CircleGeometry(2.2, 64);
    const platformMat = new THREE.MeshBasicMaterial({
      color: COLORS.orange,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
    });
    const platformMesh = new THREE.Mesh(platformGeom, platformMat);
    platformMesh.rotation.x = -Math.PI / 2;
    platformMesh.position.y = -1.8;
    platformGroup.add(platformMesh);

    // Glow ring under platform
    const glowRingGeom = new THREE.RingGeometry(2.0, 2.4, 64);
    const glowRingMat = new THREE.MeshBasicMaterial({
      color: COLORS.orange,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const glowRingMesh = new THREE.Mesh(glowRingGeom, glowRingMat);
    glowRingMesh.rotation.x = -Math.PI / 2;
    glowRingMesh.position.y = -1.82;
    platformGroup.add(glowRingMesh);

    // Inner glow disc
    const innerGlowGeom = new THREE.CircleGeometry(1.0, 32);
    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: COLORS.purple,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    });
    const innerGlowMesh = new THREE.Mesh(innerGlowGeom, innerGlowMat);
    innerGlowMesh.rotation.x = -Math.PI / 2;
    innerGlowMesh.position.y = -1.78;
    platformGroup.add(innerGlowMesh);

    scene.add(platformGroup);
  }

  // ===== CREATE MAIN DOCUMENT CARD =====
  function createDocumentCard() {
    documentGroup = new THREE.Group();

    // Main document body (rounded rectangle approximation)
    const cardGeom = new THREE.BoxGeometry(2.6, 3.4, 0.12);
    const cardMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a0e1a,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
      envMapIntensity: 1.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    });
    const cardMesh = new THREE.Mesh(cardGeom, cardMat);
    cardMesh.position.y = 0.2;
    documentGroup.add(cardMesh);

    // Card border glow
    const borderGeom = new THREE.BoxGeometry(2.7, 3.5, 0.04);
    const borderMat = new THREE.MeshBasicMaterial({
      color: COLORS.orange,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const borderMesh = new THREE.Mesh(borderGeom, borderMat);
    borderMesh.position.y = 0.2;
    borderMesh.position.z = -0.1;
    documentGroup.add(borderMesh);

    // Glass overlay on card
    const glassGeom = new THREE.BoxGeometry(2.4, 3.2, 0.02);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.03,
      metalness: 0.1,
      roughness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    });
    const glassMesh = new THREE.Mesh(glassGeom, glassMat);
    glassMesh.position.y = 0.2;
    glassMesh.position.z = 0.08;
    documentGroup.add(glassMesh);

    // Document glow (behind)
    const glowGeom = new THREE.BoxGeometry(3.0, 3.8, 0.02);
    const glowMat = new THREE.MeshBasicMaterial({
      color: COLORS.orange,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
    });
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    glowMesh.position.y = 0.2;
    glowMesh.position.z = -0.15;
    documentGroup.add(glowMesh);

    // Create workflow text using canvas texture
    const workflowCanvas = document.createElement('canvas');
    workflowCanvas.width = 512;
    workflowCanvas.height = 680;
    const wctx = workflowCanvas.getContext('2d');

    // Background
    wctx.fillStyle = '#0a0e1a';
    wctx.fillRect(0, 0, 512, 680);

    // Border glow
    wctx.strokeStyle = 'rgba(255, 106, 0, 0.15)';
    wctx.lineWidth = 2;
    wctx.roundRect(10, 10, 492, 660, 16);
    wctx.stroke();

    // Header text
    wctx.fillStyle = '#ffffff';
    wctx.font = 'bold 32px Inter, system-ui, sans-serif';
    wctx.textAlign = 'center';
    wctx.fillText('AI ', 256, 60);

    // Sub-header
    wctx.fillStyle = '#B8C1CC';
    wctx.font = '18px Inter, system-ui, sans-serif';
    wctx.fillText('Image → Text → PDF', 256, 95);

    // Divider
    wctx.strokeStyle = 'rgba(255, 106, 0, 0.2)';
    wctx.lineWidth = 1;
    wctx.beginPath();
    wctx.moveTo(80, 115);
    wctx.lineTo(432, 115);
    wctx.stroke();

    // Step 1: Upload Image
    const steps = [
      { icon: '🖼️', label: 'Upload Image', desc: 'Drag & drop or choose files', y: 160 },
      { icon: '⬇️', label: 'Extract Text', desc: 'AI-powered PDF processing', y: 270 },
      { icon: '🤖', label: 'AI Clean', desc: 'Smart text optimization', y: 380 },
      { icon: '📄', label: 'Generate PDF', desc: 'Beautiful, professional output', y: 490 },
    ];

    steps.forEach((step, i) => {
      // Step background
      wctx.fillStyle = 'rgba(255, 106, 0, 0.05)';
      wctx.roundRect(60, step.y, 392, 80, 12);
      wctx.fill();

      // Step border
      wctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
      wctx.lineWidth = 1;
      wctx.roundRect(60, step.y, 392, 80, 12);
      wctx.stroke();

      // Step number
      wctx.fillStyle = 'rgba(255, 106, 0, 0.3)';
      wctx.font = 'bold 14px Inter, system-ui, sans-serif';
      wctx.textAlign = 'left';
      wctx.fillText(`0${i + 1}`, 80, step.y + 28);

      // Step label
      wctx.fillStyle = '#ffffff';
      wctx.font = 'bold 18px Inter, system-ui, sans-serif';
      wctx.fillText(step.label, 120, step.y + 28);

      // Step desc
      wctx.fillStyle = '#B8C1CC';
      wctx.font = '14px Inter, system-ui, sans-serif';
      wctx.fillText(step.desc, 120, step.y + 55);

      // Arrow between steps
      if (i < steps.length - 1) {
        wctx.fillStyle = 'rgba(255, 106, 0, 0.2)';
        wctx.font = '16px Inter, system-ui, sans-serif';
        wctx.textAlign = 'center';
        wctx.fillText('↓', 256, step.y + 100);
      }
    });

    // Bottom badge
    wctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
    wctx.roundRect(120, 580, 272, 40, 20);
    wctx.fill();

    wctx.fillStyle = '#8B5CF6';
    wctx.font = 'bold 14px Inter, system-ui, sans-serif';
    wctx.textAlign = 'center';
    wctx.fillText('✨ Powered by Advanced AI', 256, 606);

    // Footer text
    wctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    wctx.font = '11px Inter, system-ui, sans-serif';
    wctx.textAlign = 'center';
    wctx.fillText('AI PDF Generator v2.0', 256, 650);

    const texture = new THREE.CanvasTexture(workflowCanvas);
    texture.minFilter = THREE.LinearFilter;

    const displayGeom = new THREE.BoxGeometry(2.3, 3.1, 0.01);
    const displayMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    const displayMesh = new THREE.Mesh(displayGeom, displayMat);
    displayMesh.position.y = 0.2;
    displayMesh.position.z = 0.07;
    documentGroup.add(displayMesh);

    // Add subtle floating animation offset
    documentGroup.position.y = 0;

    scene.add(documentGroup);
  }

  // ===== CREATE FLOATING ICONS =====
  function createFloatingIcons() {
    const iconData = [
      { label: '🖼️', color: COLORS.orange, angle: 0, radius: 3.2, height: 1.5, speed: 0.8 },
      { label: '🔍', color: COLORS.purple, angle: 60, radius: 3.5, height: 0.5, speed: 1.1 },
      { label: '🧠', color: COLORS.orange, angle: 120, radius: 3.0, height: -0.8, speed: 0.6 },
      { label: '📄', color: COLORS.purple, angle: 180, radius: 3.4, height: 1.0, speed: 0.9 },
      { label: '☁️', color: COLORS.orange, angle: 240, radius: 3.1, height: -0.3, speed: 1.3 },
      { label: '⬇️', color: COLORS.purple, angle: 300, radius: 3.3, height: 0.8, speed: 0.7 },
      { label: '✨', color: COLORS.orange, angle: 45, radius: 2.8, height: -1.2, speed: 1.5 },
      { label: '🔮', color: COLORS.purple, angle: 150, radius: 2.9, height: 1.8, speed: 0.5 },
    ];

    iconData.forEach((data, index) => {
      const group = new THREE.Group();

      // Background square with glow
      const bgGeom = new THREE.BoxGeometry(0.6, 0.6, 0.05);
      const bgMat = new THREE.MeshPhysicalMaterial({
        color: 0x0a0e1a,
        transparent: true,
        opacity: 0.6,
        metalness: 0.2,
        roughness: 0.1,
        clearcoat: 0.3,
        side: THREE.DoubleSide,
      });
      const bgMesh = new THREE.Mesh(bgGeom, bgMat);
      group.add(bgMesh);

      // Border glow
      const borderGlowGeom = new THREE.BoxGeometry(0.65, 0.65, 0.02);
      const borderGlowMat = new THREE.MeshBasicMaterial({
        color: data.color,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      });
      const borderGlowMesh = new THREE.Mesh(borderGlowGeom, borderGlowMat);
      borderGlowMesh.position.z = -0.03;
      group.add(borderGlowMesh);

      // Icon text using sprite
      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 128;
      iconCanvas.height = 128;
      const ictx = iconCanvas.getContext('2d');
      ictx.fillStyle = '#ffffff';
      ictx.font = '64px Inter, system-ui, sans-serif';
      ictx.textAlign = 'center';
      ictx.textBaseline = 'middle';
      ictx.fillText(data.label, 64, 64);

      const iconTexture = new THREE.CanvasTexture(iconCanvas);
      const iconMat = new THREE.SpriteMaterial({
        map: iconTexture,
        transparent: true,
        opacity: 0.9,
      });
      const iconSprite = new THREE.Sprite(iconMat);
      iconSprite.scale.set(0.4, 0.4, 1);
      iconSprite.position.z = 0.05;
      group.add(iconSprite);

      // Position
      const rad = (data.angle * Math.PI) / 180;
      group.position.set(
        Math.cos(rad) * data.radius,
        data.height + 0.2,
        Math.sin(rad) * data.radius
      );

      // Store animation data
      group.userData = {
        basePos: group.position.clone(),
        angle: data.angle,
        radius: data.radius,
        heightOffset: data.height,
        speed: data.speed,
        delay: Math.random() * Math.PI * 2,
        floatAmp: 0.15 + Math.random() * 0.1,
        rotateSpeed: 0.2 + Math.random() * 0.3,
        color: data.color,
        index,
      };

      scene.add(group);
      icons.push(group);
    });
  }

  // ===== CREATE HOLOGRAPHIC RINGS =====
  function createHolographicRings() {
    const ringConfigs = [
      { radius: 1.8, opacity: 0.08, speed: 0.3, color: COLORS.orange, y: -1.5, tubeRadius: 0.015 },
      { radius: 2.4, opacity: 0.06, speed: -0.2, color: COLORS.purple, y: -1.3, tubeRadius: 0.01 },
      { radius: 1.2, opacity: 0.1, speed: 0.4, color: COLORS.orange, y: -1.7, tubeRadius: 0.012 },
    ];

    ringConfigs.forEach((config) => {
      const ringGeom = new THREE.TorusGeometry(config.radius, config.tubeRadius, 16, 80);
      const ringMat = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: config.opacity,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2.5;
      ring.position.y = config.y;

      ring.userData = {
        speed: config.speed,
        radius: config.radius,
        baseY: config.y,
      };

      scene.add(ring);
      rings.push(ring);
    });

    // Energy ring with segments (moving light strips)
    const segments = 40;
    const segRadius = 2.0;
    const segGroup = new THREE.Group();

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const segGeom = new THREE.BoxGeometry(0.06, 0.02, 0.06);
      const segMat = new THREE.MeshBasicMaterial({
        color: COLORS.orange,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.15,
      });
      const segMesh = new THREE.Mesh(segGeom, segMat);
      segMesh.position.set(
        Math.cos(angle) * segRadius,
        0,
        Math.sin(angle) * segRadius
      );
      segMesh.rotation.y = -angle;
      segMesh.userData = { baseOpacity: segMat.opacity, speed: 0.5 + Math.random() * 0.5 };
      segGroup.add(segMesh);
    }

    segGroup.position.y = -1.6;
    segGroup.rotation.x = Math.PI / 2.5;
    segGroup.userData.isEnergyRing = true;
    scene.add(segGroup);
    rings.push(segGroup);
  }

  // ===== PARTICLE SYSTEM =====
  function createParticles() {
    const count = state.isMobile ? 300 : 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const delays = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 4 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI - Math.PI / 2;

      positions[i3] = Math.cos(theta) * radius * Math.cos(phi);
      positions[i3 + 1] = Math.sin(phi) * radius * 0.6;
      positions[i3 + 2] = Math.sin(theta) * radius * Math.cos(phi);

      sizes[i] = 0.01 + Math.random() * 0.03;

      // Color: mix of orange and purple
      const isOrange = Math.random() > 0.5;
      colors[i3] = isOrange ? 1.0 : 0.55;
      colors[i3 + 1] = isOrange ? 0.42 : 0.36;
      colors[i3 + 2] = isOrange ? 0.0 : 0.96;

      velocities[i3] = (Math.random() - 0.5) * 0.002;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.002;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.002;

      delays[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const particleSystem = new THREE.Points(geometry, particleMat);
    particleSystem.userData = {
      velocities,
      delays,
      count,
    };

    scene.add(particleSystem);
    particles.push(particleSystem);
  }

  // ===== ANIMATION LOOP =====
  function animate() {
    if (state.isReducedMotion) return;

    requestAnimationFrame(animate);

    const delta = state.clock.getDelta();
    const elapsed = state.clock.getElapsedTime();

    // Smooth mouse
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    // Camera breathing motion
    const breatheX = Math.sin(elapsed * 0.1) * 0.15;
    const breatheY = Math.cos(elapsed * 0.08) * 0.1;
    camera.position.x = mouseX * 0.8 + breatheX;
    camera.position.y = 0.5 + mouseY * 0.4 + breatheY;
    camera.lookAt(0, 0.1, 0);

    // Document card animation
    if (documentGroup) {
      const docFloat = Math.sin(elapsed * 0.4) * 0.08;
      const docTiltX = Math.sin(elapsed * 0.3) * 0.02;
      const docTiltY = Math.cos(elapsed * 0.35) * 0.03;

      documentGroup.position.y = docFloat;
      documentGroup.rotation.x = docTiltX + mouseY * 0.05;
      documentGroup.rotation.y = docTiltY + mouseX * 0.08;
    }

    // Platform animation
    if (platformGroup) {
      platformGroup.rotation.y = elapsed * 0.05 + mouseX * 0.1;
    }

    // Rings animation
    rings.forEach((ring) => {
      if (ring.userData.isEnergyRing) {
        ring.rotation.z += 0.01;
        // Animate segment opacities
        ring.children.forEach((seg, i) => {
          const pulse = Math.sin(elapsed * seg.userData.speed + i * 0.3) * 0.3 + 0.7;
          seg.material.opacity = seg.userData.baseOpacity * pulse;
        });
      } else {
        ring.rotation.z += delta * ring.userData.speed;
        ring.position.y = ring.userData.baseY + Math.sin(elapsed * 0.5 + ring.userData.radius) * 0.03;
      }
    });

    // Icons animation
    icons.forEach((icon, index) => {
      const ud = icon.userData;
      const t = elapsed * ud.speed + ud.delay;

      // Orbit around center
      const angle = t * 0.3;
      const rad = ud.radius + Math.sin(t * 0.5) * 0.2;
      icon.position.x = Math.cos(angle + (index * Math.PI * 2) / icons.length) * rad;
      icon.position.z = Math.sin(angle + (index * Math.PI * 2) / icons.length) * rad;
      icon.position.y = ud.heightOffset + 0.2 + Math.sin(t * 0.7) * ud.floatAmp;

      // Gentle rotation
      icon.rotation.y = t * ud.rotateSpeed;
      icon.rotation.x = Math.sin(t * 0.5) * 0.1;

      // Scale pulse
      const scale = 1 + Math.sin(t * 0.8) * 0.05;
      icon.scale.set(scale, scale, scale);
    });

    // Particles animation
    particles.forEach((system) => {
      const positions = system.geometry.attributes.position.array;
      const vel = system.userData.velocities;
      const delays = system.userData.delays;
      const count = system.userData.count;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] += vel[i3] + Math.sin(elapsed * 0.2 + delays[i]) * 0.001;
        positions[i3 + 1] += vel[i3 + 1] + Math.cos(elapsed * 0.15 + delays[i]) * 0.001;
        positions[i3 + 2] += vel[i3 + 2] + Math.sin(elapsed * 0.1 + delays[i]) * 0.001;

        // Keep within bounds
        const dist = Math.sqrt(
          positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2
        );
        if (dist > 7) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI - Math.PI / 2;
          const radius = 2 + Math.random() * 2;
          positions[i3] = Math.cos(theta) * radius * Math.cos(phi);
          positions[i3 + 1] = Math.sin(phi) * radius * 0.6;
          positions[i3 + 2] = Math.sin(theta) * radius * Math.cos(phi);
        }
      }

      system.geometry.attributes.position.needsUpdate = true;
    });

    renderer.render(scene, camera);
  }

  // ===== RESIZE =====
  function onResize() {
    if (!canvasContainer || !camera || !renderer) return;

    const w = canvasContainer.clientWidth;
    const h = canvasContainer.clientHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  // ===== MOUSE EVENTS =====
  function onMouseMove(e) {
    const rect = canvasContainer.getBoundingClientRect();
    targetMouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetMouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      const rect = canvasContainer.getBoundingClientRect();
      targetMouseX = ((e.touches[0].clientX - rect.left) / rect.width - 0.5) * 2;
      targetMouseY = ((e.touches[0].clientY - rect.top) / rect.height - 0.5) * 2;
    }
  }

  function onMouseLeave() {
    targetMouseX = 0;
    targetMouseY = 0;
  }

  // ===== GSAP ANIMATIONS =====
  function initGSAP() {
    if (state.isReducedMotion) return;

    const headWords = document.querySelectorAll('.hero-headline .line .word');
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Word by word reveal
    timeline.to(headWords, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
    });

    // Badge, subtitle, buttons, stats, trusted appear after headline
    timeline.to('.hero-badge-premium', {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
    }, '-=0.2');

    timeline.to('.hero-subtitle-premium', {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
    }, '-=0.1');

    timeline.to('.hero-cta-group', {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
    }, '-=0.1');

    timeline.to('.hero-stats', {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
    }, '-=0.1');

    timeline.to('.hero-trusted', {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
    }, '-=0.1');

    // Avatar entrance
    gsap.to('.hero-avatar', {
      scale: 1,
      opacity: 1,
      duration: 0.4,
      stagger: 0.08,
      ease: 'back.out(2)',
      delay: 2.0,
    });

    // ScrollTrigger for features bar
    gsap.to('.hero-features-grid', {
      scrollTrigger: {
        trigger: '.hero-features-bar',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power3.out',
    });

    // Hover effects for feature cards
    document.querySelectorAll('.hero-feature-card').forEach((card) => {
      card.addEventListener('mouseenter', function() {
        gsap.to(this, {
          scale: 1.02,
          duration: 0.3,
          ease: 'power2.out',
        });
      });
      card.addEventListener('mouseleave', function() {
        gsap.to(this, {
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
      });
    });

    // Animated counters with ScrollTrigger
    const counterElements = document.querySelectorAll('.hero-stat-value');
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !state.countersAnimated) {
          state.countersAnimated = true;
          animateCounters(counterElements);
          counterObserver.disconnect();
        }
      });
    }, { threshold: 0.3 });

    if (counterElements.length > 0) {
      counterObserver.observe(counterElements[0].closest('.hero-stats'));
    }
  }

  // ===== COUNTER ANIMATION =====
  function animateCounters(elements) {
    const values = [
      { target: 100, suffix: 'K+' },
      { target: 50, suffix: 'K+' },
      { target: 99.9, suffix: '%', decimals: 1 },
      { target: 24, suffix: '/7' },
    ];

    elements.forEach((el, index) => {
      const data = values[index];
      if (!data) return;

      gsap.fromTo(el,
        { textContent: 0 },
        {
          textContent: data.target,
          duration: 2,
          ease: 'power3.out',
          delay: 0.2 * index,
          snap: data.decimals ? (val) => parseFloat(val.toFixed(data.decimals)) : (val) => Math.round(val),
          onUpdate: function() {
            const val = data.decimals
              ? parseFloat(this.targets()[0].textContent).toFixed(data.decimals)
              : Math.round(parseFloat(this.targets()[0].textContent));
            el.textContent = val + data.suffix;
          },
        }
      );
    });
  }

  // ===== RIPPLE EFFECT =====
  function addRippleEffect() {
    document.querySelectorAll('.btn-primary-premium').forEach((btn) => {
      btn.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.width = '20px';
        ripple.style.height = '20px';

        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  // ===== MAGNETIC BUTTON EFFECT =====
  function addMagneticEffect() {
    document.querySelectorAll('.btn-primary-premium, .btn-secondary-premium').forEach((btn) => {
      btn.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        gsap.to(this, {
          x: x * 0.15,
          y: y * 0.15,
          duration: 0.3,
          ease: 'power2.out',
        });
      });

      btn.addEventListener('mouseleave', function() {
        gsap.to(this, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
        });
      });
    });
  }

  // ===== ELEMENT OBSERVER FOR SCROLL ANIMATIONS =====
  function initScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.hero-features-grid').forEach((el) => observer.observe(el));
  }

  // ===== CREATE STARS IN BG =====
  function createStars() {
    const starContainer = document.querySelector('.hero-stars');
    if (!starContainer) return;

    const count = state.isMobile ? 50 : 150;

    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'hero-star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.setProperty('--duration', (2 + Math.random() * 3) + 's');
      star.style.setProperty('--delay', Math.random() * 5 + 's');
      star.style.setProperty('--max-opacity', (0.3 + Math.random() * 0.5));
      star.style.width = (1 + Math.random() * 2) + 'px';
      star.style.height = star.style.width;
      starContainer.appendChild(star);
    }
  }

  // ===== INITIALIZATION =====
  function init() {
    if (state.isInitialized) return;
    state.isInitialized = true;

    // Create star background
    createStars();

    // Init Three.js scene
    if (!state.isReducedMotion) {
      // Wait for container to be ready
      if (document.getElementById('hero-3d-container')) {
        initThreeJS();
      } else {
        const checkContainer = setInterval(() => {
          if (document.getElementById('hero-3d-container')) {
            clearInterval(checkContainer);
            initThreeJS();
          }
        }, 100);
      }
    }

    // Init GSAP animations
    if (typeof gsap !== 'undefined') {
      initGSAP();
    }

    // Ripple effect
    addRippleEffect();

    // Magnetic effect on desktop only
    if (!state.isMobile) {
      addMagneticEffect();
    }

    // Scroll animations
    initScrollAnimations();

    // Update isMobile on resize
    window.addEventListener('resize', () => {
      state.isMobile = window.innerWidth < 768;
    });
  }

  // ===== START =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', () => {
    if (!state.isInitialized) init();
  });

})();