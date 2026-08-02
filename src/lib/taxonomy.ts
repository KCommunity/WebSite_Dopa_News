import type { CategorySlug } from "./types";

export interface CategoryDefinition {
  slug: CategorySlug;
  name: string;
  description: string;
  keywords: string[];
  synonyms: string[];
  related: CategorySlug[];
  examples: string[];
}

export const TAXONOMY: CategoryDefinition[] = [
  {
    slug: "health-medicine",
    name: "Health & Medicine",
    description: "Medical breakthroughs, public health wins, and lives improved by care.",
    keywords: ["vaccine", "treatment", "hospital", "cure", "clinical trial"],
    synonyms: ["healthcare", "medical progress"],
    related: ["science-discovery", "accessibility"],
    examples: ["New malaria vaccine rollout", "Cancer survival rates rise"],
  },
  {
    slug: "science-discovery",
    name: "Science & Discovery",
    description: "Research findings that expand knowledge and practical progress.",
    keywords: ["research", "discovery", "study", "laboratory", "breakthrough"],
    synonyms: ["scientific advance"],
    related: ["health-medicine", "technology-for-good"],
    examples: ["New exoplanet discovery with life-relevant chemistry"],
  },
  {
    slug: "education",
    name: "Education",
    description: "Better learning access, literacy, and educational innovation.",
    keywords: ["school", "literacy", "scholarship", "students", "learning"],
    synonyms: ["learning", "schools"],
    related: ["community", "accessibility"],
    examples: ["Free tutoring program lifts graduation rates"],
  },
  {
    slug: "environment",
    name: "Environment",
    description: "Restoration, climate solutions, and cleaner ecosystems.",
    keywords: ["reforestation", "restoration", "emissions", "conservation"],
    synonyms: ["climate", "nature recovery"],
    related: ["wildlife", "clean-energy"],
    examples: ["Mangrove forests restored along a coastline"],
  },
  {
    slug: "wildlife",
    name: "Wildlife",
    description: "Species protection, habitat recovery, and biodiversity wins.",
    keywords: ["endangered", "species", "habitat", "sanctuary", "wildlife"],
    synonyms: ["animals", "biodiversity"],
    related: ["environment"],
    examples: ["Once-endangered bird returns to nesting grounds"],
  },
  {
    slug: "humanitarian",
    name: "Humanitarian Action",
    description: "Aid, disaster response, and efforts that protect human dignity.",
    keywords: ["aid", "relief", "rescue", "refugees", "donation"],
    synonyms: ["relief", "aid work"],
    related: ["community", "peace"],
    examples: ["Emergency clinics reopen after flooding"],
  },
  {
    slug: "community",
    name: "Community",
    description: "Local initiatives that strengthen neighborhoods and belonging.",
    keywords: ["neighborhood", "volunteers", "mutual aid", "local"],
    synonyms: ["civic", "grassroots"],
    related: ["humanitarian", "inspiring-people"],
    examples: ["Neighbors convert vacant lot into shared garden"],
  },
  {
    slug: "clean-energy",
    name: "Clean Energy",
    description: "Safe renewable power and energy access improvements.",
    keywords: ["solar", "wind", "renewable", "grid", "battery"],
    synonyms: ["renewables", "green energy"],
    related: ["environment", "technology-for-good"],
    examples: ["Village gains reliable solar microgrid"],
  },
  {
    slug: "technology-for-good",
    name: "Technology for Good",
    description: "Technology that clearly benefits people and society.",
    keywords: ["assistive", "open source", "public benefit", "innovation"],
    synonyms: ["tech for good", "social tech"],
    related: ["accessibility", "science-discovery"],
    examples: ["Open navigation app helps blind travelers"],
  },
  {
    slug: "accessibility",
    name: "Accessibility",
    description: "Design and services that expand participation for everyone.",
    keywords: ["inclusive", "disability", "access", "captioning", "ramp"],
    synonyms: ["inclusion", "universal design"],
    related: ["technology-for-good", "education"],
    examples: ["City transit adds fully accessible stations"],
  },
  {
    slug: "peace",
    name: "Peace Initiatives",
    description: "Conflict reduction, reconciliation, and peaceful cooperation.",
    keywords: ["ceasefire", "dialogue", "reconciliation", "diplomacy"],
    synonyms: ["peacebuilding"],
    related: ["humanitarian", "community"],
    examples: ["Youth dialogue program reduces local tensions"],
  },
  {
    slug: "culture",
    name: "Culture",
    description: "Arts, heritage, and cultural achievements that uplift communities.",
    keywords: ["museum", "music", "heritage", "festival", "art"],
    synonyms: ["arts", "heritage"],
    related: ["inspiring-people", "community"],
    examples: ["Restored library becomes free arts hub"],
  },
  {
    slug: "inspiring-people",
    name: "Inspiring People",
    description: "Personal stories of courage, kindness, and meaningful progress.",
    keywords: ["hero", "kindness", "mentor", "rescuer", "advocate"],
    synonyms: ["human interest", "personal stories"],
    related: ["community", "humanitarian"],
    examples: ["Teacher funds lab equipment for rural school"],
  },
  {
    slug: "economy-for-good",
    name: "Economy for Good",
    description: "Fair economic developments that improve livelihoods.",
    keywords: ["jobs", "cooperative", "fair trade", "living wage"],
    synonyms: ["positive economy", "inclusive growth"],
    related: ["community", "education"],
    examples: ["Worker cooperative opens and hires locally"],
  },
];

export function getCategory(slug: CategorySlug): CategoryDefinition | undefined {
  return TAXONOMY.find((category) => category.slug === slug);
}

export function getCategoryName(slug: CategorySlug): string {
  return getCategory(slug)?.name ?? slug;
}
