import {
  GOOGLE_NEWS_RECENCY,
  POSITIVE_NEWS_TERMS,
} from "./editorial-focus";

export type FocusRegionId =
  | "europe"
  | "north-america"
  | "nordic"
  | "russia"
  | "china";

export interface FocusRegion {
  id: FocusRegionId;
  label: string;
  /** Terms used in Google News queries */
  queryTerms: string;
  /** Extra locale hints for Google News RSS */
  locales: Array<{ hl: string; gl: string; ceid: string }>;
}

/** Priority regions for Dopa News collection. */
export const FOCUS_REGIONS: FocusRegion[] = [
  {
    id: "europe",
    label: "Europe",
    queryTerms:
      "Europe OR European OR EU OR Germany OR France OR Spain OR Italy OR Netherlands OR Poland OR UK OR Britain",
    locales: [
      { hl: "en-GB", gl: "GB", ceid: "GB:en" },
      { hl: "en-US", gl: "US", ceid: "US:en" },
    ],
  },
  {
    id: "north-america",
    label: "North America",
    queryTerms: "USA OR \"United States\" OR Canada OR \"North America\" OR American OR Canadian",
    locales: [
      { hl: "en-US", gl: "US", ceid: "US:en" },
      { hl: "en-CA", gl: "CA", ceid: "CA:en" },
    ],
  },
  {
    id: "nordic",
    label: "Nordic countries",
    queryTerms:
      "Nordic OR Scandinavia OR Sweden OR Norway OR Denmark OR Finland OR Iceland OR Swedish OR Norwegian OR Danish OR Finnish",
    locales: [
      { hl: "en-US", gl: "US", ceid: "US:en" },
      { hl: "sv", gl: "SE", ceid: "SE:sv" },
    ],
  },
  {
    id: "russia",
    label: "Russia",
    queryTerms: "Russia OR Russian OR Moscow OR Siberia",
    locales: [
      { hl: "en-US", gl: "US", ceid: "US:en" },
      { hl: "ru", gl: "RU", ceid: "RU:ru" },
    ],
  },
  {
    id: "china",
    label: "China",
    queryTerms: "China OR Chinese OR Beijing OR Shanghai",
    locales: [
      { hl: "en-US", gl: "US", ceid: "US:en" },
      { hl: "zh-CN", gl: "CN", ceid: "CN:zh-Hans" },
    ],
  },
];

export { POSITIVE_NEWS_TERMS, DEFAULT_WEB_SEARCH_TOPIC } from "./editorial-focus";

export function buildRegionalSearchQuery(
  region: FocusRegion,
  topicHint?: string,
): string {
  const topic = topicHint?.trim()
    ? `(${topicHint.trim()})`
    : POSITIVE_NEWS_TERMS;
  // when:7d keeps results to the last week from newspapers and news sites.
  return `${topic} (${region.queryTerms}) ${GOOGLE_NEWS_RECENCY}`;
}
