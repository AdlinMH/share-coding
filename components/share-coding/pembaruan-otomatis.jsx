"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const JEDA = 3000;

// Only rendered for readers. Owner editors never get interrupted by polling.
export function PembaruanOtomatis({ versiAwal }) {
  const router = useRouter();

  useEffect(() => {
    let berhenti = false;
    let berjalan = false;
    let timer;
    let permintaan;

    async function periksa() {
      if (berhenti || berjalan || document.visibilityState === "hidden") return;
      clearTimeout(timer);
      berjalan = true;
      permintaan = new AbortController();
      // A stalled connection must not stop all future checks.
      const batasWaktu = setTimeout(() => permintaan.abort(), 10000);
      try {
        const response = await fetch("/api/posting-version", {
          cache: "no-store",
          headers: { "If-None-Match": `"${versiAwal}"` },
          signal: permintaan.signal,
        });
        if (response.status === 304 || !response.ok) return;
        const { version } = await response.json();
        if (
          !berhenti &&
          document.visibilityState !== "hidden" &&
          typeof version === "string" &&
          version !== versiAwal &&
          !window.getSelection()?.toString()
        ) {
          // Merge the new server-rendered posts; do not reload or reset scroll.
          router.refresh();
        }
      } catch {
        // Keep the existing posts visible and retry after network failures.
      } finally {
        clearTimeout(batasWaktu);
        berjalan = false;
        if (!berhenti && document.visibilityState !== "hidden") {
          timer = setTimeout(periksa, JEDA);
        }
      }
    }

    function saatTerlihat() {
      clearTimeout(timer);
      if (document.visibilityState !== "hidden") void periksa();
    }

    timer = setTimeout(periksa, JEDA);
    document.addEventListener("visibilitychange", saatTerlihat);
    window.addEventListener("online", saatTerlihat);
    return () => {
      berhenti = true;
      clearTimeout(timer);
      permintaan?.abort();
      document.removeEventListener("visibilitychange", saatTerlihat);
      window.removeEventListener("online", saatTerlihat);
    };
  }, [versiAwal, router]);

  return null;
}
