import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { garmentSchema } from "@/lib/validation";
import { removeMedia, saveImage, saveThumbnail } from "@/lib/storage";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const garment = await db.garment.findFirst({
    where: { id, ownerId: user.id },
    include: {
      originalMedia: true,
      processedMedia: true,
      thumbnailMedia: true,
      placements: { include: { pose: { include: { normalizedMedia: true } } } },
      outfitItems: {
        include: { outfit: { include: { previewMedia: true } } },
        distinct: ["outfitId"],
      },
    },
  });
  return garment
    ? NextResponse.json(garment)
    : NextResponse.json({ error: "Prenda no encontrada" }, { status: 404 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const existing = await db.garment.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!existing)
    return NextResponse.json(
      { error: "Prenda no encontrada" },
      { status: 404 },
    );
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    const parsed = garmentSchema.partial().safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
    return NextResponse.json(
      await db.garment.update({ where: { id }, data: parsed.data }),
    );
  }
  const form = await request.formData();
  const parsed = garmentSchema.safeParse({
    name: form.get("name"),
    brand: form.get("brand") || undefined,
    notes: form.get("notes") || undefined,
    zone: form.get("zone"),
    subtype: form.get("subtype"),
    status: form.get("status"),
  });
  if (!parsed.success)
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  const originalFile = form.get("original");
  const processedFile = form.get("processed");
  const newOriginal =
    originalFile instanceof File
      ? await saveImage(user.id, originalFile)
      : null;
  const newProcessed =
    processedFile instanceof File
      ? await saveImage(user.id, processedFile)
      : null;
  const newThumb = newProcessed
    ? await saveThumbnail(user.id, newProcessed.path)
    : null;
  let placements: Array<Record<string, number | string>> | null = null;
  if (form.has("placements")) {
    try {
      placements = JSON.parse(String(form.get("placements")));
    } catch {
      return NextResponse.json(
        { error: "Placements no válidos" },
        { status: 400 },
      );
    }
  }
  if (placements) {
    const poseIds = placements.map((p) => String(p.poseId));
    if (
      (await db.pose.count({
        where: { ownerId: user.id, id: { in: poseIds } },
      })) !== new Set(poseIds).size
    )
      return NextResponse.json({ error: "Pose no válida" }, { status: 403 });
  }
  const old = await db.garment.findUnique({
    where: { id },
    include: {
      originalMedia: true,
      processedMedia: true,
      thumbnailMedia: true,
    },
  });
  const updated = await db.$transaction(async (tx) => {
    if (placements)
      await tx.garmentPosePlacement.deleteMany({ where: { garmentId: id } });
    return tx.garment.update({
      where: { id },
      data: {
        ...parsed.data,
        tags: String(form.get("tags") || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 30),
        ...(newOriginal ? { originalMediaId: newOriginal.id } : {}),
        ...(newProcessed ? { processedMediaId: newProcessed.id } : {}),
        ...(newThumb ? { thumbnailMediaId: newThumb.id } : {}),
        ...(placements
          ? {
              placements: {
                create: placements.map((p) => ({
                  poseId: String(p.poseId),
                  x: Number(p.x),
                  y: Number(p.y),
                  scaleX: Number(p.scaleX),
                  scaleY: Number(p.scaleY),
                  rotation: Number(p.rotation || 0),
                  opacity: Number(p.opacity || 1),
                })),
              },
            }
          : {}),
      },
      include: { placements: true },
    });
  });
  const replaced = [
    [newOriginal, old?.originalMedia],
    [newProcessed, old?.processedMedia],
    [newThumb, old?.thumbnailMedia],
  ] as const;
  for (const [fresh, previous] of replaced)
    if (fresh && previous) {
      await db.media
        .delete({ where: { id: previous.id } })
        .catch(() => undefined);
      await removeMedia(previous.path);
    }
  return NextResponse.json(updated);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const garment = await db.garment.findFirst({
    where: { id, ownerId: user.id },
    include: {
      _count: { select: { outfitItems: true } },
      originalMedia: true,
      processedMedia: true,
      thumbnailMedia: true,
    },
  });
  if (!garment)
    return NextResponse.json(
      { error: "Prenda no encontrada" },
      { status: 404 },
    );
  if (garment._count.outfitItems)
    return NextResponse.json(
      {
        error: `Esta prenda se usa en ${garment._count.outfitItems} conjunto(s). Quítala de ellos primero.`,
      },
      { status: 409 },
    );
  const mediaIds = [
    garment.originalMediaId,
    garment.processedMediaId,
    garment.thumbnailMediaId,
  ].filter(Boolean) as string[];
  await db.$transaction([
    db.garment.delete({ where: { id } }),
    db.media.deleteMany({ where: { id: { in: mediaIds } } }),
  ]);
  await Promise.all([
    removeMedia(garment.originalMedia.path),
    removeMedia(garment.processedMedia.path),
    removeMedia(garment.thumbnailMedia?.path),
  ]);
  return NextResponse.json({ ok: true });
}
