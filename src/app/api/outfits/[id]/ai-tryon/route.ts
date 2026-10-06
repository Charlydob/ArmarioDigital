import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTryOnInputHash } from "@/lib/tryon/hash";
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

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (process.env.AI_TRYON_ENABLED !== "true")
    return NextResponse.json({ error: "La generación IA aún no está configurada" }, { status: 503 });
  if (!process.env.RUNPOD_API_KEY || !process.env.RUNPOD_ENDPOINT_ID)
    return NextResponse.json({ error: "RunPod no está configurado" }, { status: 503 });
  const outfit = await db.outfit.findFirst({
    where: { id, ownerId: user.id },
    include: { pose: { include: { normalizedMedia: true } }, items: { include: { garment: { include: { processedMedia: true } } } } },
  });
  if (!outfit?.pose) return NextResponse.json({ error: "El conjunto necesita una pose" }, { status: 400 });
  const supported = outfit.items.filter((item) => item.zone === "TORSO" || item.zone === "LEGS");
  if (!supported.length) return NextResponse.json({ error: "Añade un top o una prenda inferior" }, { status: 400 });
  const inputHash = createTryOnInputHash({
    poseMediaId: outfit.pose.normalizedMedia.id,
    garments: supported.map((item) => ({
      mediaId: item.garment.processedMedia.id,
      zone: item.zone,
      layerOrder: item.layerOrder,
      x: item.x,
      y: item.y,
      scaleX: item.scaleX,
      scaleY: item.scaleY,
      rotation: item.rotation,
    })),
  });
  const cached = await db.aiTryOnJob.findFirst({
    where: { userId: user.id, inputHash, status: "COMPLETED", resultMediaId: { not: null } },
    orderBy: { completedAt: "desc" },
  });
  if (cached) return NextResponse.json({ cached: true, job: cached });
  const active = await db.aiTryOnJob.findFirst({
    where: { userId: user.id, inputHash, status: { in: ["QUEUED", "PROCESSING"] } },
  });
  if (active) return NextResponse.json({ cached: false, job: active });
  let job = await db.aiTryOnJob.create({ data: { userId: user.id, outfitId: id, provider: "runpod-fashn-vton-1.5", inputHash } });
  const first = supported.sort((a, b) => a.layerOrder - b.layerOrder)[0];
  try {
    const submission = await new RunPodTryOnProvider().submit({
      personImage: await readMedia(outfit.pose.normalizedMedia.path),
      garmentImage: await readMedia(first.garment.processedMedia.path),
      category: first.zone === "TORSO" ? "tops" : "bottoms",
    });
    job = await db.aiTryOnJob.update({ where: { id: job.id }, data: { status: "PROCESSING", providerJobId: submission.providerJobId } });
  } catch (error) {
    job = await db.aiTryOnJob.update({ where: { id: job.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "No se pudo iniciar RunPod", completedAt: new Date() } });
    return NextResponse.json({ error: job.error, job }, { status: 502 });
  }
  return NextResponse.json({ cached: false, job }, { status: 202 });
}
