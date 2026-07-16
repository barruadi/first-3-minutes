import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitDrillSession } from '../services/anchorApi.js';

interface DrillResult {
  anchorId: string;
  durationSeconds: number;
  completed: boolean;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getVerdict(secs: number): { label: string; color: string } {
  if (secs < 60) return { label: 'Excellent', color: '#39FF14' };
  if (secs < 120) return { label: 'Good', color: '#00E5FF' };
  if (secs < 180) return { label: 'Fair', color: '#FFD60A' };
  return { label: 'Needs Practice', color: '#FF6B35' };
}

export default function CompletePage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<DrillResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('drillResult');
    if (!raw) {
      navigate('/', { replace: true });
      return;
    }

    try {
      const data = JSON.parse(raw) as DrillResult;
      setResult(data);

      // Submit to backend (fire-and-forget)
      void submitDrillSession({
        anchor_id: data.anchorId,
        duration_seconds: data.durationSeconds,
        completed: data.completed,
      }).then(() => setSubmitted(true));
    } catch {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleScanAnother = () => {
    sessionStorage.removeItem('anchorData');
    sessionStorage.removeItem('drillResult');
    navigate('/scan', { replace: true });
  };

  if (!result) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: '#0A1A0E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Loading...
      </div>
    );
  }

  const verdict = getVerdict(result.durationSeconds);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0A1A0E',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: '32px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#fff',
      }}
    >
      {/* Success icon */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: `rgba(57,255,20,0.12)`,
          border: `2.5px solid #39FF14`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 50,
          boxShadow: '0 0 32px rgba(57,255,20,0.25)',
        }}
      >
        ✓
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Drill Complete!</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
          You reached the exit safely
        </p>
      </div>

      {/* Stats card */}
      <div
        style={{
          background: 'rgba(57,255,20,0.06)',
          border: '1px solid rgba(57,255,20,0.2)',
          borderRadius: 20,
          padding: '24px 32px',
          width: '100%',
          maxWidth: 340,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Time */}
        <StatRow
          label="Time Taken"
          value={
            <span
              style={{
                fontFamily: '"Courier New", monospace',
                fontSize: 28,
                fontWeight: 700,
                color: '#39FF14',
              }}
            >
              {formatTime(result.durationSeconds)}
            </span>
          }
        />

        {/* Verdict */}
        <StatRow
          label="Performance"
          value={
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: verdict.color,
              }}
            >
              {verdict.label}
            </span>
          }
        />

        {/* Submission status */}
        <StatRow
          label="Result Saved"
          value={
            <span
              style={{
                fontSize: 14,
                color: submitted ? '#39FF14' : 'rgba(255,255,255,0.5)',
              }}
            >
              {submitted ? 'Yes' : 'Saving...'}
            </span>
          }
        />
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: '100%',
          maxWidth: 340,
        }}
      >
        <button
          onClick={handleScanAnother}
          style={{
            background: '#39FF14',
            border: 'none',
            borderRadius: 14,
            color: '#0A1A0E',
            fontSize: 16,
            fontWeight: 700,
            minHeight: 56,
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(57,255,20,0.35)',
          }}
        >
          Scan Another QR
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 14,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 15,
            fontWeight: 600,
            minHeight: 48,
            cursor: 'pointer',
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{label}</span>
      {value}
    </div>
  );
}
