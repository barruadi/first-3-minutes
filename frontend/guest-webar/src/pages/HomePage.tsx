import React from 'react';
import { useNavigate } from 'react-router-dom';

const C = {
  navy: '#0A2947',
  cream: '#F3E4C9',
  sage: '#D3D4C0',
  earth: '#8B5E3C',
  textSecondary: '#475665',
  border: 'rgba(10, 41, 71, 0.22)',
  white: '#FFFFFF',
};

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: C.cream,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: '32px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Brand mark */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: C.navy,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path
              d="M18 4L6 9v10c0 7 5.4 13.5 12 15 6.6-1.5 12-8 12-15V9L18 4z"
              stroke={C.cream}
              strokeWidth="2"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M12 18l4 4 8-8"
              stroke={C.cream}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            color: C.navy,
            letterSpacing: -0.5,
          }}
        >
          3MINUTES
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 14,
            color: C.textSecondary,
          }}
        >
          Emergency Evacuation Guide
        </p>
      </div>

      {/* Instruction card */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '20px 24px',
          maxWidth: 340,
          width: '100%',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: C.navy,
            lineHeight: 1.6,
            textAlign: 'center',
          }}
        >
          Find a QR code at your location, then tap below to scan it. You will be guided to the nearest exit.
        </p>
      </div>

      {/* Main CTA */}
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => navigate('/scan')}
          style={{
            background: C.navy,
            color: C.white,
            border: 'none',
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            minHeight: 52,
            padding: '0 24px',
            cursor: 'pointer',
            width: '100%',
            letterSpacing: 0.2,
          }}
        >
          Scan QR Code
        </button>
        <p style={{ fontSize: 12, color: C.textSecondary, margin: 0, textAlign: 'center' }}>
          Camera permission required
        </p>
      </div>
    </div>
  );
}
