import { fetchJson, stripHtml, toHttps } from './http';
import type { SearchProvider, SearchResult } from './types';

/** AniList GraphQL API（APIキー不要） https://docs.anilist.co/ */
const ENDPOINT = 'https://graphql.anilist.co';

const QUERY = /* GraphQL */ `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        title { native romaji english }
        startDate { year }
        seasonYear
        description(asHtml: false)
        coverImage { medium large extraLarge }
        studios(isMain: true) { nodes { name } }
      }
    }
  }
`;

interface AniListMedia {
  id: number;
  title: { native: string | null; romaji: string | null; english: string | null };
  startDate: { year: number | null } | null;
  seasonYear: number | null;
  description: string | null;
  coverImage: { medium: string | null; large: string | null; extraLarge: string | null } | null;
  studios: { nodes: { name: string }[] } | null;
}

interface AniListResponse {
  data: { Page: { media: AniListMedia[] } };
}

function toResult(m: AniListMedia): SearchResult {
  // 日本語タイトル（native）を優先
  const title = m.title.native || m.title.romaji || m.title.english || '(タイトル不明)';
  const subtitle = [m.title.romaji, m.title.english].find((t) => t && t !== title) ?? undefined;
  const studios = m.studios?.nodes.map((n) => n.name).join('、');
  return {
    source: 'anilist',
    externalId: String(m.id),
    mediaType: 'anime',
    title,
    subtitle,
    year: m.seasonYear ?? m.startDate?.year ?? undefined,
    creator: studios || undefined,
    synopsis: stripHtml(m.description),
    thumbnailUrl: toHttps(m.coverImage?.medium ?? m.coverImage?.large ?? undefined),
    imageUrl: toHttps(m.coverImage?.extraLarge ?? m.coverImage?.large ?? undefined),
  };
}

export const anilistProvider: SearchProvider = {
  source: 'anilist',
  mediaType: 'anime',
  label: 'AniList',
  pageUrl: (id) => `https://anilist.co/anime/${id}`,
  async search(query, opts) {
    const json = await fetchJson<AniListResponse>(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { search: query, perPage: 15 } }),
      signal: opts?.signal,
    });
    return json.data.Page.media.map(toResult);
  },
};
