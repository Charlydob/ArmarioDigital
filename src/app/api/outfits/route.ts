import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveImage } from "@/lib/storage";
import { outfitSchema } from "@/lib/validation";
import { normalizeLayers } from "@/lib/editor";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(await db.outfit.findMany({ where: { ownerId: user.id }, include: { previewMedia: true, realPhotoMedia: true, pose: { include: { normalizedMedia: true } }, items: { include: { garment: { include: { thumbnailMedia: true, processedMedia: true } } }, orderBy: { layerOrder: "asc" } }, _count: { select: { items: true } } }, orderBy: { updatedAt: "desc" } }));
}

export async function POST(request: Request) {
  const user = await requireUser();
  const form = await request.formData();
  let payload: unknown;
  try { payload = JSON.parse(String(form.get("data"))); } catch { return NextResponse.json({ error: "Datos no válidos" }, { status: 400 }); }
  const parsed = outfitSchema.safeParse(payload);
  const preview = form.get("preview");
  if (!parsed.success || !(preview instanceof File)) return NextResponse.json({ error: "Revisa el conjunto" }, { status: 400 });
  const pose = parsed.data.poseId ? await db.pose.findFirst({ where: { id: parsed.data.poseId, ownerId: user.id } }) : null;
  const validGarments = await db.garment.count({ where: { ownerId: user.id, id: { in: parsed.data.items.map((i) => i.garmentId) } } });
  if ((parsed.data.poseId && !pose) || validGarments !== new Set(parsed.data.items.map((i) => i.garmentId)).size) return NextResponse.json({ error: "Pose o prenda no válida" }, { status: 403 });
  const media = await saveImage(user.id, preview);
  const data = parsed.data;
  const outfit = await db.outfit.create({ data: { ownerId: user.id, name: data.name, notes: data.notes, poseId: data.poseId, previewMediaId: media.id, items: { create: normalizeLayers(data.items) } }, include: { items: true } });
  return NextResponse.json(outfit, { status: 201 });
}
