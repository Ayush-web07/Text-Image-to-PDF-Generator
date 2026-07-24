/**
 * ============================================================
 * FUTURISTIC AI METROPOLIS - CANVAS ANIMATION ENGINE
 * ============================================================
 * Pure Vanilla JS - No external dependencies
 * GPU accelerated with requestAnimationFrame + CSS transforms
 * ============================================================
 */

(function() {
  'use strict';

  // ===== CONFIGURATION =====
  const CONFIG = {
    // City
    buildingCount: 45,
    buildingMinWidth: 30,
    buildingMaxWidth: 90,
    buildingMinHeight: 120,
    buildingMaxHeight: 380,
    roadLanes: 4,
    
    // Particles
    particleCount: 80,
    particleMaxSize: 3,
    
    // Fog
    fogCount: 8,
    
    // Clouds
    cloudCount: 5,
    
    // Stars
    starCount: 120,
    
    // Light streaks (road)
    streakCount: 6,
    
    // Camera
    cameraDriftX: 0,
    cameraDriftY: 0,
    cameraDriftSpeed: 0.0003,
    cameraDriftAmplitude: 8,
    
    // Mouse parallax
    mouseInfluence: 0.015,
    mouseX: 0.5,
    mouseY: 0.5,
    
    // Performance
    isMobile: false,
    isReducedMotion: false,
    isTabVisible: true,
    animationScale: 1,
    
    // Colors
    colors: {
      primary: '#00E5FF',
      secondary: '#00C2FF',
      accent: '#4FD8FF',
      glow: '#6BEAFF',
      bgDeep: '#05070D',
      bgDark: '#09131D',
      windowOn: '#00E5FF',
      windowOff: '#0a2a3a',
      windowGlow: 'rgba(0, 229, 255, 0.3)',
      neon: 'rgba(0, 229, 255, 0.6)',
      neonDim: 'rgba(0, 229, 255, 0.15)',
    }
  };

  // ===== STATE =====
  let canvas, ctx;
  let W, H;
  let buildings = [];
  let particles = [];
  let fogParticles = [];
  let clouds = [];
  let stars = [];
  let lightStreaks = [];
  let frameCount = 0;
  let lastTime = 0;
  let animationId = null;
  let mouseTargetX = 0.5;
  let mouseTargetY = 0.5;
  let mouseCurrentX = 0.5;
  let mouseCurrentY = 0.5;
  let scrollY = 0;
  let isInitialized = false;

  // ===== DETECT CAPABILITIES =====
  function detectCapabilities() {
    CONFIG.isMobile = window.innerWidth < 768;
    CONFIG.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (CONFIG.isMobile) {
      CONFIG.animationScale = 0.4;
      CONFIG.particleCount = 25;
      CONFIG.buildingCount = 25;
      CONFIG.starCount = 50;
      CONFIG.fogCount = 4;
      CONFIG.cloudCount = 2;
    } else if (window.innerWidth < 1024) {
      CONFIG.animationScale = 0.7;
      CONFIG.particleCount = 45;
      CONFIG.buildingCount = 32;
      CONFIG.starCount = 80;
      CONFIG.fogCount = 5;
      CONFIG.cloudCount = 3;
    } else {
      CONFIG.animationScale = 1;
    }
  }

  // ===== UTILITY FUNCTIONS =====
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // ===== BUILDING GENERATION =====
  function generateBuildings() {
    buildings = [];
    const count = CONFIG.buildingCount;
    const spacing = W / count;
    
    for (let i = 0; i < count; i++) {
      const width = rand(CONFIG.buildingMinWidth, CONFIG.buildingMaxWidth) * CONFIG.animationScale;
      const height = rand(CONFIG.buildingMinHeight, CONFIG.buildingMaxHeight) * CONFIG.animationScale;
      const x = i * spacing + (spacing - width) / 2;
      const depth = rand(0.3, 1); // 0 = far, 1 = close
      const brightness = 0.4 + depth * 0.6;
      
      // Window grid
      const windowCols = Math.floor(width / (12 * CONFIG.animationScale));
      const windowRows = Math.floor(height / (18 * CONFIG.animationScale));
      const windows = [];
      
      for (let r = 0; r < windowRows; r++) {
        for (let c = 0; c < windowCols; c++) {
          windows.push({
            x: c * (width / windowCols) + (width / windowCols) * 0.2,
            y: r * (height / windowRows) + (height / windowRows) * 0.2,
            w: (width / windowCols) * 0.6,
            h: (height / windowRows) * 0.6,
            on: Math.random() > 0.4,
            brightness: rand(0.3, 1),
            flickerSpeed: rand(0.5, 2),
            flickerOffset: rand(0, Math.PI * 2)
          });
        }
      }
      
      buildings.push({
        x, width, height,
        depth,
        brightness,
        windows,
        windowCols,
        windowRows,
        baseY: H - 60,
        // For parallax
        parallaxFactor: 0.2 + depth * 0.8,
        // Glow
        glowIntensity: 0.1 + depth * 0.3,
        // Roof antenna
        hasAntenna: Math.random() > 0.6,
        antennaHeight: rand(15, 40) * CONFIG.animationScale,
        // Color tint
        tint: rand(0.8, 1.2)
      });
    }
  }

  // ===== PARTICLE SYSTEM =====
  function generateParticles() {
    particles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push({
        x: rand(0, W),
        y: rand(0, H),
        z: rand(0.2, 1), // depth
        size: rand(0.5, CONFIG.particleMaxSize) * CONFIG.animationScale,
        speedX: rand(-0.15, 0.15),
        speedY: rand(-0.3, -0.05),
        opacity: rand(0.2, 0.7),
        pulseSpeed: rand(0.5, 2),
        pulseOffset: rand(0, Math.PI * 2),
        color: Math.random() > 0.7 ? CONFIG.colors.accent : CONFIG.colors.primary
      });
    }
  }

  // ===== FOG SYSTEM =====
  function generateFog() {
    fogParticles = [];
    for (let i = 0; i < CONFIG.fogCount; i++) {
      fogParticles.push({
        x: rand(-100, W + 100),
        y: rand(H * 0.3, H * 0.9),
        size: rand(200, 500) * CONFIG.animationScale,
        speedX: rand(-0.1, -0.02),
        speedY: rand(-0.02, 0.02),
        opacity: rand(0.15, 0.4),
        pulseSpeed: rand(0.3, 1),
        pulseOffset: rand(0, Math.PI * 2)
      });
    }
  }

  // ===== CLOUD SYSTEM =====
  function generateClouds() {
    clouds = [];
    for (let i = 0; i < CONFIG.cloudCount; i++) {
      clouds.push({
        x: rand(-200, W + 200),
        y: rand(20, H * 0.25),
        width: rand(150, 350) * CONFIG.animationScale,
        height: rand(30, 60) * CONFIG.animationScale,
        speedX: rand(-0.08, -0.02),
        opacity: rand(0.1, 0.25),
        pulseSpeed: rand(0.5, 1.5),
        pulseOffset: rand(0, Math.PI * 2)
      });
    }
  }

  // ===== STAR SYSTEM =====
  function generateStars() {
    stars = [];
    for (let i = 0; i < CONFIG.starCount; i++) {
      stars.push({
        x: rand(0, W),
        y: rand(0, H * 0.4),
        size: rand(0.3, 1.5),
        opacity: rand(0.2, 0.8),
        twinkleSpeed: rand(0.5, 3),
        twinkleOffset: rand(0, Math.PI * 2)
      });
    }
  }

  // ===== LIGHT STREAKS (ROAD) =====
  function generateLightStreaks() {
    lightStreaks = [];
    for (let i = 0; i < CONFIG.streakCount; i++) {
      lightStreaks.push({
        x: rand(0, W),
        y: H - rand(20, 80),
        length: rand(40, 120) * CONFIG.animationScale,
        speed: rand(1, 3),
        opacity: rand(0.1, 0.4),
        width: rand(1, 3),
        color: Math.random() > 0.5 ? CONFIG.colors.primary : CONFIG.colors.secondary
      });
    }
  }

  // ===== DRAWING FUNCTIONS =====

  // Draw sky gradient
  function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#020408');
    gradient.addColorStop(0.3, '#050A14');
    gradient.addColorStop(0.6, '#09131D');
    gradient.addColorStop(0.8, '#0A1A2A');
    gradient.addColorStop(1, '#05070D');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  // Draw stars
  function drawStars(time) {
    for (const star of stars) {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
      const alpha = star.opacity * (0.3 + twinkle * 0.7);
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  // Draw fog
  function drawFog(time) {
    for (const fog of fogParticles) {
      const pulse = Math.sin(time * fog.pulseSpeed + fog.pulseOffset) * 0.3 + 0.7;
      const alpha = fog.opacity * pulse;
      
      const gradient = ctx.createRadialGradient(fog.x, fog.y, 0, fog.x, fog.y, fog.size);
      gradient.addColorStop(0, `rgba(0, 229, 255, ${alpha * 0.3})`);
      gradient.addColorStop(0.5, `rgba(0, 194, 255, ${alpha * 0.1})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(fog.x - fog.size, fog.y - fog.size, fog.size * 2, fog.size * 2);
    }
  }

  // Draw clouds
  function drawClouds(time) {
    for (const cloud of clouds) {
      const pulse = Math.sin(time * cloud.pulseSpeed + cloud.pulseOffset) * 0.2 + 0.8;
      const alpha = cloud.opacity * pulse;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(200, 220, 255, 0.03)';
      
      // Draw cloud as multiple overlapping ellipses
      const cx = cloud.x;
      const cy = cloud.y;
      const w = cloud.width;
      const h = cloud.height;
      
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.3, cy + h * 0.1, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.3, cy + h * 0.05, w * 0.4, h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.15, cy - h * 0.2, w * 0.3, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }

  // Draw buildings
  function drawBuildings(time) {
    const cameraOffsetX = CONFIG.cameraDriftX;
    const cameraOffsetY = CONFIG.cameraDriftY;
    const mouseOffsetX = (mouseCurrentX - 0.5) * CONFIG.mouseInfluence * W;
    const mouseOffsetY = (mouseCurrentY - 0.5) * CONFIG.mouseInfluence * H * 0.3;
    
    // Sort buildings by depth (far first)
    const sorted = [...buildings].sort((a, b) => a.depth - b.depth);
    
    for (const b of sorted) {
      const parallaxX = (cameraOffsetX + mouseOffsetX) * b.parallaxFactor * 0.3;
      const parallaxY = (cameraOffsetY + mouseOffsetY) * b.parallaxFactor * 0.2;
      
      const bx = b.x + parallaxX;
      const by = b.baseY - b.height + parallaxY;
      const bw = b.width;
      const bh = b.height;
      
      // Building body
      const bodyGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
      const darkFactor = 0.15 + (1 - b.depth) * 0.2;
      bodyGrad.addColorStop(0, `rgba(5, 10, 20, ${darkFactor + 0.3})`);
      bodyGrad.addColorStop(0.3, `rgba(8, 15, 30, ${darkFactor + 0.2})`);
      bodyGrad.addColorStop(0.7, `rgba(10, 20, 40, ${darkFactor + 0.15})`);
      bodyGrad.addColorStop(1, `rgba(5, 10, 20, ${darkFactor + 0.3})`);
      
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(bx, by, bw, bh);
      
      // Building edge glow (left edge)
      const edgeGrad = ctx.createLinearGradient(bx, by, bx + 4, by);
      edgeGrad.addColorStop(0, `rgba(0, 229, 255, ${0.05 * b.depth})`);
      edgeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(bx, by, 4, bh);
      
      // Building edge glow (right edge)
      const edgeGrad2 = ctx.createLinearGradient(bx + bw, by, bx + bw - 4, by);
      edgeGrad2.addColorStop(0, `rgba(0, 229, 255, ${0.03 * b.depth})`);
      edgeGrad2.addColorStop(1, 'transparent');
      ctx.fillStyle = edgeGrad2;
      ctx.fillRect(bx + bw - 4, by, 4, bh);
      
      // Top glow
      const topGrad = ctx.createLinearGradient(bx, by, bx, by + 20);
      topGrad.addColorStop(0, `rgba(0, 229, 255, ${0.08 * b.depth})`);
      topGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = topGrad;
      ctx.fillRect(bx, by, bw, 20);
      
      // Windows
      for (const w of b.windows) {
        const wx = bx + w.x;
        const wy = by + w.y;
        
        if (w.on) {
          // Flicker effect
          const flicker = Math.sin(time * w.flickerSpeed + w.flickerOffset) > 0.3 ? 1 : 0.6;
          const brightness = w.brightness * flicker * b.brightness;
          
          ctx.fillStyle = `rgba(0, 229, 255, ${brightness * 0.6})`;
          ctx.fillRect(wx, wy, w.w, w.h);
          
          // Window glow
          if (brightness > 0.5) {
            ctx.shadowColor = CONFIG.colors.windowGlow;
            ctx.shadowBlur = 4;
            ctx.fillStyle = `rgba(0, 229, 255, ${brightness * 0.2})`;
            ctx.fillRect(wx, wy, w.w, w.h);
            ctx.shadowBlur = 0;
          }
        } else {
          ctx.fillStyle = `rgba(10, 30, 50, ${0.3 + b.depth * 0.2})`;
          ctx.fillRect(wx, wy, w.w, w.h);
        }
      }
      
      // Antenna
      if (b.hasAntenna) {
        const ax = bx + bw / 2;
        const ay = by - b.antennaHeight;
        
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.1 * b.depth})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax, by);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        
        // Antenna tip glow
        const tipGlow = Math.sin(time * 1.5 + b.x) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(ax, ay, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${0.3 * tipGlow * b.depth})`;
        ctx.fill();
      }
    }
  }

  // Draw road
  function drawRoad(time) {
    const roadY = H - 60;
    const roadH = 60;
    
    // Road surface
    const roadGrad = ctx.createLinearGradient(0, roadY, 0, H);
    roadGrad.addColorStop(0, 'rgba(5, 7, 13, 0.8)');
    roadGrad.addColorStop(0.3, 'rgba(8, 12, 22, 0.9)');
    roadGrad.addColorStop(1, 'rgba(5, 7, 13, 1)');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, roadY, W, roadH);
    
    // Road top edge neon
    const edgeGrad = ctx.createLinearGradient(0, roadY, 0, roadY + 3);
    edgeGrad.addColorStop(0, `rgba(0, 229, 255, 0.15)`);
    edgeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, roadY, W, 3);
    
    // Lane markings
    ctx.strokeStyle = `rgba(0, 229, 255, 0.08)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([15, 25]);
    
    for (let i = 1; i < CONFIG.roadLanes; i++) {
      const laneY = roadY + (roadH / CONFIG.roadLanes) * i;
      ctx.beginPath();
      ctx.moveTo(0, laneY);
      ctx.lineTo(W, laneY);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Draw light streaks on road
  function drawLightStreaks(time) {
    for (const s of lightStreaks) {
      const progress = ((time * s.speed + s.x) % (W + s.length * 2)) - s.length;
      const alpha = s.opacity * (0.3 + Math.sin(time * 0.5 + s.x) * 0.3 + 0.4);
      
      const grad = ctx.createLinearGradient(progress, 0, progress + s.length, 0);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.3, s.color + Math.round(alpha * 80).toString(16).padStart(2, '0'));
      grad.addColorStop(0.7, s.color + Math.round(alpha * 100).toString(16).padStart(2, '0'));
      grad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = grad;
      ctx.fillRect(progress, s.y - s.width / 2, s.length, s.width);
    }
  }

  // Draw particles
  function drawParticles(time) {
    const mouseOffsetX = (mouseCurrentX - 0.5) * 20;
    const mouseOffsetY = (mouseCurrentY - 0.5) * 20;
    
    for (const p of particles) {
      const pulse = Math.sin(time * p.pulseSpeed + p.pulseOffset) * 0.3 + 0.7;
      const alpha = p.opacity * pulse;
      const size = p.size * (0.5 + p.z * 0.5);
      
      // Particle attraction to mouse
      const dx = mouseCurrentX * W - p.x;
      const dy = mouseCurrentY * H - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const attraction = Math.max(0, 1 - dist / (W * 0.5)) * 0.3;
      
      const px = p.x + dx * attraction * 0.01 + mouseOffsetX * p.z * 0.1;
      const py = p.y + dy * attraction * 0.01 + mouseOffsetY * p.z * 0.1;
      
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.round(alpha * 180).toString(16).padStart(2, '0');
      ctx.fill();
      
      // Particle glow
      if (size > 1.5) {
        ctx.beginPath();
        ctx.arc(px, py, size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 30).toString(16).padStart(2, '0');
        ctx.fill();
      }
    }
  }

  // ===== UPDATE FUNCTIONS =====

  function updateFog(dt) {
    for (const fog of fogParticles) {
      fog.x += fog.speedX * dt * 60;
      fog.y += fog.speedY * dt * 60;
      
      if (fog.x < -fog.size * 2) fog.x = W + fog.size;
      if (fog.x > W + fog.size * 2) fog.x = -fog.size;
      if (fog.y < -fog.size) fog.y = H + fog.size;
      if (fog.y > H + fog.size) fog.y = -fog.size;
    }
  }

  function updateClouds(dt) {
    for (const cloud of clouds) {
      cloud.x += cloud.speedX * dt * 60;
      
      if (cloud.x < -cloud.width * 2) {
        cloud.x = W + cloud.width;
        cloud.y = rand(20, H * 0.25);
      }
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.speedX * dt * 60;
      p.y += p.speedY * dt * 60;
      
      if (p.y < -10) {
        p.y = H + 10;
        p.x = rand(0, W);
      }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
    }
  }

  function updateCamera(dt) {
    CONFIG.cameraDriftX = Math.sin(frameCount * CONFIG.cameraDriftSpeed) * CONFIG.cameraDriftAmplitude;
    CONFIG.cameraDriftY = Math.sin(frameCount * CONFIG.cameraDriftSpeed * 0.7 + 1) * CONFIG.cameraDriftAmplitude * 0.5;
    
    // Smooth mouse
    mouseCurrentX = lerp(mouseCurrentX, mouseTargetX, 0.05);
    mouseCurrentY = lerp(mouseCurrentY, mouseTargetY, 0.05);
  }

  // ===== MAIN RENDER LOOP =====
  function render(timestamp) {
    if (!CONFIG.isTabVisible) {
      animationId = requestAnimationFrame(render);
      return;
    }
    
    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0.016;
    lastTime = timestamp;
    frameCount++;
    
    const time = timestamp / 1000;
    
    // Clear
    ctx.clearRect(0, 0, W, H);
    
    // Update
    updateCamera(dt);
    updateFog(dt);
    updateClouds(dt);
    updateParticles(dt);
    
    // Draw layers
    drawSky();
    drawStars(time);
    drawClouds(time);
    drawBuildings(time);
    drawRoad(time);
    drawLightStreaks(time);
    drawFog(time);
    drawParticles(time);
    
    animationId = requestAnimationFrame(render);
  }

  // ===== RESIZE =====
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    
    canvas.width = W;
    canvas.height = H;
    
    detectCapabilities();
    generateBuildings();
    generateParticles();
    generateFog();
    generateClouds();
    generateStars();
    generateLightStreaks();
  }

  // ===== MOUSE / TOUCH HANDLERS =====
  function onMouseMove(e) {
    mouseTargetX = e.clientX / W;
    mouseTargetY = e.clientY / H;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouseTargetX = e.touches[0].clientX / W;
      mouseTargetY = e.touches[0].clientY / H;
    }
  }

  function onMouseLeave() {
    mouseTargetX = 0.5;
    mouseTargetY = 0.5;
  }

  // ===== VISIBILITY CHANGE =====
  function onVisibilityChange() {
    CONFIG.isTabVisible = !document.hidden;
    if (document.hidden) {
      lastTime = 0;
    }
  }

  // ===== SCROLL =====
  function onScroll() {
    scrollY = window.scrollY;
  }

  // ===== INITIALIZATION =====
  function init() {
    if (isInitialized) return;
    
    canvas = document.getElementById('city-canvas');
    if (!canvas) {
      // Retry after DOM ready
      setTimeout(init, 100);
      return;
    }
    
    ctx = canvas.getContext('2d');
    
    detectCapabilities();
    
    // Set canvas size
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    
    // Generate all elements
    generateBuildings();
    generateParticles();
    generateFog();
    generateClouds();
    generateStars();
    generateLightStreaks();
    
    // Event listeners
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Show container
    const container = document.querySelector('.city-background');
    if (container) {
      container.classList.remove('loading');
      container.classList.add('loaded');
    }
    
    isInitialized = true;
    
    // Start render loop
    animationId = requestAnimationFrame(render);
  }

  // ===== RIPPLE EFFECT FOR BUTTONS =====
  function addRippleEffect() {
    document.querySelectorAll('.btn-hero-primary').forEach(btn => {
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
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });
  }

  // ===== START =====
  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      addRippleEffect();
    });
  } else {
    init();
    addRippleEffect();
  }

  // Also try on load in case canvas wasn't ready
  window.addEventListener('load', () => {
    if (!isInitialized) init();
    addRippleEffect();
  });

})();