"use server";

// Server Actions untuk /share-coding. Hanya pemilik yang boleh menulis.
// Sesi pemilik dicek ulang di server pada SETIAP aksi (tambah, edit, hapus).

import { refresh } from "next/cache";
import { idValid } from "@/lib/aturan";
import { rapikanDokumen, rapikanJudul } from "@/lib/dokumen";
import { cekSesiPemilik } from "@/lib/sesi";
import * as posting from "@/lib/share-coding";

const PESAN_GAGAL = "Terjadi gangguan. Coba lagi sebentar lagi.";
// Halaman tidak langsung dimuat ulang, supaya isi editor tidak hilang.
const PESAN_SESI_HABIS = "Sesi pemilik sudah berakhir. Salin isi dulu, lalu masuk lagi.";
const PESAN_TIDAK_DITEMUKAN = "Posting tidak ditemukan. Muat ulang halaman.";

async function aksiPemilik(jalankan) {
  try {
    if (!(await cekSesiPemilik())) {
      return { error: PESAN_SESI_HABIS, sesiHabis: true };
    }
    const hasil = await jalankan();
    if (hasil?.error) return hasil;
    if (hasil === false) return { error: PESAN_TIDAK_DITEMUKAN };
    refresh();
    return { ok: true };
  } catch (e) {
    console.error(e.message);
    return { error: PESAN_GAGAL };
  }
}

function periksaIsi(judulMentah, isiMentah) {
  const judul = rapikanJudul(judulMentah);
  if (judul.error) return { error: judul.error };
  const isi = rapikanDokumen(isiMentah);
  if (isi.error) return { error: isi.error };
  return { judul: judul.judul, dokumen: isi.dokumen };
}

export async function tambahPosting(judulMentah, isiMentah) {
  return aksiPemilik(async () => {
    const hasil = periksaIsi(judulMentah, isiMentah);
    if (hasil.error) return hasil;
    await posting.tambahPosting(hasil.judul, hasil.dokumen);
    return true;
  });
}

export async function ubahPosting(id, judulMentah, isiMentah) {
  if (!idValid(id)) return { error: PESAN_TIDAK_DITEMUKAN };
  return aksiPemilik(async () => {
    const hasil = periksaIsi(judulMentah, isiMentah);
    if (hasil.error) return hasil;
    return posting.ubahPosting(id, hasil.judul, hasil.dokumen);
  });
}

export async function hapusPosting(id) {
  if (!idValid(id)) return { error: PESAN_TIDAK_DITEMUKAN };
  return aksiPemilik(() => posting.hapusPosting(id));
}
