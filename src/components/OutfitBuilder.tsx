"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Image as KImage, Layer, Stage, Transformer } from "react-konva";
import Konva from "konva";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  Layers3,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { moveLayer, normalizeLayers } from "@/lib/editor";
import { defaultAnchors, type PoseAnchors, zoneLabels } from "@/lib/labels";
import { carouselBandPositions, carouselItemAt, wrapCarouselIndex } from "@/lib/outfitCarousel";
import { defaultOutfitName } from "@/lib/outfitName";
import {
  appendUniqueGarment,
  applyPosePlacements,
  placementRenderSize,
  resolveGarmentPlacement,
  serializeOutfitItems,
} from "@/lib/placement";
import AiTryOnButton from "./AiTryOnButton";

type Placement = {
  poseId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
};
type Pose = { id: string; name: string; mediaId: string; anchors: PoseAnchors };
type Garment = {
  id: string;
  name: string;
  brand: string | null;
  subtype: string;
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
type Preview = { garment: Garment; item: Item; shift: number };
export type OutfitBuilderData = {
  poses: Pose[];
  garments: Garment[];
  aiTryOnEnabled: boolean;
  outfit: null | {
    id: string;
    name: string;
    notes: string;
    poseId: string;
    items: Array<Omit<Item, "instanceId" | "poseId"> & { id: string }>;
  };
};

const zones = ["HEAD", "TORSO", "LEGS", "FEET", "ACCESSORY"] as const;
type CachedAsset = { image?: HTMLImageElement; promise?: Promise<HTMLImageElement> };
const assetCache = new Map<string, CachedAsset>();

function loadAsset(src: string) {
  const cached = assetCache.get(src);
  if (cached?.image) return Promise.resolve(cached.image);
  if (cached?.promise) return cached.promise;
  const entry: CachedAsset = {};
  entry.promise = fetch(src, { credentials: "include" })
    .then((response) => {
      if (!response.ok) throw new Error("Imagen no disponible");
      return response.blob();
    })
    .then(
      (blob) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const objectUrl = URL.createObjectURL(blob);
          const image = new Image();
          image.onload = () => {
            entry.image = image;
            resolve(image);
          };
          image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Imagen no válida"));
          };
          image.src = objectUrl;
        }),
    )
    .catch((error) => {
      assetCache.delete(src);
      throw error;
    });
  assetCache.set(src, entry);
  return entry.promise;
}

function useAsset(src?: string) {
  const [asset, setAsset] = useState<{
    src?: string;
    image?: HTMLImageElement;
  }>(() => ({ src, image: src ? assetCache.get(src)?.image : undefined }));
  useEffect(() => {
    if (!src) return;
    let active = true;
    loadAsset(src)
      .then((next) => {
        if (active) setAsset({ src, image: next });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [src]);
  return asset.src === src ? asset.image : src ? assetCache.get(src)?.image : undefined;
}

function placementFor(garment: Garment, poseId: string, anchors: PoseAnchors): Item {
  const placement = resolveGarmentPlacement(garment, poseId, anchors);
  return {
    garmentId: garment.id,
    zone: garment.zone,
    layerOrder: 0,
    instanceId: `preview-${garment.id}`,
    ...placement,
  };
}

function CanvasGarment({
  item,
  garment,
  selected = false,
  preview = false,
  shift = 0,
  onSelect,
  onChange,
}: {
  item: Item;
  garment: Garment;
  selected?: boolean;
  preview?: boolean;
  shift?: number;
  onSelect?: () => void;
  onChange?: (value: Partial<Item>) => void;
}) {
  const image = useAsset(`/api/media/${garment.mediaId}`);
  const node = useRef<Konva.Image>(null);
  const transformer = useRef<Konva.Transformer>(null);
  useLayoutEffect(() => {
    if (selected && node.current && transformer.current) {
      transformer.current.nodes([node.current]);
      transformer.current.getLayer()?.batchDraw();
    }
  }, [selected]);
  if (!image) return null;
  const { width, height } = placementRenderSize(image.width, image.height, item);
  return (
    <>
      <KImage
        ref={node}
        image={image}
        x={item.x + shift}
        y={item.y}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        rotation={item.rotation}
        opacity={preview ? Math.min(0.88, item.opacity) : item.opacity}
        perfectDrawEnabled={false}
        draggable={!preview}
        listening={!preview}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(event) =>
          onChange?.({ x: event.target.x(), y: event.target.y() })
        }
        onTransformEnd={() => {
          const target = node.current!;
          onChange?.({
            x: target.x(),
            y: target.y(),
            rotation: target.rotation(),
            scaleX: item.scaleX * target.scaleX(),
            scaleY: item.scaleY * target.scaleY(),
          });
          target.scaleX(1);
          target.scaleY(1);
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
  previews,
  selected,
  setSelected,
  setItems,
  stageRef,
  setReady,
}: {
  pose: Pose;
  items: Item[];
  garments: Garment[];
  previews: Preview[];
  selected: string | null;
  setSelected: (value: string | null) => void;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  stageRef: React.RefObject<Konva.Stage | null>;
  setReady: (ready: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const person = useAsset(`/api/media/${pose.mediaId}`);
  useEffect(() => setReady(Boolean(person)), [person, setReady]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = new ResizeObserver(() =>
      setWidth(Math.min(570, element.clientWidth, element.clientHeight * 0.75)),
    );
    resize.observe(element);
    return () => resize.disconnect();
  }, []);
  const ratio = width / 900;
  return (
    <div className="try-canvas" ref={container}>
      <img
        className="pose-fallback"
        src={`/api/media/${pose.mediaId}`}
        alt={pose.name}
      />
      <Stage
        ref={stageRef}
        width={width}
        height={(width * 4) / 3}
        scaleX={ratio}
        scaleY={ratio}
        onMouseDown={(event) => {
          if (event.target === event.target.getStage()) setSelected(null);
        }}
      >
        <Layer imageSmoothingEnabled>
          {person && <KImage image={person} width={900} height={1200} />}
          {normalizeLayers(items).map((item) => {
            const garment = garments.find(
              (candidate) => candidate.id === item.garmentId,
            );
            return garment ? (
              <CanvasGarment
                key={item.instanceId}
                item={item}
                garment={garment}
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
            ) : null;
          })}
          {previews.map((preview) => (
            <CanvasGarment
              key={preview.item.instanceId}
              item={preview.item}
              garment={preview.garment}
              preview
              shift={preview.shift / ratio}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function CarouselBand({
  zone,
  garments,
  index,
  top,
  onIndex,
  onAdd,
  onMotion,
  addedGarmentIds,
}: {
  zone: string;
  garments: Garment[];
  index: number;
  top: number;
  onIndex: (index: number) => void;
  onAdd: (index: number) => void;
  onMotion: (index: number, pixels: number) => void;
  addedGarmentIds: Set<string>;
}) {
  const [viewportRef, api] = useEmblaCarousel({
    align: "center",
    loop: garments.length > 2,
    dragFree: false,
    containScroll: "trimSnaps",
    skipSnaps: true,
    duration: 20,
  });
  const [visualIndex, setVisualIndex] = useState(index);
  const onIndexRef = useRef(onIndex);
  const onMotionRef = useRef(onMotion);
  const frameRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const targetIndexRef = useRef<number | null>(null);
  useEffect(() => {
    onIndexRef.current = onIndex;
    onMotionRef.current = onMotion;
  }, [onIndex, onMotion]);
  useEffect(() => {
    if (!api) return;
    const target = wrapCarouselIndex(index, garments.length);
    if (api.selectedScrollSnap() !== target) api.scrollTo(target);
  }, [api, index, garments.length]);
  useEffect(() => {
    if (!api) return;
    const measure = (targetIndex: number | null = null) => {
      const root = api.rootNode();
      const center = root.getBoundingClientRect().left + root.clientWidth / 2;
      const slides = api.slideNodes();
      let nearest = 0;
      let offset = Number.POSITIVE_INFINITY;
      slides.forEach((slide, slideIndex) => {
        const rect = slide.getBoundingClientRect();
        const delta = rect.left + rect.width / 2 - center;
        if (targetIndex !== null && slideIndex !== targetIndex) return;
        if (Math.abs(delta) < Math.abs(offset)) { nearest = slideIndex; offset = delta; }
      });
      return { index: nearest, offset };
    };
    const report = () => {
      frameRef.current = null;
      const measured = measure(targetIndexRef.current);
      setVisualIndex(measured.index);
      onMotionRef.current(measured.index, measured.offset);
      return measured;
    };
    const scheduleReport = () => {
      if (frameRef.current === null)
        frameRef.current = requestAnimationFrame(report);
    };
    const lockSelection = () => {
      targetIndexRef.current = api.selectedScrollSnap();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      report();
    };
    const pointerDown = () => {
      draggingRef.current = true;
      targetIndexRef.current = null;
    };
    const pointerUp = () => {
      draggingRef.current = false;
      lockSelection();
    };
    const select = () => {
      if (draggingRef.current) scheduleReport();
      else lockSelection();
    };
    const settle = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      const selected = api.selectedScrollSnap();
      targetIndexRef.current = selected;
      setVisualIndex(selected);
      onIndexRef.current(selected);
      onMotionRef.current(selected, 0);
    };
    api.on("pointerDown", pointerDown);
    api.on("pointerUp", pointerUp);
    api.on("scroll", scheduleReport);
    api.on("select", select);
    api.on("settle", settle);
    report();
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      api.off("pointerDown", pointerDown);
      api.off("pointerUp", pointerUp);
      api.off("scroll", scheduleReport);
      api.off("select", select);
      api.off("settle", settle);
    };
  }, [api]);
  if (!garments.length) return null;
  const safe = wrapCarouselIndex(visualIndex, garments.length);
  const current = carouselItemAt(garments, safe)!;
  const alreadyAdded = addedGarmentIds.has(current.id);
  return (
    <section
      className={`body-carousel carousel-${zone.toLowerCase()}`}
      style={{ top: `${top * 100}%` }}
    >
      <span className="carousel-zone">{zoneLabels[zone]}</span>
      <div className="embla" ref={viewportRef}>
        <div className="embla-track">
          {garments.map((garment, slideIndex) => <button type="button" className={`embla-garment ${slideIndex === safe ? "is-active" : ""}`} key={garment.id} onClick={() => api?.scrollTo(slideIndex)} aria-label={garment.name}><img src={`/api/media/${garment.mediaId}`} alt=""/></button>)}
        </div>
      </div>
      <div className="carousel-center-overlay">
        <span>{current.name}</span>
        <button
          disabled={alreadyAdded}
          onClick={(event) => {
            event.stopPropagation();
            onAdd(safe);
          }}
        >
          <Check />
          {alreadyAdded ? "Ya añadida" : "Fijar"}
        </button>
      </div>
    </section>
  );
}

export default function OutfitBuilder({
  poses,
  garments,
  outfit,
  aiTryOnEnabled,
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
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [indices, setIndices] = useState<Record<string, number>>({});
  const [motions, setMotions] = useState<
    Record<string, { index: number; pixels: number }>
  >({});
  const [exporting, setExporting] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);
  const draggedLayer = useRef<number | null>(null);
  const pose = poses.find((candidate) => candidate.id === poseId);
  const anchors = pose?.anchors || defaultAnchors;
  const active = items.find((item) => item.instanceId === selected);
  const addedGarmentIds = useMemo(
    () => new Set(items.map((item) => item.garmentId)),
    [items],
  );
  const byZone = useMemo(
    () =>
      Object.fromEntries(
        zones.map((zone) => [
          zone,
          garments.filter((garment) => garment.zone === zone),
        ]),
      ) as Record<string, Garment[]>,
    [garments],
  );
  useEffect(() => {
    poses.forEach((candidate) =>
      void loadAsset(`/api/media/${candidate.mediaId}`).catch(() => undefined),
    );
    garments.forEach((garment) =>
      void loadAsset(`/api/media/${garment.mediaId}`).catch(() => undefined),
    );
  }, [garments, poses]);
  const previews = exporting
    ? []
    : zones.flatMap((zone) => {
        const choices = byZone[zone];
        if (!choices.length) return [];
        const motion = motions[zone];
        const index = wrapCarouselIndex(motion?.index ?? indices[zone] ?? 0, choices.length);
        const garment = choices[index];
        if (addedGarmentIds.has(garment.id)) return [];
        return [
          {
            garment,
            item: placementFor(garment, poseId, anchors),
            shift: motion?.pixels || 0,
          },
        ];
      });
  const searchResults = query.trim()
    ? garments
        .filter((garment) =>
          `${garment.name} ${garment.brand || ""} ${garment.subtype} ${zoneLabels[garment.zone] || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : [];
  function setZoneIndex(zone: string, next: number) {
    const length = byZone[zone].length;
    if (length)
      setIndices((old) => ({
        ...old,
        [zone]: wrapCarouselIndex(next, length),
      }));
  }
  function addZone(zone: string, activeIndex?: number) {
    const choices = byZone[zone];
    if (!choices.length) return;
    const index = wrapCarouselIndex(activeIndex ?? indices[zone] ?? 0, choices.length);
    const garment = choices[index];
    const existing = items.find((item) => item.garmentId === garment.id);
    if (existing) {
      setSelected(existing.instanceId);
      return;
    }
    const item = {
      ...placementFor(garment, poseId, anchors),
      instanceId: crypto.randomUUID(),
      layerOrder: items.length,
    };
    setItems((old) => appendUniqueGarment(old, item));
    setSelected(item.instanceId);
  }
  function changePose(nextPoseId: string) {
    setStageReady(false);
    setPoseId(nextPoseId);
    const nextPose = poses.find((candidate) => candidate.id === nextPoseId);
    setItems((old) =>
      applyPosePlacements(
        old,
        garments,
        nextPoseId,
        nextPose?.anchors || defaultAnchors,
      ),
    );
    setSelected(null);
  }
  function remove() {
    setItems((old) =>
      normalizeLayers(old.filter((item) => item.instanceId !== selected)),
    );
    setSelected(null);
    setAdjustOpen(false);
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
  function reorder(from: number, to: number) {
    const sorted = normalizeLayers(items);
    const [moved] = sorted.splice(from, 1);
    sorted.splice(to, 0, moved);
    setItems(normalizeLayers(sorted));
  }
  async function save() {
    if (!pose || !stageRef.current || !stageReady)
      return alert("Espera a que termine de cargar la pose");
    setBusy(true);
    setSelected(null);
    setExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const preview = await (
      await fetch(
        stageRef.current.toDataURL({ pixelRatio: 1.5, mimeType: "image/png" }),
      )
    ).blob();
    const data = {
      name: name.trim() || defaultOutfitName(),
      notes,
      poseId,
      items: serializeOutfitItems(items),
    };
    const fd = new FormData();
    fd.set("data", JSON.stringify(data));
    fd.set(
      "preview",
      new File([preview], "conjunto.png", { type: "image/png" }),
    );
    const response = await fetch(
      outfit ? `/api/outfits/${outfit.id}` : "/api/outfits",
      { method: outfit ? "PUT" : "POST", body: fd },
    );
    setExporting(false);
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
        <p>Sube, recorta y alinea una foto de cuerpo entero.</p>
        <Link className="btn btn-primary" href="/poses/nueva">
          Crear pose
        </Link>
      </div>
    );
  const bandTops: Record<string, number> = carouselBandPositions(anchors);
  return (
    <div className="try-studio real-carousel">
      <div className="try-topbar">
        <label className="compact-pose">
          {pose && <img src={`/api/media/${pose.mediaId}`} alt="" />}
          <select
            value={poseId}
            onChange={(event) => changePose(event.target.value)}
          >
            {poses.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <div className="try-search">
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar prenda…"
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((garment) => (
                <button
                  key={garment.id}
                  onClick={() => {
                    setZoneIndex(
                      garment.zone,
                      byZone[garment.zone].findIndex(
                        (candidate) => candidate.id === garment.id,
                      ),
                    );
                    setQuery("");
                  }}
                >
                  <img src={`/api/media/${garment.thumbId}`} alt="" />
                  <span>
                    {garment.name}
                    <small>{zoneLabels[garment.zone]}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          className="try-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre"
          aria-label="Nombre del conjunto"
          maxLength={80}
        />
        <div className="toolbar">
          <AiTryOnButton outfitId={outfit?.id} enabled={aiTryOnEnabled} compact/>
          <button
            className="icon-btn"
            title="Datos"
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
            aria-label="Guardar conjunto"
            disabled={busy || !items.length || !stageReady}
            onClick={() => void save()}
          >
            <Save />
            <span>{busy ? "…" : "Guardar"}</span>
          </button>
        </div>
      </div>
      <div className="try-space">
        {pose && (
          <BuilderStage
            pose={pose}
            items={items}
            garments={garments}
            previews={previews}
            selected={selected}
            setSelected={(value) => {
              setSelected(value);
              if (value) setAdjustOpen(false);
            }}
            setItems={setItems}
            stageRef={stageRef}
            setReady={setStageReady}
          />
        )}
        <div className="carousel-bands">
          {zones.map((zone) => (
            <CarouselBand
              key={zone}
              zone={zone}
              garments={byZone[zone]}
              index={indices[zone] || 0}
              top={bandTops[zone]}
              onIndex={(index) => setZoneIndex(zone, index)}
              onAdd={(index) => addZone(zone, index)}
              addedGarmentIds={addedGarmentIds}
              onMotion={(index, pixels) => {
                setMotions((old) => ({
                  ...old,
                  [zone]: {
                    index,
                    pixels: Math.max(-150, Math.min(150, pixels)),
                  },
                }));
              }}
            />
          ))}
        </div>
      </div>
      {active && (
        <div className="active-controls">
          <button
            className="icon-btn"
            title="Ajustar"
            onClick={() => setAdjustOpen(true)}
          >
            <SlidersHorizontal />
          </button>
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
          <button className="icon-btn danger" title="Quitar" onClick={remove}>
            <Trash2 />
          </button>
          <button
            className="icon-btn"
            title="Cerrar"
            onClick={() => setSelected(null)}
          >
            <X />
          </button>
        </div>
      )}
      {(layersOpen || detailsOpen || adjustOpen) && (
        <div
          className="sheet-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLayersOpen(false);
              setDetailsOpen(false);
              setAdjustOpen(false);
            }
          }}
        >
          <section className="bottom-sheet">
            <div className="sheet-head">
              <h2>
                {layersOpen
                  ? "Capas"
                  : adjustOpen
                    ? "Ajustar prenda"
                    : "Datos del conjunto"}
              </h2>
              <button
                className="icon-btn"
                onClick={() => {
                  setLayersOpen(false);
                  setDetailsOpen(false);
                  setAdjustOpen(false);
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
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="label">
                  Notas
                  <textarea
                    className="input"
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
              </>
            ) : adjustOpen && active ? (
              <div className="adjust-grid">
                <label className="range-row">
                  <span>Ancho</span>
                  <input
                    type="range"
                    min=".08"
                    max="2.5"
                    step=".01"
                    value={active.scaleX}
                    onChange={(event) =>
                      updateActive({ scaleX: +event.target.value })
                    }
                  />
                  <b>{active.scaleX.toFixed(2)}</b>
                </label>
                <label className="range-row">
                  <span>Alto</span>
                  <input
                    type="range"
                    min=".08"
                    max="2.5"
                    step=".01"
                    value={active.scaleY}
                    onChange={(event) =>
                      updateActive({ scaleY: +event.target.value })
                    }
                  />
                  <b>{active.scaleY.toFixed(2)}</b>
                </label>
                <label className="range-row">
                  <span>Giro</span>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    value={active.rotation}
                    onChange={(event) =>
                      updateActive({ rotation: +event.target.value })
                    }
                  />
                  <b>{active.rotation}°</b>
                </label>
                <label className="range-row">
                  <span>Opacidad</span>
                  <input
                    type="range"
                    min=".1"
                    max="1"
                    step=".05"
                    value={active.opacity}
                    onChange={(event) =>
                      updateActive({ opacity: +event.target.value })
                    }
                  />
                  <b>{Math.round(active.opacity * 100)}%</b>
                </label>
              </div>
            ) : (
              <div className="layer-list">
                {normalizeLayers(items).map((item, index) => {
                  const garment = garments.find(
                    (candidate) => candidate.id === item.garmentId,
                  )!;
                  return (
                    <div
                      className="layer-row-edit"
                      key={item.instanceId}
                      draggable
                      onDragStart={() => {
                        draggedLayer.current = index;
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggedLayer.current !== null)
                          reorder(draggedLayer.current, index);
                        draggedLayer.current = null;
                      }}
                    >
                      <GripVertical />
                      <img src={`/api/media/${garment.thumbId}`} alt="" />
                      <button
                        onClick={() => {
                          setSelected(item.instanceId);
                          setLayersOpen(false);
                        }}
                      >
                        {garment.name}
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => {
                          setSelected(item.instanceId);
                          setItems((old) =>
                            moveLayer(normalizeLayers(old), index, -1),
                          );
                        }}
                      >
                        <ArrowDown />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => {
                          setSelected(item.instanceId);
                          setItems((old) =>
                            moveLayer(normalizeLayers(old), index, 1),
                          );
                        }}
                      >
                        <ArrowUp />
                      </button>
                    </div>
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
