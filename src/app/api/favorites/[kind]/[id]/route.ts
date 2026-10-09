import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const expectedOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
  if (request.headers.get("origin") && expectedOrigin !== request.headers.get("origin"))
    return NextResponse.json({ error: "Origen no válido" }, { status: 403 });
  const { kind, id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.favorite !== "boolean") return NextResponse.json({ error: "Favorito no válido" }, { status: 400 });
  const args = { where: { id, ownerId: user.id }, data: { favorite: body.favorite as boolean } };
  const result = kind === "garment" ? await db.garment.updateMany(args)
    : kind === "pose" ? await db.pose.updateMany(args)
    : kind === "outfit" ? await db.outfit.updateMany(args) : null;
  if (!result?.count) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ favorite: body.favorite });
}
