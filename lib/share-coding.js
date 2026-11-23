import "server-only";

import { ambilKonfigurasi } from "./konfigurasi.js";
import { db } from "./supabase.js";

// Semua akses tabel share_coding_posts ada di file ini.
// Setiap query SELALU memakai group_id dari environment server,
// bukan dari form, URL, atau body request.

const TABEL = "share_coding_posts";

function kelompok() {
  return ambilKonfigurasi().groupId;
}

function gagal(langkah, error) {
  return new Error(`${langkah}: ${error.message}`);
}

// Untuk semua orang: urut dari yang paling awal dibuat (sesuai urutan praktik).
// Mengedit posting tidak mengubah urutan karena created_at tidak pernah diubah.
export async function daftarPosting() {
  const { data, error } = await db()
    .from(TABEL)
    .select("id, title, content, created_at, updated_at")
    .eq("group_id", kelompok())
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);
  if (error) throw gagal("Gagal membaca posting", error);
  return data;
}

export async function tambahPosting(judul, dokumen) {
  const { error } = await db()
    .from(TABEL)
    .insert({ group_id: kelompok(), title: judul, content: dokumen });
  if (error) throw gagal("Gagal menyimpan posting", error);
}

// Mengembalikan false jika id tidak ditemukan di kelompok ini.
export async function ubahPosting(id, judul, dokumen) {
  const { data, error } = await db()
    .from(TABEL)
    .update({ title: judul, content: dokumen })
    .eq("id", id)
    .eq("group_id", kelompok())
    .select("id");
  if (error) throw gagal("Gagal mengubah posting", error);
  return data.length === 1;
}

export async function hapusPosting(id) {
  const { data, error } = await db()
    .from(TABEL)
    .delete()
    .eq("id", id)
    .eq("group_id", kelompok())
    .select("id");
  if (error) throw gagal("Gagal menghapus posting", error);
  return data.length === 1;
}
