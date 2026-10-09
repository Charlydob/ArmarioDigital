"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { subtypeLabels } from "@/lib/labels";
type G = {
  favorite: boolean;
  id: string;
  name: string;
  brand: string | null;
  zone: string;
  subtype: string;
  status: string;
  mediaId: string;
};
const filters = [
  ["ALL", "Todo"],
  ["TORSO", "Torso"],
  ["LEGS", "Piernas"],
  ["FEET", "Pies"],
  ["HEAD", "Cabeza"],
  ["ACCESSORY", "Accesorios"],
  ["WISHLIST", "Wishlist"],
];
export default function WardrobeFilters({ garments }: { garments: G[] }) {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [only, setOnly] = useState(false);
  const [first, setFirst] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const shown = useMemo(
    () =>
      garments.filter(
        (g) =>
          (!only || (favorites[g.id] ?? g.favorite)) &&
          (filter === "ALL" || g.zone === filter || g.status === filter) &&
          `${g.name} ${g.brand || ""} ${g.subtype}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ).sort((a,b) => first ? Number(favorites[b.id] ?? b.favorite)-Number(favorites[a.id] ?? a.favorite) : 0),
    [garments, filter, q, favorites, only, first],
  );
  return (
    <>
      <input
        className="input"
        placeholder="Buscar por nombre, marca o tipo…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 14, maxWidth: 480 }}
      />
      <div className="filters">
        {filters.map(([v, l]) => (
          <button
            key={v}
            className={`btn ${filter === v ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(v)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="favorite-filters"><label><input type="checkbox" checked={only} onChange={e=>setOnly(e.target.checked)}/> Solo favoritos</label><label><input type="checkbox" checked={first} onChange={e=>setFirst(e.target.checked)}/> Favoritos primero</label></div>
      <div className="grid">
        {shown.map((g) => (
          <div className="favorite-card" key={g.id}><FavoriteButton kind="garment" id={g.id} favorite={favorites[g.id] ?? g.favorite} onChange={value=>setFavorites(old=>({...old,[g.id]:value}))}/><Link href={`/armario/${g.id}`} className="card">
            <div className="image-card">
              <img
                src={`/api/media/${g.mediaId}`}
                alt={g.name}
                loading="lazy"
                style={{ objectFit: "contain" }}
              />
              {g.status === "WISHLIST" && (
                <span className="pill pill-wish">
                  <Heart size={12} fill="currentColor" /> lista de deseos
                </span>
              )}
            </div>
            <div className="card-body">
              <p className="card-title">{g.name}</p>
              <span className="subtle small">
                {g.brand ? `${g.brand} · ` : ""}
                {subtypeLabels[g.subtype] || g.subtype}
              </span>
            </div>
          </Link></div>
        ))}
      </div>
      {!shown.length && (
        <div className="empty">No hay prendas que coincidan.</div>
      )}
    </>
  );
}
