"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Move,
  RotateCcw,
  Save,
} from "lucide-react";
import { defaultAnchors, type PoseAnchors } from "@/lib/labels";
import BackgroundEditor from "./BackgroundEditor";

type PoseDraft = {
  id: string;
  name: string;
  originalMediaId: string;
  normalizedMediaId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  anchors: PoseAnchors;
};

const anchorLabels: Array<[keyof PoseAnchors, string]> = [
  ["head", "Cabeza"],
  ["shoulders", "Hombros"],
  ["torso", "Torso"],
  ["hips", "Cadera"],
  ["knees", "Rodillas"],
  ["feet", "Pies"],
];

async function compactPreview(blob: Blob) {
  const source = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const ratio = Math.min(
      1,
      1600 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    canvas
      .getContext("2d")!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    const preview = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("No se pudo preparar la imagen")),
        "image/webp",
        0.86,
      ),
    );
    return URL.createObjectURL(preview);
  } finally {
    URL.revokeObjectURL(source);
  }
}

function Silhouette() {
  return (
    <svg className="pose-silhouette" viewBox="0 0 300 400" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity=".72"
      >
        <ellipse cx="150" cy="42" rx="25" ry="32" />
        <path d="M136 74 L126 91 L91 116 M164 74 L174 91 L209 116 M126 91 Q117 151 126 210 M174 91 Q183 151 174 210 M126 210 L112 286 L103 376 M174 210 L188 286 L197 376 M126 210 Q150 224 174 210 M91 116 L72 194 M209 116 L228 194" />
      </g>
    </svg>
  );
}

export default function PoseWizard({ pose }: { pose?: PoseDraft }) {
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(pose ? 3 : 1);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState(pose?.name || "");
  const [t, setT] = useState({
    x: pose?.x || 0,
    y: pose?.y || 0,
    scale: pose?.scale || 1,
    rotation: pose?.rotation || 0,
  });
  const [anchors, setAnchors] = useState<PoseAnchors>(
    pose?.anchors || defaultAnchors,
  );
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  const anchorDrag = useRef<keyof PoseAnchors | null>(null);

  useEffect(() => {
    if (!pose) return;
    let active = true;
    fetch(`/api/media/${pose.normalizedMediaId}`)
      .then((response) => response.blob())
      .then(compactPreview)
      .then((preview) => {
        if (active) setUrl(preview);
        else URL.revokeObjectURL(preview);
      });
    return () => {
      active = false;
    };
  }, [pose]);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  async function choose(next?: File) {
    if (!next) return;
    if (!next.type.startsWith("image/"))
      return alert("Elige una imagen JPG, PNG o WebP");
    if (next.size > 20 * 1024 * 1024)
      return alert("La imagen no puede superar 20 MB");
    setFile(next);
    setStep(2);
  }

  function acceptCutout(_: Blob, preview: string) {
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return preview;
    });
    setStep(3);
  }

  async function recutOriginal() {
    if (!pose) return;
    const response = await fetch(`/api/media/${pose.originalMediaId}`);
    if (!response.ok) return alert("No se pudo cargar la foto original");
    const blob = await response.blob();
    setFile(new File([blob], "pose-original", { type: blob.type }));
    setStep(2);
  }

  function movePhoto(e: React.PointerEvent<HTMLDivElement>) {
    if (anchorDrag.current && stage.current) {
      const box = stage.current.getBoundingClientRect();
      const value = Math.max(
        0.02,
        Math.min(0.98, (e.clientY - box.top) / box.height),
      );
      setAnchors((old) => ({ ...old, [anchorDrag.current!]: value }));
      return;
    }
    if (!drag.current) return;
    setT((value) => ({
      ...value,
      x: drag.current!.ox + e.clientX - drag.current!.x,
      y: drag.current!.oy + e.clientY - drag.current!.y,
    }));
  }

  function stopDrag(e?: React.PointerEvent<HTMLDivElement>) {
    drag.current = null;
    anchorDrag.current = null;
    if (e && e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }

  async function normalizedFile() {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 900, 1200);
    const base = Math.min(900 / image.naturalWidth, 1200 / image.naturalHeight);
    const width = image.naturalWidth * base * t.scale,
      height = image.naturalHeight * base * t.scale;
    ctx.save();
    ctx.translate(450 + t.x * 2, 600 + t.y * 2);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error("No se pudo exportar")),
        "image/png",
      ),
    );
    return new File([blob], "pose.png", { type: "image/png" });
  }

  async function save() {
    if (!name.trim() || !url || (!pose && !file)) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("normalized", await normalizedFile());
      if (file && !pose) fd.set("original", file);
      Object.entries(t).forEach(([key, value]) => fd.set(key, String(value)));
      fd.set("anchors", JSON.stringify(anchors));
      const response = await fetch(
        pose ? `/api/poses/${pose.id}` : "/api/poses",
        { method: pose ? "PATCH" : "POST", body: fd },
      );
      if (!response.ok)
        throw new Error((await response.json()).error || "No se pudo guardar");
      router.push("/poses");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-head compact-head">
        <div>
          <div className="eyebrow">{pose ? "Editar pose" : "Nueva pose"}</div>
          <h1>
            {step === 1
              ? "Elige una foto"
              : step === 2
                ? "Recorta tu figura"
                : step === 3
                  ? "Alinea tu figura"
                  : "Ponle un nombre"}
          </h1>
          <p className="subtle">
            Ajusta la silueta y arrastra cada guía a la altura correcta.
          </p>
        </div>
        <Link href="/poses" className="btn btn-ghost">
          <ArrowLeft size={17} />
          Volver
        </Link>
      </header>
      <section className="card pose-wizard">
        <div className="steps">
          <i className="step on" />
          <i className={`step ${step >= 2 ? "on" : ""}`} />
          <i className={`step ${step >= 3 ? "on" : ""}`} />
          <i className={`step ${step >= 4 ? "on" : ""}`} />
        </div>
        {step === 1 && (
          <label className="drop">
            <ImagePlus size={40} />
            <h2>Sube tu foto</h2>
            <p className="subtle">De cuerpo entero · JPG, PNG o WebP</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => void choose(e.target.files?.[0])}
            />
            <span className="btn btn-primary">Seleccionar foto</span>
          </label>
        )}
        {step === 2 &&
          (file ? (
            <BackgroundEditor file={file} onAccept={acceptCutout} />
          ) : (
            <div className="empty">Preparando imagen…</div>
          ))}
        {step === 3 && (
          <>
            {!url ? (
              <div className="empty">Preparando imagen…</div>
            ) : (
              <div
                ref={stage}
                className="pose-stage"
                onPointerDown={(e) => {
                  if (anchorDrag.current) return;
                  drag.current = {
                    x: e.clientX,
                    y: e.clientY,
                    ox: t.x,
                    oy: t.y,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={movePhoto}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
              >
                <img
                  src={url}
                  alt="Tu pose"
                  draggable={false}
                  decoding="async"
                  style={{
                    transform: `translate(calc(-50% + ${t.x}px),calc(-50% + ${t.y}px)) scale(${t.scale}) rotate(${t.rotation}deg)`,
                  }}
                />
                <Silhouette />
                {anchorLabels.map(([key, label]) => (
                  <button
                    type="button"
                    className="pose-anchor"
                    key={key}
                    style={{ top: `${anchors[key] * 100}%` }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      anchorDrag.current = key;
                      stage.current?.setPointerCapture(e.pointerId);
                    }}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="pose-controls">
              <label className="range-row">
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
              </label>
              <label className="range-row">
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
              </label>
              <div className="toolbar">
                <span className="subtle drag-tip">
                  <Move size={15} /> Arrastra foto y guías
                </span>
                {pose && <button className="btn btn-ghost" onClick={() => void recutOriginal()}>Recortar de nuevo</button>}
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setT({ x: 0, y: 0, scale: 1, rotation: 0 });
                    setAnchors(defaultAnchors);
                  }}
                >
                  <RotateCcw size={15} />
                  Restablecer
                </button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>
                  Continuar
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
        {step === 4 && (
          <div className="pose-finish">
            <label className="label">
              Nombre de la pose
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. De frente"
                autoFocus
                maxLength={80}
              />
            </label>
            <div className="toolbar spread">
              <button className="btn btn-ghost" onClick={() => setStep(3)}>
                <ArrowLeft size={16} />
                Ajustar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void save()}
                disabled={!name.trim() || busy}
              >
                <Save size={16} />
                {busy
                  ? "Guardando…"
                  : pose
                    ? "Guardar cambios"
                    : "Guardar pose"}
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
