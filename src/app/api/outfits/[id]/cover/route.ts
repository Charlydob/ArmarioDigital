import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body?.mode !== "real" && body?.mode !== "virtual")
    return NextResponse.json({ error: "Portada no válida" }, { status: 400 });
  const outfit = await db.outfit.findFirst({ where: { id, ownerId: user.id } });
  if (!outfit) return NextResponse.json({ error: "Conjunto no encontrado" }, { status: 404 });
  if (body.mode === "real" && !outfit.realPhotoMediaId)
    return NextResponse.json({ error: "Este conjunto no tiene foto real" }, { status: 400 });
  if (body.mode === "virtual" && !outfit.previewMediaId)
    return NextResponse.json({ error: "Este conjunto no tiene preview virtual" }, { status: 400 });
  await db.outfit.update({ where: { id }, data: { preferRealPhoto: body.mode === "real" } });
  return NextResponse.json({ ok: true, mode: body.mode });
}
