"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Ellipsis,
  ImageIcon,
  Save,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import BackgroundEditor from "./BackgroundEditor";
import { subtypeLabels, zoneLabels } from "@/lib/labels";

type Placement = {
  poseId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
};
type Garment = {
  id: string;
  name: string;
  brand: string;
  notes: string;
  zone: string;
  subtype: string;
  status: string;
  tags: string[];
  originalMediaId: string;
  processedMediaId: string;
  placements: Placement[];
};
type Pose = { id: string; name: string; mediaId: string };
const subtypeKeys = Object.keys(subtypeLabels);

export default function GarmentDetailEditor({
  garment,
  poses,
  outfits,
}: {
  garment: Garment;
  poses: Pose[];
  outfits: Array<{ id: string; name: string; previewMediaId: string | null }>;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [data, setData] = useState({
    name: garment.name,
    brand: garment.brand,
    notes: garment.notes,
    zone: garment.zone,
    subtype: garment.subtype,
    status: garment.status,
    tags: garment.tags.join(", "),
  });
  const [placements, setPlacements] = useState<Record<string, Placement>>(
    Object.fromEntries(garment.placements.map((item) => [item.poseId, item])),
  );
  const [selectedPose, setSelectedPose] = useState(
    garment.placements[0]?.poseId || poses[0]?.id || "",
  );
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processed, setProcessed] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState("");
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = placements[selectedPose];
  const pose = poses.find((item) => item.id === selectedPose);

  async function originalAsFile() {
    const blob = await fetch(`/api/media/${garment.originalMediaId}`).then(
      (response) => response.blob(),
    );
    return new File([blob], "original", { type: blob.type });
  }
  function togglePose(id: string) {
    setPlacements((old) => {
      const next = { ...old };
      if (next[id]) delete next[id];
      else
        next[id] = {
          poseId: id,
          x: 450,
          y: 600,
          scaleX: 0.55,
          scaleY: 0.55,
          rotation: 0,
          opacity: 1,
        };
      return next;
    });
    setSelectedPose(id);
  }
  function update(values: Partial<Placement>) {
    if (current)
      setPlacements((old) => ({
        ...old,
        [selectedPose]: { ...current, ...values },
      }));
  }
  async function save() {
    setBusy(true);
    const fd = new FormData();
    Object.entries(data).forEach(
      ([key, value]) => key !== "tags" && fd.set(key, value),
    );
    fd.set("tags", data.tags);
    fd.set("placements", JSON.stringify(Object.values(placements)));
    if (originalFile) fd.set("original", originalFile);
    if (processed)
      fd.set(
        "processed",
        new File([processed], "prenda.png", { type: "image/png" }),
      );
    const response = await fetch(`/api/garments/${garment.id}`, {
      method: "PATCH",
      body: fd,
    });
    setBusy(false);
    if (!response.ok)
      return alert((await response.json()).error || "No se pudo guardar");
    router.refresh();
  }
  async function remove() {
    setBusy(true);
    const response = await fetch(`/api/garments/${garment.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setBusy(false);
      return alert((await response.json()).error);
    }
    router.push("/armario");
    router.refresh();
  }

  return (
    <>
      <header className="page-head compact-head">
        <div>
          <div className="eyebrow">Detalle de prenda</div>
          <h1>{garment.name}</h1>
        </div>
        <div className="toolbar">
          <Link href="/armario" className="btn btn-ghost">
            <ArrowLeft size={16} />
            Volver
          </Link>
          <div className="menu-wrap">
            <button
              className="icon-btn"
              aria-label="Más acciones"
              onClick={() => setMenu(!menu)}
            >
              <Ellipsis />
            </button>
            {menu && (
              <div className="action-menu">
                <button
                  onClick={() => {
                    setConfirmDelete(true);
                    setMenu(false);
                  }}
                >
                  <Trash2 />
                  Eliminar prenda
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="garment-detail">
        <section className="card garment-media">
          <div className="checker">
            <img
              src={
                processedUrl ||
                `/api/media/${showOriginal ? garment.originalMediaId : garment.processedMediaId}`
              }
              alt={garment.name}
            />
          </div>
          <div className="segmented">
            <button
              className={!showOriginal ? "active" : ""}
              onClick={() => setShowOriginal(false)}
            >
              Recortada
            </button>
            <button
              className={showOriginal ? "active" : ""}
              onClick={() => setShowOriginal(true)}
            >
              Original
            </button>
          </div>
          <div className="toolbar wrap">
            <button
              className="btn btn-ghost"
              onClick={async () =>
                setEditorFile(originalFile || (await originalAsFile()))
              }
            >
              <WandSparkles size={16} />
              Reprocesar fondo
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => fileInput.current?.click()}
            >
              <ImageIcon size={16} />
              Cambiar foto
            </button>
            <input
              ref={fileInput}
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setOriginalFile(file);
                  setEditorFile(file);
                }
              }}
            />
          </div>
        </section>
        <details className="card compact-disclosure garment-form" open>
          <summary>Datos</summary>
          <div className="disclosure-body">
          <div className="form-grid fields">
            <label className="label">
              Nombre
              <input
                className="input"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </label>
            <label className="label">
              Marca
              <input
                className="input"
                value={data.brand}
                onChange={(e) => setData({ ...data, brand: e.target.value })}
              />
            </label>
            <label className="label">
              Zona
              <select
                className="input"
                value={data.zone}
                onChange={(e) => setData({ ...data, zone: e.target.value })}
              >
                {Object.entries(zoneLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Tipo
              <select
                className="input"
                value={data.subtype}
                onChange={(e) => setData({ ...data, subtype: e.target.value })}
              >
                {subtypeKeys.map((key) => (
                  <option key={key} value={key}>
                    {subtypeLabels[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Estado
              <select
                className="input"
                value={data.status}
                onChange={(e) => setData({ ...data, status: e.target.value })}
              >
                <option value="OWNED">En mi armario</option>
                <option value="WISHLIST">Lista de deseos</option>
              </select>
            </label>
            <label className="label">
              Etiquetas
              <input
                className="input"
                value={data.tags}
                onChange={(e) => setData({ ...data, tags: e.target.value })}
                placeholder="verano, oficina…"
              />
            </label>
          </div>
          <label className="label">
            Notas
            <textarea
              className="input"
              rows={3}
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </label>
          </div>
        </details>
      </div>
      {editorFile && (
        <div className="editor-modal">
          <section className="card editor-panel">
            <button
              className="icon-btn close"
              onClick={() => setEditorFile(null)}
            >
              <X />
            </button>
            <BackgroundEditor
              file={editorFile}
              onAccept={(blob, url) => {
                setProcessed(blob);
                setProcessedUrl(url);
                setShowOriginal(false);
                setEditorFile(null);
              }}
            />
          </section>
        </div>
      )}
      <details className="card compact-disclosure placement-section">
        <summary>Poses y placement</summary>
        <div className="disclosure-body">
        <div className="section-head">
          <div>
            <h2>Poses compatibles</h2>
            <p className="subtle">
              Selecciona las poses y ajusta la prenda sobre cada una.
            </p>
          </div>
        </div>
        <div className="pose-choice-row">
          {poses.map((item) => (
            <button
              key={item.id}
              className={placements[item.id] ? "selected" : ""}
              onClick={() => togglePose(item.id)}
            >
              <img src={`/api/media/${item.mediaId}`} alt="" />
              <span>{item.name}</span>
              {placements[item.id] && <Check />}
            </button>
          ))}
        </div>
        {current && pose && (
          <div className="placement-editor">
            <div className="placement-stage">
              <img src={`/api/media/${pose.mediaId}`} alt="" />
              <img
                src={processedUrl || `/api/media/${garment.processedMediaId}`}
                alt=""
                className="overlay-garment"
                style={{
                  left: `${current.x / 9}%`,
                  top: `${current.y / 12}%`,
                  width: `${current.scaleX * 100}%`,
                  opacity: current.opacity,
                  transform: `translate(-50%,-50%) scaleY(${current.scaleY / current.scaleX}) rotate(${current.rotation}deg)`,
                }}
              />
            </div>
            <div className="placement-controls">
              <label className="range-row">
                <span>Horizontal</span>
                <input
                  type="range"
                  min="0"
                  max="900"
                  value={current.x}
                  onChange={(e) => update({ x: +e.target.value })}
                />
              </label>
              <label className="range-row">
                <span>Vertical</span>
                <input
                  type="range"
                  min="0"
                  max="1200"
                  value={current.y}
                  onChange={(e) => update({ y: +e.target.value })}
                />
              </label>
              <label className="range-row">
                <span>Ancho</span>
                <input
                  type="range"
                  min=".1"
                  max="1.8"
                  step=".01"
                  value={current.scaleX}
                  onChange={(e) => update({ scaleX: +e.target.value })}
                />
              </label>
              <label className="range-row">
                <span>Alto</span>
                <input
                  type="range"
                  min=".1"
                  max="1.8"
                  step=".01"
                  value={current.scaleY}
                  onChange={(e) => update({ scaleY: +e.target.value })}
                />
              </label>
              <label className="range-row">
                <span>Giro</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={current.rotation}
                  onChange={(e) => update({ rotation: +e.target.value })}
                />
              </label>
            </div>
          </div>
        )}
        </div>
      </details>
      {outfits.length > 0 && (
        <details className="card compact-disclosure">
          <summary>Uso en conjuntos</summary>
          <div className="disclosure-body">
          <div className="section-head">
            <h2>Usada en conjuntos</h2>
          </div>
          <div className="usage-row">
            {outfits.map((outfit) => (
              <Link
                className="card"
                href={`/conjuntos/${outfit.id}`}
                key={outfit.id}
              >
                {outfit.previewMediaId && (
                  <img src={`/api/media/${outfit.previewMediaId}`} alt="" />
                )}
                <span>{outfit.name}</span>
              </Link>
            ))}
          </div>
          </div>
        </details>
      )}
      <div className="sticky-save">
        <button
          className="btn btn-primary"
          disabled={busy || !data.name.trim()}
          onClick={() => void save()}
        >
          <Save size={17} />
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
      {confirmDelete && (
        <div className="sheet-backdrop">
          <section className="bottom-sheet confirm-sheet">
            <h2>¿Eliminar {garment.name}?</h2>
            <p className="subtle">
              La imagen y sus ajustes se borrarán. No se puede deshacer.
            </p>
            <div className="toolbar spread">
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmDelete(false)}
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
