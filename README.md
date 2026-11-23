# Share Coding

Website mandiri yang diekstrak dari fitur Share Coding pada TanyaAja!. Beranda `/` menampilkan instruksi, tautan, perintah, dan kode dalam urutan pembuatan. Siswa membaca tanpa akun dan menyalin kode secara manual. Pemateri masuk lewat PIN untuk menambah, mengedit, atau menghapus posting melalui dialog pada halaman yang sama.

## Menjalankan lokal

Gunakan Node.js 22 atau lebih baru dan npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Buka URL yang dicetak terminal. Tanpa konfigurasi, beranda menampilkan status penyiapan. Untuk mengaktifkan login dan posting:

Konfigurasi lokal saat ini menggunakan salinan `.env.local` TanyaAja! atas permintaan pengguna, termasuk GROUP_ID, PIN, dan Supabase yang sama. Gunakan **Masuk sebagai pemilik** di footer. Tidak perlu menjalankan SQL pada database yang sudah ada.

Untuk database baru, jalankan `supabase/setup.sql`, isi empat variabel server dari `.env.example`, lalu mulai ulang dev server.

Semua variabel bersifat server-only, tanpa awalan `NEXT_PUBLIC_`. Jangan commit `.env.local`. Kredensial lokal disalin dari TanyaAja! atas permintaan pengguna; posting dibaca dari tabel dan GROUP_ID yang sama, bukan diduplikasi. Perubahan `OWNER_PIN` tidak otomatis mengakhiri sesi yang sudah aktif; hapus baris `owner_sessions` untuk GROUP_ID ini jika perlu mencabut semua sesi.

## Perilaku dan batasan

- Posting tampil dari yang terlama dibuat; mengedit tidak mengubah urutan.
- Siswa memuat ulang halaman untuk melihat posting terbaru. Tidak ada realtime.
- Rich-text editor Tiptap mendukung paragraf, daftar, tautan, dan blok kode.
- Isi disimpan sebagai dokumen JSON terstruktur, divalidasi server, dan dirender tanpa HTML mentah. Tautan dibatasi HTTP/HTTPS.
- Daftar menampilkan maksimal 200 posting. Versi awal ditujukan untuk satu pemateri dan satu daftar praktik.
- Login mempertahankan PIN 4 angka dari aplikasi sumber, dengan batas percobaan tersimpan di database. Sesi berlaku 8 jam.

## Database dan akses

`supabase/setup.sql` membuat `share_coding_posts`, `owner_sessions`, `rate_limits`, fungsi rate limit, dan trigger timestamp. Tabel sesi dan RPC memakai skema TanyaAja! yang sudah tersedia. Cookie `share_coding_sesi` terpisah sehingga login browser kedua aplikasi tetap terpisah. Perubahan posting terlihat di kedua aplikasi setelah reload.

Browser mengakses data melalui server Next.js. RLS aktif tanpa policy; role `anon` dan `authenticated` tidak memiliki hak tabel maupun RPC. Server memakai secret key dan memeriksa sesi pemilik pada setiap perubahan posting. Karena secret key melewati RLS, setiap query posting dan sesi membatasi `group_id` dari environment server. `GROUP_ID` bukan pengganti database terpisah untuk pemisahan keamanan.

## Pemeriksaan

```sh
npm run lint
npm test
npm run build
```

Tes database opsional memerlukan **database uji** yang sudah menjalankan `supabase/setup.sql`, kredensialnya di `.env.local`, serta `SHARE_CODING_TEST_DB=1`:

```sh
npm run test:supabase
```

Tes ini membuat lalu menghapus posting pada dua GROUP_ID acak. Jangan aktifkan pada production atau database bersama TanyaAja!. Tanpa opt-in, tes database dilewati.

## Repository dan deployment

Repository tujuan: `git@github.com:AdlinMH/share-coding.git`. Proyek ini memiliki riwayat Git sendiri; riwayat dan remote TanyaAja! tidak disalin.

Untuk Vercel, import repository sebagai proyek Next.js dan atur empat variabel server di atas. Jalankan setup SQL pada Supabase tujuan sebelum menguji login dan CRUD. Belum ada deployment yang dilakukan oleh proses ekstraksi ini.

## Hasil verifikasi ekstraksi

- Lint, 14 tes validasi, dan build production Turbopack lulus.
- Beranda tanpa konfigurasi diperiksa di browser desktop dan HP 390px; tidak ada overflow horizontal.
- Setup SQL diuji pada PostgreSQL 16 sementara: instalasi berulang, RLS/hak akses, operasi posting, validasi dokumen, dan rate limit lulus.
- Login dan CRUD melalui aplikasi dengan Supabase sungguhan belum diverifikasi karena konfigurasi website baru belum tersedia. Tes integrasi Supabase dilewati secara eksplisit.
- Fingerprint source TanyaAja! tidak berubah selama ekstraksi.
