// Gaya isi posting. Dipakai tampilan publik dan editor supaya hasilnya sama.
// Blok kode: monospace, spasi dan baris baru dipertahankan, scroll horizontal
// di dalam blok untuk baris panjang, dan teks bisa diblok manual.
export const KELAS_ISI = [
  "flex flex-col gap-3 text-base leading-relaxed break-words",
  "[&_p:empty]:min-h-[1lh]",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_li>p]:my-0",
  "[&_li_ul]:mt-1 [&_li_ol]:mt-1",
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a]:break-all",
  "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-secondary [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.9em]",
  "[&_pre]:overflow-x-auto [&_pre]:overflow-y-hidden [&_pre]:rounded-lg [&_pre]:bg-[#16063c] [&_pre]:p-4 [&_pre]:text-[#f4efff]",
  "[&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-6 [&_pre]:whitespace-pre [&_pre]:[tab-size:2]",
  "[&_pre]:select-text [&_pre_*]:selection:bg-[#ffb900] [&_pre_*]:selection:text-[#16063c]",
  "[&_pre_code]:whitespace-pre [&_pre_code]:break-normal",
].join(" ");
