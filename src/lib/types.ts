export type EditorialStatus =
  | "collected"
  | "processed"
  | "ai_enriched"
  | "pending_validation"
  | "validated"
  | "published"
  | "archived"
  | "rejected";

export type CategorySlug =
  | "health-medicine"
  | "science-discovery"
  | "education"
  | "environment"
  | "wildlife"
  | "humanitarian"
  | "community"
  | "clean-energy"
  | "technology-for-good"
  | "accessibility"
  | "peace"
  | "culture"
  | "inspiring-people"
  | "economy-for-good";

export interface Source {
  id: string;
  name: string;
  url: string;
  feedUrl?: string;
  reliability: number;
  notes?: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: CategorySlug;
  status: EditorialStatus;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  originalLanguage: string;
  country?: string;
  keywords: string[];
  impactScore: number;
  credibilityScore: number;
  explainability: string;
  collectedAt: string;
  processedAt?: string;
  publishedAt?: string;
  validatedAt?: string;
  validatedBy?: string;
  featured?: boolean;
  imageUrl?: string;
  imageAlt?: string;
}

export interface StoreData {
  version: number;
  updatedAt: string;
  sources: Source[];
  articles: Article[];
}
