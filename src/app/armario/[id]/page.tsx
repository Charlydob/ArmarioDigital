import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import GarmentDetailEditor from "@/components/GarmentDetailEditor";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function GarmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [garment, poses] = await Promise.all([
    db.garment.findFirst({
      where: { id, ownerId: user.id },
      include: {
        placements: true,
        outfitItems: {
          select: {
            outfit: { select: { id: true, name: true, previewMediaId: true } },
          },
          distinct: ["outfitId"],
        },
      },
    }),
    db.pose.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true, normalizedMediaId: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  if (!garment) notFound();
  return (
    <AppShell>
      <GarmentDetailEditor
        garment={{
          id: garment.id,
          name: garment.name,
          brand: garment.brand || "",
          notes: garment.notes || "",
          zone: garment.zone,
          subtype: garment.subtype,
          status: garment.status,
          tags: garment.tags,
          originalMediaId: garment.originalMediaId,
          processedMediaId: garment.processedMediaId,
          placements: garment.placements,
        }}
        poses={poses.map((pose) => ({
          id: pose.id,
          name: pose.name,
          mediaId: pose.normalizedMediaId,
        }))}
        outfits={garment.outfitItems.map((item) => item.outfit)}
      />
    </AppShell>
  );
}
