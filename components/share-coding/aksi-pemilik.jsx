"use client";

import { useRef, useState, useTransition } from "react";
import { LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { logout } from "@/app/actions";
import { hapusPosting } from "@/app/posting-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DialogPosting } from "./form-posting";
import { kabari } from "./pesan-status";

// Komponen di file ini hanya dirender jika sesi pemilik valid.
// Server tetap memeriksa sesi lagi pada setiap aksi.

export function TombolTambah() {
  const [terbuka, setTerbuka] = useState(false);
  return (
    <>
      <Button size="lg" onClick={() => setTerbuka(true)}>
        <Plus aria-hidden="true" />
        Tambah posting
      </Button>
      <DialogPosting terbuka={terbuka} onOpenChange={setTerbuka} posting={null} />
    </>
  );
}

export function TombolKeluar() {
  const [sedangKeluar, startTransition] = useTransition();
  const [galat, setGalat] = useState("");
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        disabled={sedangKeluar}
        onClick={() => {
          setGalat("");
          startTransition(async () => {
            try {
              await logout();
            } catch {
              setGalat("Koneksi bermasalah. Coba keluar lagi.");
            }
          });
        }}
      >
        <LogOut aria-hidden="true" />
        {sedangKeluar ? "Keluar..." : "Keluar"}
      </Button>
      {galat && (
        <p role="alert" className="w-full text-sm text-destructive">
          {galat}
        </p>
      )}
    </>
  );
}

export function AksiPosting({ posting }) {
  const [editTerbuka, setEditTerbuka] = useState(false);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [galat, setGalat] = useState("");
  const [sedangHapus, startTransition] = useTransition();
  const sedangJalan = useRef(false); // penjaga klik ganda

  function hapus() {
    if (sedangJalan.current) return;
    sedangJalan.current = true;
    setKonfirmasiHapus(false);
    setGalat("");
    startTransition(async () => {
      try {
        const hasil = await hapusPosting(posting.id);
        if (hasil?.ok) {
          kabari("Posting dihapus.");
        } else {
          setGalat(hasil?.error || "Gagal menghapus. Coba lagi.");
        }
      } catch {
        setGalat("Koneksi bermasalah. Posting belum dihapus.");
      } finally {
        sedangJalan.current = false;
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setEditTerbuka(true)} disabled={sedangHapus}>
          <Pencil aria-hidden="true" />
          Edit
        </Button>
        <Button
          variant="destructive"
          className="ml-auto"
          onClick={() => setKonfirmasiHapus(true)}
          disabled={sedangHapus}
        >
          <Trash2 aria-hidden="true" />
          {sedangHapus ? "Menghapus..." : "Hapus"}
        </Button>
      </div>
      {galat && (
        <p role="alert" className="text-sm text-destructive">
          {galat}
        </p>
      )}

      <DialogPosting terbuka={editTerbuka} onOpenChange={setEditTerbuka} posting={posting} />

      <AlertDialog open={konfirmasiHapus} onOpenChange={setKonfirmasiHapus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus posting ini?</AlertDialogTitle>
            <AlertDialogDescription>
              “{posting.title}” akan dihapus permanen dan hilang dari halaman siswa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={hapus}>
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
