"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Check, ImagePlus, Plus, Save } from "lucide-react";

type Garment = { id: string; name: string; mediaId: string; zone: string };

export default function RealPhotoOutfitForm({ garments }: { garments: Garment[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!photo) return input.current?.click();
    setBusy(true);
    const form = new FormData();
    form.set("photo", photo);
    form.set("name", name);
    form.set("garmentIds", JSON.stringify(selected));
    const response = await fetch("/api/outfits/real-photo", { method: "POST", body: form });
    setBusy(false);
    if (!response.ok) return alert((await response.json()).error || "No se pudo guardar");
    const outfit = await response.json();
    router.push(`/conjuntos/${outfit.id}`);
    router.refresh();
  }
  return (
    <div className="real-photo-flow">
      <section className="card real-photo-uploader">
        <button className="real-photo-pick" onClick={() => input.current?.click()}>
          {photoUrl ? <img src={photoUrl} alt="Foto real del conjunto" /> : <><ImagePlus /><b>Subir foto real</b><span>Una foto llevando el conjunto</span></>}
        </button>
        <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
          const next = event.target.files?.[0];
          if (!next) return;
          if (photoUrl) URL.revokeObjectURL(photoUrl);
          setPhoto(next);
          setPhotoUrl(URL.createObjectURL(next));
        }} />
        <label className="label compact-field">Nombre opcional<input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Se genera automáticamente" maxLength={80} /></label>
      </section>
      <section className="card card-body">
        <div className="section-head"><div><h2>Prendas que aparecen</h2><p className="subtle">Selecciona todas las que reconozcas. Puedes continuar sin completar la lista.</p></div></div>
        <div className="photo-garment-grid">
          {garments.map((garment) => {
            const active = selected.includes(garment.id);
            return <button type="button" className={active ? "selected" : ""} key={garment.id} onClick={() => setSelected((old) => active ? old.filter((id) => id !== garment.id) : [...old, garment.id])}>
              <img src={`/api/media/${garment.mediaId}`} alt="" /><span>{garment.name}</span>{active && <Check />}
            </button>;
          })}
        </div>
        <Link className="btn btn-ghost" href="/armario/nueva"><Plus size={16}/>Añadir prenda</Link>
      </section>
      <div className="sticky-save"><button className="btn btn-primary" disabled={busy || !photo} onClick={() => void save()}><Save size={17}/>{busy ? "Guardando…" : "Guardar conjunto"}</button></div>
    </div>
  );
}
