import Link from "next/link";
import { Plus, Shirt } from "lucide-react";
import AppShell from "@/components/AppShell";
import WardrobeFilters from "@/components/WardrobeFilters";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function WardrobePage(){const user=await requireUser();const garments=await db.garment.findMany({where:{ownerId:user.id},include:{thumbnailMedia:true,processedMedia:true},orderBy:{updatedAt:"desc"}});return <AppShell><header className="page-head"><div><div className="eyebrow">Tu colección</div><h1>Armario</h1><p className="subtle">Lo que tienes y lo que te gustaría tener.</p></div><Link href="/armario/nueva" className="btn btn-primary"><Plus size={18}/><span className="btn-label-hide">Añadir prenda</span></Link></header>{garments.length?<WardrobeFilters garments={garments.map(g=>({id:g.id,favorite:g.favorite,name:g.name,brand:g.brand,zone:g.zone,subtype:g.subtype,status:g.status,mediaId:g.thumbnailMedia?.id||g.processedMedia.id}))}/>:<div className="empty"><Shirt/><h2>Tu armario está esperando</h2><p>Añade una captura o una foto de tu primera prenda.</p><Link className="btn btn-primary" href="/armario/nueva">Añadir prenda</Link></div>}</AppShell>}
