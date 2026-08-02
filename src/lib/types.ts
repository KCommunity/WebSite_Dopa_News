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

/** One reporting outlet / URL backing a news item. */
export interface ArticleSource {
  id?: string;
  name: string;
  url: string;
  reliability?: number;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: CategorySlug;
  status: EditorialStatus;
  /** Primary source kept for backward compatibility. */
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  /** One or several sources for this news item. */
  sources?: ArticleSource[];
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
  discoveryMethod?: "rss" | "web_search" | "seed";
  searchQuery?: string;
}

export interface StoreData {
  version: number;
  updatedAt: string;
  sources: Source[];
  articles: Article[];
}
