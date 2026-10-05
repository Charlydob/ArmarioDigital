import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import AppShell from "@/components/AppShell";
import DeleteButton from "@/components/DeleteButton";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PosesPage(){const user=await requireUser();const poses=await db.pose.findMany({where:{ownerId:user.id},include:{normalizedMedia:true,_count:{select:{outfits:true,placements:true}}},orderBy:{updatedAt:"desc"}});return <AppShell><header className="page-head"><div><div className="eyebrow">Tu figura</div><h1>Poses</h1><p className="subtle">Fotos alineadas para que cada prenda encaje mejor.</p></div><Link href="/poses/nueva" className="btn btn-primary"><Plus size={18}/><span className="btn-label-hide">Nueva pose</span></Link></header>{poses.length?<div className="grid">{poses.map(p=><article className="card" key={p.id}><div className="image-card"><img src={`/api/media/${p.normalizedMedia.id}`} alt={p.name} loading="lazy" style={{objectFit:"contain"}}/></div><div className="card-body"><div className="toolbar" style={{justifyContent:"space-between"}}><div><p className="card-title">{p.name}</p><span className="subtle" style={{fontSize:12}}>{p._count.placements} prendas · {p._count.outfits} conjuntos</span></div><DeleteButton endpoint={`/api/poses/${p.id}`} compact/></div></div></article>)}</div>:<div className="empty"><UserRound/><h2>Añade tu primera pose</h2><p>Usa una foto de cuerpo entero con buena luz.</p><Link className="btn btn-primary" href="/poses/nueva">Empezar</Link></div>}</AppShell>}
