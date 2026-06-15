import { useEffect, useRef, useCallback } from 'react';

/**
 * Premium agency-style custom cursor.
 * 
 * Features:
 *  - Buttery-smooth lerp follower (inner dot + outer ring)
 *  - Magenta/pink glow with blurred outer halo
 *  - Elastic scale-up on interactive elements
 *  - Fading trail particles
 *  - mix-blend-mode: difference for dynamic contrast
 *  - 60 fps via requestAnimationFrame
 *  - pointer-events: none – never blocks clicks
 *  - Desktop only (hidden on touch devices)
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const glowRef = useRef(null);
  const trailCanvasRef = useRef(null);

  // Mutable state kept outside React to avoid re-renders
  const state = useRef({
    mouseX: -100,
    mouseY: -100,
    dotX: -100,
    dotY: -100,
    ringX: -100,
    ringY: -100,
    glowX: -100,
    glowY: -100,
    hovering: false,
    clicking: false,
    speed: 0,
    prevX: -100,
    prevY: -100,
    visible: false,
    trails: [],            // { x, y, alpha, size }
    trailTimer: 0,
  });

  // ── Detect interactive elements ──
  const isInteractive = useCallback((el) => {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.getAttribute('role') === 'button') return true;
    if (el.closest('button, a, [role="button"], label, .cursor-hover')) return true;
    const style = window.getComputedStyle(el);
    return style.cursor === 'pointer';
  }, []);

  useEffect(() => {
    // Skip on touch-only devices
    if ('ontouchstart' in window && !window.matchMedia('(hover: hover)').matches) return;

    const s = state.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const glow = glowRef.current;
    const canvas = trailCanvasRef.current;
    if (!dot || !ring || !glow || !canvas) return;

    const ctx = canvas.getContext('2d');
    let raf;

    // Size canvas to viewport
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Hide default cursor globally
    document.documentElement.style.cursor = 'none';
    document.body.style.cursor = 'none';

    // ── Event listeners ──
    const onMove = (e) => {
      s.mouseX = e.clientX;
      s.mouseY = e.clientY;
      if (!s.visible) s.visible = true;
      // Hover detection
      s.hovering = isInteractive(e.target);
    };

    const onDown = () => { s.clicking = true; };
    const onUp   = () => { s.clicking = false; };

    const onEnter = () => { s.visible = true; };
    const onLeave = () => { s.visible = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('mouseleave', onLeave);

    // ── Animation loop ──
    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      // Lerp positions at different rates for depth
      s.dotX  = lerp(s.dotX,  s.mouseX, 0.25);
      s.dotY  = lerp(s.dotY,  s.mouseY, 0.25);
      s.ringX = lerp(s.ringX, s.mouseX, 0.12);
      s.ringY = lerp(s.ringY, s.mouseY, 0.12);
      s.glowX = lerp(s.glowX, s.mouseX, 0.08);
      s.glowY = lerp(s.glowY, s.mouseY, 0.08);

      // Speed (for squash/stretch & trail density)
      const dx = s.mouseX - s.prevX;
      const dy = s.mouseY - s.prevY;
      s.speed = Math.sqrt(dx * dx + dy * dy);
      s.prevX = s.mouseX;
      s.prevY = s.mouseY;

      const vis = s.visible ? 1 : 0;

      // ─ Inner dot ─
      const dotScale = s.clicking ? 0.6 : s.hovering ? 2.2 : 1;
      // Subtle squash/stretch along velocity direction when fast
      const stretch = Math.min(s.speed / 80, 0.35);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      dot.style.transform = `translate(${s.dotX}px, ${s.dotY}px) translate(-50%, -50%) rotate(${angle}deg) scale(${dotScale + stretch}, ${dotScale - stretch * 0.5})`;
      dot.style.opacity = vis;

      // ─ Outer ring ─
      const ringScale = s.clicking ? 0.7 : s.hovering ? 1.8 : 1;
      ring.style.transform = `translate(${s.ringX}px, ${s.ringY}px) translate(-50%, -50%) scale(${ringScale})`;
      ring.style.opacity = vis * 0.7;
      ring.style.borderColor = s.hovering ? '#ff4fd8' : 'rgba(255, 79, 216, 0.5)';

      // ─ Glow ─
      const glowScale = s.hovering ? 1.6 : 1;
      glow.style.transform = `translate(${s.glowX}px, ${s.glowY}px) translate(-50%, -50%) scale(${glowScale})`;
      glow.style.opacity = vis * (s.hovering ? 0.5 : 0.25);

      // ─ Trail particles ─
      s.trailTimer++;
      if (s.speed > 2 && s.visible && s.trailTimer % 2 === 0) {
        s.trails.push({
          x: s.dotX,
          y: s.dotY,
          alpha: 0.6,
          size: 4 + Math.min(s.speed / 15, 8),
        });
      }

      // Draw & decay trails
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = s.trails.length - 1; i >= 0; i--) {
        const t = s.trails[i];
        t.alpha -= 0.025;
        t.size *= 0.96;
        if (t.alpha <= 0) {
          s.trails.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 79, 216, ${t.alpha * 0.35})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', resize);
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
    };
  }, [isInteractive]);

  return (
    <>
      {/* Trail canvas – behind everything, never blocks clicks */}
      <canvas
        ref={trailCanvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99997,
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        }}
      />

      {/* Outer glow (biggest, blurriest, slowest) */}
      <div
        ref={glowRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,79,216,0.35) 0%, rgba(255,79,216,0) 70%)',
          filter: 'blur(12px)',
          pointerEvents: 'none',
          zIndex: 99998,
          opacity: 0,
          transition: 'opacity 0.3s ease',
          willChange: 'transform, opacity',
        }}
      />

      {/* Outer ring (delayed follower) */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1.5px solid rgba(255, 79, 216, 0.5)',
          pointerEvents: 'none',
          zIndex: 99999,
          mixBlendMode: 'difference',
          opacity: 0,
          transition: 'border-color 0.35s ease, opacity 0.3s ease',
          willChange: 'transform, opacity, border-color',
        }}
      />

      {/* Inner dot (fastest, snappiest) */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#ff4fd8',
          boxShadow: '0 0 10px 2px rgba(255,79,216,0.6), 0 0 30px 6px rgba(255,79,216,0.2)',
          pointerEvents: 'none',
          zIndex: 100000,
          mixBlendMode: 'difference',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          willChange: 'transform, opacity',
        }}
      />
    </>
  );
}
