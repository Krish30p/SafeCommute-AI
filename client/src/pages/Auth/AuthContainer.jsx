import React, { useEffect, useRef, useState } from 'react';
import Login from './Login';
import Signup from './Signup';

// Map-style illustrated SVG background with cursor reactivity
function MapBackground({ mouse }) {
  const { x, y } = mouse; // normalized 0-1

  // Parallax offset helpers - different layers move at different rates
  const p = (depth, base = 0) => base + (x - 0.5) * depth;
  const q = (depth, base = 0) => base + (y - 0.5) * depth;

  return (
    <svg
      viewBox="0 0 1280 720"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full"
      style={{ transition: 'none' }}
    >
      {/* Off-white base */}
      <rect width="1280" height="720" fill="#F5F4EF" />

      {/* ── LAYER 1 – Deep parallax (slow) ── */}
      <g style={{ transform: `translate(${p(-18)}px, ${q(-14)}px)`, transition: 'transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
        {/* Large sage green shape – top left */}
        <path d="M-60,0 C80,-30 200,20 240,120 C280,220 200,340 80,360 C-40,380 -100,280 -80,160 Z" fill="#A8BB9A" opacity="0.9" />
        {/* Smaller sage top left corner */}
        <path d="M0,250 C60,230 130,270 150,330 C170,390 120,440 60,450 C0,460 -40,410 -30,350 Z" fill="#8FAF82" opacity="0.8" />
      </g>

      {/* ── LAYER 2 – Mid parallax ── */}
      <g style={{ transform: `translate(${p(-30)}px, ${q(-22)}px)`, transition: 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
        {/* Sky blue vertical strip – center */}
        <rect x="480" y="-10" width="90" height="480" rx="6" fill="#ADD8E6" opacity="0.55" />

        {/* Sky blue bottom-right patch */}
        <path d="M900,580 C960,560 1040,580 1060,650 C1080,720 1020,760 940,750 C860,740 840,680 900,580 Z" fill="#ADD8E6" opacity="0.6" />

        {/* Sage green – right side large blob */}
        <path d="M1100,0 C1220,-20 1320,60 1300,200 C1280,340 1180,400 1080,380 C980,360 940,240 980,120 C1000,60 1060,10 1100,0 Z" fill="#A8BB9A" opacity="0.85" />

        {/* Sage green – far right bottom */}
        <path d="M1200,450 C1280,430 1340,480 1340,560 C1340,640 1270,700 1190,690 C1110,680 1080,610 1130,540 Z" fill="#8FAF82" opacity="0.7" />
      </g>

      {/* ── LAYER 3 – Foreground parallax (fast) ── */}
      <g style={{ transform: `translate(${p(-50)}px, ${q(-38)}px)`, transition: 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
        {/* Golden/amber wavy road – main horizontal snake */}
        <path
          d="M-40,380 C100,340 180,420 300,400 C420,380 480,300 600,320 C720,340 780,420 920,400 C1060,380 1180,300 1340,320"
          fill="none"
          stroke="#F0B846"
          strokeWidth="28"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* Road outline (white center line) */}
        <path
          d="M-40,380 C100,340 180,420 300,400 C420,380 480,300 600,320 C720,340 780,420 920,400 C1060,380 1180,300 1340,320"
          fill="none"
          stroke="#FDE68A"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="30 25"
          opacity="0.7"
        />

        {/* Secondary curving road */}
        <path
          d="M200,720 C240,620 300,560 360,480 C420,400 500,380 540,300 C580,220 560,120 620,40"
          fill="none"
          stroke="#F0B846"
          strokeWidth="22"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Map fold line – subtle diagonal */}
        <line x1="680" y1="-10" x2="680" y2="730" stroke="#D0CFC6" strokeWidth="1.5" opacity="0.5" strokeDasharray="6 8" />
        <line x1="-10" y1="370" x2="1290" y2="370" stroke="#D0CFC6" strokeWidth="1.5" opacity="0.3" strokeDasharray="6 8" />
      </g>

      {/* ── LAYER 4 – Location pin (closest, fastest) ── */}
      <g style={{ transform: `translate(${p(-70)}px, ${q(-55)}px)`, transition: 'transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
        {/* Pin drop shadow */}
        <ellipse cx="975" cy="265" rx="38" ry="12" fill="#00000015" />
        {/* Pin body */}
        <path
          d="M900,80 C900,-10 1050,-10 1050,80 C1050,140 975,250 975,250 C975,250 900,140 900,80 Z"
          fill="#F08080"
        />
        {/* Pin inner circle */}
        <circle cx="975" cy="88" r="36" fill="white" opacity="0.92" />
      </g>

      {/* Subtle vignette overlay */}
      <radialGradient id="vig" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="transparent" />
        <stop offset="100%" stopColor="#00000012" />
      </radialGradient>
      <rect width="1280" height="720" fill="url(#vig)" />
    </svg>
  );
}

export default function AuthContainer() {
  const [authPage, setAuthPage] = useState('login');
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const rafRef = useRef(null);
  const targetRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      targetRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    // Smooth lerp loop
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      setMouse(prev => {
        const nx = lerp(prev.x, targetRef.current.x, 0.06);
        const ny = lerp(prev.y, targetRef.current.y, 0.06);
        if (Math.abs(nx - prev.x) < 0.0001 && Math.abs(ny - prev.y) < 0.0001) return prev;
        return { x: nx, y: ny };
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Illustrated Map Background ── */}
      <div className="absolute inset-0">
        <MapBackground mouse={mouse} />
      </div>

      {/* ── Subtle frosted overlay on whole page ── */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />

      {/* ── Foreground layout ── */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center">

        {/* Branding */}
        <div className="text-center mb-6 select-none">
          <p
            className="font-black tracking-[0.22em] uppercase mb-1"
            style={{ color: '#2D3748', fontSize: '1.4rem', letterSpacing: '0.25em' }}
          >
            Safe Commute-AI
          </p>
          <h1
            className="font-black leading-none"
            style={{
              fontSize: '5rem',
              color: '#ADD8E6',
              WebkitTextStroke: '2.5px #6BAED6',
              textShadow: '3px 3px 0px #6BAED6, 0 4px 20px rgba(173,216,230,0.4)',
              letterSpacing: '0.08em',
              fontFamily: "'Arial Black', 'Arial Bold', Gadget, sans-serif",
            }}
          >
            HAVEN
          </h1>
        </div>

        {/* Form card container with slide transition */}
        <div className="w-full relative" style={{ minHeight: '420px' }}>

          {/* LOGIN */}
          <div
            className="absolute inset-0 w-full"
            style={{
              opacity: authPage === 'login' ? 1 : 0,
              transform: authPage === 'login' ? 'translateX(0) scale(1)' : 'translateX(-40px) scale(0.97)',
              pointerEvents: authPage === 'login' ? 'auto' : 'none',
              transition: 'opacity 0.45s ease, transform 0.45s ease',
            }}
          >
            <Login onNavigateToSignup={() => setAuthPage('signup')} />
          </div>

          {/* SIGNUP */}
          <div
            className="absolute inset-0 w-full"
            style={{
              opacity: authPage === 'signup' ? 1 : 0,
              transform: authPage === 'signup' ? 'translateX(0) scale(1)' : 'translateX(40px) scale(0.97)',
              pointerEvents: authPage === 'signup' ? 'auto' : 'none',
              transition: 'opacity 0.45s ease, transform 0.45s ease',
            }}
          >
            <Signup onNavigateToLogin={() => setAuthPage('login')} />
          </div>

        </div>
      </div>
    </div>
  );
}
