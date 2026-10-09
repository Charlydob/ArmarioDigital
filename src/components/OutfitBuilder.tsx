"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Image as KImage, Layer, Stage, Transformer } from "react-konva";
import Konva from "konva";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import FavoriteButton from "./FavoriteButton";
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
import { defaultAnchors, type PoseAnchors, zoneLabels, subtypeLabels } from "@/lib/labels";
import { carouselBandPositions, wrapCarouselIndex } from "@/lib/outfitCarousel";
import { defaultOutfitName } from "@/lib/outfitName";
import {
  appendUniqueGarment,
  applyPosePlacements,
  placementRenderSize,
  resolveFlatPlacement,
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
type Pose = { favorite: boolean; id: string; name: string; mediaId: string; anchors: PoseAnchors };
type Garment = {
  favorite: boolean;
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
  userId: string;
  poses: Pose[];
  garments: Garment[];
  aiTryOnEnabled: boolean;
  startWithoutPose?: boolean;
  outfit: null | {
    id: string;
    name: string;
    notes: string;
    poseId: string | null;
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
          image.onload = async () => {
            try { await image.decode(); entry.image = image; resolve(image); }
            catch { URL.revokeObjectURL(objectUrl); reject(new Error("Imagen no válida")); }
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
  const placement = poseId
    ? resolveGarmentPlacement(garment, poseId, anchors)
    : resolveFlatPlacement(garment);
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
  onFrame,
}: {
  pose?: Pose;
  items: Item[];
  garments: Garment[];
  previews: Preview[];
  selected: string | null;
  setSelected: (value: string | null) => void;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  stageRef: React.RefObject<Konva.Stage | null>;
  setReady: (ready: boolean) => void;
  onFrame: (frame: { width: number; height: number; top: number; left: number }) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const person = useAsset(pose ? `/api/media/${pose.mediaId}` : undefined);
  useEffect(() => setReady(!pose || Boolean(person)), [person, pose, setReady]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = new ResizeObserver(() => {
      const nextWidth = Math.min(570, element.clientWidth, element.clientHeight * 0.75);
      setWidth(nextWidth);
      onFrame({ width: nextWidth, height: nextWidth * 4 / 3, top: (element.clientHeight - nextWidth * 4 / 3) / 2, left: (element.clientWidth - nextWidth) / 2 });
    });
    resize.observe(element);
    return () => resize.disconnect();
  }, [onFrame]);
  useLayoutEffect(() => {
    const element = container.current;
    if (element) onFrame({ width, height: width * 4 / 3, top: (element.clientHeight - width * 4 / 3) / 2, left: (element.clientWidth - width) / 2 });
  }, [width, onFrame]);
  const ratio = width / 900;
  return (
    <div className={`try-canvas ${pose ? "with-pose" : "flat-outfit"}`} ref={container}>
      {pose ? <img
        className="pose-fallback"
        src={`/api/media/${pose.mediaId}`}
        alt={pose.name}
      /> : <span className="flat-outfit-label">Composición sin pose</span>}
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

type Frame = { width: number; height: number; top: number; left: number };

// The slider owns physical motion. React only observes a crossed snap, never pixels.
function CarouselBand({ zone, garments, index, top, onIndex, onAdd, addedGarmentIds,
  poseId, anchors, frame, panel, onFavorite, assets,
}: {
  zone: string; garments: Garment[]; index: number; top: number;
  onIndex: (index: number) => void; onAdd: (index: number) => void;
  addedGarmentIds: Set<string>; poseId: string; anchors: PoseAnchors; frame: Frame;
  panel: boolean; onFavorite: (id: string, value: boolean) => void;
  assets: Map<string, HTMLImageElement>;
}) {
  const [visualIndex, setVisualIndex] = useState(index);
  const callbacks = useRef({ onIndex, onAdd });
  useLayoutEffect(() => { callbacks.current = { onIndex, onAdd }; }, [onIndex, onAdd]);
  const currentIndex = useRef(index);
  const [sliderRef, slider] = useKeenSlider<HTMLDivElement>({
    mode: "free-snap", rubberband: false, loop: false, renderMode: "performance",
    initial: 0, slides: { perView: panel ? 1.7 : 1.5, origin: "center", spacing: 0 },
    slideChanged(api) {
      const next = api.track.details.rel;
      currentIndex.current = next;
      setVisualIndex(next);
      callbacks.current.onIndex(next);
    },
  });
  const ids = garments.map(g => g.id).join("|");
  useEffect(() => {
    // Rebuild when choices or viewport geometry change, never on selection.
    if (slider.current) slider.current.update({ ...slider.current.options }, Math.max(0, Math.min(index, garments.length - 1)));
    currentIndex.current = Math.max(0, Math.min(index, garments.length - 1));
    setVisualIndex(currentIndex.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, panel, frame.width]);
  useEffect(() => {
    if (currentIndex.current !== index) {
      slider.current?.moveToIdx(index);
      currentIndex.current = index;
    }
  }, [index, slider]);
  if (!garments.length) return panel ? <section className="panel-empty-zone" data-zone={zone}><span>{zoneLabels[zone]}</span><small>Sin prendas</small></section> : null;
  const safe = Math.min(visualIndex, garments.length - 1);
  const current = garments[safe];
  const ratio = frame.width / 900;
  return <section className={`selection-band ${panel ? "panel-band" : "body-band"}`} data-zone={zone}
    style={panel ? undefined : { top: top * frame.height, width: frame.width }}>
    <div className="band-controls" data-keen-slider-clickable>
      <span>{zoneLabels[zone]}</span>
      <FavoriteButton kind="garment" id={current.id} favorite={current.favorite} onChange={value => onFavorite(current.id, value)}/>
      <button className="pin-button" disabled={addedGarmentIds.has(current.id)} onClick={() => callbacks.current.onAdd(currentIndex.current)}>
        {addedGarmentIds.has(current.id) ? <Check size={12}/> : "+"} {addedGarmentIds.has(current.id) ? "Añadida" : "Fijar"}
      </button>
    </div>
    <div ref={sliderRef} className="keen-slider garment-slider" aria-label={zoneLabels[zone]}>
      {garments.map((garment, i) => {
        const image = assets.get(garment.mediaId)!;
        const placement = placementFor(garment, poseId, anchors);
        const size = placementRenderSize(image.naturalWidth, image.naturalHeight, placement);
        return <div className="keen-slider__slide garment-slide" key={garment.id} data-garment={garment.id}>
          <button type="button" className="garment-choice" aria-label={garment.name} aria-pressed={i === safe} onClick={() => slider.current?.moveToIdx(i)}>
            <img src={image.src} alt={garment.name} draggable={false}
              className={panel ? "panel-png" : "placed-png"}
              style={panel ? undefined : {
                width: size.width * ratio, height: size.height * ratio,
                left: `calc(50% + ${(placement.x - 450) * ratio}px)`,
                top: (placement.y - top * 1200) * ratio,
                transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                opacity: addedGarmentIds.has(garment.id) ? 0 : placement.opacity,
              }}/>
          </button>
        </div>;
      })}
    </div>
    {panel && <span className="panel-selection-name">{current.name}</span>}
  </section>;
}

export default function OutfitBuilder({
  userId,
  poses,
  garments: initialGarments,
  outfit,
  aiTryOnEnabled,
  startWithoutPose = false,
}: OutfitBuilderData) {
  const router = useRouter();
  const [garments, setGarments] = useState(initialGarments);
  const [poseFavorites, setPoseFavorites] = useState<Record<string, boolean>>({});
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favoritesFirst, setFavoritesFirst] = useState(true);
  const [viewMode, setViewMode] = useState<"body" | "panel">(() => typeof window !== "undefined" && localStorage.getItem(`armario-view-${userId}`) === "panel" ? "panel" : "body");
  const [assets, setAssets] = useState<Map<string, HTMLImageElement> | null>(null);
  const [assetError, setAssetError] = useState(false);
  const [assetAttempt, setAssetAttempt] = useState(0);
  const [frame, setFrame] = useState<Frame>({ width: 360, height: 480, top: 0, left: 0 });
  function changeView(mode: "body" | "panel") {
    setViewMode(mode); localStorage.setItem(`armario-view-${userId}`, mode);
  }
  function favoriteGarment(id: string, favorite: boolean) {
    const garment = garments.find(g => g.id === id);
    const next = garments.map(g => g.id === id ? { ...g, favorite } : g);
    if (garment) {
      const choices = next.filter(g => g.zone === garment.zone && (!onlyFavorites || g.favorite))
        .sort((a,b) => favoritesFirst ? Number(b.favorite) - Number(a.favorite) : 0);
      setIndices(old => ({ ...old, [garment.zone]: Math.max(0, choices.findIndex(g => g.id === id)) }));
    }
    setGarments(next);
  }
  const [poseId, setPoseId] = useState(
    outfit ? outfit.poseId || "" : startWithoutPose ? "" : poses[0]?.id || "",
  );
  const [items, setItems] = useState<Item[]>(
    () =>
      outfit?.items.map((item) => ({
        ...item,
        poseId: outfit.poseId || "",
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
  const [exporting, setExporting] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);
  const draggedLayer = useRef<number | null>(null);
  const pose = poses.find((candidate) => candidate.id === poseId);
  const anchors = pose?.anchors || defaultAnchors;
  const sortedPoses = [...poses].filter(p => !onlyFavorites || (poseFavorites[p.id] ?? p.favorite) || p.id === poseId)
    .sort((a,b) => favoritesFirst ? Number(poseFavorites[b.id] ?? b.favorite) - Number(poseFavorites[a.id] ?? a.favorite) : 0);

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
          garments.filter((garment) => garment.zone === zone && (!onlyFavorites || garment.favorite))
            .sort((a,b) => favoritesFirst ? Number(b.favorite) - Number(a.favorite) : 0),
        ]),
      ) as Record<string, Garment[]>,
    [garments, onlyFavorites, favoritesFirst],
  );
  useEffect(() => {
    let alive = true;
    Promise.all(initialGarments.map(async g => [g.mediaId, await loadAsset(`/api/media/${g.mediaId}`)] as const))
      .then(entries => { if (alive) setAssets(new Map(entries)); })
      .catch(() => { if (alive) setAssetError(true); });
    return () => { alive = false; };
  }, [initialGarments, assetAttempt]);
  const previews = exporting || viewMode !== "panel" || !assets ? [] : zones.flatMap(zone => {
    const choices = byZone[zone];
    const garment = choices[wrapCarouselIndex(indices[zone] || 0, choices.length)];
    return !garment || addedGarmentIds.has(garment.id) ? [] : [{ garment, item: placementFor(garment, poseId, anchors), shift: 0 }];
  });
  const searchResults = query.trim()
    ? garments
        .filter((garment) =>
          `${garment.name} ${garment.brand || ""} ${garment.subtype} ${subtypeLabels[garment.subtype] || ""} ${zoneLabels[garment.zone] || ""}`
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
    if (!stageRef.current || !stageReady || !assets)
      return alert("Espera a que termine de cargar la composición");
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
      poseId: poseId || null,
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
  const bandTops: Record<string, number> = carouselBandPositions(anchors);
  return (
    <div className={`try-studio real-carousel selection-studio ${viewMode === "panel" ? "panel-mode" : "body-mode"}`}>
      <div className="try-topbar">
        <label className="compact-pose">
          {pose && <img src={`/api/media/${pose.mediaId}`} alt="" />}
          <select
            value={poseId}
            onChange={(event) => changePose(event.target.value)}
          >
            <option value="">Sin pose · composición flotante</option>
            {sortedPoses.map((option) => (
              <option key={option.id} value={option.id}>
                {(poseFavorites[option.id] ?? option.favorite) ? "♥ " : ""}{option.name}
              </option>
            ))}
          </select>
          {pose && <FavoriteButton kind="pose" id={pose.id} favorite={poseFavorites[pose.id] ?? pose.favorite} onChange={value => setPoseFavorites(old => ({ ...old, [pose.id]: value }))}/>}
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
                    if (onlyFavorites && !garment.favorite) setOnlyFavorites(false);
                    setZoneIndex(
                      garment.zone,
                      garments.filter(g => g.zone === garment.zone && (!onlyFavorites || !garment.favorite || g.favorite)).sort((a,b) => favoritesFirst ? Number(b.favorite) - Number(a.favorite) : 0).findIndex(g => g.id === garment.id),
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
            disabled={busy || !items.length || !stageReady || !assets}
            onClick={() => void save()}
          >
            <Save />
            <span>{busy ? "…" : "Guardar"}</span>
          </button>
        </div>
      </div>
      <div className="selection-options">
        <div className="view-toggle" aria-label="Modo del probador"><button aria-pressed={viewMode === "body"} onClick={() => changeView("body")}>Sobre cuerpo</button><button aria-pressed={viewMode === "panel"} onClick={() => changeView("panel")}>Panel</button></div>
        <label><input type="checkbox" checked={onlyFavorites} onChange={e => { setOnlyFavorites(e.target.checked); setIndices({}); }}/> Solo favoritos</label>
        <label><input type="checkbox" checked={favoritesFirst} onChange={e => { setFavoritesFirst(e.target.checked); setIndices({}); }}/> Favoritos primero</label>
      </div>
      <div className="try-space">
        <div className="body-stage-area">
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
            onFrame={setFrame}
          />
        </div>
        {!assets && <div className="asset-status" role="status">{assetError ? <><span>No se pudieron cargar las prendas.</span><button className="btn" onClick={() => { setAssetError(false); setAssetAttempt(n => n + 1); }}>Reintentar</button></> : "Preparando prendas…"}</div>}
        {assets && <div className={viewMode === "panel" ? "selection-panel" : "body-bands"}
          style={viewMode === "body" ? { width: frame.width, height: frame.height, top: frame.top, left: frame.left } : undefined}>
          {zones.map(zone => <CarouselBand key={zone} zone={zone} garments={byZone[zone]} index={indices[zone] || 0}
            top={bandTops[zone]} onIndex={index => setZoneIndex(zone, index)} onAdd={index => addZone(zone, index)}
            addedGarmentIds={addedGarmentIds} poseId={poseId} anchors={anchors} frame={frame} panel={viewMode === "panel"}
            onFavorite={favoriteGarment} assets={assets}/>) }
          {onlyFavorites && !zones.some(zone => byZone[zone].length) && <span className="empty">Marca prendas como favoritas para verlas aquí.</span>}
        </div>}
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
