import React from 'react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-navy text-warm-beige gap-4 p-6">
      <div className="flex items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="QR link">
          <rect x="4" y="4" width="16" height="16" rx="2" stroke="#F3E4C9" strokeWidth="3" fill="none" />
          <rect x="28" y="4" width="16" height="16" rx="2" stroke="#F3E4C9" strokeWidth="3" fill="none" />
          <rect x="4" y="28" width="16" height="16" rx="2" stroke="#F3E4C9" strokeWidth="3" fill="none" />
          <rect x="8" y="8" width="8" height="8" rx="1" fill="#F3E4C9" />
          <rect x="32" y="8" width="8" height="8" rx="1" fill="#F3E4C9" />
          <rect x="8" y="32" width="8" height="8" rx="1" fill="#F3E4C9" />
          <rect x="28" y="28" width="4" height="4" rx="1" fill="#F3E4C9" />
          <rect x="36" y="28" width="4" height="4" rx="1" fill="#F3E4C9" />
          <rect x="28" y="36" width="4" height="4" rx="1" fill="#F3E4C9" />
          <rect x="36" y="36" width="4" height="4" rx="1" fill="#F3E4C9" />
        </svg>
      </div>
      <div className="font-semibold text-lg">Halaman tidak ditemukan</div>
      <div className="text-sm opacity-70 text-center max-w-xs">
        Pindai QR rescue yang tersedia di lokasi untuk mengakses panduan evakuasi.
      </div>
    </div>
  );
}
