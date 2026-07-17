import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const C = {
  navy:          '#0A2947',
  cream:         '#F3E4C9',
  earth:         '#8B5E3C',
  textSecondary: '#475665',
  border:        'rgba(10, 41, 71, 0.12)',
  white:         '#FFFFFF',
};

// ── Animation constants ───────────────────────────────────────────────────────
const DUR     = 360; // ms — duration per element
const STAGGER = 75;  // ms — delay between elements

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2" y="2" width="6" height="6" rx="1" stroke={C.navy} strokeWidth="1.6" />
        <rect x="12" y="2" width="6" height="6" rx="1" stroke={C.navy} strokeWidth="1.6" />
        <rect x="2" y="12" width="6" height="6" rx="1" stroke={C.navy} strokeWidth="1.6" />
        <rect x="14" y="14" width="2" height="2" rx="0.5" fill={C.navy} />
        <rect x="12" y="12" width="2" height="2" rx="0.5" fill={C.navy} />
        <rect x="16" y="12" width="2" height="2" rx="0.5" fill={C.navy} />
        <rect x="12" y="16" width="2" height="2" rx="0.5" fill={C.navy} />
        <rect x="16" y="16" width="2" height="2" rx="0.5" fill={C.navy} />
      </svg>
    ),
    label: 'Find a QR code near an exit',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2" y="5" width="12" height="10" rx="2" stroke={C.navy} strokeWidth="1.6" />
        <circle cx="8" cy="10" r="2.5" stroke={C.navy} strokeWidth="1.6" />
        <path d="M14 8l4-2v8l-4-2" stroke={C.navy} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
    label: 'Tap the button and allow camera',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 16V6" stroke={C.navy} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6 10l4-4 4 4" stroke={C.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 17h12" stroke={C.navy} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    label: 'Follow the AR arrows to the exit',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const anim = (i: number): React.CSSProperties => ({
    opacity:          show ? 1 : 0,
    transform:        show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
    transition:       `opacity ${DUR}ms ease, transform ${DUR}ms cubic-bezier(0.34, 1.3, 0.64, 1)`,
    transitionDelay:  show ? `${i * STAGGER}ms` : '0ms',
  });

  return (
    <>
      <style>{`
        @keyframes btnPulse {
          0%   { box-shadow: 0 4px 16px rgba(10,41,71,0.30), 0 0 0 0 rgba(10,41,71,0.28); }
          55%  { box-shadow: 0 4px 16px rgba(10,41,71,0.18), 0 0 0 12px rgba(10,41,71,0); }
          100% { box-shadow: 0 4px 16px rgba(10,41,71,0.18), 0 0 0 0   rgba(10,41,71,0); }
        }
      `}</style>

      <div
        style={{
          minHeight: '100dvh',
          background: `radial-gradient(ellipse 90% 45% at 50% 0%, rgba(10,41,71,0.08) 0%, transparent 100%), ${C.cream}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          padding: '44px 24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflowX: 'hidden',
        }}
      >
        {/* ── Brand mark ── */}
        <div style={{ textAlign: 'center', ...anim(0) }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: C.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 10px 32px rgba(10,41,71,0.18)',
              overflow: 'hidden',
            }}
          >
            <img
              src="/logo.jpeg"
              alt="3MINUTES logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
              color: C.navy,
              letterSpacing: -1,
              lineHeight: 1,
            }}
          >
            3MINUTES
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 12,
              fontWeight: 600,
              color: C.textSecondary,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Emergency Evacuation Guide
          </p>
        </div>

        {/* ── Steps card ── */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            padding: '20px 22px',
            maxWidth: 340,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            boxShadow: '0 2px 12px rgba(10,41,71,0.06)',
            ...anim(1),
          }}
        >
          {STEPS.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 0',
                borderBottom: i < STEPS.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(10,41,71,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {step.icon}
              </div>
              <span style={{ fontSize: 14, color: C.navy, lineHeight: 1.45, fontWeight: 500 }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div
          style={{
            width: '100%',
            maxWidth: 340,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            ...anim(2),
          }}
        >
          <button
            onClick={() => navigate('/scan')}
            style={{
              background: C.navy,
              color: C.white,
              border: 'none',
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 700,
              minHeight: 54,
              padding: '0 24px',
              cursor: 'pointer',
              width: '100%',
              letterSpacing: 0.3,
              boxShadow: '0 4px 16px rgba(10,41,71,0.25)',
              animation: show
                ? `btnPulse 1100ms ease ${STAGGER * 3 + DUR}ms forwards`
                : 'none',
            }}
          >
            Scan QR Code
          </button>
          <p
            style={{
              fontSize: 12,
              color: C.textSecondary,
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Camera required · Secure connection (HTTPS) needed
          </p>
        </div>
      </div>
    </>
  );
}
