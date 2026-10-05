"use client";
import { useEffect, useRef, useState } from "react";
import {
  Eraser,
  Paintbrush,
  Redo2,
  RotateCcw,
  Undo2,
  WandSparkles,
} from "lucide-react";

export default function BackgroundEditor({
  file,
  onAccept,
}: {
  file: File;
  onAccept: (blob: Blob, url: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const original = useRef<HTMLCanvasElement | null>(null);
  const history = useRef<ImageData[]>([]);
  const future = useRef<ImageData[]>([]);
  const [mode, setMode] = useState<"erase" | "restore">("erase");
  const [size, setSize] = useState(28);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const source = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = canvas.current!;
      const max = 1000;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const o = document.createElement("canvas");
      o.width = c.width;
      o.height = c.height;
      o.getContext("2d")!.drawImage(c, 0, 0);
      original.current = o;
    };
    img.src = source;
    return () => URL.revokeObjectURL(source);
  }, [file]);
  function pos(e: React.PointerEvent) {
    const c = canvas.current!,
      r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    };
  }
  function start(e: React.PointerEvent) {
    const c = canvas.current!;
    history.current.push(
      c.getContext("2d")!.getImageData(0, 0, c.width, c.height),
    );
    future.current = [];
    if (history.current.length > 12) history.current.shift();
    setDrawing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    paint(e);
  }
  function paint(e: React.PointerEvent) {
    if (!drawing && e.type !== "pointerdown") return;
    const c = canvas.current!,
      ctx = c.getContext("2d")!,
      p = pos(e),
      radius = (size * c.width) / c.getBoundingClientRect().width;
    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (original.current) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(original.current, 0, 0);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
  }
  function undo() {
    const state = history.current.pop();
    if (state) {
      const c = canvas.current!,
        ctx = c.getContext("2d")!;
      future.current.push(ctx.getImageData(0, 0, c.width, c.height));
      ctx.putImageData(state, 0, 0);
    }
  }
  function redo() {
    const state = future.current.pop();
    if (state) {
      const c = canvas.current!,
        ctx = c.getContext("2d")!;
      history.current.push(ctx.getImageData(0, 0, c.width, c.height));
      ctx.putImageData(state, 0, 0);
    }
  }
  function reset() {
    if (original.current)
      canvas.current!.getContext("2d")!.drawImage(original.current, 0, 0);
  }
  async function auto() {
    setBusy(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const result = await removeBackground(file, { progress: () => {} });
      const url = URL.createObjectURL(result);
      const img = new Image();
      img.onload = () => {
        const c = canvas.current!;
        const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        history.current = [];
        future.current = [];
        URL.revokeObjectURL(url);
        setBusy(false);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setBusy(false);
      };
      img.src = url;
    } catch {
      alert(
        "El recorte automático no ha podido completarse. Puedes usar el pincel manual.",
      );
      setBusy(false);
    }
  }
  function accept() {
    canvas.current!.toBlob((blob) => {
      if (blob) onAccept(blob, URL.createObjectURL(blob));
    }, "image/png");
  }
  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={auto} disabled={busy}>
          <WandSparkles size={17} />
          {busy ? "Recortando…" : "Recorte automático"}
        </button>
        <button
          className={`btn ${mode === "erase" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("erase")}
        >
          <Eraser size={17} />
          Borrar
        </button>
        <button
          className={`btn ${mode === "restore" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("restore")}
        >
          <Paintbrush size={17} />
          Restaurar
        </button>
        <button
          className="btn btn-icon btn-ghost"
          aria-label="Deshacer"
          onClick={undo}
        >
          <Undo2 size={17} />
        </button>
        <button
          className="btn btn-icon btn-ghost"
          aria-label="Rehacer"
          onClick={redo}
        >
          <Redo2 size={17} />
        </button>
        <button
          className="btn btn-icon btn-ghost"
          aria-label="Reiniciar"
          onClick={reset}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="range-row">
        <span>Pincel</span>
        <input
          type="range"
          min="5"
          max="90"
          value={size}
          onChange={(e) => setSize(+e.target.value)}
        />
        <b>{size}</b>
      </div>
      <canvas
        ref={canvas}
        className="mask-canvas"
        onPointerDown={start}
        onPointerMove={paint}
        onPointerUp={() => setDrawing(false)}
        onPointerCancel={() => setDrawing(false)}
      />
      <div
        className="toolbar"
        style={{ justifyContent: "flex-end", marginTop: 16 }}
      >
        <button className="btn btn-primary" onClick={accept}>
          Aceptar recorte
        </button>
      </div>
    </div>
  );
}
