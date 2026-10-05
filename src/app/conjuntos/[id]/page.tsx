import { notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import OutfitActions from "@/components/OutfitActions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { zoneLabels } from "@/lib/labels";

const zoneOrder: Record<string, number> = {
  HEAD: 0,
  TORSO: 1,
  ACCESSORY: 2,
  LEGS: 3,
  FEET: 4,
};
export default async function OutfitDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const outfit = await db.outfit.findFirst({
    where: { id, ownerId: user.id },
    include: {
      previewMedia: true,
      pose: true,
      items: {
        include: {
          garment: { include: { thumbnailMedia: true, processedMedia: true } },
        },
      },
    },
  });
  if (!outfit) notFound();
  const items = [...outfit.items].sort(
    (a, b) =>
      zoneOrder[a.zone] - zoneOrder[b.zone] || a.layerOrder - b.layerOrder,
  );
  return (
    <AppShell>
      <header className="page-head compact-head">
        <div>
          <div className="eyebrow">Ficha de estilismo</div>
          <h1>{outfit.name}</h1>
          <p className="subtle">
            {outfit.pose.name} · {outfit.items.length} prendas
          </p>
        </div>
        <OutfitActions id={outfit.id} />
      </header>
      <section className="outfit-spatial">
        <div className="detail-preview card">
          {outfit.previewMedia ? (
            <img
              src={`/api/media/${outfit.previewMedia.id}`}
              alt={outfit.name}
            />
          ) : (
            <div className="empty">Sin vista previa</div>
          )}
        </div>
        <div className="spatial-items">
          {items.map((item, index) => (
            <Link
              href={`/armario/${item.garmentId}`}
              className={`spatial-item side-${index % 2}`}
              key={item.id}
            >
              <img
                src={`/api/media/${item.garment.thumbnailMedia?.id || item.garment.processedMedia.id}`}
                alt=""
              />
              <span>
                <b>{item.garment.name}</b>
                <small>{zoneLabels[item.zone]}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <div className="section-head">
        <h2>Prendas del conjunto</h2>
      </div>
      <div className="outfit-items-strip">
        {items.map((item) => (
          <Link
            href={`/armario/${item.garmentId}`}
            className="card"
            key={item.id}
          >
            <img
              src={`/api/media/${item.garment.thumbnailMedia?.id || item.garment.processedMedia.id}`}
              alt=""
            />
            <span>{item.garment.name}</span>
          </Link>
        ))}
      </div>
      {outfit.notes && (
        <div className="card card-body notes-card">
          <div className="eyebrow">Notas</div>
          <p>{outfit.notes}</p>
        </div>
      )}
    </AppShell>
  );
}
