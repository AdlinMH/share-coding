"use client";

import { useId, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { tambahPosting, ubahPosting } from "@/app/posting-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BATAS_SHARE } from "@/lib/dokumen";
import { kabari } from "./pesan-status";

// Editor dimuat terpisah dan hanya di browser, saat dialog dibuka.
const EditorIsi = dynamic(() => import("./editor-isi"), {
  ssr: false,
  loading: () => (
    <p className="rounded-lg border px-3 py-10 text-center text-sm text-muted-foreground">
      Memuat editor...
    </p>
  ),
});

// Dialog tambah/edit posting. posting = null untuk posting baru.
export function DialogPosting({ terbuka, onOpenChange, posting }) {
  return (
    <Dialog open={terbuka} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{posting ? "Edit posting" : "Tambah posting"}</DialogTitle>
          <DialogDescription>
            Untuk kode atau perintah, pilih <strong>Blok kode</strong> lalu tempel kodenya.
          </DialogDescription>
        </DialogHeader>
        {terbuka && <FormPosting posting={posting} selesai={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FormPosting({ posting, selesai }) {
  const idJudul = useId();
  const idLabelIsi = useId();
  const [judul, setJudul] = useState(posting?.title ?? "");
  const [isi, setIsi] = useState(posting?.content ?? null);
  const [galat, setGalat] = useState("");
  const [sedangSimpan, startTransition] = useTransition();
  const sedangJalan = useRef(false); // penjaga klik ganda

  function simpan(event) {
    event.preventDefault();
    if (sedangJalan.current) return;
    if (judul.trim().length === 0) {
      setGalat("Judul tidak boleh kosong.");
      return;
    }
    if (!isi) {
      setGalat("Isi posting tidak boleh kosong.");
      return;
    }

    setGalat("");
    sedangJalan.current = true;
    // Salin sebagai JSON biasa: atribut dari ProseMirror memakai objek tanpa prototype,
    // yang tidak bisa dikirim apa adanya ke Server Action.
    const isiKirim = JSON.parse(JSON.stringify(isi));
    startTransition(async () => {
      try {
        const hasil = posting
          ? await ubahPosting(posting.id, judul, isiKirim)
          : await tambahPosting(judul, isiKirim);
        if (hasil?.ok) {
          selesai();
          kabari(posting ? "Perubahan disimpan." : "Posting ditambahkan.");
        } else {
          setGalat(hasil?.error || "Gagal menyimpan. Coba lagi.");
        }
      } catch {
        setGalat("Koneksi bermasalah. Posting belum tersimpan, coba lagi.");
      } finally {
        sedangJalan.current = false;
      }
    });
  }

  return (
    <form onSubmit={simpan} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={idJudul}>Judul</Label>
        <Input
          id={idJudul}
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="Contoh: Tahap 2 · Buat komponen Logo"
          maxLength={BATAS_SHARE.judulMaks}
          disabled={sedangSimpan}
          className="h-10"
          autoComplete="off"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span id={idLabelIsi} className="text-sm font-medium">
          Isi
        </span>
        <EditorIsi awal={posting?.content} onChange={setIsi} idLabel={idLabelIsi} disabled={sedangSimpan} />
      </div>

      <p role="alert" className="min-h-5 text-sm text-destructive">
        {galat}
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" onClick={selesai} disabled={sedangSimpan}>
          Batal
        </Button>
        <Button type="submit" size="lg" disabled={sedangSimpan}>
          {sedangSimpan ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
