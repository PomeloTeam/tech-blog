(() => {
  'use strict';

  // Keep the effect confined to Butterfly's full-height homepage cover.
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeEffect = null;

  function createEffect(header) {
    const canvas = document.createElement('canvas');
    canvas.className = 'pomelo-stars';
    canvas.setAttribute('aria-hidden', 'true');
    header.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) {
      canvas.remove();
      return null;
    }

    let width = 0;
    let height = 0;
    let stars = [];
    let shootingStar = null;
    let frameId = 0;
    let previousFrame = 0;
    let elapsed = 0;
    let nextShootingStar = 11 + Math.random() * 9;
    let destroyed = false;
    let inView = header.getBoundingClientRect().bottom > 0;
    let reducedMotion = motionPreference.matches;

    function resetParallax() {
      header.style.setProperty('--hero-x', '0px');
      header.style.setProperty('--hero-y', '0px');
    }

    function draw() {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const twinkle = reducedMotion ? 0.75 : 0.64 + Math.sin(elapsed * star.frequency + star.phase) * 0.24;
        context.fillStyle = `rgba(215, 239, 255, ${star.opacity * twinkle})`;
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();
        if (star.radius > 1.25) {
          context.fillStyle = `rgba(193, 224, 255, ${star.opacity * twinkle * 0.08})`;
          context.beginPath();
          context.arc(star.x, star.y, star.radius * 4, 0, Math.PI * 2);
          context.fill();
        }
      }

      if (shootingStar) {
        const progress = shootingStar.age / shootingStar.duration;
        const x = shootingStar.x + shootingStar.velocityX * shootingStar.age;
        const y = shootingStar.y + shootingStar.velocityY * shootingStar.age;
        const tailX = x - shootingStar.tail;
        const tailY = y - shootingStar.tail * 0.4;
        const gradient = context.createLinearGradient(tailX, tailY, x, y);
        gradient.addColorStop(0, 'rgba(170, 213, 255, 0)');
        gradient.addColorStop(1, `rgba(224, 245, 255, ${Math.sin(progress * Math.PI) * 0.72})`);
        context.strokeStyle = gradient;
        context.lineWidth = 1.4;
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(x, y);
        context.stroke();
      }
    }

    function resize() {
      if (destroyed) return;
      const bounds = header.getBoundingClientRect();
      const nextWidth = Math.round(bounds.width);
      const nextHeight = Math.round(bounds.height);
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const count = width < 768 ? 35 : 75;
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        // Most stars sit above the mountain horizon; a few reach the lower sky.
        y: Math.random() * height * 0.77,
        radius: 0.4 + Math.random() * 1.15,
        opacity: 0.35 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        frequency: 0.35 + Math.random() * 0.65,
        speed: 0.35 + Math.random() * 0.65
      }));
      shootingStar = null;
      draw();
    }

    function frame(timestamp) {
      frameId = 0;
      if (destroyed || reducedMotion || document.hidden || !inView) return;
      // Render at most 30 frames per second, even on high-refresh displays.
      if (!previousFrame || timestamp - previousFrame >= 1000 / 30) {
        const delta = previousFrame ? Math.min((timestamp - previousFrame) / 1000, 0.08) : 0;
        previousFrame = timestamp;
        elapsed += delta;
        for (const star of stars) {
          star.x += star.speed * delta;
          if (star.x > width + star.radius) star.x = -star.radius;
        }
        if (!shootingStar && elapsed >= nextShootingStar) {
          shootingStar = {
            x: width * (0.12 + Math.random() * 0.48),
            y: height * (0.08 + Math.random() * 0.22),
            velocityX: Math.min(width * 0.32, 320),
            velocityY: Math.min(width * 0.32, 320) * 0.4,
            tail: Math.min(width * 0.11, 110),
            age: 0,
            duration: 1.2
          };
          nextShootingStar = elapsed + 14 + Math.random() * 15;
        }
        if (shootingStar) {
          shootingStar.age += delta;
          if (shootingStar.age >= shootingStar.duration) shootingStar = null;
        }
        draw();
      }
      frameId = window.requestAnimationFrame(frame);
    }

    function syncPlayback() {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      previousFrame = 0;
      const shouldAnimate = !destroyed && !reducedMotion && !document.hidden && inView;
      header.style.setProperty('--hero-play-state', shouldAnimate ? 'running' : 'paused');
      if (shouldAnimate) {
        frameId = window.requestAnimationFrame(frame);
      }
    }

    function changeMotionPreference() {
      reducedMotion = motionPreference.matches;
      if (reducedMotion) {
        shootingStar = null;
        resetParallax();
        draw();
      }
      syncPlayback();
    }

    function moveParallax(event) {
      if (reducedMotion || event.pointerType === 'touch') return;
      const bounds = header.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      header.style.setProperty('--hero-x', `${(x * 12).toFixed(2)}px`);
      header.style.setProperty('--hero-y', `${(y * 8).toFixed(2)}px`);
    }

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (!inView) resetParallax();
      syncPlayback();
    });

    header.addEventListener('pointermove', moveParallax, { passive: true });
    header.addEventListener('pointerleave', resetParallax, { passive: true });
    document.addEventListener('visibilitychange', syncPlayback);
    motionPreference.addEventListener('change', changeMotionPreference);
    resizeObserver.observe(header);
    intersectionObserver.observe(header);
    resetParallax();
    resize();
    syncPlayback();

    return {
      header,
      destroy() {
        destroyed = true;
        syncPlayback();
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        header.removeEventListener('pointermove', moveParallax);
        header.removeEventListener('pointerleave', resetParallax);
        document.removeEventListener('visibilitychange', syncPlayback);
        motionPreference.removeEventListener('change', changeMotionPreference);
        resetParallax();
        canvas.remove();
      }
    };
  }

  function initialize() {
    const header = document.querySelector('#page-header.full_page');
    if (activeEffect?.header === header && header?.isConnected) return;
    activeEffect?.destroy();
    activeEffect = header ? createEffect(header) : null;
  }

  // Also support optional Butterfly PJAX navigation and browser back/forward cache.
  document.addEventListener('pjax:complete', initialize);
  window.addEventListener('pageshow', initialize);
  window.addEventListener('pagehide', () => {
    activeEffect?.destroy();
    activeEffect = null;
  });
  initialize();
})();
