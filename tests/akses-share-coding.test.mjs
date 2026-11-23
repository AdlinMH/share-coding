// Tes isolasi kelompok tabel share_coding_posts terhadap database Supabase sungguhan.
// Butuh .env.local yang sudah diisi, setup.sql yang sudah dijalankan.
// Jalankan: npm run test:supabase
// PAKAI DATABASE UJI. Tes ini membuat lalu menghapus data di kelompok
// "uji-a-<acak>" dan "uji-b-<acak>".
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const siap = process.env.SHARE_CODING_TEST_DB === "1" && process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY;
const akhiran = Math.random().toString(36).slice(2, 8);
const A = `uji-a-${akhiran}`;
const B = `uji-b-${akhiran}`;

let s;
let klien;
const pakaiKelompok = (g) => (process.env.GROUP_ID = g);
const dok = (teks) => ({ type: "doc", content: [{ type: "codeBlock", content: [{ type: "text", text: teks }] }] });

before(async () => {
  if (!siap) return;
  process.env.OWNER_PIN ||= "0000";
  pakaiKelompok(A);
  s = await import("../lib/share-coding.js");
  klien = (await import("../lib/supabase.js")).db();
});

after(async () => {
  if (!siap) return;
  await klien.from("share_coding_posts").delete().in("group_id", [A, B]);
});

test("isolasi posting dua kelompok", { skip: !siap && "Database uji belum diaktifkan (SHARE_CODING_TEST_DB=1)" }, async (t) => {
  pakaiKelompok(A);
  await s.tambahPosting("Tahap 1", dok("npm run dev"));
  await s.tambahPosting("Tahap 2", dok("<Logo />"));
  pakaiKelompok(B);
  await s.tambahPosting("Punya B", dok("echo B"));

  pakaiKelompok(A);
  const [satu, dua] = await s.daftarPosting();

  await t.test("urut dari yang paling awal dibuat", async () => {
    assert.deepEqual((await s.daftarPosting()).map((x) => x.title), ["Tahap 1", "Tahap 2"]);
  });

  await t.test("edit tidak mengubah urutan", async () => {
    assert.equal(await s.ubahPosting(satu.id, "Tahap 1 (revisi)", dok("npm run dev -- -p 3001")), true);
    const daftar = await s.daftarPosting();
    assert.deepEqual(daftar.map((x) => x.title), ["Tahap 1 (revisi)", "Tahap 2"]);
    assert.equal(daftar[0].content.content[0].content[0].text, "npm run dev -- -p 3001");
    assert.notEqual(daftar[0].updated_at, daftar[0].created_at);
  });

  await t.test("kelompok B tidak membaca posting A", async () => {
    pakaiKelompok(B);
    const daftar = await s.daftarPosting();
    assert.deepEqual(daftar.map((x) => x.title), ["Punya B"]);
  });

  await t.test("kelompok B tidak bisa mengubah/menghapus posting A", async () => {
    pakaiKelompok(B);
    assert.equal(await s.ubahPosting(dua.id, "dibajak", dok("dibajak")), false);
    assert.equal(await s.hapusPosting(dua.id), false);
    pakaiKelompok(A);
    const daftar = await s.daftarPosting();
    assert.equal(daftar.length, 2);
    assert.equal(daftar[1].title, "Tahap 2");
  });

  await t.test("constraint database menolak isi bukan dokumen", async () => {
    const { error } = await klien
      .from("share_coding_posts")
      .insert({ group_id: A, title: "x", content: { type: "html" } });
    assert.equal(error?.code, "23514");
  });

  await t.test("hapus di kelompok sendiri", async () => {
    pakaiKelompok(A);
    assert.equal(await s.hapusPosting(dua.id), true);
    assert.equal((await s.daftarPosting()).length, 1);
  });
});
