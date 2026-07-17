import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitDrillSession } from '../services/anchorApi.js';

const C = {
  navy: '#0A2947',
  cream: '#F3E4C9',
  earth: '#8B5E3C',
  sage: '#D3D4C0',
  textSec: '#475665',
  border: 'rgba(10, 41, 71, 0.22)',
  white: '#FFFFFF',
  safetyRed: '#D93025',
};

interface DrillResult {
  anchorId: string;
  durationSeconds: number;
  completed: boolean;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getVerdict(secs: number): { label: string; color: string } {
  if (secs < 60) return { label: 'Excellent', color: C.earth };
  if (secs < 120) return { label: 'Good', color: C.navy };
  if (secs < 180) return { label: 'Fair', color: C.textSec };
  return { label: 'Needs Practice', color: C.safetyRed };
}

export default function CompletePage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<DrillResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('drillResult');
    if (!raw) { navigate('/', { replace: true }); return; }
    try {
      const data = JSON.parse(raw) as DrillResult;
      setResult(data);
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
      <div style={{
        minHeight: '100dvh',
        background: C.cream,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: C.navy,
        fontFamily: 'system-ui, sans-serif',
      }}>
        Loading...
      </div>
    );
  }

  const verdict = getVerdict(result.durationSeconds);

  return (
    <div style={{
      minHeight: '100dvh',
      background: C.cream,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 28,
      padding: '32px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Success mark */}
      <div style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        background: C.white,
        border: `2.5px solid ${C.navy}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 40,
        color: C.navy,
      }}>
        ✓
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: C.navy }}>Drill Complete!</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: C.textSec }}>
          You reached the exit safely
        </p>
      </div>

      {/* Stats card */}
      <div style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '24px 28px',
        width: '100%',
        maxWidth: 340,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <StatRow
          label="Time Taken"
          value={
            <span style={{
              fontFamily: '"Courier New", monospace',
              fontSize: 28,
              fontWeight: 700,
              color: C.earth,
            }}>
              {formatTime(result.durationSeconds)}
            </span>
          }
        />
        <StatRow
          label="Performance"
          value={
            <span style={{ fontSize: 18, fontWeight: 700, color: verdict.color }}>
              {verdict.label}
            </span>
          }
        />
        <StatRow
          label="Result Saved"
          value={
            <span style={{ fontSize: 14, color: submitted ? C.earth : C.textSec }}>
              {submitted ? 'Saved' : 'Saving...'}
            </span>
          }
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 340 }}>
        <button
          onClick={handleScanAnother}
          style={{
            background: C.navy,
            border: 'none',
            borderRadius: 16,
            color: C.white,
            fontSize: 16,
            fontWeight: 700,
            minHeight: 52,
            cursor: 'pointer',
          }}
        >
          Scan Another QR
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: `1px solid ${C.navy}`,
            borderRadius: 16,
            color: C.navy,
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

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 13, color: C.textSec }}>{label}</span>
      {value}
    </div>
  );
}
