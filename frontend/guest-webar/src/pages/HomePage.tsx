import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0A1A0E',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: '24px 16px',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Logo / Title */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(57,255,20,0.15)',
            border: '2px solid #39FF14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            margin: '0 auto 16px',
          }}
        >
          🚪
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: -0.5,
            color: '#fff',
          }}
        >
          3MINUTES
        </h1>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 14,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.5,
          }}
        >
          Emergency Evacuation Guide
        </p>
      </div>

      {/* Instruction card */}
      <div
        style={{
          background: 'rgba(57,255,20,0.07)',
          border: '1px solid rgba(57,255,20,0.25)',
          borderRadius: 16,
          padding: '20px 24px',
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.6,
          }}
        >
          Find a QR code at your location, then tap below to scan it. You will be guided to the
          nearest exit.
        </p>
      </div>

      {/* Main CTA */}
      <button
        onClick={() => navigate('/scan')}
        style={{
          background: '#39FF14',
          color: '#0A1A0E',
          border: 'none',
          borderRadius: 14,
          fontSize: 17,
          fontWeight: 700,
          minHeight: 56,
          padding: '0 40px',
          cursor: 'pointer',
          letterSpacing: 0.2,
          boxShadow: '0 0 24px rgba(57,255,20,0.4)',
          width: '100%',
          maxWidth: 340,
          transition: 'opacity 0.15s',
        }}
      >
        Scan QR Code
      </button>

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
        Camera permission required
      </p>
    </div>
  );
}
