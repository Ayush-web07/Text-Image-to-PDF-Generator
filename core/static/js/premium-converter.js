/* ===================================
   AI PDF STUDIO PRO - PREMIUM CONVERTER ENGINE
   Cinematic 8-Stage AI Conversion Pipeline
   =================================== */

class PremiumConverter {
    constructor(options = {}) {
        this.stages = options.stages || this.getDefaultStages();
        this.currentStage = 0;
        this.isRunning = false;
        this.progress = 0;
        this.overlay = null;
        this.particles = [];
        this.confettiPieces = [];
        this.onComplete = options.onComplete || null;
        this.onError = options.onError || null;
        this.totalDuration = options.totalDuration || 12000; // 12 seconds
    }

    getDefaultStages() {
        return [
            {
                title: 'Initializing AI Engine...',
                subtitle: 'Neural networks booting up',
                progress: 0,
                duration: 1000,
                animation: 'stage1Neural',
            },
            {
                title: 'Reading Image...',
                subtitle: 'Scanning and analyzing pixels',
                progress: 10,
                duration: 1500,
                animation: 'stage2Scanner',
            },
            {
                title: 'Detecting Text...',
                subtitle: 'processing characters',
                progress: 25,
                duration: 2000,
                animation: 'stage3OCR',
            },
            {
                title: 'Analyzing Layout...',
                subtitle: 'Mapping document structure',
                progress: 40,
                duration: 1500,
                animation: 'stage4Layout',
            },
            {
                title: 'Optimizing Quality...',
                subtitle: 'Enhancing clarity and sharpness',
                progress: 55,
                duration: 2000,
                animation: 'stage5Quality',
            },
            {
                title: 'Generating PDF...',
                subtitle: 'Building document pages',
                progress: 75,
                duration: 2000,
                animation: 'stage6PDF',
            },
            {
                title: 'Compressing File...',
                subtitle: 'Optimizing file size',
                progress: 90,
                duration: 1500,
                animation: 'stage7Compress',
            },
            {
                title: 'Finalizing Document...',
                subtitle: 'Applying finishing touches',
                progress: 100,
                duration: 1000,
                animation: 'stage8Finalize',
            },
        ];
    }

    // ===== CREATE OVERLAY =====
    createOverlay() {
        // Remove existing overlay if any
        const existing = document.querySelector('.ai-conversion-overlay');
        if (existing) existing.remove();

        // Remove existing confetti container if any
        const existingConfetti = document.querySelector('.confetti-container');
        if (existingConfetti) existingConfetti.remove();

        this.overlay = document.createElement('div');
        this.overlay.className = 'ai-conversion-overlay';
        this.overlay.setAttribute('role', 'dialog');
        this.overlay.setAttribute('aria-modal', 'true');
        this.overlay.setAttribute('aria-label', 'AI Conversion in progress');

        // Particles background
        const particles = document.createElement('div');
        particles.className = 'conversion-particles';
        for (let i = 0; i < 50; i++) {
            const p = document.createElement('div');
            p.className = 'conversion-particle';
            p.style.setProperty('--particle-size', `${2 + Math.random() * 4}px`);
            p.style.setProperty('--particle-color', ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e'][Math.floor(Math.random() * 4)]);
            p.style.setProperty('--duration', `${6 + Math.random() * 8}s`);
            p.style.setProperty('--delay', `${Math.random() * 6}s`);
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `${Math.random() * 100}%`;
            particles.appendChild(p);
            this.particles.push(p);
        }
        this.overlay.appendChild(particles);

        // Light streaks
        const streaks = document.createElement('div');
        streaks.className = 'conversion-light-streaks';
        for (let i = 0; i < 8; i++) {
            const s = document.createElement('div');
            s.className = 'light-streak';
            s.style.left = `${Math.random() * 100}%`;
            s.style.animationDelay = `${Math.random() * 4}s`;
            s.style.animationDuration = `${4 + Math.random() * 4}s`;
            streaks.appendChild(s);
        }
        this.overlay.appendChild(streaks);

        // Energy waves
        for (let i = 0; i < 3; i++) {
            const w = document.createElement('div');
            w.className = 'energy-wave';
            w.style.top = `${20 + Math.random() * 60}%`;
            w.style.left = `${20 + Math.random() * 60}%`;
            w.style.animationDelay = `${i * 1.5}s`;
            this.overlay.appendChild(w);
        }

        // AI Orb
        const orbContainer = document.createElement('div');
        orbContainer.className = 'ai-orb-container';
        orbContainer.innerHTML = `
            <div class="ai-orb" aria-hidden="true">
                <div class="ai-orb-aura"></div>
                <div class="ai-orb-ring-3"></div>
                <div class="ai-orb-ring-2"></div>
                <div class="ai-orb-ring"></div>
                <div class="ai-orb-core">
                    <div class="ai-orb-inner"></div>
                </div>
            </div>
        `;
        this.overlay.appendChild(orbContainer);

        // Content
        const content = document.createElement('div');
        content.className = 'conversion-content';
        content.innerHTML = `
            <div class="conversion-stage-title" id="stageTitle">Initializing AI Engine...</div>
            <div class="conversion-stage-subtitle" id="stageSubtitle">Neural networks booting up</div>
            <div id="stageAnimation"></div>
            <div class="premium-progress-container">
                <div class="premium-progress-bar">
                    <div class="premium-progress-fill" id="progressFill" style="width: 0%"></div>
                </div>
                <div class="progress-percentage" id="progressPercent">0%</div>
            </div>
        `;
        this.overlay.appendChild(content);

        document.body.appendChild(this.overlay);

        // Trigger reflow for transition
        void this.overlay.offsetWidth;
        this.overlay.classList.add('active');
    }

    // ===== START CONVERSION =====
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.currentStage = 0;
        this.progress = 0;

        this.createOverlay();

        // Start the stage pipeline
        this.runStage(0);
    }

    // ===== RUN A SINGLE STAGE =====
    runStage(index) {
        if (index >= this.stages.length) {
            this.finish();
            return;
        }

        this.currentStage = index;
        const stage = this.stages[index];

        // Update title and subtitle
        const titleEl = document.getElementById('stageTitle');
        const subtitleEl = document.getElementById('stageSubtitle');
        const animContainer = document.getElementById('stageAnimation');

        if (titleEl) {
            titleEl.classList.remove('visible');
            void titleEl.offsetWidth;
            titleEl.textContent = stage.title;
            titleEl.classList.add('visible');
        }

        if (subtitleEl) {
            subtitleEl.classList.remove('visible');
            void subtitleEl.offsetWidth;
            subtitleEl.textContent = stage.subtitle;
            subtitleEl.classList.add('visible');
        }

        // Run stage-specific animation
        if (animContainer && typeof this[stage.animation] === 'function') {
            animContainer.innerHTML = '';
            this[stage.animation](animContainer);
        }

        // Animate progress bar
        this.animateProgress(stage.progress, stage.duration);

        // Schedule next stage
        setTimeout(() => {
            this.runStage(index + 1);
        }, stage.duration);
    }

    // ===== ANIMATE PROGRESS =====
    animateProgress(targetPercent, duration) {
        const fill = document.getElementById('progressFill');
        const percentEl = document.getElementById('progressPercent');
        if (!fill || !percentEl) return;

        const startPercent = this.progress;
        const delta = targetPercent - startPercent;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = startPercent + delta * easeOut;
            
            fill.style.width = `${current}%`;
            percentEl.textContent = `${Math.round(current)}%`;
            this.progress = current;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                fill.style.width = `${targetPercent}%`;
                percentEl.textContent = `${targetPercent}%`;
                this.progress = targetPercent;
            }
        };

        requestAnimationFrame(update);
    }

    // ===== STAGE 1: NEURAL NETWORK =====
    stage1Neural(container) {
        container.className = '';
        container.innerHTML = `
            <div class="neural-nodes-container" aria-hidden="true">
                <div class="neural-node"></div>
                <div class="neural-node small"></div>
                <div class="neural-node"></div>
                <div class="neural-node medium"></div>
                <div class="neural-node"></div>
                <div class="neural-node small"></div>
                <div class="neural-node"></div>
                <div class="neural-node medium"></div>
            </div>
        `;
    }

    // ===== STAGE 2: SCANNER =====
    stage2Scanner(container) {
        container.className = '';
        container.innerHTML = `
            <div class="scanner-container" aria-hidden="true">
                <div class="scanner-beam"></div>
            </div>
        `;
    }

    // ===== STAGE 3: OCR TEXT DETECTION =====
    stage3OCR(container) {
        container.className = '';
        container.innerHTML = `
            <div class="ocr-laser-container" aria-hidden="true">
                <div class="ocr-laser"></div>
            </div>
            <div class="ocr-text-appear" id="ocrText"></div>
        `;

        // Animate letters appearing one by one
        const textEl = document.getElementById('ocrText');
        if (!textEl) return;

        const sampleText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const letters = sampleText.split('');

        letters.forEach((letter, i) => {
            setTimeout(() => {
                const span = document.createElement('span');
                span.className = 'ocr-letter';
                span.textContent = letter;
                span.style.animationDelay = '0s';
                textEl.appendChild(span);
            }, i * 40);
        });
    }

    // ===== STAGE 4: LAYOUT ANALYSIS =====
    stage4Layout(container) {
        container.className = '';
        const gridHtml = `
            <div class="layout-grid-container" aria-hidden="true">
                <div class="layout-grid-line horizontal" style="top: 25%; animation-delay: 0s;"></div>
                <div class="layout-grid-line horizontal" style="top: 50%; animation-delay: 0.2s;"></div>
                <div class="layout-grid-line horizontal" style="top: 75%; animation-delay: 0.4s;"></div>
                <div class="layout-grid-line vertical" style="left: 25%; animation-delay: 0.1s;"></div>
                <div class="layout-grid-line vertical" style="left: 50%; animation-delay: 0.3s;"></div>
                <div class="layout-grid-line vertical" style="left: 75%; animation-delay: 0.5s;"></div>
                <div class="layout-box" style="top: 5%; left: 5%; width: 20%; height: 15%; animation-delay: 0.3s;"></div>
                <div class="layout-box" style="top: 5%; left: 30%; width: 40%; height: 15%; animation-delay: 0.4s;"></div>
                <div class="layout-box" style="top: 30%; left: 5%; width: 60%; height: 10%; animation-delay: 0.5s;"></div>
                <div class="layout-box" style="top: 50%; left: 5%; width: 30%; height: 40%; animation-delay: 0.6s; border-color: rgba(6, 182, 212, 0.4);"></div>
                <div class="layout-box" style="top: 50%; left: 40%; width: 55%; height: 20%; animation-delay: 0.7s; border-color: rgba(139, 92, 246, 0.3);"></div>
                <div class="layout-box" style="top: 75%; left: 40%; width: 55%; height: 15%; animation-delay: 0.8s;"></div>
            </div>
        `;
        container.innerHTML = gridHtml;
    }

    // ===== STAGE 5: QUALITY OPTIMIZATION =====
    stage5Quality(container) {
        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#22c55e'];
        container.className = '';
        
        const frame = document.createElement('div');
        frame.className = 'quality-frame';
        
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder-image';
        placeholder.style.cssText = 'width:100%;height:100%;background:linear-gradient(135deg,#1e293b,#334155);';
        frame.appendChild(placeholder);
        
        container.appendChild(frame);

        // Trigger enhancement after a moment
        setTimeout(() => {
            frame.classList.add('enhanced');
            
            // Add sparkle effects
            for (let i = 0; i < 15; i++) {
                const sparkle = document.createElement('div');
                sparkle.className = 'quality-sparkle';
                sparkle.style.left = `${Math.random() * 100}%`;
                sparkle.style.top = `${Math.random() * 100}%`;
                sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
                sparkle.style.animationDelay = `${Math.random() * 1}s`;
                frame.appendChild(sparkle);
            }
        }, 300);
    }

    // ===== STAGE 6: PDF GENERATION =====
    stage6PDF(container) {
        container.className = '';
        container.innerHTML = `
            <div class="pdf-construction" aria-hidden="true">
                <div class="pdf-page-stack"></div>
                <div class="pdf-page-stack"></div>
                <div class="pdf-page-stack"></div>
            </div>
        `;
    }

    // ===== STAGE 7: COMPRESSION =====
    stage7Compress(container) {
        container.className = '';
        container.innerHTML = `
            <div class="compression-container" aria-hidden="true">
                <div class="compression-ring"></div>
                <div class="compression-ring"></div>
                <div class="compression-ring"></div>
                <div class="digital-cube"></div>
                <div class="digital-cube"></div>
                <div class="digital-cube"></div>
            </div>
        `;
    }

    // ===== STAGE 8: FINALIZATION =====
    stage8Finalize(container) {
        container.className = '';
        container.innerHTML = `
            <div class="golden-glow-container" aria-hidden="true">
                <div class="golden-glow"></div>
            </div>
        `;
    }

    // ===== FINISH - SUCCESS ANIMATION =====
    finish() {
        setTimeout(() => {
            this.showSuccess();
        }, 500);
    }

    showSuccess() {
        const content = this.overlay?.querySelector('.conversion-content');
        if (!content) {
            this.cleanup();
            return;
        }

        const stageAnim = document.getElementById('stageAnimation');
        
        // Clear stage content
        if (stageAnim) stageAnim.innerHTML = '';

        // Success content
        content.innerHTML = `
            <div class="conversion-success">
                <div class="success-checkmark">
                    <div class="success-checkmark-circle">
                        <i class="bi bi-check-lg"></i>
                    </div>
                    <div class="success-energy-wave"></div>
                </div>
                <h2 class="success-title">Conversion Complete!</h2>
                <p class="success-subtitle">Your PDF has been generated successfully</p>
            </div>
        `;

        // Launch confetti
        this.launchConfetti();

        // Trigger callback after a delay
        setTimeout(() => {
            this.cleanup();
            if (typeof this.onComplete === 'function') {
                this.onComplete();
            }
        }, 2500);
    }

    // ===== CONFETTI SYSTEM =====
    launchConfetti() {
        const container = document.createElement('div');
        container.className = 'confetti-container';
        container.setAttribute('aria-hidden', 'true');
        
        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#f97316'];
        const shapes = ['square', 'circle', 'triangle'];

        for (let i = 0; i < 120; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const left = Math.random() * 100;
            const duration = 2 + Math.random() * 2;
            const delay = Math.random() * 0.5;
            const size = 6 + Math.random() * 8;

            piece.style.cssText = `
                left: ${left}%;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: ${shape === 'circle' ? '50%' : shape === 'triangle' ? '0' : '2px'};
                clip-path: ${shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none'};
                --fall-duration: ${duration}s;
                --delay: ${delay}s;
                opacity: ${0.7 + Math.random() * 0.3};
            `;

            container.appendChild(piece);
            this.confettiPieces.push(piece);
        }

        document.body.appendChild(container);

        // Remove confetti after animation
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, 5000);
    }

    // ===== CLEANUP =====
    cleanup() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.classList.remove('active');
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
            }, 500);
        }

        // Remove confetti container
        document.querySelectorAll('.confetti-container').forEach(el => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });

        this.isRunning = false;
    }

    // ===== ABORT =====
    abort() {
        this.isRunning = false;
        this.cleanup();
    }
}

// ===== EXPORT =====
window.PremiumConverter = PremiumConverter;

// ===== MAGNETIC BUTTON EFFECT =====
function initMagneticEffect() {
    document.querySelectorAll('.magnetic-wrap').forEach(wrap => {
        wrap.addEventListener('mousemove', (e) => {
            const rect = wrap.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            wrap.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        
        wrap.addEventListener('mouseleave', () => {
            wrap.style.transform = 'translate(0, 0)';
        });
    });
}

// ===== RIPPLE EFFECT =====
function initRippleEffect() {
    document.querySelectorAll('.btn-convert-premium, .ripple-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple-effect';
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ===== INIT ON DOM READY =====
document.addEventListener('DOMContentLoaded', function() {
    initMagneticEffect();
    initRippleEffect();
    initScrollAnimations();
});