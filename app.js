// === CONSTANTS ===
const DESKTOP_FRAMES = 267;
const MOBILE_FRAMES  = 272;
const PAGE_COUNT     = 5;
const LERP           = 0.02;
const CONCURRENCY    = 48;

// === DEVICE DETECTION ===
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || innerWidth < 768;
const TOTAL_FRAMES = isMobile ? MOBILE_FRAMES : DESKTOP_FRAMES;
const FRAME_DIR = isMobile ? 'frames-mobile' : 'frames-webp';

// === CANVAS SETUP ===
const canvas = document.getElementById('gl-canvas');
const ctx = canvas.getContext('2d');
let canvasDpr = 1;

function resize() {
  canvasDpr = Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2);
  canvas.width  = innerWidth * canvasDpr;
  canvas.height = innerHeight * canvasDpr;
  canvas.style.width  = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// === FRAME LOADING ===
const frames = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let isReady = false;

function frameName(i) {
  return `${FRAME_DIR}/frame_${String(i + 1).padStart(6, '0')}.webp`;
}

async function loadAll() {
  const queue = Array.from({length: TOTAL_FRAMES}, (_, i) => i);
  
  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      await new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => {
          frames[i] = img;
          loadedCount++;
          // Progress bar
          const pct = Math.round(loadedCount / TOTAL_FRAMES * 100);
          const bar = document.getElementById('progress-bar');
          if (bar) bar.style.width = pct + '%';
          // First frame — start animation
          if (loadedCount === 1) {
            isReady = true;
            startAnim();
          }
          // All loaded — hide loader
          if (loadedCount === TOTAL_FRAMES) {
            const loader = document.getElementById('loader');
            if (loader) {
              loader.style.transition = 'opacity 0.8s';
              loader.style.opacity = '0';
              setTimeout(() => loader.style.display = 'none', 800);
            }
          }
          resolve();
        };
        img.src = frameName(i);
      });
    }
  }
  
  await Promise.all(Array.from({length: CONCURRENCY}, worker));
}

// === ANIMATION LOOP ===
let currentFrame = 0;
let targetFrame  = 0;

window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const progress  = maxScroll > 0 ? scrollY / maxScroll : 0;
  targetFrame = progress * (TOTAL_FRAMES - 1);
}, { passive: true });

function drawFrame(idx) {
  const img = frames[Math.max(0, Math.min(idx, TOTAL_FRAMES - 1))];
  if (!img || !img.complete) return;
  
  const W = innerWidth;
  const H = innerHeight;
  
  // Cover-fit
  const r  = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const iw = img.naturalWidth * r;
  const ih = img.naturalHeight * r;
  const x  = (W - iw) / 2;
  const y  = (H - ih) / 2;
  
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, x, y, iw, ih);
  
  // Vignette
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.18, W/2, H/2, H*0.85);
  vig.addColorStop(0, 'rgba(13,13,13,0)');
  vig.addColorStop(1, 'rgba(13,13,13,0.78)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  
  // Bottom darkening
  const bot = ctx.createLinearGradient(0, H*0.6, 0, H);
  bot.addColorStop(0, 'rgba(13,13,13,0)');
  bot.addColorStop(1, 'rgba(13,13,13,0.88)');
  ctx.fillStyle = bot;
  ctx.fillRect(0, H*0.6, W, H*0.4);
}

function startAnim() {
  function loop() {
    requestAnimationFrame(loop);
    currentFrame += (targetFrame - currentFrame) * LERP;
    if (isReady) drawFrame(Math.round(currentFrame));
  }
  loop();
}

// === SECTION ACTIVATION (IntersectionObserver) ===
const pages    = Array.from(document.querySelectorAll('.page'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = pages.indexOf(entry.target);
      pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      navLinks.forEach((l, i) => {
        if(l) l.classList.toggle('active', i === idx);
      });
    }
  });
}, { rootMargin: '-40% 0px -40% 0px' });

pages.forEach(p => observer.observe(p));

// === BURGER MENU ===
const burger = document.getElementById('burger');
const drawer = document.getElementById('nav-drawer');
if (burger && drawer) {
  burger.addEventListener('click', () => {
    drawer.classList.toggle('open');
    burger.classList.toggle('open');
  });
  drawer.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
      burger.classList.remove('open');
    });
  });
}

// === START ===
loadAll();
