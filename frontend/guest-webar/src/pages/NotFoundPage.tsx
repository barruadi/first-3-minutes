import React from 'react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-navy text-warm-beige gap-4 p-6">
      <div className="text-5xl">🔗</div>
      <div className="font-semibold text-lg">Halaman tidak ditemukan</div>
      <div className="text-sm opacity-70 text-center max-w-xs">
        Pindai QR rescue yang tersedia di lokasi untuk mengakses panduan evakuasi.
      </div>
    </div>
  );
}
