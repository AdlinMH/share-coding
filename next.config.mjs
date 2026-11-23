/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  cacheComponents: true,
  // Sembunyikan badge Next.js (mis. "Cache disabled") saat npm run dev.
  // Error kompilasi/runtime tetap ditampilkan.
  devIndicators: false,
  partialPrefetching: true,
  turbopack: {
    // Pakai folder proyek ini sebagai root (bukan folder induk).
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
