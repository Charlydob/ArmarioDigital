"use client";

import Link from "next/link";
import { CalendarDays, Check, X } from "lucide-react";
import { useState } from "react";

function localIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function OutfitAgendaAction({ outfitId }: { outfitId: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(localIsoDate);
  const [type, setType] = useState<"PLANNED" | "WORN">("PLANNED");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    const response = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, outfitId, type }),
    });
    setBusy(false);
    if (!response.ok)
      return alert((await response.json()).error || "No se pudo añadir a la agenda");
    setSaved(true);
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={() => { setSaved(false); setOpen(true); }}>
        <CalendarDays size={16} />
        Añadir a agenda
      </button>
      {open && (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="bottom-sheet confirm-sheet">
            <div className="sheet-head">
              <div><span className="eyebrow">Agenda</span><h2>Asignar este look</h2></div>
              <button className="icon-btn" aria-label="Cerrar" onClick={() => setOpen(false)}><X /></button>
            </div>
            {saved ? (
              <div className="agenda-success">
                <Check />
                <b>Look añadido</b>
                <p className="subtle">La fecha ya aparece en Agenda e Inicio.</p>
                <Link className="btn btn-primary" href={`/calendario?date=${date}`}>Abrir Agenda</Link>
              </div>
            ) : (
              <>
                <label className="label">Fecha<input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
                <label className="label">Tipo<select className="input" value={type} onChange={(event) => setType(event.target.value as "PLANNED" | "WORN")}><option value="PLANNED">Planificado</option><option value="WORN">Usado</option></select></label>
                <button className="btn btn-primary" disabled={busy || !date} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar en Agenda"}</button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
