import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeMedia, saveImage } from "@/lib/storage";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const outfit = await db.outfit.findFirst({ where: { id, ownerId: user.id }, include: { realPhotoMedia: true } });
  if (!outfit) return NextResponse.json({ error: "Conjunto no encontrado" }, { status: 404 });
  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) return NextResponse.json({ error: "Selecciona una foto" }, { status: 400 });
  const media = await saveImage(user.id, photo);
  await db.outfit.update({ where: { id }, data: { realPhotoMediaId: media.id, preferRealPhoto: true } });
  if (outfit.realPhotoMedia) {
    await db.media.delete({ where: { id: outfit.realPhotoMedia.id } }).catch(() => undefined);
    await removeMedia(outfit.realPhotoMedia.path);
  }
  return NextResponse.json({ id, realPhotoMediaId: media.id });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const outfit = await db.outfit.findFirst({ where: { id, ownerId: user.id }, include: { realPhotoMedia: true } });
  if (!outfit) return NextResponse.json({ error: "Conjunto no encontrado" }, { status: 404 });
  await db.outfit.update({ where: { id }, data: { realPhotoMediaId: null, preferRealPhoto: false } });
  if (outfit.realPhotoMedia) {
    await db.media.delete({ where: { id: outfit.realPhotoMedia.id } }).catch(() => undefined);
    await removeMedia(outfit.realPhotoMedia.path);
  }
  return NextResponse.json({ ok: true });
}
