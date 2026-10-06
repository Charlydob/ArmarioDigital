import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readMedia, saveImage } from "@/lib/storage";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const source = await db.outfit.findFirst({ where: { id, ownerId: user.id }, include: { items: true, previewMedia: true, realPhotoMedia: true } });
  if (!source) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const preview = source.previewMedia ? await saveImage(user.id, await readMedia(source.previewMedia.path), source.previewMedia.mime) : null;
  const realPhoto = source.realPhotoMedia ? await saveImage(user.id, await readMedia(source.realPhotoMedia.path), source.realPhotoMedia.mime) : null;
  const copy = await db.outfit.create({ data: { ownerId: user.id, name: `${source.name} · copia`, notes: source.notes, poseId: source.poseId, previewMediaId: preview?.id, realPhotoMediaId: realPhoto?.id, items: { create: source.items.map(({ garmentId, zone, layerOrder, x, y, scaleX, scaleY, rotation, opacity }) => ({ garmentId, zone, layerOrder, x, y, scaleX, scaleY, rotation, opacity })) } } });
  return NextResponse.json(copy, { status: 201 });
}
