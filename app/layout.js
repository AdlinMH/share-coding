import "./globals.css";

export const metadata = {
  title: "Share Coding",
  icons: { icon: "data:," },
  description: "Kode, perintah terminal, dan langkah praktik dari pemateri.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
