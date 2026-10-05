import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeMedia, saveImage } from "@/lib/storage";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const pose = await db.pose.findFirst({
    where: { id, ownerId: user.id },
    include: {
      originalMedia: true,
      normalizedMedia: true,
      _count: { select: { outfits: true, placements: true } },
    },
  });
  return pose
    ? NextResponse.json(pose)
    : NextResponse.json({ error: "Pose no encontrada" }, { status: 404 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const pose = await db.pose.findFirst({
    where: { id, ownerId: user.id },
    include: { normalizedMedia: true },
  });
  if (!pose)
    return NextResponse.json({ error: "Pose no encontrada" }, { status: 404 });
  const form = await request.formData();
  const normalized = form.get("normalized");
  let anchors: Record<string, number>;
  try {
    anchors = JSON.parse(String(form.get("anchors") || "{}"));
  } catch {
    return NextResponse.json({ error: "Guías no válidas" }, { status: 400 });
  }
  const media =
    normalized instanceof File ? await saveImage(user.id, normalized) : null;
  const updated = await db.pose.update({
    where: { id },
    data: {
      name: String(form.get("name") || pose.name)
        .trim()
        .slice(0, 80),
      x: Number(form.get("x") ?? pose.x),
      y: Number(form.get("y") ?? pose.y),
      scale: Number(form.get("scale") ?? pose.scale),
      rotation: Number(form.get("rotation") ?? pose.rotation),
      anchors,
      ...(media ? { normalizedMediaId: media.id } : {}),
    },
  });
  if (media) {
    await db.media
      .delete({ where: { id: pose.normalizedMediaId } })
      .catch(() => undefined);
    await removeMedia(pose.normalizedMedia.path);
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const pose = await db.pose.findFirst({
    where: { id, ownerId: user.id },
    include: {
      _count: { select: { outfits: true } },
      originalMedia: true,
      normalizedMedia: true,
    },
  });
  if (!pose)
    return NextResponse.json({ error: "Pose no encontrada" }, { status: 404 });
  if (pose._count.outfits)
    return NextResponse.json(
      {
        error: `Esta pose se usa en ${pose._count.outfits} conjunto(s). Edítalos o elimínalos primero.`,
      },
      { status: 409 },
    );
  await db.$transaction([
    db.pose.delete({ where: { id } }),
    db.media.deleteMany({
      where: { id: { in: [pose.originalMediaId, pose.normalizedMediaId] } },
    }),
  ]);
  await Promise.all([
    removeMedia(pose.originalMedia.path),
    removeMedia(pose.normalizedMedia.path),
  ]);
  return NextResponse.json({ ok: true });
}
