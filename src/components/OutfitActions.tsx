"use client";
import Link from "next/link";
import { Copy, Edit3, Ellipsis, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OutfitActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  async function duplicate() {
    setBusy(true);
    const response = await fetch(`/api/outfits/${id}/duplicate`, {
      method: "POST",
    });
    if (response.ok) {
      const copy = await response.json();
      router.push(`/conjuntos/${copy.id}`);
      router.refresh();
    } else setBusy(false);
  }
  async function remove() {
    setBusy(true);
    const response = await fetch(`/api/outfits/${id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/conjuntos");
      router.refresh();
    } else {
      setBusy(false);
      alert("No se pudo eliminar");
    }
  }
  return (
    <>
      <div className="toolbar">
        <Link className="btn btn-primary" href={`/probar?edit=${id}`}>
          <Edit3 size={16} />
          Editar
        </Link>
        <div className="menu-wrap">
          <button className="icon-btn" onClick={() => setMenu(!menu)}>
            <Ellipsis />
          </button>
          {menu && (
            <div className="action-menu">
              <button disabled={busy} onClick={() => void duplicate()}>
                <Copy />
                Duplicar
              </button>
              <button
                className="danger"
                onClick={() => {
                  setConfirming(true);
                  setMenu(false);
                }}
              >
                <Trash2 />
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
      {confirming && (
        <div className="sheet-backdrop">
          <section className="bottom-sheet confirm-sheet">
            <div className="sheet-head">
              <h2>Eliminar conjunto</h2>
              <button className="icon-btn" onClick={() => setConfirming(false)}>
                <X />
              </button>
            </div>
            <p className="subtle">
              Se borrará este estilismo y su vista previa.
            </p>
            <div className="toolbar spread">
              <button
                className="btn btn-ghost"
                onClick={() => setConfirming(false)}
              >
                Cancelar
              </button>
              <button
                className="btn danger-solid"
                disabled={busy}
                onClick={() => void remove()}
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
