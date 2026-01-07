// ===============================
// Theme toggle (multi-page safe) + persistence
// ===============================
const toggleButton = document.getElementById('theme-toggle');
const body = document.body;

// Load saved theme (default: dark)
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    body.classList.remove('dark-mode');
} else {
    body.classList.add('dark-mode');
}

function syncThemeIcon() {
    if (!toggleButton) return;
    toggleButton.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙';
}
syncThemeIcon();

if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
        syncThemeIcon();
    });
}



// ===============================
// Space background (stars + comets) — runs on all pages
// ===============================
function hexToRgb(hex) {
    const h = (hex || '').replace('#', '').trim();
    if (h.length === 3) {
        const r = parseInt(h[0] + h[0], 16);
        const g = parseInt(h[1] + h[1], 16);
        const b = parseInt(h[2] + h[2], 16);
        return [r, g, b];
    }
    if (h.length === 6) {
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return [r, g, b];
    }
    return null;
}

function hslToRgbGlobal(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

function setupSpaceBackground() {
    const prefersReduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return null;

    // Reuse if already present (multi-page safe)
    let canvas = document.getElementById('space-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'space-canvas';
        canvas.className = 'space-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.insertAdjacentElement('afterbegin', canvas);
    }

    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1;

    const rand = (a, b) => a + Math.random() * (b - a);

    let stars = [];
    let comets = [];
    let accent = [57, 255, 136];

    function readAccentFromCSS() {
        const v = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-color')
            .trim();

        if (!v) return;

        // rgb(r,g,b)
        const m = v.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (m) {
            accent = [Number(m[1]), Number(m[2]), Number(m[3])];
            return;
        }

        // #rrggbb
        const rgb = hexToRgb(v);
        if (rgb) accent = rgb;
    }

    function resize() {
        dpr = Math.max(1, window.devicePixelRatio || 1);
        w = Math.max(1, window.innerWidth || 1);
        h = Math.max(1, window.innerHeight || 1);

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        // Draw in CSS pixels
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Re-init stars based on area (kept intentionally modest for perf)
        const count = Math.min(180, Math.max(70, Math.floor((w * h) / 12000)));
        stars = Array.from({ length: count }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            r: rand(0.35, 1.45),
            baseA: rand(0.08, 0.32),
            tw: rand(0, Math.PI * 2),
            twSpeed: rand(0.6, 1.35)
        }));
    }

        function spawnComet() {
        // Bias toward classic "shooting comet" direction: top/right -> down/left.
        // (dx < 0, dy > 0)
        const fromTop = Math.random() < 0.55;

        let x, y;
        if (fromTop) {
            x = rand(-120, w + 120);
            y = -90;
        } else {
            x = w + 90;
            // keep most comets in upper/mid sky to avoid covering footer-heavy pages
            y = rand(-120, h * 0.75);
        }

        // Angle in degrees: 115°..165° (down-left). Canvas y-axis is downward.
        const ang = rand(115, 165) * Math.PI / 180;

        // Slight variance: some fast, some slow, but constant flow.
        const speed = rand(520, 980); // px/s

        const vx = Math.cos(ang) * speed;
        const vy = Math.sin(ang) * speed;

        const tailLen = rand(320, 720);          // long comet tail
        const trailLife = rand(0.55, 0.95);      // seconds for trail particles to persist
        const headR = rand(1.6, 2.9);
        const coreW = rand(1.5, 3.0);

        comets.push({
            x, y, vx, vy,
            tailLen,
            trailLife,
            headR,
            coreW,
            life: 0,
            maxLife: rand(1.35, 2.6), // seconds (still filtered by off-screen)
            trail: []
        });
    }

        function drawComet(c) {
        const speed = Math.hypot(c.vx, c.vy) || 1;
        const nx = c.vx / speed;
        const ny = c.vy / speed;

        const tailX = c.x - nx * c.tailLen;
        const tailY = c.y - ny * c.tailLen;

        // Smooth fade-in/out per comet life
        const t = Math.min(1, c.life / c.maxLife);
        const fade = t < 0.18 ? (t / 0.18) : (t > 0.9 ? (1 - t) / 0.1 : 1);

        const [r, g, b] = accent;

        // Core tail (long gradient stroke)
        const grad = ctx.createLinearGradient(tailX, tailY, c.x, c.y);
        grad.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, 0)`);
        grad.addColorStop(0.15, `rgba(${r}, ${g}, ${b}, ${0.10 * fade})`);
        grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${0.28 * fade})`);
        grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, ${0.85 * fade})`);

        ctx.save();
        ctx.lineWidth = c.coreW;
        ctx.lineCap = 'round';
        ctx.strokeStyle = grad;

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();

        // Particle trail (adds "comet tail" texture)
        // Draw older particles first so the head looks brighter/cleaner.
        const tl = c.trailLife || 0.75;
        for (let i = 0; i < c.trail.length; i++) {
            const p = c.trail[i];
            const u = 1 - Math.min(1, p.age / tl);   // 1 -> fresh, 0 -> old
            if (u <= 0) continue;

            // Slight taper and fade
            const a = (0.38 * u * fade);
            const rad = Math.max(0.6, (1.9 * u));

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
            ctx.fill();
        }

        // Head glow (radial gradient)
        const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.headR * 7.5);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.95 * fade})`);
        glow.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${0.38 * fade})`);
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.headR * 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Bright head dot
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.9 * fade})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.headR, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    let last = performance.now();
    // Aim for a steady stream (not occasional bursts)
    let nextCometAt = last + rand(240, 520);
    let paused = document.visibilityState === 'hidden';

    function tick(now) {
        if (paused) {
            last = now;
            requestAnimationFrame(tick);
            return;
        }

        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        ctx.clearRect(0, 0, w, h);

        // Stars: subtle twinkle on white, matching your palette.
        for (const s of stars) {
            s.tw += dt * s.twSpeed;
            const a = Math.max(0, s.baseA + 0.12 * Math.sin(s.tw));
            ctx.fillStyle = `rgba(244, 244, 244, ${a})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Comets: more constant flow (always a few active, plus frequent new ones)
        // Ensure baseline activity
        const MIN_ACTIVE = 2;
        const MAX_ACTIVE = 6;

        // Keep at least MIN_ACTIVE comets alive
        while (comets.length < MIN_ACTIVE) spawnComet();

        // Frequent spawns to feel "constant" without overwhelming the UI
        if (now >= nextCometAt && comets.length < MAX_ACTIVE) {
            spawnComet();
            nextCometAt = now + rand(260, 620);
        }

        for (const c of comets) {
            c.x += c.vx * dt;
            c.y += c.vy * dt;
            c.life += dt;

            // Add trail particle (every frame is fine; we also prune aggressively)
            c.trail.push({ x: c.x, y: c.y, age: 0 });

            // Age trail particles
            for (let i = 0; i < c.trail.length; i++) c.trail[i].age += dt;

            // Prune trail by lifetime and hard cap to keep perf stable
            const tl = c.trailLife || 0.75;
            c.trail = c.trail.filter(p => p.age < tl).slice(-60);

            drawComet(c);
        }

        // Remove finished/off-screen comets
        comets = comets.filter(c =>
            c.life < c.maxLife &&
            c.x > -c.tailLen - 160 && c.x < w + c.tailLen + 160 &&
            c.y > -c.tailLen - 160 && c.y < h + c.tailLen + 160
        );

        requestAnimationFrame(tick);
    }

    // Public hook for other effects (e.g., gallery slide theme shifts)
    window.__spaceBg = {
        setHue: (hue) => { accent = hslToRgbGlobal(hue, 100, 55); },
        setAccentRgb: (r, g, b) => { accent = [r, g, b]; },
        refreshAccentFromCSS: readAccentFromCSS
    };

    readAccentFromCSS();
    resize();

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
        paused = document.visibilityState === 'hidden';
    });

    requestAnimationFrame(tick);
    return window.__spaceBg;
}

// Initialize once
setupSpaceBackground();

// ===============================
// Active navbar link (Option A multi-page)
// ===============================
(function setActiveNav() {
    const filename = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const pageKey =
        filename === 'index.html' ? 'home' :
        filename.replace('.html', '');

    document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
        a.classList.toggle('active', a.dataset.page === pageKey);
    });
})();

// ===============================
// Sliding underline indicator for navbar
// ===============================
(function navSlidingIndicator() {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll('a'));
    if (!links.length) return;

    function moveIndicatorTo(link) {
        const navRect = nav.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();

        const x = linkRect.left - navRect.left;
        const w = linkRect.width;

        nav.style.setProperty('--indicator-x', `${x}px`);
        nav.style.setProperty('--indicator-width', `${w}px`);
    }

    function syncToActive() {
        const active = nav.querySelector('a.active') || links[0];
        if (active) moveIndicatorTo(active);
    }

    links.forEach(link => {
        link.addEventListener('mouseenter', () => moveIndicatorTo(link));
        link.addEventListener('focus', () => moveIndicatorTo(link));
    });

    nav.addEventListener('mouseleave', syncToActive);

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#')) return;

            e.preventDefault();
            moveIndicatorTo(link);

            setTimeout(() => {
                window.location.href = href;
            }, 200);
        });
    });

    window.addEventListener('resize', syncToActive);
    syncToActive();
})();

// ===============================
// ENHANCED SCROLLY GALLERY
// ===============================
function setupScrollyGallery() {
    const section = document.getElementById('hfa-gallery');
    if (!section) return false;

    const wrappers = Array.from(section.querySelectorAll('.zoom-wrapper'));
    if (wrappers.length < 2) return false;

    const prefersReduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    section.classList.add('scrolly-enabled');
    section.style.setProperty('--gallery-count', wrappers.length);

    // How long each slide stays “locked” at peak (in viewport-heights)
    const HOLD_PAGES = 0.5;   // set 2.0 to 3.0 for your “2–3 scroll” request
    // How long the transition takes between slides (in viewport-heights)
    const MOVE_PAGES = 0.2;

    function totalScrollablePages(count) {
    // hold for every slide + transitions between slides
    return (count * HOLD_PAGES) + ((count - 1) * MOVE_PAGES);
    }

    function setGalleryHeight() {
    const vh = window.innerHeight || 1;
    const total = 1 + totalScrollablePages(wrappers.length);
    section.style.minHeight = `${Math.ceil(total * vh)}px`;
    }
    setGalleryHeight();

    // Space background (stars + comets) is initialized globally (see setupSpaceBackground).

    const stage = document.createElement('div');
    stage.className = 'scrolly-stage';

    const header = section.querySelector('.gallery-header');
    if (header) header.insertAdjacentElement('afterend', stage);
    else section.insertAdjacentElement('afterbegin', stage);

    wrappers.forEach(w => stage.appendChild(w));

    if (prefersReduced) return true;

    const hasAnime = typeof anime !== 'undefined';

    // Enhanced caption split with preparations
    wrappers.forEach((w, idx) => {
        const cap = w.querySelector('.caption');
        splitCaptionToChars(cap);
        w.dataset.index = idx;
        addCornerAccents(w);
    });

    let start = 0;
    let scrollable = 1;
    let activeIndex = 0;

    function clamp01(x) { return Math.min(1, Math.max(0, x)); }

    function recalc() {
        const rect = section.getBoundingClientRect();
        start = window.scrollY + rect.top;
        scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
    }

    function setActive(idx) {
        wrappers.forEach((w, i) => {
            const zi = w.querySelector('.zoom-image');
            if (!zi) return;
            zi.classList.toggle('active', i === idx);
        });

        if (!hasAnime) return;

        const w = wrappers[idx];
        if (!w) return;

        const cap = w.querySelector('.caption');
        const chars = cap ? cap.querySelectorAll('.cap-char') : null;
        const img = w.querySelector('.zoom-image img');
        const accents = w.querySelectorAll('.corner-accent');

        // Caption reveal with glow
        if (chars && chars.length) {
            chars.forEach(ch => {
                ch.style.opacity = '0';
                ch.style.transform = 'translateY(20px) rotateX(-45deg)';
                ch.style.filter = 'blur(8px)';
            });

            anime({
                targets: chars,
                opacity: [0, 1],
                translateY: [20, 0],
                rotateX: [-45, 0],
                filter: ['blur(8px)', 'blur(0px)'],
                delay: anime.stagger(18, {from: 'center'}),
                duration: 650,
                easing: 'spring(1, 80, 10, 0)'
            });
        }

        // Image entrance
        if (img) {
            anime({
                targets: img,
                keyframes: [
                    { scale: 1.08, rotateZ: '-1.2deg', filter: 'brightness(1.15) saturate(1.2)' },
                    { scale: 1.02, rotateZ: '0.4deg', filter: 'brightness(1.05) saturate(1.1)' },
                    { scale: 1.00, rotateZ: '0deg', filter: 'brightness(1) saturate(1)' }
                ],
                duration: 800,
                easing: 'easeOutElastic(1, .6)'
            });
        }

        // Corner accent pulse
        if (accents.length) {
            anime({
                targets: accents,
                scale: [0, 1],
                opacity: [0, 1],
                rotate: ['-180deg', '0deg'],
                delay: anime.stagger(80),
                duration: 600,
                easing: 'easeOutExpo'
            });
        }

        updateParticleTheme(idx, wrappers.length);
    }

    function render() {
        const p = clamp01((window.scrollY - start) / scrollable);
        const count = wrappers.length;

        const totalPages = (count * HOLD_PAGES) + ((count - 1) * MOVE_PAGES);
        const t = p * totalPages;

        // Map time -> position with a HOLD plateau at each integer slide
        let pos = 0;
        let x = t;

        for (let i = 0; i < count - 1; i++) {
        // Hold on slide i
        if (x <= HOLD_PAGES) { pos = i; break; }
        x -= HOLD_PAGES;

        // Transition i -> i+1
        if (x <= MOVE_PAGES) { pos = i + (x / MOVE_PAGES); break; }
        x -= MOVE_PAGES;

        // If we exhaust loop, we’re past this segment; continue
        pos = i + 1;
        }

        // Final slide hold
        if (t >= totalPages) pos = count - 1;

        const nextActive = Math.round(pos);
        if (nextActive !== activeIndex) {
            activeIndex = nextActive;
            setActive(activeIndex);
        }

        wrappers.forEach((w, i) => {
            const local = pos - i;
            const depth = clamp01(1 - Math.abs(local));

            const alpha = Math.pow(depth, 0.7);
            const tiltSign = local < 0 ? -1 : 1;
            const rotY = tiltSign * (1 - depth) * 28;
            const rotX = (1 - depth) * 14;
            const y = (1 - depth) * 60;
            const z = depth * 200;
            const s = 0.92 + 0.16 * depth;

            w.style.opacity = String(alpha);
            w.style.transform =
                `translate(-50%, -50%) translateY(${y}px) translateZ(${z}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${s})`;
            w.style.pointerEvents = depth > 0.35 ? 'auto' : 'none';
            w.style.zIndex = Math.round(depth * 100);

            const img = w.querySelector('.zoom-image img');
            if (img) {
                const inset = 16 * (1 - depth);
                const radius = 28 - 10 * depth;
                const blur = (1 - depth) * 14;
                const brightness = 0.70 + 0.30 * depth;
                const saturate = 0.80 + 0.20 * depth;
                const hue = (1 - depth) * 15;

                img.style.clipPath = `inset(${inset}% ${inset}% round ${radius}px)`;
                img.style.filter =
                    `blur(${blur}px) brightness(${brightness}) saturate(${saturate}) hue-rotate(${hue}deg)`;
            }

            const accents = w.querySelectorAll('.corner-accent');
            accents.forEach(acc => {
                acc.style.opacity = String(depth * 0.6);
            });
        });

        // animateParticles(p);
    }

    function createParticleCanvas() {
        const canvas = document.createElement('canvas');
        canvas.className = 'particle-canvas';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        window.particleCtx = canvas.getContext('2d');
        window.particles = [];
        
        for (let i = 0; i < 50; i++) {
            window.particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5
            });
        }
        
        return canvas;
    }

    function animateParticles(scrollProgress) {
        if (!window.particleCtx || !window.particles) return;
        
        const ctx = window.particleCtx;
        const canvas = ctx.canvas;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        window.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
            
            ctx.fillStyle = `rgba(${window.particleColor || '57, 255, 136'}, ${p.opacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        requestAnimationFrame(() => animateParticles(scrollProgress));
    }

    function updateParticleTheme(index, total) {
    // Shift accent hue slightly per slide (still within your green palette)
    const hue = 140 + (index / total) * 40; // 140–180
    if (window.__spaceBg && typeof window.__spaceBg.setHue === 'function') {
        window.__spaceBg.setHue(hue);
    }
}

function hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
    }

    function addCornerAccents(wrapper) {
        const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        positions.forEach(pos => {
            const accent = document.createElement('div');
            accent.className = `corner-accent ${pos}`;
            wrapper.appendChild(accent);
        });
    }

    function splitCaptionToChars(el) {
        if (!el || el.dataset.split === '1') return;
        const text = el.textContent.trim();
        el.dataset.split = '1';
        el.setAttribute('aria-label', text);
        el.textContent = '';

        const frag = document.createDocumentFragment();
        for (const ch of text) {
            const span = document.createElement('span');
            span.className = 'cap-char';
            span.textContent = ch === ' ' ? '\u00A0' : ch;
            span.style.display = 'inline-block';
            frag.appendChild(span);
        }
        el.appendChild(frag);
    }

    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            render();
            ticking = false;
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { 
        setGalleryHeight();
        recalc(); 
        render();
        if (window.particleCtx) {
            const canvas = window.particleCtx.canvas;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    });

    window.addEventListener('load', () => {
    setGalleryHeight();
    recalc();
    render();
    }, { once: true });

    recalc();
    setActive(0);
    render();
    return true;
}

// Initialize the enhanced gallery
const scrollyEnabled = setupScrollyGallery();

// Fallback zoom scroll if gallery not found
if (!scrollyEnabled) {
    setupZoomScroll();
}

function setupZoomScroll() {
    const zoomImages = document.querySelectorAll('.zoom-image');
    if (!zoomImages.length) return;

    let ticking = false;

    function renderZoom() {
        const centerPoint = window.innerHeight / 2;

        zoomImages.forEach(img => {
            const box = img.getBoundingClientRect();
            const imgCenter = box.top + (box.height / 2);
            const distanceFromCenter = Math.abs(centerPoint - imgCenter);

            const range = 500;
            let scale = 1;
            let opacity = 1;

            if (distanceFromCenter < range) {
                const factor = distanceFromCenter / range;
                scale = 1 - (factor * 0.3);
                opacity = 1 - (factor * 0.5);

                if (distanceFromCenter < 100) {
                    img.classList.add('active');
                } else {
                    img.classList.remove('active');
                }
            } else {
                scale = 0.7;
                opacity = 0.5;
                img.classList.remove('active');
            }

            img.style.transform = `scale(${scale})`;
            img.style.opacity = `${opacity}`;
        });
    }

    function onScrollZoom() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            renderZoom();
            ticking = false;
        });
    }

    window.addEventListener('scroll', onScrollZoom, { passive: true });
    window.addEventListener('resize', () => requestAnimationFrame(renderZoom));
    renderZoom();
}

// ===============================
// Research page: Evidence lightbox (safe on all pages)
// (append at end of index.js)
// ===============================
(function setupEvidenceLightbox() {
    const dlg = document.getElementById('lightbox');
    if (!dlg) return;

    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-cap');
    const closeBtn = dlg.querySelector('.lightbox-close');

    const buttons = document.querySelectorAll('[data-lightbox]');
    if (!buttons.length) return;

    function open(src, caption) {
        if (!src) return;

        // If dialog not supported, fallback open in new tab
        if (typeof dlg.showModal !== 'function') {
            window.open(src, '_blank', 'noopener,noreferrer');
            return;
        }

        img.src = src;
        img.alt = caption || 'Preview';
        cap.textContent = caption || '';

        dlg.showModal();
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const src = btn.getAttribute('data-lightbox');
            const caption = btn.getAttribute('data-caption') || '';
            open(src, caption);
        });
    });

    function close() {
        if (dlg.open) dlg.close();
        // prevent showing old image briefly next open
        img.removeAttribute('src');
        img.alt = '';
        cap.textContent = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', close);

    // close on clicking outside the content
    dlg.addEventListener('click', (e) => {
        if (e.target === dlg) close();
    });

    // close on Escape
    dlg.addEventListener('cancel', (e) => {
        e.preventDefault();
        close();
    });
})();

// ===============================
// Evidence lightbox (safe on all pages)
// (append at end of index.js)
// ===============================
(function setupEvidenceLightbox() {
    const dlg = document.getElementById('lightbox');
    if (!dlg) return;

    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-cap');
    const closeBtn = dlg.querySelector('.lightbox-close');

    const buttons = document.querySelectorAll('[data-lightbox]');
    if (!buttons.length) return;

    function open(src, caption) {
        if (!src) return;

        // If dialog not supported, fallback open in new tab
        if (typeof dlg.showModal !== 'function') {
            window.open(src, '_blank', 'noopener,noreferrer');
            return;
        }

        img.src = src;
        img.alt = caption || 'Preview';
        cap.textContent = caption || '';

        dlg.showModal();
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const src = btn.getAttribute('data-lightbox');
            const caption = btn.getAttribute('data-caption') || '';
            open(src, caption);
        });
    });

    function close() {
        if (dlg.open) dlg.close();
        img.removeAttribute('src');
        img.alt = '';
        cap.textContent = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', close);

    dlg.addEventListener('click', (e) => {
        if (e.target === dlg) close();
    });

    dlg.addEventListener('cancel', (e) => {
        e.preventDefault();
        close();
    });
})();

// ===============================
// Leadership galleries: horizontal motion driven by vertical scroll
// Append at end of index.js
// ===============================
(function setupScrollDrivenGalleries() {
    const galleries = Array.from(document.querySelectorAll('[data-hscroll]'));
    if (!galleries.length) return;

    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    const state = galleries.map((el) => {
        const track = el.querySelector('.hscroll-track');
        const root = el.closest('.gallery-section') || el;
        const dir = (el.getAttribute('data-direction') || 'rtl').toLowerCase();
        return { el, track, root, dir, overflow: 0 };
    });

    function measure() {
        state.forEach(s => {
            if (!s.track) return;
            s.overflow = Math.max(0, s.track.scrollWidth - s.el.clientWidth);
        });
    }

    function progressFor(rootEl) {
        const rect = rootEl.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;

        // progress = how far the section has travelled through the viewport (0..1)
        // 0 when section just enters from bottom; 1 when it leaves at top.
        const total = rect.height + vh;
        const seen = vh - rect.top;
        return clamp01(seen / total);
    }

    let raf = null;
    function update() {
        raf = null;

        state.forEach(s => {
            if (!s.track || s.overflow <= 0) {
                if (s.track) s.track.style.transform = 'translate3d(0,0,0)';
                return;
            }

            const p = progressFor(s.root);

            // rtl: start at left, end at right (content moves left)
            // ltr: start at right, end at left (content moves right)
            let tx;
            if (s.dir === 'ltr') {
                tx = -(1 - p) * s.overflow;
            } else {
                tx = -p * s.overflow;
            }

            s.track.style.transform = `translate3d(${tx}px, 0, 0)`;
        });
    }

    function requestUpdate() {
        if (raf) return;
        raf = window.requestAnimationFrame(update);
    }

    // Initial
    measure();
    requestUpdate();

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', () => {
        measure();
        requestUpdate();
    }, { passive: true });
})();

// ===============================
// Lightbox (idempotent): click-to-enlarge on any [data-lightbox]
// Append at end of index.js
// ===============================
(function setupLightboxOnce() {
    const dlg = document.getElementById('lightbox');
    if (!dlg) return;

    // prevent double-binding if you already added lightbox earlier
    if (dlg.dataset.bound === 'true') return;
    dlg.dataset.bound = 'true';

    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-cap');
    const closeBtn = dlg.querySelector('.lightbox-close');

    function open(src, caption) {
        if (!src) return;
        if (typeof dlg.showModal !== 'function') {
            window.open(src, '_blank', 'noopener,noreferrer');
            return;
        }
        img.src = src;
        img.alt = caption || 'Preview';
        cap.textContent = caption || '';
        dlg.showModal();
    }

    function close() {
        if (dlg.open) dlg.close();
        img.removeAttribute('src');
        img.alt = '';
        cap.textContent = '';
    }

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-lightbox]');
        if (!btn) return;
        const src = btn.getAttribute('data-lightbox');
        const caption = btn.getAttribute('data-caption') || '';
        open(src, caption);
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
})();

// ===============================
// Patch: make <dialog>.showModal() idempotent
// This prevents errors if multiple lightbox handlers call showModal() on the same dialog.
// (additive; safe across pages)
// ===============================
(function patchDialogShowModalIdempotent() {
    try {
        if (typeof HTMLDialogElement === 'undefined') return;
        const proto = HTMLDialogElement.prototype;
        if (!proto || typeof proto.showModal !== 'function') return;

        // Only patch once
        if (proto.__showModalIdempotentPatched) return;
        proto.__showModalIdempotentPatched = true;

        const original = proto.showModal;
        proto.showModal = function patchedShowModal() {
            if (this.open) return; // no-op if already open
            return original.call(this);
        };
    } catch (_) {
        // Silent: never block page execution
    }
})();
// =========================================================
// DRAMATIC MODE: stronger alternating speeds + easing curve
// (append-only; overrides the previous enhancer if present)
// =========================================================
(function dramaticLeadershipHscroll() {
    const leadershipRowsRoot = document.querySelector('.gallery-rows');
    const isLeadershipPage =
        /leadership\.html$/i.test(location.pathname) || !!leadershipRowsRoot;

    if (!isLeadershipPage) return;

    const rows = Array.from(document.querySelectorAll('.gallery-rows [data-hscroll]'));
    if (!rows.length) return;

    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    // Smooth “cinematic” curve (more dramatic around mid-scroll)
    function easeInOutCubic(t){
        return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
    }

    function progressFor(rootEl) {
        const rect = rootEl.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const total = rect.height + vh;
        const seen = vh - rect.top;
        return clamp01(seen / total);
    }

    // Ensure labels exist (if user added previous block, this stays consistent)
    rows.forEach((rowEl, globalIdx) => {
        if (rowEl.querySelector('.row-label')) return;

        const section = rowEl.closest('.gallery-section');
        const title = section?.querySelector('h3')?.textContent?.trim() || '';
        const rowsInSection = section ? Array.from(section.querySelectorAll('.gallery-rows [data-hscroll]')) : rows;
        const localIdx = Math.max(0, rowsInSection.indexOf(rowEl));

        const lab = document.createElement('div');
        lab.className = 'row-label';
        lab.textContent = title ? `${title} — Row ${localIdx + 1}` : `Row ${globalIdx + 1}`;
        rowEl.appendChild(lab);
    });

    const state = rows.map((el, idx) => {
        const track = el.querySelector('.hscroll-track');
        const root = el.closest('.gallery-section') || el;

        // Alternate direction per adjacent row: rtl, ltr, rtl, ltr...
        const dir = (idx % 2 === 0) ? 'rtl' : 'ltr';
        const speed = 1.35;

        return { el, track, root, dir, speed, overflow: 0 };
    });

    function measure() {
        state.forEach(s => {
            if (!s.track) return;
            s.overflow = Math.max(0, s.track.scrollWidth - s.el.clientWidth);
        });
    }

    let raf = null;
    function update() {
        raf = null;

        state.forEach(s => {
            if (!s.track || s.overflow <= 0) {
                if (s.track) s.track.style.transform = 'translate3d(0,0,0)';
                return;
            }

            // apply easing for drama
            const raw = progressFor(s.root);
            const p = easeInOutCubic(raw);

            // scaled travel
            const travel = s.overflow * s.speed;

            // rtl: 0 -> -travel
            // ltr: -travel -> 0
            const tx = (s.dir === 'ltr')
                ? -(1 - p) * travel
                : -p * travel;

            s.track.style.transform = `translate3d(${tx}px, 0, 0)`;
        });
    }

    function requestUpdate() {
        if (raf) return;
        raf = window.requestAnimationFrame(update);
    }

    // Re-measure after images load for accurate overflow
    rows.forEach(r => {
        r.querySelectorAll('img').forEach(img => {
            if (img.complete) return;
            img.addEventListener('load', () => {
                measure();
                requestUpdate();
            }, { once: true });
        });
    });

    measure();
    requestUpdate();

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', () => {
        measure();
        requestUpdate();
    }, { passive: true });

    window.addEventListener('load', () => {
        measure();
        requestUpdate();
    }, { once: true });
})();


// // ===============================
// // Aurora Flow Background (Hero)
// // ===============================
// (function setupAuroraFlowBackground() {
//     const prefersReduced = window.matchMedia &&
//         window.matchMedia('(prefers-reduced-motion: reduce)').matches;

//     if (prefersReduced) return;

//     const heroes = document.querySelectorAll('.hero');
//     if (!heroes.length) return;

//     heroes.forEach(hero => {
//         // Prevent duplicates (multi-page safe)
//         if (hero.querySelector('.aurora-background')) return;

//         const aurora = document.createElement('div');
//         aurora.className = 'aurora-background';

//         // Keep it behind hero content but above the star canvas
//         hero.appendChild(aurora);
//     });
// })();

// ===============================
// Stats: "0000 0.0 0.0" -> per-digit scramble (2s each, left->right) -> lock final
// ===============================
(function statsSequentialReveal_digits() {
  if (window.__STATS_SEQ_REVEAL_DIGITS__) return;
  window.__STATS_SEQ_REVEAL_DIGITS__ = true;

  const items = Array.from(document.querySelectorAll('.stats-row .stat-item'));
  if (!items.length) return;

  const reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) return; // keep static for reduced motion users

  // ---- Controls you’ll actually tweak ----
  const randomDuration = 2000; // 2s scramble per stat
  const digitDelay = 67;      // ms between digits starting (left->right cascade)
  const flickerMs = 6.7;        // how often digits change during scramble
  // ---------------------------------------

  const stats = items.map((item) => {
    const el = item.querySelector('.stat-number');
    const label = (item.querySelector('.stat-label')?.textContent || '').toUpperCase();
    if (!el) return null;

    const finalText = (el.textContent || '').trim();
    const decimals = finalText.includes('.') ? finalText.split('.')[1].length : 0;

    // Placeholder matches the shape of the final number (SAT => 0000, IELTS => 0.0, etc.)
    let placeholder = '';
    if (decimals > 0) {
      const intPart = finalText.split('.')[0].replace(/\D/g, '');
      const intDigits = Math.max(intPart.length, 1);
      placeholder = '0'.repeat(intDigits) + '.' + '0'.repeat(decimals);
    } else {
      const digits = Math.max(finalText.replace(/\D/g, '').length, 4);
      placeholder = '0'.repeat(digits);
    }

    el.dataset.final = finalText;
    el.dataset.placeholder = placeholder;
    el.textContent = placeholder;

    return { item, el, label, finalText, placeholder };
  }).filter(Boolean);

  let skipAll = false;
  const lockAll = () => {
    skipAll = true;
    stats.forEach(s => {
      s.el.textContent = s.finalText;
      s.el.classList.remove('is-scrambling');
      s.el.classList.add('is-locked');
    });
  };
  items.forEach(it => it.addEventListener('pointerdown', lockAll, { once: true }));

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Per-digit random, but still “plausible-looking” for each stat
  function randomDigitFor(label, digitIndex, charIndex, fullText) {
    // SAT looks best if it stays in a realistic range (mostly 1xxx / up to 1600)
    if (label.includes('SAT')) {
      if (digitIndex === 0) return '1';
      if (digitIndex === 1) return String(randInt(0, 6));
      return String(randInt(0, 9));
    }

    // IELTS / GPA: keep it impressive by biasing the leading digit upward
    // (only affects the first integer digit in the string)
    const isLeadingDigit = (charIndex === 0 || (charIndex === 1 && fullText[0] === '0'));
    if (isLeadingDigit) return String(randInt(6, 9));

    return String(randInt(0, 9));
  }

  function buildScrambleString({ label, placeholder }, elapsed) {
    let out = '';
    let digitOrdinal = 0;

    for (let i = 0; i < placeholder.length; i++) {
      const ch = placeholder[i];

      if (ch < '0' || ch > '9') {
        // keep '.' or other non-digits fixed
        out += ch;
        continue;
      }

      const startAt = digitOrdinal * digitDelay;

      if (elapsed < startAt) {
        // not started yet: keep the initial zero for a left->right cascade effect
        out += '0';
      } else {
        // active: randomize this digit
        out += randomDigitFor(label, digitOrdinal, i, placeholder);
      }

      digitOrdinal++;
    }

    return out;
  }

  function animateOne(s) {
    return new Promise((resolve) => {
      const { el, item, label, finalText, placeholder } = s;

      let startTime = null;
      let lastFlicker = 0;
      let raf = null;

      el.classList.remove('is-locked');
      el.classList.add('is-scrambling');

      const tick = (ts) => {
        if (skipAll) { resolve(); return; }
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;

        if (elapsed < randomDuration) {
          if (ts - lastFlicker > flickerMs) {
            lastFlicker = ts;
            el.textContent = buildScrambleString({ label, placeholder }, elapsed);
          }
          raf = requestAnimationFrame(tick);
          return;
        }

        // Lock final
        el.textContent = finalText;
        el.classList.remove('is-scrambling');
        el.classList.add('is-locked');

        el.classList.remove('pop-once');
        void el.offsetWidth;
        el.classList.add('pop-once');

        if (raf) cancelAnimationFrame(raf);
        resolve();
      };

      raf = requestAnimationFrame(tick);
    });
  }

  async function runSequence() {
    for (const s of stats) {
      if (skipAll) break;
      await animateOne(s);
    }
  }

  const row = document.querySelector('.stats-row');
  if (!row) return;

  const obs = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        obs.disconnect();
        runSequence();
        break;
      }
    }
  }, { threshold: 0.55 });

  obs.observe(row);
})();

// ===============================
// Cursor interactions: Custom cursor + magnetic buttons
// (append-only)
// ===============================
(function () {
  function supportsFinePointer() {
    return window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function setupCustomCursor() {
    if (prefersReducedMotion() || !supportsFinePointer()) return;

    // Prevent duplicates across multi-page navigations / hot reloads
    if (document.querySelector('.cursor-dot') || document.querySelector('.cursor-ring')) return;

    const cursorDot = document.createElement('div');
    const cursorRing = document.createElement('div');

    cursorDot.className = 'cursor-dot is-hidden';
    cursorRing.className = 'cursor-ring is-hidden';

    document.body.appendChild(cursorDot);
    document.body.appendChild(cursorRing);

    document.body.classList.add('custom-cursor');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    const lerp = (a, b, t) => a + (b - a) * t;

    function update() {
      // Dot follows instantly
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top = mouseY + 'px';

      // Ring eases behind
        const dx = mouseX - ringX;
        const dy = mouseY - ringY;
        const dist = Math.hypot(dx, dy);

        // Faster catch-up when you move quickly, smoother when you move slowly
        const t = Math.min(0.35, Math.max(0.14, dist / 300));

        ringX += dx * t;
        ringY += dy * t;


      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top = ringY + 'px';

      requestAnimationFrame(update);
    }

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      cursorDot.classList.remove('is-hidden');
      cursorRing.classList.remove('is-hidden');
    }, { passive: true });

    // Hide on leave (prevents cursor freezing mid-screen)
    document.addEventListener('mouseleave', () => {
      cursorDot.classList.add('is-hidden');
      cursorRing.classList.add('is-hidden');
    });

    // Hover effects via event delegation (covers elements added later)
    const interactiveSelector = 'a, button, .btn, .hover-lift, summary, [role="button"]';

    document.addEventListener('mouseover', (e) => {
      const hit = e.target && e.target.closest ? e.target.closest(interactiveSelector) : null;
      if (hit) cursorRing.classList.add('hover');
    });

    document.addEventListener('mouseout', (e) => {
      const hit = e.target && e.target.closest ? e.target.closest(interactiveSelector) : null;
      if (!hit) return;

      const to = e.relatedTarget;
      if (to && hit.contains(to)) return; // still inside same element
      cursorRing.classList.remove('hover');
    });

    // Click feedback
    document.addEventListener('mousedown', () => {
      cursorRing.classList.add('down');
      cursorDot.classList.add('down');
    });

    document.addEventListener('mouseup', () => {
      cursorRing.classList.remove('down');
      cursorDot.classList.remove('down');
    });

    update();
  }

  function wrapMagneticInner(el) {
    // If already wrapped, return the existing wrapper
    const existing = el.querySelector(':scope > .magnetic-inner');
    if (existing) return existing;

    const inner = document.createElement('span');
    inner.className = 'magnetic-inner';

    // Move all existing children into inner wrapper
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);

    return inner;
  }

  function setupMagneticButtons() {
    if (prefersReducedMotion() || !supportsFinePointer()) return;

    // Auto-tag common "button-like" items as magnetic (safe defaults)
    const autoMagneticSelector = [
      '.btn',
      '.nav-links a',
      '#theme-toggle',
      '.profile-links a'
    ].join(',');

    document.querySelectorAll(autoMagneticSelector).forEach((el) => {
      el.classList.add('magnetic');
    });

    const magneticElements = Array.from(document.querySelectorAll('.magnetic'));
    if (!magneticElements.length) return;

    const maxDistance = 65;      // activation radius (px)
    const strengthScale = 0.35;  // how far inner content moves

    // Cache per-element geometry for performance
    const state = new Map();

    function measure(el) {
      const rect = el.getBoundingClientRect();
      state.set(el, {
        rect,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        tx: 0,
        ty: 0,
        raf: null
      });
    }

    magneticElements.forEach((el) => {
      const inner = wrapMagneticInner(el);
      measure(el);

      const onMove = (e) => {
        const s = state.get(el);
        if (!s) return;

        const x = e.clientX - s.cx;
        const y = e.clientY - s.cy;
        const dist = Math.hypot(x, y);

        if (dist < maxDistance) {
          const t = (maxDistance - dist) / maxDistance;
          s.tx = x * t * strengthScale;
          s.ty = y * t * strengthScale;

          if (!s.raf) {
            s.raf = requestAnimationFrame(() => {
              inner.style.transform = `translate(${s.tx.toFixed(2)}px, ${s.ty.toFixed(2)}px)`;
              s.raf = null;
            });
          }
        }
      };

      const onEnter = () => measure(el);

      const onLeave = () => {
        const s = state.get(el);
        if (!s) return;
        s.tx = 0;
        s.ty = 0;
        inner.style.transform = 'translate(0px, 0px)';
      };

      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    // Re-measure on layout changes
    const remeasureAll = () => magneticElements.forEach(measure);
    window.addEventListener('resize', remeasureAll, { passive: true });
    window.addEventListener('scroll', remeasureAll, { passive: true });
  }

  function init() {
    if (!document.body) return;
    setupCustomCursor();
    setupMagneticButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// =========================================================
// ABOUT PAGE ADD-ONS (scoped)
// - Smooth scroll + active toc
// - Timeline progress fill
// - No changes to index.js; safe on other pages
// =========================================================

(function setupAboutPageAddons() {
  if (!document.body || !document.body.classList.contains('about-page')) return;

  const nav = document.querySelector('.navbar');
  const navOffset = (nav ? nav.offsetHeight : 76) + 14;
  document.documentElement.style.setProperty('--about-nav-offset', navOffset + 'px');

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // ---------- Smooth scroll for TOC chips ----------
  const tocLinks = Array.from(document.querySelectorAll('.about-toc a[href^="#"], .about-toc-inline a[href^="#"]'));
  const targets = tocLinks
    .map(a => {
      const id = (a.getAttribute('href') || '').slice(1);
      const el = id ? document.getElementById(id) : null;
      return el ? { a, id, el } : null;
    })
    .filter(Boolean);

  function setActive(id) {
    tocLinks.forEach(a => a.classList.toggle('is-active', (a.getAttribute('href') || '') === `#${id}`));
  }

  function scrollToTarget(el) {
    const y = window.scrollY + el.getBoundingClientRect().top - navOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  tocLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      const id = href.slice(1);
      const el = document.getElementById(id);
      if (!el) return;

      e.preventDefault();
      setActive(id);
      scrollToTarget(el);
    });
  });

  // ---------- Active step highlighting ----------
  const steps = Array.from(document.querySelectorAll('.story-step'));
  if (steps.length) {
    const io = new IntersectionObserver((entries) => {
      // Pick the most visible step as active
      const visible = entries
        .filter(en => en.isIntersecting)
        .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));

      if (!visible.length) return;

      const active = visible[0].target;
      const id = active.id;

      steps.forEach(s => s.classList.toggle('is-active', s === active));
      if (id) setActive(id);
    }, {
      root: null,
      threshold: [0.15, 0.3, 0.45, 0.6],
      rootMargin: `-${navOffset}px 0px -55% 0px`
    });

    steps.forEach(s => io.observe(s));
  }

  // ---------- Timeline progress fill ----------
  const timeline = document.querySelector('[data-timeline]');
  if (!timeline) return;

  let raf = null;
  function updateTimelineProgress() {
    raf = null;

    const rect = timeline.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 1;

    // Progress from when the timeline top reaches mid-viewport to when it leaves
    const start = vh * 0.30;
    const end = vh * 0.75;

    const t = (start - rect.top) / (rect.height - (end - start));
    const p = clamp01(t);
    timeline.style.setProperty('--timeline-progress', String(p));
  }

  function requestUpdate() {
    if (raf) return;
    raf = requestAnimationFrame(updateTimelineProgress);
  }

  updateTimelineProgress();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
})();

// ===============================
// ENHANCED PDF HANDLER: Fixes PDF viewing in lightbox
// (append-only; replaces/enhances existing PDF handler)
// ===============================
(function setupEnhancedPdfHandler() {
  const dlg = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const frame = document.getElementById('lightbox-frame');
  const cap = document.getElementById('lightbox-cap');
  const closeBtn = dlg.querySelector('.lightbox-close');
  
  if (!dlg || !frame || !img) return;

  function isPdf(src) {
    return /\.pdf(\?|#|$)/i.test(src || '');
  }

  function openPdf(src, caption) {
    if (!src) return;
    
    // If dialog not supported, fallback to new tab
    if (typeof dlg.showModal !== 'function') {
      window.open(src, '_blank', 'noopener,noreferrer');
      return;
    }

    // Mark dialog as showing PDF
    dlg.classList.add('show-pdf');
    
    // Hide image, show iframe
    img.style.display = 'none';
    img.removeAttribute('src');
    img.alt = '';
    
    frame.style.display = 'block';
    frame.src = src;
    frame.title = caption || 'PDF preview';
    
    if (cap) cap.textContent = caption || '';
    
    if (!dlg.open) dlg.showModal();
  }

  function openImage(src, caption) {
    if (!src) return;
    
    if (typeof dlg.showModal !== 'function') {
      window.open(src, '_blank', 'noopener,noreferrer');
      return;
    }

    // Mark dialog as showing image
    dlg.classList.remove('show-pdf');
    
    // Show image, hide iframe
    frame.style.display = 'none';
    frame.removeAttribute('src');
    frame.title = '';
    
    img.style.display = 'block';
    img.src = src;
    img.alt = caption || 'Preview';
    
    if (cap) cap.textContent = caption || '';
    
    if (!dlg.open) dlg.showModal();
  }

  function closeDialog() {
    if (dlg.open) dlg.close();
    
    // Clean up both img and iframe
    img.removeAttribute('src');
    img.alt = '';
    img.style.display = 'none';
    
    frame.removeAttribute('src');
    frame.title = '';
    frame.style.display = 'none';
    
    if (cap) cap.textContent = '';
    
    dlg.classList.remove('show-pdf');
  }

  // Capture phase to override any existing lightbox handlers
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lightbox]');
    if (!btn) return;
    
    const src = btn.getAttribute('data-lightbox') || '';
    const caption = btn.getAttribute('data-caption') || '';
    
    e.preventDefault();
    e.stopImmediatePropagation();
    
    if (isPdf(src)) {
      openPdf(src, caption);
    } else {
      openImage(src, caption);
    }
  }, true); // Use capture phase

  // Close handlers
  if (closeBtn) {
    closeBtn.removeEventListener('click', closeDialog); // Remove any old handlers
    closeBtn.addEventListener('click', closeDialog);
  }

  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) closeDialog();
  });

  dlg.addEventListener('close', closeDialog);
  
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeDialog();
  });

  // Mark all PDF image sources to show placeholders
  document.querySelectorAll('img[src$=".pdf"]').forEach(img => {
    img.style.display = 'none';
    const placeholder = img.parentElement?.querySelector('.proof-ph, .proof-tile, .evidence-ph, .img-ph');
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
  });
})();

// ===============================
// PDF THUMBNAIL GENERATOR: Show placeholder for PDF files
// ===============================
(function markPdfPlaceholders() {
  const pdfImages = document.querySelectorAll('img[src$=".pdf"]');
  
  pdfImages.forEach(img => {
    // Hide the img tag
    img.style.display = 'none';
    
    // Show the placeholder
    const btn = img.closest('.proof-btn, .evidence-btn, .gallery-btn');
    if (!btn) return;
    
    const placeholder = btn.querySelector('.proof-ph, .proof-tile, .evidence-ph, .img-ph');
    if (placeholder) {
      placeholder.style.display = 'flex';
      
      // Update placeholder text to indicate it's a PDF
      const title = placeholder.querySelector('.proof-ph-title, .evidence-ph-title, .img-ph-title');
      if (title && !title.textContent.includes('PDF')) {
        title.textContent = 'PDF: ' + title.textContent;
      }
    }
  });
  
  // Re-run after images attempt to load
  window.addEventListener('load', () => {
    document.querySelectorAll('img[src$=".pdf"]').forEach(img => {
      img.style.display = 'none';
      const btn = img.closest('.proof-btn, .evidence-btn, .gallery-btn');
      if (!btn) return;
      const placeholder = btn.querySelector('.proof-ph, .proof-tile, .evidence-ph, .img-ph');
      if (placeholder) placeholder.style.display = 'flex';
    });
  });
})();

(function keepMagneticCursorAboveLightbox(){
  const dlg = document.getElementById('lightbox');
  if (!dlg) return;

  // Remember original position so we can restore it
  let homeParent = null;
  const homeMarker = document.createComment('cursor-home-marker');

  function getCursor() {
    return {
      dot: document.querySelector('.cursor-dot'),
      ring: document.querySelector('.cursor-ring'),
    };
  }

  function moveIntoDialog() {
    const { dot, ring } = getCursor();
    if (!dot || !ring) return false;

    // On first successful move, pin the restore point
    if (!homeParent) {
      homeParent = dot.parentNode || document.body;
      homeParent.insertBefore(homeMarker, dot);
    }

    // Put cursor nodes inside the dialog so they're in the top layer too
    dlg.appendChild(ring);
    dlg.appendChild(dot);

    // Safety: if your logic hides cursor on mouseleave, force it visible when dialog is open
    dot.classList.remove('is-hidden');
    ring.classList.remove('is-hidden');
    return true;
  }

  function moveBack() {
    const { dot, ring } = getCursor();
    if (!dot || !ring || !homeParent) return;

    homeParent.insertBefore(ring, homeMarker);
    homeParent.insertBefore(dot, homeMarker);
  }

  // Watch dialog open/close
  const mo = new MutationObserver(() => {
    if (dlg.open) {
      // Cursor nodes might be injected a bit later by your JS; retry a few times.
      let tries = 0;
      const t = setInterval(() => {
        tries += 1;
        if (moveIntoDialog() || tries >= 25) clearInterval(t);
      }, 40);
    } else {
      moveBack();
    }
  });

  mo.observe(dlg, { attributes: true, attributeFilter: ['open'] });

  // If the dialog is already open (rare), handle it
  if (dlg.open) moveIntoDialog();
})();