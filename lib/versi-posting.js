import { createHash } from "node:crypto";

// Includes every visible id and update timestamp, so deletion is detected too.
export function versiPosting(daftar) {
  return createHash("sha256")
    .update(JSON.stringify(daftar.map(({ id, updated_at }) => [id, updated_at])))
    .digest("hex");
}
