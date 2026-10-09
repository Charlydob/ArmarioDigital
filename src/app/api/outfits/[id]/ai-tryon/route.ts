import { z } from "zod";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTryOnProviderInputHash } from "@/lib/tryon/hash";
import type { TryOnInput } from "@/lib/tryon/provider";
import { RunPodTryOnProvider } from "@/lib/tryon/runpod";
import { readMedia, saveImage } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  let jobs = await db.aiTryOnJob.findMany({ where: { outfitId: id, userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 });
  const processing = jobs.find((job) => job.status === "PROCESSING" && job.providerJobId);
  if (processing && process.env.AI_TRYON_ENABLED === "true") {
    try {
      const result = await new RunPodTryOnProvider().status(processing.providerJobId!);
      if (result.status === "COMPLETED" && result.resultImage) {
        const media = await saveImage(user.id, result.resultImage, "image/png");
        await db.aiTryOnJob.update({ where: { id: processing.id }, data: { status: "COMPLETED", resultMediaId: media.id, completedAt: new Date() } });
      } else if (result.status === "FAILED") await db.aiTryOnJob.update({ where: { id: processing.id }, data: { status: "FAILED", error: result.error, completedAt: new Date() } });
      jobs = await db.aiTryOnJob.findMany({ where: { outfitId: id, userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 });
    } catch { /* a transient provider error must not destroy the queued job */ }
  }
  return NextResponse.json({ enabled: process.env.AI_TRYON_ENABLED === "true", jobs });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (process.env.AI_TRYON_ENABLED !== "true")
    return NextResponse.json({ error: "La generación IA aún no está configurada" }, { status: 503 });
  if (!process.env.RUNPOD_API_KEY || !process.env.RUNPOD_ENDPOINT_ID)
    return NextResponse.json({ error: "RunPod no está configurado" }, { status: 503 });
  const parsed = z.object({ garmentId: z.string().min(1).optional(), personSource: z.enum(["original", "processed"]).optional() }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Inputs no válidos" }, { status: 400 });
  const options = parsed.data;
  const outfit = await db.outfit.findFirst({
    where: { id, ownerId: user.id },
    include: { pose: { include: { normalizedMedia: true, originalMedia: true } }, items: { include: { garment: { include: { processedMedia: true } } } } },
  });
  if (!outfit?.pose) return NextResponse.json({ error: "El conjunto necesita una pose" }, { status: 400 });
  const supported = outfit.items.filter((item) => item.zone === "TORSO" || item.zone === "LEGS");
  if (!supported.length) return NextResponse.json({ error: "Añade un top o una prenda inferior" }, { status: 400 });
  // FASHN accepts one garment per invocation. Hash only the inputs actually sent.
  const first = options.garmentId ? supported.find(item => item.garmentId === options.garmentId) : supported.sort((a,b) => a.layerOrder - b.layerOrder)[0];
  if (!first) return NextResponse.json({ error: "Prenda no válida para este conjunto" }, { status: 400 });
  const category = first.garment.subtype === "DRESS" ? "one-pieces" : first.zone === "TORSO" ? "tops" : "bottoms";
  const personMedia = options.personSource === "original" ? outfit.pose.originalMedia : outfit.pose.normalizedMedia;
  const input: TryOnInput = {
    personImage: await readMedia(personMedia.path),
    garmentImage: await readMedia(first.garment.processedMedia.path),
    category,
  };
  const inputHash = createTryOnProviderInputHash(input, "runpod-fashn-vton-1.5");
  const cached = await db.aiTryOnJob.findFirst({
    where: { userId: user.id, inputHash, status: "COMPLETED", resultMediaId: { not: null } },
    orderBy: { completedAt: "desc" },
  });
  if (cached) {
    const job = cached.outfitId === id ? cached : await db.aiTryOnJob.create({ data: {
      userId: user.id, outfitId: id, provider: cached.provider, inputHash,
      status: "COMPLETED", resultMediaId: cached.resultMediaId, completedAt: cached.completedAt,
    } });
    return NextResponse.json({ cached: true, job });
  }
  const active = await db.aiTryOnJob.findFirst({
    where: { userId: user.id, outfitId: id, inputHash, status: { in: ["QUEUED", "PROCESSING"] } },
  });
  if (active) return NextResponse.json({ cached: false, job: active });
  let job = await db.aiTryOnJob.create({ data: { userId: user.id, outfitId: id, provider: "runpod-fashn-vton-1.5", inputHash } });
  try {
    const submission = await new RunPodTryOnProvider().submit(input);
    job = await db.aiTryOnJob.update({ where: { id: job.id }, data: { status: "PROCESSING", providerJobId: submission.providerJobId } });
  } catch (error) {
    job = await db.aiTryOnJob.update({ where: { id: job.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "No se pudo iniciar RunPod", completedAt: new Date() } });
    return NextResponse.json({ error: job.error, job }, { status: 502 });
  }
  return NextResponse.json({ cached: false, job }, { status: 202 });
}
