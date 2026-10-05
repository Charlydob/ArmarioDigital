"use client";
import Link from "next/link";
import { Copy,Edit3,Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function OutfitActions({id}:{id:string}){const router=useRouter();const[busy,setBusy]=useState(false);async function duplicate(){setBusy(true);const r=await fetch(`/api/outfits/${id}/duplicate`,{method:"POST"});if(r.ok){const x=await r.json();router.push(`/conjuntos/${x.id}`);router.refresh()}else setBusy(false)}async function remove(){if(!confirm("¿Eliminar este conjunto?"))return;setBusy(true);const r=await fetch(`/api/outfits/${id}`,{method:"DELETE"});if(r.ok){router.push("/conjuntos");router.refresh()}else setBusy(false)}return <div className="toolbar"><Link className="btn btn-primary" href={`/probar?edit=${id}`}><Edit3 size={17}/>Editar</Link><button className="btn btn-ghost" onClick={duplicate} disabled={busy}><Copy size={17}/>Duplicar</button><button className="btn btn-danger" onClick={remove} disabled={busy}><Trash2 size={17}/>Eliminar</button></div>}
