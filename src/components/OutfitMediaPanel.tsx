"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OutfitMediaPanel({ id, name, virtualMediaId, realPhotoMediaId }: { id: string; name: string; virtualMediaId: string | null; realPhotoMediaId: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"real" | "virtual">(realPhotoMediaId ? "real" : "virtual");
  const [busy, setBusy] = useState(false);
  const mediaId = mode === "real" ? realPhotoMediaId : virtualMediaId;
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    const form = new FormData(); form.set("photo", file);
    const response = await fetch(`/api/outfits/${id}/real-photo`, { method: "POST", body: form });
    setBusy(false);
    if (!response.ok) return alert((await response.json()).error || "No se pudo guardar");
    setMode("real"); router.refresh();
  }
  async function remove() {
    setBusy(true);
    const response = await fetch(`/api/outfits/${id}/real-photo`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) return alert("No se pudo eliminar la foto");
    setMode("virtual"); router.refresh();
  }
  return <div className="detail-preview card outfit-media-panel">
    {realPhotoMediaId && virtualMediaId && <div className="segmented media-switch"><button className={mode === "real" ? "active" : ""} onClick={() => setMode("real")}>Foto real</button><button className={mode === "virtual" ? "active" : ""} onClick={() => setMode("virtual")}>Preview virtual</button></div>}
    {mediaId ? <img src={`/api/media/${mediaId}`} alt={name}/> : <div className="empty">Sin vista previa</div>}
    <div className="media-actions"><button className="btn btn-ghost" disabled={busy} onClick={() => input.current?.click()}><Camera size={16}/>{realPhotoMediaId ? "Reemplazar foto real" : "Añadir foto real"}</button>{realPhotoMediaId && <button className="icon-btn danger" disabled={busy} aria-label="Eliminar foto real" onClick={() => void remove()}><Trash2/></button>}</div>
    <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])}/>
  </div>;
}
