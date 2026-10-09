"use client";
import { useState, type ReactNode } from "react";
import FavoriteButton, { type FavoriteKind } from "./FavoriteButton";
export default function FavoriteGrid({ kind, entries }: { kind: FavoriteKind; entries: { id: string; favorite: boolean; content: ReactNode }[] }) {
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [only, setOnly] = useState(false);
  const [first, setFirst] = useState(true);
  const favorite = (entry: typeof entries[number]) => values[entry.id] ?? entry.favorite;
  const shown = entries.filter(e => !only || favorite(e)).sort((a,b) => first ? Number(favorite(b))-Number(favorite(a)) : 0);
  return <><div className="favorite-filters"><label><input type="checkbox" checked={only} onChange={e=>setOnly(e.target.checked)}/> Solo favoritos</label><label><input type="checkbox" checked={first} onChange={e=>setFirst(e.target.checked)}/> Favoritos primero</label></div><div className="grid">{shown.map(entry=><div key={entry.id} className="favorite-card">{entry.content}<FavoriteButton kind={kind} id={entry.id} favorite={favorite(entry)} onChange={value=>setValues(old=>({...old,[entry.id]:value}))}/></div>)}</div>{!shown.length && <p className="empty">No hay favoritos.</p>}</>;
}
