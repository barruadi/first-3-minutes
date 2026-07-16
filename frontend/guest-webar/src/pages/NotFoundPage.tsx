import React from 'react';

export default function NotFoundPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0A2947', color: '#F3E4C9', gap: 16, padding: 24,
    }}>
      <div style={{ fontSize: 48 }}>🔗</div>
      <div style={{ fontWeight: 600, fontSize: 18 }}>Halaman tidak ditemukan</div>
      <div style={{ fontSize: 14, opacity: 0.7, textAlign: 'center', maxWidth: 320 }}>
        Pindai QR rescue yang tersedia di lokasi untuk mengakses panduan evakuasi.
      </div>
    </div>
  );
}
