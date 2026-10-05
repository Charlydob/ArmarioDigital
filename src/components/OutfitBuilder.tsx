"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Image as KImage, Layer, Stage, Transformer } from "react-konva";
import Konva from "konva";
import { ArrowDown, ArrowUp, Heart, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { moveLayer, normalizeLayers } from "@/lib/editor";

type Placement = {
  poseId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
};
export type OutfitBuilderData = {
  poses: Pose[];
  garments: Garment[];
  outfit: null | {
    id: string;
    name: string;
    notes: string;
    poseId: string;
    items: Array<Omit<Item, "instanceId" | "poseId"> & { id: string }>;
  };
};
type Pose = { id: string; name: string; mediaId: string };
type Garment = {
  id: string;
  name: string;
  zone: string;
  status: string;
  mediaId: string;
  thumbId: string;
  placements: Placement[];
};
type Item = Placement & {
  garmentId: string;
  zone: string;
  layerOrder: number;
  instanceId: string;
};
function useAsset(src?: string) {
  const [img, setImg] = useState<HTMLImageElement>();
  useEffect(() => {
    if (!src) return;
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);
  return img;
}
function CanvasImage({
  item,
  garment,
  selected,
  onSelect,
  onChange,
}: {
  item: Item;
  garment: Garment;
  selected: boolean;
  onSelect: () => void;
  onChange: (p: Partial<Item>) => void;
}) {
  const image = useAsset(`/api/media/${garment.mediaId}`);
  const ref = useRef<Konva.Image>(null);
  const tr = useRef<Konva.Transformer>(null);
  useLayoutEffect(() => {
    if (selected && ref.current && tr.current) {
      tr.current.nodes([ref.current]);
      tr.current.getLayer()?.batchDraw();
    }
  }, [selected]);
  if (!image) return null;
  const width = image.width * item.scaleX,
    height = image.height * item.scaleY;
  return (
    <>
      <KImage
        ref={ref}
        image={image}
        x={item.x}
        y={item.y}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        rotation={item.rotation}
        opacity={item.opacity}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const n = ref.current!;
          onChange({
            x: n.x(),
            y: n.y(),
            rotation: n.rotation(),
            scaleX: item.scaleX * n.scaleX(),
            scaleY: item.scaleY * n.scaleY(),
          });
          n.scaleX(1);
          n.scaleY(1);
        }}
      />
      {selected && (
        <Transformer
          ref={tr}
          rotateEnabled
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
          boundBoxFunc={(o, n) =>
            Math.abs(n.width) < 20 || Math.abs(n.height) < 20 ? o : n
          }
        />
      )}
    </>
  );
}
function BuilderStage({
  pose,
  items,
  garments,
  selected,
  setSelected,
  setItems,
  stageRef,
}: {
  pose: Pose;
  items: Item[];
  garments: Garment[];
  selected: string | null;
  setSelected: (v: string | null) => void;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(540);
  const bg = useAsset(`/api/media/${pose.mediaId}`);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const obs = new ResizeObserver(() =>
      setWidth(Math.min(650, el.clientWidth)),
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const ratio = width / 900;
  function change(id: string, p: Partial<Item>) {
    setItems((list) =>
      list.map((i) => (i.instanceId === id ? { ...i, ...p } : i)),
    );
  }
  return (
    <div className="canvas-wrap" ref={container}>
      <Stage
        ref={stageRef}
        width={width}
        height={(width * 4) / 3}
        scaleX={ratio}
        scaleY={ratio}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) setSelected(null);
        }}
      >
        <Layer>
          {bg && <KImage image={bg} width={900} height={1200} />}{" "}
          {normalizeLayers(items).map((item) => {
            const garment = garments.find((g) => g.id === item.garmentId)!;
            return (
              <CanvasImage
                key={item.instanceId}
                item={item}
                garment={garment}
                selected={selected === item.instanceId}
                onSelect={() => setSelected(item.instanceId)}
                onChange={(p) => change(item.instanceId, p)}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
export default function OutfitBuilder({
  poses,
  garments,
  outfit,
}: OutfitBuilderData) {
  const router = useRouter();
  const [poseId, setPoseId] = useState(outfit?.poseId || poses[0]?.id || "");
  const [items, setItems] = useState<Item[]>(
    () =>
      outfit?.items?.map((i) => ({
        ...i,
        poseId: outfit.poseId,
        instanceId: i.id,
      })) || [],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState(outfit?.name || "");
  const [notes, setNotes] = useState(outfit?.notes || "");
  const [zone, setZone] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);
  const pose = poses.find((p) => p.id === poseId);
  const active = items.find((i) => i.instanceId === selected);
  function add(g: Garment) {
    const preset = g.placements.find((p) => p.poseId === poseId);
    const defaults: Record<string, [number, number, number]> = {
      HEAD: [450, 170, 0.3],
      TORSO: [450, 430, 0.5],
      LEGS: [450, 760, 0.55],
      FEET: [450, 1080, 0.35],
      ACCESSORY: [500, 480, 0.35],
    };
    const [x, y, s] = defaults[g.zone] || defaults.ACCESSORY;
    const item: Item = {
      garmentId: g.id,
      zone: g.zone,
      layerOrder: items.length,
      instanceId: crypto.randomUUID(),
      x: preset?.x ?? x,
      y: preset?.y ?? y,
      scaleX: preset?.scaleX ?? s,
      scaleY: preset?.scaleY ?? s,
      rotation: preset?.rotation ?? 0,
      opacity: preset?.opacity ?? 1,
      poseId,
    };
    setItems((v) => [...v, item]);
    setSelected(item.instanceId);
  }
  function remove() {
    setItems((v) =>
      normalizeLayers(v.filter((i) => i.instanceId !== selected)),
    );
    setSelected(null);
  }
  function layer(dir: -1 | 1) {
    const sorted = normalizeLayers(items);
    const idx = sorted.findIndex((i) => i.instanceId === selected);
    setItems(moveLayer(sorted, idx, dir));
  }
  async function save() {
    if (!name.trim() || !pose || !stageRef.current) {
      alert("Ponle un nombre al conjunto");
      return;
    }
    setBusy(true);
    setSelected(null);
    await new Promise((r) => setTimeout(r, 80));
    const dataUrl = stageRef.current.toDataURL({
      pixelRatio: 1.5,
      mimeType: "image/jpeg",
      quality: 0.9,
    });
    const preview = await (await fetch(dataUrl)).blob();
    const payload = {
      name: name.trim(),
      notes,
      poseId,
      items: normalizeLayers(items).map((i) => ({
        garmentId: i.garmentId,
        zone: i.zone,
        layerOrder: i.layerOrder,
        x: i.x,
        y: i.y,
        scaleX: i.scaleX,
        scaleY: i.scaleY,
        rotation: i.rotation,
        opacity: i.opacity,
      })),
    };
    const fd = new FormData();
    fd.set("data", JSON.stringify(payload));
    fd.set(
      "preview",
      new File([preview], "conjunto.jpg", { type: "image/jpeg" }),
    );
    const res = await fetch(
      outfit ? `/api/outfits/${outfit.id}` : "/api/outfits",
      { method: outfit ? "PUT" : "POST", body: fd },
    );
    if (res.ok) {
      const saved = await res.json();
      router.push(`/conjuntos/${saved.id}`);
      router.refresh();
    } else {
      alert((await res.json()).error || "No se pudo guardar");
      setBusy(false);
    }
  }
  if (!poses.length)
    return (
      <div className="empty">
        <h2>Primero necesitas una pose</h2>
        <p>Sube y alinea una foto de cuerpo entero antes de crear conjuntos.</p>
        <a className="btn btn-primary" href="/poses/nueva">
          Crear pose
        </a>
      </div>
    );
  return (
    <div className="editor">
      <aside className="panel">
        <label className="label">
          Pose
          <select
            className="select"
            value={poseId}
            onChange={(e) => {
              if (
                items.length &&
                !confirm(
                  "Cambiar de pose quitará las prendas actuales. ¿Continuar?",
                )
              )
                return;
              setPoseId(e.target.value);
              setItems([]);
              setSelected(null);
            }}
          >
            {poses.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="filters" style={{ marginTop: 14 }}>
          {["ALL", "TORSO", "LEGS", "FEET", "HEAD", "ACCESSORY"].map((z) => (
            <button
              key={z}
              className={`btn ${zone === z ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setZone(z)}
            >
              {z === "ALL" ? "Todo" : z.toLowerCase()}
            </button>
          ))}
        </div>
        {garments
          .filter((g) => zone === "ALL" || g.zone === zone)
          .map((g) => (
            <div className="garment-pick" key={g.id}>
              <img src={`/api/media/${g.thumbId}`} alt="" />
              <div>
                <b style={{ fontSize: 13 }}>{g.name}</b>
                <div className="subtle" style={{ fontSize: 10 }}>
                  {g.zone}{" "}
                  {g.status === "WISHLIST" && (
                    <Heart size={10} fill="currentColor" />
                  )}
                </div>
              </div>
              <button
                className="btn btn-icon"
                onClick={() => add(g)}
                aria-label={`Añadir ${g.name}`}
              >
                <Plus size={18} />
              </button>
            </div>
          ))}
      </aside>
      {pose && (
        <BuilderStage
          pose={pose}
          items={items}
          garments={garments}
          selected={selected}
          setSelected={setSelected}
          setItems={setItems}
          stageRef={stageRef}
        />
      )}
      <aside className="panel">
        <label className="label">
          Nombre
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Look de otoño"
          />
        </label>
        <label className="label" style={{ marginTop: 12 }}>
          Notas
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
          />
        </label>
        <h3 style={{ marginTop: 22 }}>Capas</h3>
        <p className="subtle" style={{ fontSize: 12 }}>
          Lo último de la lista queda delante.
        </p>
        {normalizeLayers(items).map((i) => {
          const g = garments.find((x) => x.id === i.garmentId)!;
          return (
            <button
              className={`layer-row ${selected === i.instanceId ? "active" : ""}`}
              key={i.instanceId}
              onClick={() => setSelected(i.instanceId)}
              style={{ border: 0, width: "100%", cursor: "pointer" }}
            >
              <img src={`/api/media/${g.thumbId}`} alt="" />
              <span style={{ flex: 1, textAlign: "left", fontWeight: 700 }}>
                {g.name}
              </span>
              <small>{i.layerOrder + 1}</small>
            </button>
          );
        })}
        {active && (
          <>
            <div className="toolbar" style={{ marginTop: 12 }}>
              <button
                className="btn btn-icon btn-ghost"
                title="Bajar capa"
                onClick={() => layer(-1)}
              >
                <ArrowDown size={17} />
              </button>
              <button
                className="btn btn-icon btn-ghost"
                title="Subir capa"
                onClick={() => layer(1)}
              >
                <ArrowUp size={17} />
              </button>
              <button
                className="btn btn-icon btn-danger"
                title="Quitar"
                onClick={remove}
              >
                <Trash2 size={17} />
              </button>
            </div>
            <div className="range-row">
              <span>Opacidad</span>
              <input
                type="range"
                min=".1"
                max="1"
                step=".05"
                value={active.opacity}
                onChange={(e) =>
                  setItems((v) =>
                    v.map((i) =>
                      i.instanceId === active.instanceId
                        ? { ...i, opacity: +e.target.value }
                        : i,
                    ),
                  )
                }
              />
              <b>{Math.round(active.opacity * 100)}%</b>
            </div>
          </>
        )}
        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 20 }}
          onClick={save}
          disabled={busy || !items.length}
        >
          <Save size={18} />
          {busy ? "Guardando…" : "Guardar conjunto"}
        </button>
      </aside>
    </div>
  );
}
