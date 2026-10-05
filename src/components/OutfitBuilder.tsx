"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Image as KImage, Layer, Stage, Transformer } from "react-konva";
import Konva from "konva";
import {
  ArrowDown,
  ArrowUp,
  Layers3,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { moveLayer, normalizeLayers } from "@/lib/editor";
import { zoneLabels } from "@/lib/labels";

type Placement = {
  poseId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
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

function useAsset(src?: string) {
  const [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => {
    if (!src) return;
    const next = new Image();
    next.onload = () => setImage(next);
    next.src = src;
  }, [src]);
  return image;
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
  onChange: (value: Partial<Item>) => void;
}) {
  const image = useAsset(`/api/media/${garment.mediaId}`);
  const ref = useRef<Konva.Image>(null);
  const transformer = useRef<Konva.Transformer>(null);
  useLayoutEffect(() => {
    if (selected && ref.current && transformer.current) {
      transformer.current.nodes([ref.current]);
      transformer.current.getLayer()?.batchDraw();
    }
  }, [selected]);
  if (!image) return null;
  const width = image.width * item.scaleX;
  const height = image.height * item.scaleY;
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
          const node = ref.current!;
          onChange({
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            scaleX: item.scaleX * node.scaleX(),
            scaleY: item.scaleY * node.scaleY(),
          });
          node.scaleX(1);
          node.scaleY(1);
        }}
      />
      {selected && (
        <Transformer
          ref={transformer}
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
          boundBoxFunc={(oldBox, box) =>
            Math.abs(box.width) < 20 || Math.abs(box.height) < 20 ? oldBox : box
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
  setSelected: (value: string | null) => void;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const background = useAsset(`/api/media/${pose.mediaId}`);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = new ResizeObserver(() =>
      setWidth(Math.min(570, element.clientWidth)),
    );
    resize.observe(element);
    return () => resize.disconnect();
  }, []);
  const ratio = width / 900;
  return (
    <div className="try-canvas" ref={container}>
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
          {background && (
            <KImage image={background} width={900} height={1200} />
          )}{" "}
          {normalizeLayers(items).map((item) => (
            <CanvasImage
              key={item.instanceId}
              item={item}
              garment={garments.find(
                (garment) => garment.id === item.garmentId,
              )!}
              selected={selected === item.instanceId}
              onSelect={() => setSelected(item.instanceId)}
              onChange={(value) =>
                setItems((list) =>
                  list.map((candidate) =>
                    candidate.instanceId === item.instanceId
                      ? { ...candidate, ...value }
                      : candidate,
                  ),
                )
              }
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

const zoneOrder = ["HEAD", "TORSO", "LEGS", "FEET", "ACCESSORY"];

export default function OutfitBuilder({
  poses,
  garments,
  outfit,
}: OutfitBuilderData) {
  const router = useRouter();
  const [poseId, setPoseId] = useState(outfit?.poseId || poses[0]?.id || "");
  const [items, setItems] = useState<Item[]>(
    () =>
      outfit?.items.map((item) => ({
        ...item,
        poseId: outfit.poseId,
        instanceId: item.id,
      })) || [],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState(outfit?.name || "");
  const [notes, setNotes] = useState(outfit?.notes || "");
  const [busy, setBusy] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);
  const pose = poses.find((item) => item.id === poseId);
  const active = items.find((item) => item.instanceId === selected);
  function add(garment: Garment) {
    const preset = garment.placements.find((item) => item.poseId === poseId);
    const defaults: Record<string, [number, number, number]> = {
      HEAD: [450, 150, 0.3],
      TORSO: [450, 420, 0.5],
      LEGS: [450, 760, 0.55],
      FEET: [450, 1080, 0.35],
      ACCESSORY: [520, 430, 0.32],
    };
    const [x, y, scale] = defaults[garment.zone] || defaults.ACCESSORY;
    const item: Item = {
      garmentId: garment.id,
      zone: garment.zone,
      layerOrder: items.length,
      instanceId: crypto.randomUUID(),
      poseId,
      x: preset?.x ?? x,
      y: preset?.y ?? y,
      scaleX: preset?.scaleX ?? scale,
      scaleY: preset?.scaleY ?? scale,
      rotation: preset?.rotation ?? 0,
      opacity: preset?.opacity ?? 1,
    };
    setItems((old) => [...old, item]);
    setSelected(item.instanceId);
  }
  function remove() {
    setItems((old) =>
      normalizeLayers(old.filter((item) => item.instanceId !== selected)),
    );
    setSelected(null);
  }
  function layer(direction: -1 | 1) {
    const sorted = normalizeLayers(items);
    setItems(
      moveLayer(
        sorted,
        sorted.findIndex((item) => item.instanceId === selected),
        direction,
      ),
    );
  }
  function updateActive(value: Partial<Item>) {
    setItems((old) =>
      old.map((item) =>
        item.instanceId === selected ? { ...item, ...value } : item,
      ),
    );
  }
  async function save() {
    if (!name.trim() || !pose || !stageRef.current)
      return alert("Ponle un nombre al conjunto");
    setBusy(true);
    setSelected(null);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const preview = await (
      await fetch(
        stageRef.current.toDataURL({
          pixelRatio: 1.5,
          mimeType: "image/jpeg",
          quality: 0.9,
        }),
      )
    ).blob();
    const data = {
      name: name.trim(),
      notes,
      poseId,
      items: normalizeLayers(items).map(
        ({
          garmentId,
          zone,
          layerOrder,
          x,
          y,
          scaleX,
          scaleY,
          rotation,
          opacity,
        }) => ({
          garmentId,
          zone,
          layerOrder,
          x,
          y,
          scaleX,
          scaleY,
          rotation,
          opacity,
        }),
      ),
    };
    const fd = new FormData();
    fd.set("data", JSON.stringify(data));
    fd.set(
      "preview",
      new File([preview], "conjunto.jpg", { type: "image/jpeg" }),
    );
    const response = await fetch(
      outfit ? `/api/outfits/${outfit.id}` : "/api/outfits",
      { method: outfit ? "PUT" : "POST", body: fd },
    );
    if (!response.ok) {
      setBusy(false);
      return alert((await response.json()).error || "No se pudo guardar");
    }
    const saved = await response.json();
    router.push(`/conjuntos/${saved.id}`);
    router.refresh();
  }
  if (!poses.length)
    return (
      <div className="empty">
        <h2>Primero necesitas una pose</h2>
        <p>Sube y alinea una foto de cuerpo entero.</p>
        <Link className="btn btn-primary" href="/poses/nueva">
          Crear pose
        </Link>
      </div>
    );
  return (
    <div className="try-studio">
      <div className="try-topbar">
        <div className="pose-selector">
          {poses.map((item) => (
            <button
              key={item.id}
              className={poseId === item.id ? "active" : ""}
              onClick={() => {
                if (
                  item.id === poseId ||
                  (items.length &&
                    !confirm(
                      "Cambiar de pose quitará las prendas actuales. ¿Continuar?",
                    ))
                )
                  return;
                setPoseId(item.id);
                setItems([]);
                setSelected(null);
              }}
            >
              <img src={`/api/media/${item.mediaId}`} alt="" />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
        <input className="try-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del look" aria-label="Nombre del conjunto" maxLength={80}/>
        <div className="toolbar">
          <button
            className="icon-btn"
            title="Datos del conjunto"
            onClick={() => setDetailsOpen(true)}
          >
            <SlidersHorizontal />
          </button>
          <button
            className="icon-btn"
            title="Capas"
            onClick={() => setLayersOpen(true)}
          >
            <Layers3 />
            <i>{items.length}</i>
          </button>
          <button
            className="btn btn-primary"
            disabled={busy || !items.length}
            onClick={() => void save()}
          >
            <Save size={16} />
            <span>{busy ? "Guardando…" : "Guardar"}</span>
          </button>
        </div>
      </div>
      <div className="try-space">
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
        <div className="zone-rails">
          {zoneOrder.map((zone) => (
            <section
              className={`zone-rail zone-${zone.toLowerCase()}`}
              key={zone}
            >
              <b>{zoneLabels[zone]}</b>
              <div>
                {garments
                  .filter((garment) => garment.zone === zone)
                  .map((garment) => (
                    <button
                      key={garment.id}
                      onClick={() => add(garment)}
                      title={`Añadir ${garment.name}`}
                    >
                      <img src={`/api/media/${garment.thumbId}`} alt="" />
                      <span>{garment.name}</span>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      {active && (
        <div className="active-controls">
          <button
            className="icon-btn"
            title="Bajar capa"
            onClick={() => layer(-1)}
          >
            <ArrowDown />
          </button>
          <button
            className="icon-btn"
            title="Subir capa"
            onClick={() => layer(1)}
          >
            <ArrowUp />
          </button>
          <label>
            <span>Opacidad</span>
            <input
              type="range"
              min=".1"
              max="1"
              step=".05"
              value={active.opacity}
              onChange={(e) => updateActive({ opacity: +e.target.value })}
            />
          </label>
          <button className="icon-btn danger" title="Quitar" onClick={remove}>
            <Trash2 />
          </button>
          <button
            className="icon-btn"
            title="Cerrar controles"
            onClick={() => setSelected(null)}
          >
            <X />
          </button>
        </div>
      )}
      {(layersOpen || detailsOpen) && (
        <div
          className="sheet-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setLayersOpen(false);
              setDetailsOpen(false);
            }
          }}
        >
          <section className="bottom-sheet">
            {" "}
            <div className="sheet-head">
              <h2>{layersOpen ? "Capas" : "Datos del conjunto"}</h2>
              <button
                className="icon-btn"
                onClick={() => {
                  setLayersOpen(false);
                  setDetailsOpen(false);
                }}
              >
                <X />
              </button>
            </div>
            {detailsOpen ? (
              <>
                <label className="label">
                  Nombre
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Look de otoño"
                  />
                </label>
                <label className="label">
                  Notas
                  <textarea
                    className="input"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opcional"
                  />
                </label>
              </>
            ) : (
              <div className="layer-list">
                {normalizeLayers(items).map((item) => {
                  const garment = garments.find(
                    (candidate) => candidate.id === item.garmentId,
                  )!;
                  return (
                    <button
                      key={item.instanceId}
                      className={selected === item.instanceId ? "active" : ""}
                      onClick={() => {
                        setSelected(item.instanceId);
                        setLayersOpen(false);
                      }}
                    >
                      <img src={`/api/media/${garment.thumbId}`} alt="" />
                      <span>{garment.name}</span>
                      <small>{item.layerOrder + 1}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
