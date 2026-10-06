export function defaultOutfitName(now = new Date()) {
  const date = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(now)
    .replace(",", " ·");
  return `Look ${date}`;
}
