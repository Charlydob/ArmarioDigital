import Link from "next/link";
import { Camera, Images, Plus, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function OutfitsPage() {
  const user = await requireUser();
  const outfits = await db.outfit.findMany({ where: { ownerId: user.id }, include: { previewMedia: true, realPhotoMedia: true, _count: { select: { items: true } } }, orderBy: { updatedAt: "desc" } });
  return <AppShell>
    <header className="page-head"><div><div className="eyebrow">Looks guardados</div><h1>Conjuntos</h1><p className="subtle">Ideas listas para volver a probar y cambiar.</p></div><details className="create-outfit-menu"><summary className="btn btn-primary"><Plus size={18}/><span className="btn-label-hide">Añadir</span></summary><div><Link href="/probar"><Sparkles/>Crear virtualmente</Link><Link href="/conjuntos/foto-real"><Camera/>Añadir foto real</Link></div></details></header>
    {outfits.length ? <div className="grid">{outfits.map((outfit) => { const cover = outfit.realPhotoMedia || outfit.previewMedia; return <Link className="card" key={outfit.id} href={`/conjuntos/${outfit.id}`}><div className="image-card">{cover && <img src={`/api/media/${cover.id}`} alt={outfit.name} loading="lazy"/>}{outfit.realPhotoMedia && <span className="photo-badge"><Camera/>Foto real</span>}</div><div className="card-body"><p className="card-title">{outfit.name}</p><span className="subtle small">{outfit._count.items} prendas · {new Intl.DateTimeFormat("es",{day:"numeric",month:"short"}).format(outfit.updatedAt)}</span></div></Link>;})}</div> : <div className="empty"><Images/><h2>Aún no hay conjuntos</h2><p>Crea uno sobre tu pose o guarda directamente una foto real.</p><div className="toolbar"><Link className="btn btn-primary" href="/probar">Crear virtualmente</Link><Link className="btn btn-ghost" href="/conjuntos/foto-real">Añadir foto real</Link></div></div>}
  </AppShell>;
}
