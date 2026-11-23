// Aturan posting /share-coding: judul dan isi (dokumen Tiptap/ProseMirror JSON).
// File ini tidak memakai database atau API Node, jadi dipakai server (validasi),
// browser (editor), dan tes (tests/dokumen.test.mjs).
//
// Server tidak pernah menyimpan HTML. Isi disimpan sebagai JSON terstruktur,
// dibersihkan dengan daftar izin: hanya node, mark, dan atribut di bawah ini
// yang lolos. Tautan hanya boleh http:// atau https://.

export const BATAS_SHARE = {
  judulMaks: 120,
  isiJsonMaks: 60000, // panjang JSON dokumen (karakter)
  teksMaks: 20000, // total teks di dalam dokumen
  simpulMaks: 3000, // jumlah node
  kedalamanMaks: 10, // daftar bertingkat
  tautanMaks: 2000,
};

// Node yang boleh berada di dalam node lain.
const BLOK = ["paragraph", "bulletList", "orderedList", "codeBlock"];
const ISI_BOLEH = {
  doc: BLOK,
  listItem: BLOK,
  paragraph: ["text", "hardBreak"],
  codeBlock: ["text"],
  bulletList: ["listItem"],
  orderedList: ["listItem"],
};
const MARK_BOLEH = ["bold", "italic", "code", "link"];

export function rapikanJudul(nilai) {
  const judul = typeof nilai === "string" ? nilai.replace(/\s+/g, " ").trim() : "";
  if (judul.length === 0) return { error: "Judul tidak boleh kosong." };
  if (judul.length > BATAS_SHARE.judulMaks) {
    return { error: `Judul maksimal ${BATAS_SHARE.judulMaks} karakter.` };
  }
  return { judul };
}

// Mengembalikan URL yang aman (http/https) atau null.
export function urlAman(nilai) {
  if (typeof nilai !== "string") return null;
  const teks = nilai.trim();
  if (teks.length === 0 || teks.length > BATAS_SHARE.tautanMaks) return null;
  if (!/^https?:\/\//i.test(teks)) return null;
  try {
    const url = new URL(teks);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

class DokumenSalah extends Error {}

function tolak(pesan) {
  throw new DokumenSalah(pesan);
}

function objekBiasa(nilai) {
  return nilai !== null && typeof nilai === "object" && !Array.isArray(nilai);
}

function bersihkanMarks(marks) {
  if (marks === undefined) return [];
  if (!Array.isArray(marks)) tolak("Format isi tidak dikenali.");
  const hasil = [];
  const sudah = new Set();
  for (const mark of marks) {
    if (!objekBiasa(mark) || !MARK_BOLEH.includes(mark.type)) {
      tolak("Isi memakai format yang tidak didukung.");
    }
    if (sudah.has(mark.type)) continue;
    sudah.add(mark.type);
    if (mark.type === "link") {
      const href = urlAman(mark.attrs?.href);
      if (!href) tolak("Tautan harus diawali http:// atau https://.");
      hasil.push({ type: "link", attrs: { href } });
    } else {
      hasil.push({ type: mark.type });
    }
  }
  return hasil;
}

function bersihkanNode(node, induk, hitung, kedalaman) {
  if (!objekBiasa(node) || typeof node.type !== "string") {
    tolak("Format isi tidak dikenali.");
  }
  if (!ISI_BOLEH[induk].includes(node.type)) {
    tolak("Isi memakai format yang tidak didukung.");
  }
  hitung.simpul += 1;
  if (hitung.simpul > BATAS_SHARE.simpulMaks) tolak("Isi terlalu panjang.");
  if (kedalaman > BATAS_SHARE.kedalamanMaks) tolak("Daftar bertingkat terlalu dalam.");

  if (node.type === "text") {
    if (typeof node.text !== "string") tolak("Format isi tidak dikenali.");
    // Karakter NUL tidak bisa disimpan di PostgreSQL. Teks lain dipertahankan apa adanya.
    const teks = node.text.replaceAll("\u0000", "");
    if (teks.length === 0) return null;
    hitung.teks += teks.length;
    if (teks.trim().length > 0) hitung.berisi = true;
    // Kode di blok kode selalu teks polos, tanpa format.
    const marks = induk === "codeBlock" ? [] : bersihkanMarks(node.marks);
    return marks.length > 0 ? { type: "text", text: teks, marks } : { type: "text", text: teks };
  }

  if (node.type === "hardBreak") return { type: "hardBreak" };

  const hasil = { type: node.type };
  if (node.type === "orderedList") {
    const mulai = node.attrs?.start;
    if (Number.isInteger(mulai) && mulai > 1 && mulai <= 10000) {
      hasil.attrs = { start: mulai };
    }
  }

  if (node.content !== undefined && !Array.isArray(node.content)) {
    tolak("Format isi tidak dikenali.");
  }
  const anak = (node.content ?? [])
    .map((n) => bersihkanNode(n, node.type, hitung, kedalaman + 1))
    .filter(Boolean);

  if (["bulletList", "orderedList", "listItem", "codeBlock"].includes(node.type) && anak.length === 0) {
    return null; // daftar dan blok kode kosong dibuang
  }
  if (node.type === "listItem" && anak[0].type !== "paragraph") {
    anak.unshift({ type: "paragraph" });
  }
  if (anak.length > 0) hasil.content = anak;
  return hasil;
}

// Memeriksa dan membersihkan dokumen dari editor.
// Mengembalikan { dokumen } atau { error }.
export function rapikanDokumen(nilai) {
  if (!objekBiasa(nilai) || nilai.type !== "doc") {
    return { error: "Isi posting tidak boleh kosong." };
  }
  let json;
  try {
    json = JSON.stringify(nilai);
  } catch {
    return { error: "Format isi tidak dikenali." };
  }
  if (json.length > BATAS_SHARE.isiJsonMaks) {
    return { error: "Isi terlalu panjang. Bagi menjadi beberapa posting." };
  }
  if (nilai.content !== undefined && !Array.isArray(nilai.content)) {
    return { error: "Format isi tidak dikenali." };
  }

  const hitung = { simpul: 0, teks: 0, berisi: false };
  try {
    const content = (nilai.content ?? [])
      .map((n) => bersihkanNode(n, "doc", hitung, 1))
      .filter(Boolean);
    // Paragraf kosong di awal dan akhir (sisa editor) dibuang.
    const kosong = (n) => n?.type === "paragraph" && !n.content;
    while (kosong(content[0])) content.shift();
    while (kosong(content.at(-1))) content.pop();
    if (!hitung.berisi) return { error: "Isi posting tidak boleh kosong." };
    if (hitung.teks > BATAS_SHARE.teksMaks) {
      return { error: "Isi terlalu panjang. Bagi menjadi beberapa posting." };
    }
    return { dokumen: { type: "doc", content } };
  } catch (e) {
    if (e instanceof DokumenSalah) return { error: e.message };
    throw e;
  }
}
