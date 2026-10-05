export type Transform = { x: number; y: number; scaleX: number; scaleY: number; rotation: number; opacity: number };

export function normalizeLayers<T extends { layerOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.layerOrder - b.layerOrder).map((item, layerOrder) => ({ ...item, layerOrder }));
}

export function moveLayer<T extends { layerOrder: number }>(items: T[], index: number, direction: -1 | 1): T[] {
  const sorted = normalizeLayers(items);
  const target = Math.max(0, Math.min(sorted.length - 1, index + direction));
  if (target === index) return sorted;
  [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
  return sorted.map((item, layerOrder) => ({ ...item, layerOrder }));
}

export function clampTransform(t: Transform): Transform {
  return {
    x: Math.max(-900, Math.min(1800, t.x)),
    y: Math.max(-1200, Math.min(2400, t.y)),
    scaleX: Math.max(0.05, Math.min(8, t.scaleX)),
    scaleY: Math.max(0.05, Math.min(8, t.scaleY)),
    rotation: Math.max(-180, Math.min(180, t.rotation)),
    opacity: Math.max(0.05, Math.min(1, t.opacity)),
  };
}

export const zoneCrop: Record<string, string> = {
  HEAD: "50% 10%", TORSO: "50% 35%", LEGS: "50% 67%", FEET: "50% 94%", ACCESSORY: "50% 42%",
};
