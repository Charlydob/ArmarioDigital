import AppShell from "@/components/AppShell";
import RealPhotoOutfitForm from "@/components/RealPhotoOutfitForm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function NewRealPhotoOutfitPage() {
  const user = await requireUser();
  const garments = await db.garment.findMany({ where: { ownerId: user.id }, include: { thumbnailMedia: true, processedMedia: true }, orderBy: { updatedAt: "desc" } });
  return <AppShell><header className="page-head"><div><div className="eyebrow">Nuevo conjunto</div><h1>Añadir foto real</h1><p className="subtle">Guarda el look aunque todavía no tengas todas sus prendas catalogadas.</p></div></header><RealPhotoOutfitForm garments={garments.map((garment) => ({ id: garment.id, name: garment.name, zone: garment.zone, mediaId: garment.thumbnailMedia?.id || garment.processedMedia.id }))}/></AppShell>;
}
