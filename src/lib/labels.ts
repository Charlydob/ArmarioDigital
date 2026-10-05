export const zoneLabels: Record<string, string> = {
  HEAD: "Cabeza",
  TORSO: "Torso",
  LEGS: "Piernas",
  FEET: "Pies",
  ACCESSORY: "Accesorios",
};

export const subtypeLabels: Record<string, string> = {
  TOP: "Top",
  TSHIRT: "Camiseta",
  SHIRT: "Camisa",
  KNIT: "Punto",
  SWEATSHIRT: "Sudadera",
  JACKET: "Chaqueta",
  COAT: "Abrigo",
  DRESS: "Vestido",
  PANTS: "Pantalón",
  SKIRT: "Falda",
  SOCKS: "Calcetines",
  SHOES: "Zapatos",
  HAT: "Sombrero",
  GLASSES: "Gafas",
  BAG: "Bolso",
  SCARF: "Bufanda",
  JEWELRY: "Joyería",
  OTHER: "Otro",
};

export const defaultAnchors = {
  head: 0.1,
  shoulders: 0.23,
  torso: 0.4,
  hips: 0.54,
  knees: 0.76,
  feet: 0.95,
};
export type PoseAnchors = typeof defaultAnchors;

export function parseAnchors(value: unknown): PoseAnchors {
  if (!value || typeof value !== "object") return defaultAnchors;
  const data = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(defaultAnchors).map(([key, fallback]) => [
      key,
      typeof data[key] === "number"
        ? Math.max(0.02, Math.min(0.98, data[key] as number))
        : fallback,
    ]),
  ) as PoseAnchors;
}
