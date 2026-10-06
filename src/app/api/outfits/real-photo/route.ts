import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultOutfitName } from "@/lib/outfitName";
import { saveImage } from "@/lib/storage";
import { realPhotoOutfitSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await requireUser();
  const form = await request.formData();
  const photo = form.get("photo");
  let garmentIds: unknown = [];
  try { garmentIds = JSON.parse(String(form.get("garmentIds") || "[]")); }
  catch { return NextResponse.json({ error: "Prendas no válidas" }, { status: 400 }); }
  const parsed = realPhotoOutfitSchema.safeParse({
    name: String(form.get("name") || "").trim() || undefined,
    notes: String(form.get("notes") || "").trim() || undefined,
    garmentIds,
  });
  if (!parsed.success || !(photo instanceof File))
    return NextResponse.json({ error: "Revisa la foto y los datos" }, { status: 400 });
  const uniqueIds = [...new Set(parsed.data.garmentIds)];
  const garments = await db.garment.findMany({
    where: { ownerId: user.id, id: { in: uniqueIds } },
    select: { id: true, zone: true },
  });
  if (garments.length !== uniqueIds.length)
    return NextResponse.json({ error: "Alguna prenda no es válida" }, { status: 403 });
  const media = await saveImage(user.id, photo);
  const outfit = await db.outfit.create({
    data: {
      ownerId: user.id,
      name: parsed.data.name || defaultOutfitName(),
      notes: parsed.data.notes,
      realPhotoMediaId: media.id,
      items: {
        create: garments.map((garment, layerOrder) => ({
          garmentId: garment.id,
          zone: garment.zone,
          layerOrder,
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
        })),
      },
    },
  });
  return NextResponse.json(outfit, { status: 201 });
}
