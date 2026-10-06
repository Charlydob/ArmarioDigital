"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { isoDate, monthGrid } from "@/lib/calendar";

type OutfitOption = { id: string; name: string; previewMediaId: string | null };
type Entry = {
  id: string;
  date: string;
  type: "PLANNED" | "WORN";
  notes: string | null;
  outfitId: string;
  outfit: OutfitOption;
};

export default function CalendarView({ outfits, initialDate = "" }: { outfits: OutfitOption[]; initialDate?: string }) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)),
  );
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState("");
  const [outfitId, setOutfitId] = useState(outfits[0]?.id || "");
  const [type, setType] = useState<"PLANNED" | "WORN">("PLANNED");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const days = useMemo(
    () => monthGrid(cursor.getUTCFullYear(), cursor.getUTCMonth()),
    [cursor],
  );
  const byDate = useMemo(
    () => new Map(entries.map((entry) => [entry.date.slice(0, 10), entry])),
    [entries],
  );
  const rangeStart = isoDate(days[0]);
  const rangeEnd = isoDate(days.at(-1)!);

  async function load() {
    const response = await fetch(
      `/api/calendar?start=${rangeStart}&end=${rangeEnd}`,
    );
    if (response.ok) setEntries(await response.json());
  }
  useEffect(() => {
    let active = true;
    fetch(`/api/calendar?start=${rangeStart}&end=${rangeEnd}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (active) setEntries(data);
      });
    return () => {
      active = false;
    };
  }, [rangeStart, rangeEnd]);
  useEffect(() => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) open(initialDate);
    // Initial deep-link only; subsequent selection is controlled locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDate]);

  function open(date: string) {
    const entry = byDate.get(date);
    setSelected(date);
    setOutfitId(entry?.outfitId || outfits[0]?.id || "");
    setType(entry?.type || "PLANNED");
    setNotes(entry?.notes || "");
  }
  async function save() {
    if (!outfitId) return;
    setBusy(true);
    const response = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selected, outfitId, type, notes }),
    });
    setBusy(false);
    if (!response.ok)
      return alert((await response.json()).error || "No se pudo guardar");
    setSelected("");
    await load();
  }
  async function remove() {
    setBusy(true);
    await fetch(`/api/calendar?date=${selected}`, { method: "DELETE" });
    setBusy(false);
    setSelected("");
    await load();
  }

  return (
    <>
      <div className="calendar-toolbar">
        <button
          className="icon-btn"
          aria-label="Mes anterior"
          onClick={() =>
            setCursor(
              new Date(
                Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1),
              ),
            )
          }
        >
          <ChevronLeft />
        </button>
        <h2>
          {new Intl.DateTimeFormat("es", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(cursor)}
        </h2>
        <button
          className="icon-btn"
          aria-label="Mes siguiente"
          onClick={() =>
            setCursor(
              new Date(
                Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
              ),
            )
          }
        >
          <ChevronRight />
        </button>
      </div>
      <div className="calendar-weekdays">
        {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
          <b key={day}>{day}</b>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const date = isoDate(day);
          const entry = byDate.get(date);
          const current = day.getUTCMonth() === cursor.getUTCMonth();
          return (
            <button
              key={date}
              className={`calendar-day ${current ? "" : "outside"} ${date === isoDate(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))) ? "today" : ""}`}
              onClick={() => open(date)}
            >
              <span>{day.getUTCDate()}</span>
              {entry && (
                <>
                  <div className="calendar-look">
                    {entry.outfit.previewMediaId ? (
                      <img
                        src={`/api/media/${entry.outfit.previewMediaId}`}
                        alt=""
                      />
                    ) : (
                      <i />
                    )}
                  </div>
                  <small>
                    {entry.type === "WORN" ? "Llevado" : "Planeado"}
                  </small>
                </>
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <div
          className="sheet-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected("");
          }}
        >
          <section className="bottom-sheet">
            <div className="sheet-head">
              <div>
                <span className="eyebrow">
                  {new Intl.DateTimeFormat("es", {
                    dateStyle: "full",
                    timeZone: "UTC",
                  }).format(new Date(`${selected}T00:00:00Z`))}
                </span>
                <h2>Planifica tu conjunto</h2>
              </div>
              <button className="icon-btn" onClick={() => setSelected("")}>
                <X />
              </button>
            </div>
            {outfits.length ? (
              <>
                <label className="label">
                  Conjunto
                  <select
                    className="input"
                    value={outfitId}
                    onChange={(e) => setOutfitId(e.target.value)}
                  >
                    {outfits.map((outfit) => (
                      <option key={outfit.id} value={outfit.id}>
                        {outfit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="segmented">
                  <button
                    className={type === "PLANNED" ? "active" : ""}
                    onClick={() => setType("PLANNED")}
                  >
                    Planificado
                  </button>
                  <button
                    className={type === "WORN" ? "active" : ""}
                    onClick={() => setType("WORN")}
                  >
                    Usado
                  </button>
                </div>
                <label className="label">
                  Notas
                  <textarea
                    className="input"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ocasión, tiempo, ideas…"
                  />
                </label>
                <div className="toolbar spread">
                  {byDate.has(selected) ? (
                    <button
                      className="btn btn-ghost danger"
                      disabled={busy}
                      onClick={() => void remove()}
                    >
                      <Trash2 size={16} />
                      Quitar
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void save()}
                  >
                    {busy ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty compact">
                <p>Crea primero un conjunto para poder planificarlo.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
