import React from 'react';

interface Props {
  message?: string;
}

export default function LoadingState({ message = 'Memuat...' }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      gap: 16,
      color: 'var(--color-text-secondary)',
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: '3px solid var(--color-surface-muted)',
        borderTopColor: 'var(--color-primary-900)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 14 }}>{message}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
