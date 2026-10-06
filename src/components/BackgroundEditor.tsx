"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Eraser,
  Hand,
  Paintbrush,
  Redo2,
  RotateCcw,
  ScanLine,
  Undo2,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type Mode = "erase" | "restore" | "polygon" | "pan";
type Point = { x: number; y: number };

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
  const panStart = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
  } | null>(null);
  const [mode, setMode] = useState<Mode>("polygon");
  const [size, setSize] = useState(28);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const target = canvas.current!;
      const scale = Math.min(1, 800 / Math.max(image.width, image.height));
      target.width = Math.max(1, Math.round(image.width * scale));
      target.height = Math.max(1, Math.round(image.height * scale));
      target
        .getContext("2d")!
        .drawImage(image, 0, 0, target.width, target.height);
      const copy = document.createElement("canvas");
      copy.width = target.width;
      copy.height = target.height;
      copy.getContext("2d")!.drawImage(target, 0, 0);
      original.current = copy;
      setDimensions({ width: target.width, height: target.height });
    };
    image.src = source;
    return () => URL.revokeObjectURL(source);
  }, [file]);

  function position(event: React.PointerEvent) {
    const target = canvas.current!;
    const box = target.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) * target.width) / box.width,
      y: ((event.clientY - box.top) * target.height) / box.height,
    };
  }
  function snapshot() {
    const target = canvas.current!;
    history.current.push(
      target.getContext("2d")!.getImageData(0, 0, target.width, target.height),
    );
    future.current = [];
    if (history.current.length > 6) history.current.shift();
  }
  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (mode === "polygon") {
      setPoints((old) => [...old, position(event)]);
      return;
    }
    if (mode === "pan") {
      panStart.current = {
        x: event.clientX,
        y: event.clientY,
        px: pan.x,
        py: pan.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    snapshot();
    setDrawing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    paint(event, true);
  }
  function paint(event: React.PointerEvent<HTMLCanvasElement>, force = false) {
    if (mode === "pan" && panStart.current) {
      setPan({
        x: panStart.current.px + event.clientX - panStart.current.x,
        y: panStart.current.py + event.clientY - panStart.current.y,
      });
      return;
    }
    if ((!drawing && !force) || (mode !== "erase" && mode !== "restore"))
      return;
    const target = canvas.current!,
      context = target.getContext("2d")!,
      point = position(event),
      radius = (size * target.width) / target.getBoundingClientRect().width;
    if (mode === "erase") {
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fill();
    } else if (original.current) {
      context.save();
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.clip();
      context.globalCompositeOperation = "source-over";
      context.drawImage(original.current, 0, 0, target.width, target.height);
      context.restore();
    }
    context.globalCompositeOperation = "source-over";
  }
  function stop(event?: React.PointerEvent<HTMLCanvasElement>) {
    setDrawing(false);
    panStart.current = null;
    if (event?.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function applyPolygon() {
    if (points.length < 3) return;
    snapshot();
    const target = canvas.current!,
      context = target.getContext("2d")!;
    context.save();
    context.globalCompositeOperation = "destination-in";
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.closePath();
    context.fill();
    context.restore();
    setPoints([]);
    setMode("erase");
  }
  function undo() {
    const state = history.current.pop();
    if (!state) return;
    const target = canvas.current!,
      context = target.getContext("2d")!;
    future.current.push(
      context.getImageData(0, 0, target.width, target.height),
    );
    context.putImageData(state, 0, 0);
  }
  function redo() {
    const state = future.current.pop();
    if (!state) return;
    const target = canvas.current!,
      context = target.getContext("2d")!;
    history.current.push(
      context.getImageData(0, 0, target.width, target.height),
    );
    context.putImageData(state, 0, 0);
  }
  function reset() {
    if (!original.current) return;
    const target = canvas.current!;
    target.getContext("2d")!.clearRect(0, 0, target.width, target.height);
    target
      .getContext("2d")!
      .drawImage(original.current, 0, 0, target.width, target.height);
    history.current = [];
    future.current = [];
    setPoints([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }
  function cleanupHalo() {
    snapshot();
    const target = canvas.current!;
    const context = target.getContext("2d")!;
    const image = context.getImageData(0, 0, target.width, target.height);
    for (let index = 0; index < image.data.length; index += 4) {
      const alpha = image.data[index + 3];
      const brightness = Math.max(image.data[index], image.data[index + 1], image.data[index + 2]);
      if (alpha > 0 && alpha < 235 && brightness > 220) {
        const whiteFactor = Math.max(0, (255 - brightness) / 35);
        image.data[index + 3] = Math.round(alpha * whiteFactor);
      }
    }
    context.putImageData(image, 0, 0);
  }
  async function auto() {
    setBusy(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const result = await removeBackground(file, {
        model: "isnet_quint8",
        output: { format: "image/png", quality: 1 },
        progress: () => {},
      });
      const url = URL.createObjectURL(result);
      const image = new Image();
      image.onload = () => {
        const target = canvas.current!,
          scale = Math.min(1, 800 / Math.max(image.width, image.height));
        target.width = Math.max(1, Math.round(image.width * scale));
        target.height = Math.max(1, Math.round(image.height * scale));
        target
          .getContext("2d")!
          .drawImage(image, 0, 0, target.width, target.height);
        setDimensions({ width: target.width, height: target.height });
        history.current = [];
        future.current = [];
        setPoints([]);
        URL.revokeObjectURL(url);
        setBusy(false);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        setBusy(false);
      };
      image.src = url;
    } catch {
      alert(
        "El recorte automático no ha podido completarse. Delimita la prenda con Contorno.",
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
    <div className="mask-editor">
      <div className="mask-toolbar">
        <button
          className="btn btn-primary"
          onClick={() => void auto()}
          disabled={busy}
        >
          <WandSparkles />
          {busy ? "Recortando…" : "Automático"}
        </button>
        <button
          className={`btn ${mode === "polygon" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("polygon")}
        >
          <ScanLine />
          Contorno
        </button>
        <button
          className={`btn ${mode === "erase" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("erase")}
        >
          <Eraser />
          Borrar
        </button>
        <button
          className={`btn ${mode === "restore" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("restore")}
        >
          <Paintbrush />
          Restaurar
        </button>
        <button
          className={`btn btn-icon ${mode === "pan" ? "btn-primary" : "btn-ghost"}`}
          aria-label="Mover lienzo"
          onClick={() => setMode("pan")}
        >
          <Hand />
        </button>
        <button className="btn btn-ghost" onClick={cleanupHalo} title="Reduce bordes blancos semitransparentes; puedes deshacerlo">
          <WandSparkles />
          Limpiar halo
        </button>
      </div>
      {mode === "polygon" && (
        <div className="mask-hint">
          <span>Toca puntos alrededor de la figura y cierra la selección.</span>
          <button
            className="btn btn-primary"
            disabled={points.length < 3}
            onClick={applyPolygon}
          >
            <Check />
            Aplicar
          </button>
          <button
            className="btn btn-ghost"
            disabled={!points.length}
            onClick={() => setPoints([])}
          >
            <X />
            Limpiar
          </button>
        </div>
      )}
      {(mode === "erase" || mode === "restore") && (
        <label className="range-row">
          <span>Pincel</span>
          <input
            type="range"
            min="5"
            max="90"
            value={size}
            onChange={(event) => setSize(+event.target.value)}
          />
          <b>{size}</b>
        </label>
      )}
      <div className="mask-viewport">
        <div
          className="mask-surface"
          style={{
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          }}
        >
          <canvas
            ref={canvas}
            className="mask-canvas"
            onPointerDown={start}
            onPointerMove={paint}
            onPointerUp={stop}
            onPointerCancel={stop}
          />
          {points.length > 0 && (
            <svg
              className="polygon-overlay"
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            >
              <polyline
                points={points
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth={Math.max(2, dimensions.width / 250)}
              />
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={Math.max(4, dimensions.width / 120)}
                  fill="currentColor"
                />
              ))}
            </svg>
          )}
        </div>
      </div>
      <div className="toolbar spread mask-footer">
        <div className="toolbar">
          <button
            className="icon-btn"
            aria-label="Alejar"
            onClick={() => setZoom((value) => Math.max(0.7, value - 0.2))}
          >
            <ZoomOut />
          </button>
          <button
            className="icon-btn"
            aria-label="Acercar"
            onClick={() => setZoom((value) => Math.min(3, value + 0.2))}
          >
            <ZoomIn />
          </button>
          <button className="icon-btn" aria-label="Deshacer" onClick={undo}>
            <Undo2 />
          </button>
          <button className="icon-btn" aria-label="Rehacer" onClick={redo}>
            <Redo2 />
          </button>
          <button className="icon-btn" aria-label="Restablecer" onClick={reset}>
            <RotateCcw />
          </button>
        </div>
        <button className="btn btn-primary" onClick={accept}>
          Aceptar PNG
        </button>
      </div>
    </div>
  );
}
