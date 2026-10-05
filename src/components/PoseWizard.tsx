"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Move,
  RotateCcw,
  Save,
} from "lucide-react";
import Link from "next/link";

export default function PoseWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [t, setT] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  function choose(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Elige una imagen");
      return;
    }
    setFile(f);
    setUrl(URL.createObjectURL(f));
    setStep(2);
  }
  function down(e: React.PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, ox: t.x, oy: t.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    setT((v) => ({
      ...v,
      x: drag.current!.ox + e.clientX - drag.current!.x,
      y: drag.current!.oy + e.clientY - drag.current!.y,
    }));
  }
  function up() {
    drag.current = null;
  }
  async function save() {
    if (!file || !name.trim()) return;
    setBusy(true);
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e9e4df";
    ctx.fillRect(0, 0, 900, 1200);
    const base = Math.min(900 / img.width, 1200 / img.height);
    const w = img.width * base * t.scale,
      h = img.height * base * t.scale;
    ctx.save();
    ctx.translate(450 + t.x * 2, 600 + t.y * 2);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/webp", 0.92),
    );
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("original", file);
    fd.set("normalized", new File([blob], "pose.webp", { type: "image/webp" }));
    Object.entries(t).forEach(([k, v]) => fd.set(k, String(v)));
    const res = await fetch("/api/poses", { method: "POST", body: fd });
    if (res.ok) {
      router.push("/poses");
      router.refresh();
    } else {
      alert((await res.json()).error || "No se pudo guardar");
      setBusy(false);
    }
  }
  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow">Nueva pose</div>
          <h1>{step === 1 ? "Elige una foto" : "Alinea tu figura"}</h1>
          <p className="subtle">
            {step === 1
              ? "Mejor de cuerpo entero, con luz uniforme."
              : "Ajusta la foto a las guías. Podrás usarla con todas tus prendas."}
          </p>
        </div>
        <Link href="/poses" className="btn btn-ghost">
          <ArrowLeft size={18} />
          Volver
        </Link>
      </header>
      <div className="card" style={{ padding: 24 }}>
        <div className="steps">
          <i className="step on" />
          <i className={`step ${step >= 2 ? "on" : ""}`} />
          <i className={`step ${step >= 3 ? "on" : ""}`} />
        </div>
        {step === 1 && (
          <label className="drop">
            <ImagePlus size={45} />
            <h2 style={{ marginTop: 15 }}>Sube tu foto</h2>
            <p className="subtle">JPG, PNG o WebP · máximo 15 MB</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => choose(e.target.files?.[0])}
            />
            <span className="btn btn-primary">Seleccionar foto</span>
          </label>
        )}
        {step === 2 && (
          <>
            <div
              className="pose-stage"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
            >
              <img
                src={url}
                alt="Tu pose"
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: `translate(calc(-50% + ${t.x}px),calc(-50% + ${t.y}px)) scale(${t.scale}) rotate(${t.rotation}deg)`,
                }}
              />
              {[
                [9, "Cabeza"],
                [23, "Hombros"],
                [40, "Torso"],
                [54, "Cadera"],
                [77, "Piernas"],
                [95, "Pies"],
              ].map(([top, label]) => (
                <div className="guide" key={label} style={{ top: `${top}%` }}>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ maxWidth: 520, margin: "20px auto" }}>
              <div className="range-row">
                <span>Escala</span>
                <input
                  type="range"
                  min=".5"
                  max="2"
                  step=".01"
                  value={t.scale}
                  onChange={(e) => setT({ ...t, scale: +e.target.value })}
                />
                <b>{t.scale.toFixed(2)}</b>
              </div>
              <div className="range-row">
                <span>Rotación</span>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step=".5"
                  value={t.rotation}
                  onChange={(e) => setT({ ...t, rotation: +e.target.value })}
                />
                <b>{t.rotation}°</b>
              </div>
              <div className="toolbar" style={{ justifyContent: "center" }}>
                <span className="subtle">
                  <Move size={16} /> Arrastra la foto para moverla
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => setT({ x: 0, y: 0, scale: 1, rotation: 0 })}
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>
                  Continuar
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
        {step === 3 && (
          <div style={{ maxWidth: 500, margin: "40px auto" }}>
            <div className="pose-stage" style={{ width: 240 }}>
              <img
                src={url}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: `translate(calc(-50% + ${t.x / 2}px),calc(-50% + ${t.y / 2}px)) scale(${t.scale}) rotate(${t.rotation}deg)`,
                }}
              />
            </div>
            <label className="label" style={{ marginTop: 22 }}>
              Nombre de la pose
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Brazos relajados"
                autoFocus
                maxLength={80}
              />
            </label>
            <div
              className="toolbar"
              style={{ marginTop: 18, justifyContent: "space-between" }}
            >
              <button className="btn btn-ghost" onClick={() => setStep(2)}>
                <ArrowLeft size={17} />
                Ajustar
              </button>
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={!name.trim() || busy}
              >
                <Save size={17} />
                {busy ? "Guardando…" : "Guardar pose"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
