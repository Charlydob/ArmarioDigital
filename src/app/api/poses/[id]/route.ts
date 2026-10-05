import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeMedia } from "@/lib/storage";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const pose = await db.pose.findFirst({ where: { id, ownerId: user.id }, include: { _count: { select: { outfits: true } }, originalMedia: true, normalizedMedia: true } });
  if (!pose) return NextResponse.json({ error: "Pose no encontrada" }, { status: 404 });
  if (pose._count.outfits) return NextResponse.json({ error: `Esta pose se usa en ${pose._count.outfits} conjunto(s). Edítalos o elimínalos primero.` }, { status: 409 });
  await db.$transaction([db.pose.delete({ where: { id } }), db.media.deleteMany({ where: { id: { in: [pose.originalMediaId, pose.normalizedMediaId] } } })]);
  await Promise.all([removeMedia(pose.originalMedia.path), removeMedia(pose.normalizedMedia.path)]);
  return NextResponse.json({ ok: true });
}
