import React from 'react';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Terjadi kesalahan', onRetry }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      gap: 16,
      color: 'var(--color-error)',
    }}>
      <div style={{ fontSize: 32 }}>⚠</div>
      <div style={{ fontWeight: 500 }}>{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 20px',
            background: 'var(--color-primary-900)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
