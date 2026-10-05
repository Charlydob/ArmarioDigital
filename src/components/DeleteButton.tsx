"use client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ endpoint, label = "Eliminar", compact = false }: { endpoint: string; label?: string; compact?: boolean }) {
  const router=useRouter(); const [busy,setBusy]=useState(false);
  const remove=async()=>{ if(!confirm("¿Seguro que quieres eliminarlo?"))return; setBusy(true); const res=await fetch(endpoint,{method:"DELETE"}); const body=await res.json(); if(!res.ok) alert(body.error||"No se pudo eliminar"); else router.refresh(); setBusy(false); };
  return <button className={`btn btn-danger ${compact?"btn-icon":""}`} onClick={remove} disabled={busy}><Trash2 size={17}/>{!compact&&label}</button>;
}
