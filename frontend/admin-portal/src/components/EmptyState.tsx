import React from 'react';

interface Props {
  message?: string;
  hint?: string;
}

export default function EmptyState({ message = 'Tidak ada data', hint }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      gap: 8,
      color: 'var(--color-text-secondary)',
    }}>
      <div style={{ fontSize: 40, opacity: 0.3 }}>◻</div>
      <div style={{ fontWeight: 500 }}>{message}</div>
      {hint && <div style={{ fontSize: 13, opacity: 0.7 }}>{hint}</div>}
    </div>
  );
}
