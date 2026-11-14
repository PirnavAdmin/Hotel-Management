export const BAR_SERVING_MEASURES = Object.freeze([
  "Single Peg (30 ml)",
  "Double Peg (60 ml)",
  "Large Peg (90 ml)",
  "Shot (30 ml)",
  "Small Glass (150 ml)",
  "Medium Glass (250 ml)",
  "Large Glass (300 ml)",
  "Pint (330 ml)",
  "Large Pint (500 ml)",
  "Bottle (330 ml)",
  "Bottle (500 ml)",
  "Bottle (650 ml)",
  "Bottle (750 ml)",
  "Bottle (1 L)",
  "Can (330 ml)",
  "Can (500 ml)",
  "Pitcher (1500 ml)",
  "Jug (2000 ml)",
  "Tower (3000 ml)",
]);

const keyOf = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]/g, "");

const aliases = new Map();
const alias = (canonical, ...values) => {
  [canonical, ...values].forEach((value) => aliases.set(keyOf(value), canonical));
};

alias("Single Peg (30 ml)", "30 ml (Single Peg)", "30ml single peg", "single peg 30ml", "single peg 30 ml");
alias("Double Peg (60 ml)", "60 ml (Double Peg)", "Peg (60 ml)", "Peg 60ml", "60ml double peg", "double peg 60ml", "double peg 60 ml");
alias("Large Peg (90 ml)", "90 ml (Large Peg)", "90ml large peg", "large peg 90ml", "large peg 90 ml");
alias("Shot (30 ml)", "30 ml (Shot)", "30 ml shot", "30ml shot", "shot 30 ml");
alias("Small Glass (150 ml)", "Glass (150 ml)", "150 ml glass", "150ml glass", "small glass 150ml");
alias("Medium Glass (250 ml)", "Glass (250 ml)", "250 ml glass", "250ml glass", "medium glass 250ml");
alias("Large Glass (300 ml)", "Glass (300 ml)", "300 ml glass", "300ml glass", "large glass 300ml");
alias("Pint (330 ml)", "Pint 330ml", "Pint 330 ml", "330 ml pint", "330ml pint");
alias("Large Pint (500 ml)", "Pint (500 ml)", "Pint 500ml", "Pint 500 ml", "500 ml pint", "500ml pint");
alias("Bottle (330 ml)", "Bottle 330ml", "Bottle 330 ml", "330 ml bottle", "330ml bottle");
alias("Bottle (500 ml)", "Bottle 500ml", "Bottle 500 ml", "500 ml bottle", "500ml bottle");
alias("Bottle (650 ml)", "Bottle 650ml", "Bottle 650 ml", "650 ml bottle", "650ml bottle");
alias("Bottle (750 ml)", "Bottle 750ml", "Bottle 750 ml", "750 ml bottle", "750ml bottle");
alias("Bottle (1 L)", "Bottle (1000 ml)", "Bottle (1000 ml / 1 L)", "Bottle 1000ml", "Bottle 1 litre", "1 L Bottle", "1000 ml bottle");
alias("Can (330 ml)", "Can 330ml", "Can 330 ml", "330 ml can", "330ml can");
alias("Can (500 ml)", "Can 500ml", "Can 500 ml", "500 ml can", "500ml can");
alias("Pitcher (1500 ml)", "Pitcher 1500ml", "Pitcher 1500 ml", "1.5 L Pitcher", "1500 ml pitcher");
alias("Jug (2000 ml)", "Jug 2000ml", "Jug 2000 ml", "2 L Jug", "2000 ml jug");
alias("Tower (3000 ml)", "Tower 3000ml", "Tower 3000 ml", "3 L Tower", "3000 ml tower");

export function normalizeBarServingMeasure(value) {
  const raw = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  return aliases.get(keyOf(raw)) || raw;
}

const measureValue = (entry) => {
  if (typeof entry === "string" || typeof entry === "number") return String(entry).trim();
  if (!entry || typeof entry !== "object") return "";
  return String(entry.measure ?? entry.servingMeasure ?? entry.servingVolume ?? entry.name ?? entry.value ?? "").trim();
};

/** Combines standard, API, and saved custom measures into a normalized unique option list. */
export function mergeBarServingMeasures(apiMeasures = [], drinks = []) {
  const unique = new Map();
  const add = (entry) => {
    const value = normalizeBarServingMeasure(measureValue(entry));
    const key = keyOf(value);
    if (!value || key === "custommeasure" || unique.has(key)) return;
    unique.set(key, value);
  };

  BAR_SERVING_MEASURES.forEach(add);
  (Array.isArray(apiMeasures) ? apiMeasures : []).forEach(add);
  (Array.isArray(drinks) ? drinks : []).forEach((drink) => add(drink?.measure ?? drink?.servingMeasure ?? drink?.servingVolume));
  return Array.from(unique.values());
}
