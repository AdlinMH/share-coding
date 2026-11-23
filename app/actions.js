"use server";

import { refresh } from "next/cache";
import { RATE_LIMIT, pinCocok } from "@/lib/aturan";
import { ambilKonfigurasi } from "@/lib/konfigurasi";
import { bolehLanjut } from "@/lib/rate-limit";
import { akhiriSesiPemilik, buatSesiPemilik } from "@/lib/sesi";

const PESAN_GAGAL = "Terjadi gangguan. Coba lagi sebentar lagi.";

export async function loginPin(pin) {
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return { error: "PIN harus 4 angka." };
  }

  try {
    const boleh = await bolehLanjut(
      "pin",
      RATE_LIMIT.pinPerIp,
      RATE_LIMIT.pinPerKelompok
    );
    if (!boleh) {
      return { error: "Terlalu banyak percobaan. Tunggu 15 menit." };
    }

    const { ownerPin } = ambilKonfigurasi();
    if (!pinCocok(pin, ownerPin)) {
      return { error: "PIN salah." };
    }

    await buatSesiPemilik();
    refresh();
    return { ok: true };
  } catch (e) {
    console.error(e.message);
    return { error: PESAN_GAGAL };
  }
}

export async function logout() {
  try {
    await akhiriSesiPemilik();
  } catch (e) {
    console.error(e.message);
  }
  refresh();
  return { ok: true };
}

