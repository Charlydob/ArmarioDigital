import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readMedia } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser().catch(() => null);
  if (!user) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const media = await db.media.findFirst({ where: { id, ownerId: user.id } });
  if (!media) return new Response("No encontrado", { status: 404 });
  const body = await readMedia(media.path).catch(() => null);
  if (!body) return new Response("No encontrado", { status: 404 });
  return new Response(body, { headers: { "Content-Type": media.mime, "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
