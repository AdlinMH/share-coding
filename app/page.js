import { connection } from "next/server";
import { Suspense } from "react";
import { Code2 } from "lucide-react";
import { AksiPosting, TombolKeluar, TombolTambah } from "@/components/share-coding/aksi-pemilik";
import { IsiPosting } from "@/components/share-coding/isi-posting";
import { PesanStatus } from "@/components/share-coding/pesan-status";
import { TombolLogin } from "@/components/tombol-login";
import { Card, CardContent } from "@/components/ui/card";
import { cekSesiPemilik } from "@/lib/sesi";
import { konfigurasiSiap } from "@/lib/konfigurasi";
import { daftarPosting } from "@/lib/share-coding";
import { formatTanggal } from "@/lib/tanggal";

export const metadata = {
  title: "Share Coding",
  description: "Kode, perintah terminal, dan langkah praktik dari pemateri.",
};

// Halaman publik untuk berbagi kode per langkah praktik.
// Siswa cukup membuka / tanpa PIN atau akun.
export default function ShareCoding() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="mt-4 flex items-center justify-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
          <Code2 className="size-8 text-primary" aria-hidden="true" />
          Share Coding
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-base text-muted-foreground">
          Kode dan langkah praktik dari pemateri. Blok kodenya dengan mouse, lalu salin
          dengan <kbd className="rounded border bg-card px-1 font-mono text-sm">Ctrl</kbd>+
          <kbd className="rounded border bg-card px-1 font-mono text-sm">C</kbd>.
        </p>
      </header>

      {/* Bagian ini membaca cookie dan database, jadi dimuat saat request. */}
      <Suspense fallback={<Memuat />}>
        <Isi />
      </Suspense>
    </div>
  );
}

async function Isi() {
  // Tandai bagian ini selalu dibuat ulang per request (tidak di-cache).
  await connection();

  if (!konfigurasiSiap()) {
    return (
      <>
        <BelumDikonfigurasi />
        <footer className="mt-12 flex justify-center border-t pt-4">
          <TombolLogin siap={false} />
        </footer>
      </>
    );
  }

  let pemilik = false;
  let daftar = [];
  try {
    [pemilik, daftar] = await Promise.all([cekSesiPemilik(), daftarPosting()]);
  } catch (e) {
    console.error(e.message);
    return <Gangguan />;
  }

  return (
    <>
      <main className="flex flex-col gap-4">
        {pemilik && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
            <div>
              <p className="text-lg font-semibold">Mode pemilik</p>
              <p className="text-sm text-muted-foreground">
                Posting baru tampil paling bawah. Siswa perlu memuat ulang halaman.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TombolTambah />
              <TombolKeluar />
            </div>
          </div>
        )}

        {daftar.length === 0 ? (
          <Kosong pemilik={pemilik} />
        ) : (
          <ol className="flex flex-col gap-4" aria-label="Daftar posting">
            {daftar.map((posting) => (
              <li key={posting.id} className="min-w-0">
                <Card className="min-w-0">
                  <CardContent className="flex min-w-0 flex-col gap-3">
                    <h2 className="text-lg leading-snug font-semibold break-words">{posting.title}</h2>
                    <IsiPosting dokumen={posting.content} />
                    <p className="text-sm text-muted-foreground">
                      Dibuat {formatTanggal(posting.created_at)}
                      {posting.updated_at !== posting.created_at &&
                        ` · diubah ${formatTanggal(posting.updated_at)}`}
                    </p>
                    {pemilik && <AksiPosting posting={posting} />}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </main>

      <footer className="mt-12 flex flex-wrap justify-center gap-2 border-t pt-4 text-sm text-muted-foreground">
        {!pemilik && <TombolLogin label="Masuk sebagai pemilik" />}
      </footer>

      {pemilik && <PesanStatus />}
    </>
  );
}

function Kosong({ pemilik }) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
      <Code2 className="mx-auto mb-3 size-10 text-primary" aria-hidden="true" />
      <p className="font-semibold">Belum ada posting.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {pemilik
          ? "Klik Tambah posting untuk membagikan langkah pertama."
          : "Kode dari pemateri akan muncul di sini. Muat ulang halaman sebentar lagi."}
      </p>
    </div>
  );
}

function Memuat() {
  return (
    <p role="status" className="py-10 text-center text-muted-foreground">
      Memuat...
    </p>
  );
}

function Gangguan() {
  return (
    <div role="alert" className="rounded-xl border bg-card p-6 text-center">
      <p className="font-semibold">Halaman belum bisa dimuat.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Coba muat ulang halaman beberapa saat lagi.
      </p>
    </div>
  );
}

function BelumDikonfigurasi() {
  return (
    <main className="rounded-xl border bg-card p-6 text-center" role="status">
      <h2 className="text-lg font-semibold">Website sedang disiapkan.</h2>
      <p className="mt-2 text-muted-foreground">Posting akan tersedia setelah penyiapan selesai.</p>
    </main>
  );
}
