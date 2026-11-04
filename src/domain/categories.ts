/**
 * Knowledge categories and disciplinary families.
 *
 * The 12 categories are the user-facing filters. Because 12 hues cannot be
 * told apart reliably on a map (especially with colour-vision deficiencies),
 * markers encode the *disciplinary family* (3 families) with both colour and
 * shape; the exact category is always available as text (tooltip, list,
 * detail panel). Colours are fixed per family and never re-assigned by filters.
 */

export const CATEGORY_IDS = [
  "history-geopolitics",
  "science-mathematics",
  "medicine-health",
  "technology-inventions",
  "philosophy-thought",
  "arts-culture",
  "economy-trade",
  "society-demography",
  "environment-nature",
  "disasters-accidents",
  "archaeology-civilizations",
  "religions-cultural-change",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export const FAMILY_IDS = ["knowledge", "societies", "earth"] as const;
export type FamilyId = (typeof FAMILY_IDS)[number];

export type MarkerShape = "circle" | "square" | "triangle";

export interface FamilyDefinition {
  id: FamilyId;
  /** Fixed categorical slot (1-based) in the validated palette. */
  slot: 1 | 2 | 3;
  shape: MarkerShape;
  color: { light: string; dark: string };
}

/**
 * Palette slots 1–3 of the reference categorical palette; validated all-pairs
 * (CVD ΔE ≥ 9.2, normal-vision ΔE ≥ 20.9) against both map land surfaces.
 */
export const FAMILIES: Record<FamilyId, FamilyDefinition> = {
  knowledge: { id: "knowledge", slot: 1, shape: "circle", color: { light: "#2a78d6", dark: "#3987e5" } },
  societies: { id: "societies", slot: 2, shape: "square", color: { light: "#eb6834", dark: "#d95926" } },
  earth: { id: "earth", slot: 3, shape: "triangle", color: { light: "#1baf7a", dark: "#199e70" } },
};

export const CATEGORY_FAMILY: Record<CategoryId, FamilyId> = {
  "science-mathematics": "knowledge",
  "medicine-health": "knowledge",
  "technology-inventions": "knowledge",
  "philosophy-thought": "knowledge",
  "arts-culture": "knowledge",
  "history-geopolitics": "societies",
  "economy-trade": "societies",
  "society-demography": "societies",
  "archaeology-civilizations": "societies",
  "religions-cultural-change": "societies",
  "environment-nature": "earth",
  "disasters-accidents": "earth",
};

export function familyOf(category: CategoryId): FamilyDefinition {
  return FAMILIES[CATEGORY_FAMILY[category]];
}

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}
