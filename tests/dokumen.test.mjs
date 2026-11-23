// Tes aturan posting /share-coding (tanpa database). Jalankan: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { BATAS_SHARE, rapikanDokumen, rapikanJudul, urlAman } from "../lib/dokumen.js";

const doc = (...content) => ({ type: "doc", content });
const p = (...content) => ({ type: "paragraph", content });
const t = (text, marks) => (marks ? { type: "text", text, marks } : { type: "text", text });
const kode = (text) => ({ type: "codeBlock", attrs: { language: null }, content: [t(text)] });

const JSX_LOGO = `export function Logo() {
  return (
    <p className="text-4xl font-extrabold">
      <span className="text-primary">Tanya</span>
      <span className='ml-1'>Aja!</span>
      {/* komentar & "kutip" */}
\t</p>
  );
}`;

test("judul wajib diisi, spasi dirapikan, dibatasi panjangnya", () => {
  assert.ok(rapikanJudul("").error);
  assert.ok(rapikanJudul("   ").error);
  assert.ok(rapikanJudul(undefined).error);
  assert.ok(rapikanJudul(42).error);
  assert.equal(rapikanJudul("  Tahap 2 ·\n Buat  Logo ").judul, "Tahap 2 · Buat Logo");
  assert.equal(rapikanJudul("a".repeat(BATAS_SHARE.judulMaks)).judul.length, BATAS_SHARE.judulMaks);
  assert.ok(rapikanJudul("a".repeat(BATAS_SHARE.judulMaks + 1)).error);
});

test("hanya tautan http/https yang diterima", () => {
  assert.equal(urlAman("https://example.com/lesson"), "https://example.com/lesson");
  assert.equal(urlAman(" http://localhost:3000 "), "http://localhost:3000/");
  assert.equal(urlAman("javascript:alert(1)"), null);
  assert.equal(urlAman("JaVaScRiPt:alert(1)"), null);
  assert.equal(urlAman("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(urlAman("vbscript:msgbox"), null);
  assert.equal(urlAman("//evil.example"), null);
  assert.equal(urlAman("/relatif"), null);
  assert.equal(urlAman("https://user:pass@evil.example"), null);
  assert.equal(urlAman("https://" + "a".repeat(BATAS_SHARE.tautanMaks)), null);
  assert.equal(urlAman(null), null);
});

test("blok kode JSX tersimpan persis: indentasi, tab, baris baru, kutip", () => {
  const hasil = rapikanDokumen(doc(p(t("Buat file components/logo.jsx")), kode(JSX_LOGO)));
  assert.equal(hasil.error, undefined);
  assert.equal(hasil.dokumen.content[1].type, "codeBlock");
  assert.equal(hasil.dokumen.content[1].content[0].text, JSX_LOGO);
  // atribut language dibuang (tidak dipakai)
  assert.equal(hasil.dokumen.content[1].attrs, undefined);
});

test("format editor yang didukung tetap utuh", () => {
  const masukan = doc(
    p(t("Tebal", [{ type: "bold" }]), t(" "), t("miring", [{ type: "italic" }]), t(" "), t("npm", [{ type: "code" }])),
    p(t("Buka "), t("Vercel", [{ type: "link", attrs: { href: "https://vercel.com", target: "_blank", rel: "x", class: "y" } }])),
    { type: "paragraph" },
    { type: "bulletList", content: [{ type: "listItem", content: [p(t("satu"))] }] },
    { type: "orderedList", attrs: { start: 3, type: null }, content: [{ type: "listItem", content: [p(t("tiga")), { type: "bulletList", content: [{ type: "listItem", content: [p(t("anak"))] }] }] }] },
    p(t("baris 1"), { type: "hardBreak" }, t("baris 2"))
  );
  const { dokumen, error } = rapikanDokumen(masukan);
  assert.equal(error, undefined);
  assert.deepEqual(dokumen.content[1].content[1].marks, [{ type: "link", attrs: { href: "https://vercel.com/" } }]);
  assert.deepEqual(dokumen.content[2], { type: "paragraph" });
  assert.deepEqual(dokumen.content[4].attrs, { start: 3 });
  assert.equal(dokumen.content[4].content[0].content[1].type, "bulletList");
  assert.equal(dokumen.content[5].content[1].type, "hardBreak");
});

test("isi kosong ditolak", () => {
  assert.ok(rapikanDokumen(null).error);
  assert.ok(rapikanDokumen("<p>halo</p>").error);
  assert.ok(rapikanDokumen({ type: "paragraph" }).error);
  assert.ok(rapikanDokumen(doc()).error);
  assert.ok(rapikanDokumen(doc({ type: "paragraph" }, p(t("   ")))).error);
});

test("node, mark, dan tautan berbahaya ditolak", () => {
  // HTML mentah / node asing
  assert.ok(rapikanDokumen(doc({ type: "html", content: [t("<script>")] })).error);
  assert.ok(rapikanDokumen(doc({ type: "image", attrs: { src: "x" } })).error);
  assert.ok(rapikanDokumen(doc({ type: "heading", attrs: { level: 1 }, content: [t("H")] })).error);
  // node di tempat yang salah
  assert.ok(rapikanDokumen(doc(t("teks langsung di doc"))).error);
  assert.ok(rapikanDokumen(doc(p(p(t("p dalam p"))))).error);
  assert.ok(rapikanDokumen(doc({ type: "bulletList", content: [p(t("bukan listItem"))] })).error);
  // mark asing dan tautan berbahaya
  assert.ok(rapikanDokumen(doc(p(t("x", [{ type: "textStyle", attrs: { color: "red" } }])))).error);
  assert.ok(rapikanDokumen(doc(p(t("klik", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])))).error);
  assert.ok(rapikanDokumen(doc(p(t("klik", [{ type: "link", attrs: {} }])))).error);
  // struktur rusak
  assert.ok(rapikanDokumen(doc(p({ type: "text", text: 5 }))).error);
  assert.ok(rapikanDokumen({ type: "doc", content: "bukan array" }).error);
  assert.ok(rapikanDokumen(doc(p(t("x", "bukan array")))).error);
});

test("teks berbahaya hanya disimpan sebagai teks dan atribut asing dibuang", () => {
  const { dokumen } = rapikanDokumen(
    doc({ type: "paragraph", attrs: { onclick: "alert(1)" }, extra: 1, content: [t("<img src=x onerror=alert(1)>")] })
  );
  assert.deepEqual(dokumen.content[0], { type: "paragraph", content: [t("<img src=x onerror=alert(1)>")] });
});

test("paragraf kosong di awal dan akhir dibuang, di tengah dipertahankan", () => {
  const { dokumen } = rapikanDokumen(
    doc({ type: "paragraph" }, p(t("a")), { type: "paragraph" }, p(t("b")), { type: "paragraph" }, { type: "paragraph" })
  );
  assert.deepEqual(dokumen.content, [p(t("a")), { type: "paragraph" }, p(t("b"))]);
});

test("blok kode kosong dibuang", () => {
  const { dokumen } = rapikanDokumen(doc(p(t("Instruksi")), { type: "codeBlock", attrs: { language: null } }));
  assert.deepEqual(dokumen.content, [p(t("Instruksi"))]);
});

test("mark di dalam blok kode dibuang, NUL dihapus", () => {
  const { dokumen } = rapikanDokumen(
    doc({ type: "codeBlock", content: [t("a\u0000b", [{ type: "bold" }])] })
  );
  assert.deepEqual(dokumen.content[0], { type: "codeBlock", content: [t("ab")] });
});

test("ukuran dan kedalaman dibatasi", () => {
  assert.ok(rapikanDokumen(doc(kode("x".repeat(BATAS_SHARE.isiJsonMaks)))).error);
  let node = p(t("dalam"));
  for (let i = 0; i < BATAS_SHARE.kedalamanMaks; i++) {
    node = { type: "bulletList", content: [{ type: "listItem", content: [node] }] };
  }
  assert.ok(rapikanDokumen(doc(node)).error);
  const banyak = Array.from({ length: BATAS_SHARE.simpulMaks }, () => p(t("x")));
  assert.ok(rapikanDokumen(doc(...banyak)).error);
});
