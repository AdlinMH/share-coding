import { Fragment } from "react";
import { urlAman } from "@/lib/dokumen";
import { KELAS_ISI } from "./gaya-isi";

// Menampilkan dokumen posting (JSON) sebagai elemen React.
// Tidak ada HTML mentah: semua teks dirender sebagai teks, jadi kode JSX
// seperti <Logo /> tampil apa adanya. Node yang tidak dikenal diabaikan,
// dan tautan dicek ulang (hanya http/https).
// Komponen ini tidak memuat editor, jadi daftar publik tetap ringan.
export function IsiPosting({ dokumen }) {
  return <div className={KELAS_ISI}>{renderDaftar(dokumen?.content)}</div>;
}

function renderDaftar(daftar) {
  if (!Array.isArray(daftar)) return null;
  return daftar.map((node, i) => <Fragment key={i}>{renderNode(node)}</Fragment>);
}

function renderNode(node) {
  switch (node?.type) {
    case "paragraph":
      return <p>{renderDaftar(node.content)}</p>;
    case "bulletList":
      return <ul>{renderDaftar(node.content)}</ul>;
    case "orderedList":
      return (
        <ol start={Number.isInteger(node.attrs?.start) ? node.attrs.start : undefined}>
          {renderDaftar(node.content)}
        </ol>
      );
    case "listItem":
      return <li>{renderDaftar(node.content)}</li>;
    case "codeBlock":
      return (
        <pre tabIndex={0}>
          <code>{teksKode(node.content)}</code>
        </pre>
      );
    case "hardBreak":
      return <br />;
    case "text":
      return renderTeks(node);
    default:
      return null;
  }
}

// Isi blok kode digabung menjadi satu string supaya indentasi, baris baru,
// dan kutip tetap persis sama saat diblok dan disalin.
function teksKode(content) {
  if (!Array.isArray(content)) return "";
  return content.map((n) => (typeof n?.text === "string" ? n.text : "")).join("");
}

function renderTeks(node) {
  if (typeof node.text !== "string") return null;
  let hasil = node.text;
  const marks = Array.isArray(node.marks) ? node.marks : [];
  const ada = (jenis) => marks.find((m) => m?.type === jenis);

  if (ada("code")) hasil = <code>{hasil}</code>;
  if (ada("italic")) hasil = <em>{hasil}</em>;
  if (ada("bold")) hasil = <strong>{hasil}</strong>;

  const href = urlAman(ada("link")?.attrs?.href);
  if (href) {
    hasil = (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {hasil}
      </a>
    );
  }
  return hasil;
}
