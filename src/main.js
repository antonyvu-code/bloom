import { gsap } from 'gsap';
import { MORNINGS } from './mornings.generated.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('garden-canvas');
const ctx = canvas.getContext('2d');
const garden = document.querySelector('.garden');
const countEl = document.getElementById('seed-count');

const HUES = [16, 28, 350, 40, 8]; // terracotta, amber, rose, gold, rust
const SEED_MORNINGS = MORNINGS; // derived at build time from the real daily digest
const MAX_PLANTS = 60;

let width = 0;
let height = 0;
let plants = [];
let planted = 0;

function hashToUnit(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function makePlant(x, baseY, seedIndex) {
  const hue = HUES[seedIndex % HUES.length];
  const petalCount = 5 + Math.floor(hashToUnit(seedIndex * 3.1) * 4); // 5-8
  const headRadius = 14 + hashToUnit(seedIndex * 5.7) * 10;
  const stemHeight = height * (0.28 + hashToUnit(seedIndex * 7.3) * 0.16);
  const sat = 55 + hashToUnit(seedIndex * 2.2) * 20;
  const light = 52 + hashToUnit(seedIndex * 9.1) * 10;

  const plant = {
    baseX: x,
    baseY,
    headX: x + (hashToUnit(seedIndex * 4.4) - 0.5) * 40,
    headY: baseY - stemHeight,
    petalCount,
    headRadius,
    color: `hsl(${hue}, ${sat}%, ${light}%)`,
    colorDeep: `hsl(${hue}, ${sat}%, ${Math.max(light - 18, 20)}%)`,
    colorEdge: `hsl(${hue}, ${sat}%, ${Math.max(light - 30, 16)}%)`,
    center: `hsl(${(hue + 30) % 360}, ${Math.min(sat + 10, 90)}%, 34%)`,
    swayPhase: hashToUnit(seedIndex * 6.6) * Math.PI * 2,
    petalSkew: hashToUnit(seedIndex * 11.3), // deterministic petal-length variance
    leafSide: hashToUnit(seedIndex * 13.9) > 0.5 ? 1 : -1,
    leafAt: 0.45 + hashToUnit(seedIndex * 15.1) * 0.2, // where the leaf sits on the stem
    growth: 0,
  };

  gsap.to(plant, {
    growth: 1,
    duration: reduceMotion ? 0.01 : 1.8 + hashToUnit(seedIndex) * 0.6,
    delay: reduceMotion ? 0 : hashToUnit(seedIndex * 8.8) * 0.3,
    ease: 'elastic.out(1, 0.65)',
  });

  return plant;
}

function seedInitialPlants() {
  plants = [];
  for (let i = 0; i < SEED_MORNINGS; i++) {
    const x = width * (0.12 + (i / Math.max(SEED_MORNINGS - 1, 1)) * 0.76);
    plants.push(makePlant(x, height * 0.92, i));
  }
  planted = SEED_MORNINGS;
  updateCount();
}

function updateCount() {
  countEl.textContent = `${SEED_MORNINGS} mornings, ${planted} flowers`;
}

function quadPoint(p, cpx, cpy, endX, endY, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p.baseX + 2 * mt * t * cpx + t * t * endX,
    y: mt * mt * p.baseY + 2 * mt * t * cpy + t * t * endY,
  };
}

function drawStem(p, growth) {
  const stemT = Math.min(growth / 0.45, 1);
  const endX = p.baseX + (p.headX - p.baseX) * stemT;
  const endY = p.baseY + (p.headY - p.baseY) * stemT;
  const cpx = (p.baseX + endX) / 2 + 6;
  const cpy = (p.baseY + endY) / 2;

  ctx.beginPath();
  ctx.moveTo(p.baseX, p.baseY);
  ctx.quadraticCurveTo(cpx, cpy, endX, endY);
  ctx.strokeStyle = 'rgba(90, 110, 70, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // A single leaf unfurls once the stem is most of the way up.
  const leafT = Math.max(Math.min((stemT - p.leafAt) / 0.3, 1), 0);
  if (leafT > 0) {
    const at = quadPoint(p, cpx, cpy, endX, endY, p.leafAt);
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(p.leafSide * (0.9 - leafT * 0.2));
    ctx.beginPath();
    ctx.ellipse(p.leafSide * 7 * leafT, 0, 9 * leafT, 3.4 * leafT, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(96, 118, 74, 0.6)';
    ctx.fill();
    ctx.restore();
  }
}

function drawHead(p, growth, time) {
  const headT = Math.max(Math.min((growth - 0.45) / 0.55, 1), 0);
  if (headT <= 0) return;

  const sway = reduceMotion ? 0 : Math.sin(time * 0.0007 + p.swayPhase) * 2;
  const cx = p.headX;
  const cy = p.headY;
  const r = p.headRadius * headT;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((sway * Math.PI) / 180);

  for (let i = 0; i < p.petalCount; i++) {
    const angle = (i / p.petalCount) * Math.PI * 2;
    // Deterministic per-petal length variance keeps each bloom hand-drawn, not stamped.
    const len = r * (0.58 + 0.12 * Math.sin(i * 2.4 + p.petalSkew * 6.3));
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(len, 0, len, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = p.colorEdge;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.restore();
  }

  // Flower centre + a small ring of stamen dots for depth.
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = p.colorDeep;
  ctx.fill();

  const stamens = p.petalCount + 2;
  for (let i = 0; i < stamens; i++) {
    const a = (i / stamens) * Math.PI * 2 + p.swayPhase;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16, Math.max(r * 0.05, 0.8), 0, Math.PI * 2);
    ctx.fillStyle = p.center;
    ctx.fill();
  }

  ctx.restore();
}

function drawFrame(time) {
  ctx.clearRect(0, 0, width, height);

  // ground line
  ctx.strokeStyle = 'rgba(90,110,70,0.25)';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.94);
  ctx.lineTo(width, height * 0.94);
  ctx.stroke();

  plants.forEach((p) => {
    drawStem(p, p.growth);
    drawHead(p, p.growth, time);
  });
}

// ---------- Render loop control ----------
// The loop is paused whenever there is nothing to show: the garden scrolled out
// of view, the tab is hidden, or (with reduced motion) every flower has finished
// growing. Ambient sway keeps the loop alive only while the garden is on-screen.
let rafId = null;
let onScreen = true;

function needsAnimation() {
  if (!reduceMotion) return true; // continuous sway is the garden's living quality
  return plants.some((p) => p.growth < 1); // reduced motion: run only while growing
}

function loop(time) {
  drawFrame(time);
  if (onScreen && document.visibilityState === 'visible' && needsAnimation()) {
    rafId = requestAnimationFrame(loop);
  } else {
    rafId = null;
  }
}

function startLoop() {
  if (rafId == null && onScreen && document.visibilityState === 'visible') {
    rafId = requestAnimationFrame(loop);
  }
}

function stopLoop() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
    if (onScreen) startLoop();
    else stopLoop();
  }).observe(garden);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') startLoop();
  else stopLoop();
});

function resize() {
  const rect = garden.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  seedInitialPlants();
  startLoop(); // re-seeded plants need the loop (matters under reduced motion)
}

garden.addEventListener('pointerdown', (e) => {
  if (planted >= MAX_PLANTS) return;
  const rect = garden.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const seedIndex = planted + Math.floor(Math.random() * 1000);
  plants.push(makePlant(x, height * (0.88 + Math.random() * 0.06), seedIndex));
  planted += 1;
  updateCount();
  startLoop(); // a fresh tween needs the loop running (matters under reduced motion)
});

document.getElementById('scroll-cue').addEventListener('click', () => {
  document.querySelector('.note').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
});

window.addEventListener('resize', resize);
resize();
startLoop();
