// Format tanggal Indonesia (WIB), sama di server dan browser.
const format = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function formatTanggal(nilai) {
  if (!nilai) return "";
  return `${format.format(new Date(nilai))} WIB`;
}
