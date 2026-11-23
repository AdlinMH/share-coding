"use client";

// Editor rich text untuk isi posting (Tiptap). Hanya dimuat untuk pemilik,
// lewat next/dynamic di form-posting.jsx, jadi daftar publik tidak memuatnya.

import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Code2, Link2, List, ListOrdered, Pilcrow, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { urlAman } from "@/lib/dokumen";
import { cn } from "@/lib/utils";
import { KELAS_ISI } from "./gaya-isi";

const EKSTENSI = [
  StarterKit.configure({
    // Hanya format yang diizinkan server (lib/dokumen.js).
    heading: false,
    blockquote: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    codeBlock: { enableTabIndentation: true, tabSize: 2, defaultLanguage: null },
    link: {
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: "https",
      protocols: [],
      isAllowedUri: (url) => urlAman(url) !== null,
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
  }),
];

export default function EditorIsi({ awal, onChange, idLabel, disabled }) {
  const editor = useEditor({
    extensions: EKSTENSI,
    content: awal ?? "",
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        "aria-labelledby": idLabel,
        "aria-multiline": "true",
        role: "textbox",
        class: cn(
          KELAS_ISI,
          "min-h-48 max-h-[55dvh] overflow-y-auto rounded-b-lg px-3 py-3 outline-none"
        ),
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? null : e.getJSON()),
  });

  // Kunci editor selama menyimpan.
  useEffect(() => {
    if (editor && editor.isEditable === Boolean(disabled)) editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <p className="rounded-lg border px-3 py-10 text-center text-sm text-muted-foreground">
        Memuat editor...
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <Toolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, disabled }) {
  const [bukaTautan, setBukaTautan] = useState(false);
  const [alamat, setAlamat] = useState("");
  const [galat, setGalat] = useState("");

  const aktif = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      paragraf: e.isActive("paragraph") && !e.isActive("bulletList") && !e.isActive("orderedList"),
      daftar: e.isActive("bulletList"),
      angka: e.isActive("orderedList"),
      kode: e.isActive("codeBlock"),
      tautan: e.isActive("link"),
    }),
  });

  function rantai() {
    return editor.chain().focus();
  }

  function mulaiTautan() {
    setAlamat(editor.getAttributes("link").href ?? "");
    setGalat("");
    setBukaTautan(true);
  }

  // Bukan <form>: editor ini berada di dalam form posting (form tidak boleh bersarang).
  function pasangTautan() {
    const href = urlAman(alamat);
    if (!href) {
      setGalat("Tautan harus diawali http:// atau https://.");
      return;
    }
    const { empty } = editor.state.selection;
    if (empty && !editor.isActive("link")) {
      // Tidak ada teks yang dipilih: sisipkan alamatnya sebagai teks tautan.
      rantai()
        .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
        .run();
    } else {
      rantai().extendMarkRange("link").setLink({ href }).run();
    }
    setBukaTautan(false);
  }

  const tombol = [
    { label: "Paragraf", ikon: Pilcrow, aktif: aktif.paragraf, jalan: () => rantai().clearNodes().setParagraph().run() },
    { label: "Daftar", ikon: List, aktif: aktif.daftar, jalan: () => rantai().toggleBulletList().run() },
    { label: "Daftar angka", ikon: ListOrdered, aktif: aktif.angka, jalan: () => rantai().toggleOrderedList().run() },
    { label: "Tautan", ikon: Link2, aktif: aktif.tautan, jalan: mulaiTautan },
    { label: "Blok kode", ikon: Code2, aktif: aktif.kode, jalan: () => rantai().toggleCodeBlock().run() },
  ];

  return (
    <div className="border-b bg-muted/50 px-1.5 py-1.5">
      <div role="toolbar" aria-label="Format isi" className="flex flex-wrap gap-1">
        {tombol.map(({ label, ikon: Ikon, aktif: nyala, jalan }) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant={nyala ? "secondary" : "ghost"}
            aria-pressed={nyala}
            // Jangan ambil fokus dari editor, supaya kursor tetap di posisi yang sama.
            onMouseDown={(e) => e.preventDefault()}
            onClick={jalan}
            disabled={disabled}
          >
            <Ikon aria-hidden="true" />
            {label}
          </Button>
        ))}
        {aktif.tautan && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => rantai().extendMarkRange("link").unsetLink().run()}
            disabled={disabled}
          >
            <Unlink aria-hidden="true" />
            Lepas tautan
          </Button>
        )}
      </div>

      {bukaTautan && (
        <div className="mt-1.5 flex flex-col gap-1.5 px-1 pb-1">
          <div className="flex gap-1.5">
            <Input
              type="url"
              inputMode="url"
              aria-label="Alamat tautan"
              placeholder="https://..."
              value={alamat}
              onChange={(e) => {
                setAlamat(e.target.value);
                setGalat("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  pasangTautan();
                }
              }}
              aria-invalid={galat ? true : undefined}
              autoFocus
            />
            <Button type="button" size="sm" className="h-8" onClick={pasangTautan}>
              Pasang
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setBukaTautan(false)}>
              Batal
            </Button>
          </div>
          {galat && <p className="text-sm text-destructive">{galat}</p>}
        </div>
      )}
    </div>
  );
}
