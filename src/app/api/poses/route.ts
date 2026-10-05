import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveImage } from "@/lib/storage";

export async function GET() {
  const user = await requireUser();
  const poses = await db.pose.findMany({
    where: { ownerId: user.id },
    include: {
      originalMedia: true,
      normalizedMedia: true,
      _count: { select: { outfits: true, placements: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(poses);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const form = await request.formData();
  const original = form.get("original");
  const normalized = form.get("normalized");
  const name = String(form.get("name") || "").trim();
  if (!(original instanceof File) || !(normalized instanceof File) || !name)
    return NextResponse.json(
      { error: "Faltan datos de la pose" },
      { status: 400 },
    );
  const [originalMedia, normalizedMedia] = await Promise.all([
    saveImage(user.id, original),
    saveImage(user.id, normalized),
  ]);
  let anchors: Record<string, number> | undefined;
  try {
    anchors = JSON.parse(String(form.get("anchors") || "null")) || undefined;
  } catch {
    return NextResponse.json({ error: "Guías no válidas" }, { status: 400 });
  }
  const pose = await db.pose.create({
    data: {
      ownerId: user.id,
      name: name.slice(0, 80),
      originalMediaId: originalMedia.id,
      normalizedMediaId: normalizedMedia.id,
      x: Number(form.get("x") || 0),
      y: Number(form.get("y") || 0),
      scale: Number(form.get("scale") || 1),
      rotation: Number(form.get("rotation") || 0),
      ...(anchors ? { anchors } : {}),
    },
  });
  return NextResponse.json(pose, { status: 201 });
}
