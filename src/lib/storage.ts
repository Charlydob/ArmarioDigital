import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/lib/db";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const root = () => path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_PATH || path.join(process.cwd(), "data"));

export async function saveImage(ownerId: string, input: File | Buffer, mime?: string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(await input.arrayBuffer());
  const type = mime || (input instanceof File ? input.type : "image/png");
  if (!allowed.has(type)) throw new Error("Formato de imagen no permitido");
  if (buffer.length > 15 * 1024 * 1024) throw new Error("La imagen supera 15 MB");
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height || meta.width > 12000 || meta.height > 12000) throw new Error("Imagen no válida");
  const ext = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
  const relative = `${ownerId}/${new Date().getFullYear()}/${randomUUID()}.${ext}`;
  const absolute = path.join(root(), relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, buffer, { flag: "wx" });
  return db.media.create({ data: { ownerId, path: relative, mime: type, size: buffer.length, width: meta.width, height: meta.height } });
}

export async function saveThumbnail(ownerId: string, mediaPath: string) {
  const source = safePath(mediaPath);
  const output = await sharp(source).resize(640, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  return saveImage(ownerId, output, "image/webp");
}

export function safePath(relative: string) {
  const base = root();
  const result = path.resolve(base, relative);
  if (!result.startsWith(base + path.sep)) throw new Error("Ruta no válida");
  return result;
}

export async function readMedia(relative: string) { return readFile(/* turbopackIgnore: true */ safePath(relative)); }
export async function removeMedia(relative?: string | null) {
  if (!relative) return;
  await unlink(safePath(relative)).catch(() => undefined);
}
