import { metadataPosting } from "@/lib/share-coding";
import { versiPosting } from "@/lib/versi-posting";

// Public metadata only. Database credentials and GROUP_ID stay on the server.
export async function GET(request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const version = versiPosting(await metadataPosting());
    headers.ETag = `"${version}"`;
    if (request.headers.get("if-none-match") === headers.ETag) {
      return new Response(null, { status: 304, headers });
    }
    return Response.json({ version }, { headers });
  } catch (error) {
    console.error("Gagal memeriksa pembaruan:", error.message);
    return Response.json({ error: "Pembaruan belum tersedia." }, { status: 503, headers });
  }
}
