import AppShell from "@/components/AppShell";
import OutfitBuilderLoader from "@/components/OutfitBuilderLoader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAnchors } from "@/lib/labels";

export default async function TryPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireUser();
  const { edit } = await searchParams;
  const [poses, garments, outfit] = await Promise.all([
    db.pose.findMany({
      where: { ownerId: user.id },
      include: { normalizedMedia: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.garment.findMany({
      where: { ownerId: user.id },
      include: { processedMedia: true, thumbnailMedia: true, placements: true },
      orderBy: { updatedAt: "desc" },
    }),
    edit
      ? db.outfit.findFirst({
          where: { id: edit, ownerId: user.id },
          include: { items: true },
        })
      : null,
  ]);
  const data = {
    poses: poses.map((p) => ({
      id: p.id,
      name: p.name,
      mediaId: p.normalizedMedia.id,
      anchors: parseAnchors(p.anchors),
    })),
    garments: garments.map((g) => ({
      id: g.id,
      name: g.name,
      brand: g.brand,
      subtype: g.subtype,
      zone: g.zone,
      status: g.status,
      mediaId: g.processedMedia.id,
      thumbId: g.thumbnailMedia?.id || g.processedMedia.id,
      placements: g.placements,
    })),
    outfit: outfit
      ? {
          id: outfit.id,
          name: outfit.name,
          notes: outfit.notes || "",
          poseId: outfit.poseId,
          items: outfit.items,
        }
      : null,
  };
  return (
    <AppShell>
      <header className="page-head try-page-head">
        <div>
          <div className="eyebrow">Probador visual</div>
          <h1>{outfit ? "Edita tu conjunto" : "Crea un conjunto"}</h1>
          <p className="subtle">
            Desliza prendas sobre tu cuerpo y fíjalas por capas.
          </p>
        </div>
      </header>
      <OutfitBuilderLoader data={data} />
    </AppShell>
  );
}
