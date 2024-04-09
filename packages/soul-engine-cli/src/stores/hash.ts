import { createHash } from "node:crypto";

export const hashContent = (data: string | Buffer) => {
  const hash = createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}
