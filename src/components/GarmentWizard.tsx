"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Save } from "lucide-react";
import BackgroundEditor from "./BackgroundEditor";
import { zoneCrop } from "@/lib/editor";

type Pose = { id: string; name: string; mediaId: string };
type Placement = {
  poseId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
};
const subtypes = [
  "TOP",
  "TSHIRT",
  "SHIRT",
  "KNIT",
  "SWEATSHIRT",
  "JACKET",
  "COAT",
  "DRESS",
  "PANTS",
  "SKIRT",
  "SOCKS",
  "SHOES",
  "HAT",
  "GLASSES",
  "BAG",
  "SCARF",
  "JEWELRY",
  "OTHER",
];
export default function GarmentWizard({ poses }: { poses: Pose[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [processed, setProcessed] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState("");
  const [data, setData] = useState({
    name: "",
    brand: "",
    notes: "",
    zone: "TORSO",
    subtype: "TSHIRT",
    status: "OWNED",
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [placements, setPlacements] = useState<Record<string, Placement>>({});
  const [poseIndex, setPoseIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  function choose(f?: File) {
    if (!f) return;
    setFile(f);
    setOriginalUrl(URL.createObjectURL(f));
    setStep(2);
  }
  function accept(blob: Blob, url: string) {
    setProcessed(blob);
    setProcessedUrl(url);
    setStep(3);
  }
  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }
  function prepare() {
    const next = { ...placements };
    selected.forEach(
      (id) =>
        (next[id] ??= {
          poseId: id,
          x: 450,
          y: 600,
          scaleX: 0.55,
          scaleY: 0.55,
          rotation: 0,
          opacity: 1,
        }),
    );
    setPlacements(next);
    setPoseIndex(0);
    setStep(5);
  }
  const current = placements[selected[poseIndex]];
  function update(p: Partial<Placement>) {
    if (!current) return;
    setPlacements((v) => ({ ...v, [current.poseId]: { ...current, ...p } }));
  }
  function down(e: React.PointerEvent) {
    if (!current) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: current.x, oy: current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    update({
      x: drag.current.ox + (e.clientX - drag.current.x) * 2,
      y: drag.current.oy + (e.clientY - drag.current.y) * 2,
    });
  }
  async function save() {
    if (!file || !processed) return;
    setBusy(true);
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.set(k, v));
    fd.set("original", file);
    fd.set(
      "processed",
      new File([processed], "prenda.png", { type: "image/png" }),
    );
    fd.set("placements", JSON.stringify(selected.map((id) => placements[id])));
    const res = await fetch("/api/garments", { method: "POST", body: fd });
    if (res.ok) {
      router.push("/armario");
      router.refresh();
    } else {
      alert((await res.json()).error || "No se pudo guardar");
      setBusy(false);
    }
  }
  const pose = poses.find((p) => p.id === selected[poseIndex]);
  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow">Nueva prenda · {step} de 5</div>
          <h1>
            {
              [
                "",
                "Sube una imagen",
                "Quita el fondo",
                "Cuéntanos qué es",
                "Elige poses",
                "Ajusta la prenda",
              ][step]
            }
          </h1>
        </div>
        <Link href="/armario" className="btn btn-ghost">
          <ArrowLeft size={18} />
          Salir
        </Link>
      </header>
      <div className="card" style={{ padding: 24 }}>
        <div className="steps">
          {[1, 2, 3, 4, 5].map((n) => (
            <i key={n} className={`step ${step >= n ? "on" : ""}`} />
          ))}
        </div>
        {step === 1 && (
          <label className="drop">
            <ImagePlus size={45} />
            <h2 style={{ marginTop: 15 }}>Foto o captura de la prenda</h2>
            <p className="subtle">
              Busca un fondo sencillo para obtener mejor resultado.
            </p>
            <input
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => choose(e.target.files?.[0])}
            />
            <span className="btn btn-primary">Seleccionar imagen</span>
          </label>
        )}
        {step === 2 && file && (
          <BackgroundEditor file={file} onAccept={accept} />
        )}{" "}
        {step === 3 && (
          <div style={{ maxWidth: 700, margin: "auto" }}>
            <div className="form-grid">
              <div className="image-card card">
                <img
                  src={processedUrl || originalUrl}
                  alt=""
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <label className="label">
                  Nombre
                  <input
                    className="input"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    placeholder="Ej. Jersey crema"
                  />
                </label>
                <label className="label">
                  Zona
                  <select
                    className="select"
                    value={data.zone}
                    onChange={(e) => setData({ ...data, zone: e.target.value })}
                  >
                    <option value="HEAD">Cabeza</option>
                    <option value="TORSO">Torso</option>
                    <option value="LEGS">Piernas</option>
                    <option value="FEET">Pies</option>
                    <option value="ACCESSORY">Accesorio</option>
                  </select>
                </label>
                <label className="label">
                  Tipo
                  <select
                    className="select"
                    value={data.subtype}
                    onChange={(e) =>
                      setData({ ...data, subtype: e.target.value })
                    }
                  >
                    {subtypes.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="label">
                  Marca (opcional)
                  <input
                    className="input"
                    value={data.brand}
                    onChange={(e) =>
                      setData({ ...data, brand: e.target.value })
                    }
                  />
                </label>
                <label className="label">
                  Estado
                  <select
                    className="select"
                    value={data.status}
                    onChange={(e) =>
                      setData({ ...data, status: e.target.value })
                    }
                  >
                    <option value="OWNED">En mi armario</option>
                    <option value="WISHLIST">Wishlist</option>
                  </select>
                </label>
                <label className="label">
                  Notas
                  <textarea
                    className="textarea"
                    value={data.notes}
                    onChange={(e) =>
                      setData({ ...data, notes: e.target.value })
                    }
                  />
                </label>
                <button
                  className="btn btn-primary"
                  disabled={!data.name.trim()}
                  onClick={() => setStep(4)}
                >
                  Elegir poses
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <p className="subtle">
              Selecciona una o varias poses compatibles. Mostramos el recorte de{" "}
              <b>{data.zone.toLowerCase()}</b> para comparar mejor.
            </p>
            {poses.length ? (
              <div className="grid">
                {poses.map((p) => (
                  <button
                    key={p.id}
                    className="card"
                    onClick={() => toggle(p.id)}
                    style={{
                      border: selected.includes(p.id)
                        ? "3px solid #7a3f49"
                        : "1px solid #e7dfd8",
                      padding: 0,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div className="crop-pose">
                      <img
                        src={`/api/media/${p.mediaId}`}
                        alt={p.name}
                        style={{ objectPosition: zoneCrop[data.zone] }}
                      />
                    </div>
                    <div
                      className="card-body toolbar"
                      style={{ justifyContent: "space-between" }}
                    >
                      <b>{p.name}</b>
                      {selected.includes(p.id) && <Check color="#7a3f49" />}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="danger-note">
                Aún no hay poses. Puedes guardar la prenda sin placement y
                configurarlo después desde un conjunto.
              </div>
            )}
            <div
              className="toolbar"
              style={{ justifyContent: "flex-end", marginTop: 20 }}
            >
              <button
                className="btn btn-primary"
                onClick={selected.length ? prepare : () => setStep(5)}
              >
                {selected.length ? "Ajustar sobre pose" : "Continuar sin pose"}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
        {step === 5 && selected.length > 0 && pose && current && (
          <div>
            <div
              className="pose-stage"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={() => (drag.current = null)}
            >
              <img
                src={`/api/media/${pose.mediaId}`}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: "translate(-50%,-50%)",
                }}
              />
              <img
                src={processedUrl}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: `${(current.x / 900) * 100}%`,
                  top: `${(current.y / 1200) * 100}%`,
                  width: `${current.scaleX * 100}%`,
                  height: "auto",
                  opacity: current.opacity,
                  transform: `translate(-50%,-50%) scaleY(${current.scaleY / current.scaleX}) rotate(${current.rotation}deg)`,
                  pointerEvents: "none",
                }}
              />
            </div>
            <div style={{ maxWidth: 560, margin: "18px auto" }}>
              <div className="range-row">
                <span>Ancho</span>
                <input
                  type="range"
                  min=".1"
                  max="1.8"
                  step=".01"
                  value={current.scaleX}
                  onChange={(e) => update({ scaleX: +e.target.value })}
                />
                <b>{current.scaleX.toFixed(2)}</b>
              </div>
              <div className="range-row">
                <span>Alto</span>
                <input
                  type="range"
                  min=".1"
                  max="1.8"
                  step=".01"
                  value={current.scaleY}
                  onChange={(e) => update({ scaleY: +e.target.value })}
                />
                <b>{current.scaleY.toFixed(2)}</b>
              </div>
              <div className="range-row">
                <span>Giro</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={current.rotation}
                  onChange={(e) => update({ rotation: +e.target.value })}
                />
                <b>{current.rotation}°</b>
              </div>
              <div className="range-row">
                <span>Opacidad</span>
                <input
                  type="range"
                  min=".2"
                  max="1"
                  step=".05"
                  value={current.opacity}
                  onChange={(e) => update({ opacity: +e.target.value })}
                />
                <b>{Math.round(current.opacity * 100)}%</b>
              </div>
              <div
                className="toolbar"
                style={{ justifyContent: "space-between" }}
              >
                <button
                  className="btn btn-ghost"
                  disabled={poseIndex === 0}
                  onClick={() => setPoseIndex((i) => i - 1)}
                >
                  Anterior
                </button>
                {poseIndex < selected.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setPoseIndex((i) => i + 1)}
                  >
                    Siguiente pose
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={save}
                    disabled={busy}
                  >
                    <Save size={17} />
                    {busy ? "Guardando…" : "Guardar prenda"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {step === 5 && !selected.length && (
          <div className="empty">
            <h2>Todo listo</h2>
            <p>La prenda se podrá posicionar libremente dentro del probador.</p>
            <button className="btn btn-primary" onClick={save} disabled={busy}>
              <Save size={17} />
              {busy ? "Guardando…" : "Guardar prenda"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
