"use client";
import { Heart } from "lucide-react";
import { useState } from "react";

export type FavoriteKind = "garment" | "pose" | "outfit";
export default function FavoriteButton({ kind, id, favorite, onChange }: {
  kind: FavoriteKind; id: string; favorite: boolean; onChange?: (value: boolean) => void;
}) {
  const [value, setValue] = useState(favorite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shown = onChange ? favorite : value;
  return <button type="button" className={`favorite-button ${shown ? "is-favorite" : ""}`} aria-label={`${shown ? "Quitar de" : "Marcar como"} favoritos`} aria-pressed={shown} disabled={busy} title={error || "Favorito"} onClick={async (event) => {
    event.preventDefault(); event.stopPropagation();
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/favorites/${kind}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite: !shown }) });
      if (!response.ok) throw new Error("No se pudo guardar el favorito");
      setValue(!shown); onChange?.(!shown);
    } catch { setError("No se pudo guardar. Inténtalo de nuevo"); }
    finally { setBusy(false); }
  }}><Heart size={17} fill={shown ? "currentColor" : "none"}/>{error && <span role="alert" className="favorite-error">{error}</span>}</button>;
}
