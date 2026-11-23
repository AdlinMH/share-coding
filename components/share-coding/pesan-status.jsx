"use client";

import { useEffect, useState } from "react";

// Pesan singkat di bawah layar setelah aksi pemilik berhasil
// (mis. posting dihapus, sehingga kartunya sudah hilang dari daftar).
const NAMA_EVENT = "share-coding:pesan";

export function kabari(teks) {
  window.dispatchEvent(new CustomEvent(NAMA_EVENT, { detail: teks }));
}

export function PesanStatus() {
  const [teks, setTeks] = useState("");

  useEffect(() => {
    let timer;
    function tampil(event) {
      setTeks(event.detail);
      clearTimeout(timer);
      timer = setTimeout(() => setTeks(""), 4000);
    }
    window.addEventListener(NAMA_EVENT, tampil);
    return () => {
      window.removeEventListener(NAMA_EVENT, tampil);
      clearTimeout(timer);
    };
  }, []);

  return (
    <p
      role="status"
      aria-live="polite"
      className={
        teks
          ? "fixed inset-x-4 bottom-4 z-40 mx-auto max-w-sm rounded-lg bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-800 shadow-lg ring-1 ring-green-200"
          : "sr-only"
      }
    >
      {teks}
    </p>
  );
}
