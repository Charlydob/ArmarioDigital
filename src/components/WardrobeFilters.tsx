"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { subtypeLabels } from "@/lib/labels";
type G = {
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
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const shown = useMemo(
    () =>
      garments.filter(
        (g) =>
          (filter === "ALL" || g.zone === filter || g.status === filter) &&
          `${g.name} ${g.brand || ""} ${g.subtype}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [garments, filter, q],
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
      <div className="grid">
        {shown.map((g) => (
          <Link href={`/armario/${g.id}`} className="card" key={g.id}>
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
          </Link>
        ))}
      </div>
      {!shown.length && (
        <div className="empty">No hay prendas que coincidan.</div>
      )}
    </>
  );
}
