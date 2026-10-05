import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveImage, saveThumbnail } from "@/lib/storage";
import { garmentSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const zone = url.searchParams.get("zone") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const garments = await db.garment.findMany({ where: { ownerId: user.id, ...(zone ? { zone: zone as never } : {}), ...(status ? { status: status as never } : {}) }, include: { processedMedia: true, thumbnailMedia: true, placements: true, _count: { select: { outfitItems: true } } }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(garments);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const form = await request.formData();
  const parsed = garmentSchema.safeParse({ name: form.get("name"), brand: form.get("brand") || undefined, notes: form.get("notes") || undefined, zone: form.get("zone"), subtype: form.get("subtype"), status: form.get("status") });
  const original = form.get("original");
  const processed = form.get("processed");
  if (!parsed.success || !(original instanceof File) || !(processed instanceof File)) return NextResponse.json({ error: "Revisa los datos de la prenda" }, { status: 400 });
  const [originalMedia, processedMedia] = await Promise.all([saveImage(user.id, original), saveImage(user.id, processed)]);
  const thumbnail = await saveThumbnail(user.id, processedMedia.path);
  let placements: Array<Record<string, number | string>> = [];
  try { placements = JSON.parse(String(form.get("placements") || "[]")); } catch { return NextResponse.json({ error: "Placements no válidos" }, { status: 400 }); }
  const poseIds = placements.map((p) => String(p.poseId));
  const ownedPoses = await db.pose.count({ where: { ownerId: user.id, id: { in: poseIds } } });
  if (ownedPoses !== new Set(poseIds).size) return NextResponse.json({ error: "Pose no válida" }, { status: 403 });
  const garment = await db.garment.create({ data: { ownerId: user.id, ...parsed.data, originalMediaId: originalMedia.id, processedMediaId: processedMedia.id, thumbnailMediaId: thumbnail.id, placements: { create: placements.map((p) => ({ poseId: String(p.poseId), x: Number(p.x), y: Number(p.y), scaleX: Number(p.scaleX), scaleY: Number(p.scaleY), rotation: Number(p.rotation || 0), opacity: Number(p.opacity || 1) })) } }, include: { placements: true } });
  return NextResponse.json(garment, { status: 201 });
}
