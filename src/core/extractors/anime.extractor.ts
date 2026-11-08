import type { AnimeEpisode, AnimeSearchResult, DirectStreamResult, SubtitleTrack } from './types';

const BASE_URL = 'https://hianime.at';
const TIMEOUT_MS = 10000;

/**
 * XOR deobfuscation function using the key "otaku-embed-v1".
 * Reverses the obfuscation used in ani-cli / otaku embed providers.
 */
export function deobfuscateOtakuBlob(base64Payload: string): string {
  const binaryString =
    typeof atob === 'function'
      ? atob(base64Payload)
      : Buffer.from(base64Payload, 'base64').toString('binary');
  const key = 'otaku-embed-v1';
  let result = '';
  for (let i = 0; i < binaryString.length; i++) {
    const charCode = binaryString.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

/**
 * Resilient fetch helper that attempts direct request first,
 * falling back to public CORS proxies if running in a restricted browser context.
 */
async function fetchWithFallback(url: string, headers: Record<string, string> = {}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ...headers,
      },
      signal: controller.signal,
    });
    if (res.ok) {
      return await res.text();
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (primaryErr) {
    // If direct fetch fails (e.g. CORS in browser), attempt via CORS proxies
    const proxies = [
      (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
      (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
    ];

    for (const proxy of proxies) {
      try {
        const proxyRes = await fetch(proxy(url), { signal: controller.signal });
        if (proxyRes.ok) {
          return await proxyRes.text();
        }
      } catch {
        // Continue to next proxy
      }
    }

    throw primaryErr;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Searches HiAnime for an anime series or movie.
 * Corresponds to ani-cli search routine.
 */
export async function searchAnime(query: string): Promise<AnimeSearchResult[]> {
  try {
    const searchUrl = `${BASE_URL}/search?keyword=${encodeURIComponent(query.trim())}`;
    const html = await fetchWithFallback(searchUrl);

    const results: AnimeSearchResult[] = [];

    // Browser DOMParser approach
    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const items = doc.querySelectorAll('.film_list-wrap .flw-item');

      items.forEach((item) => {
        const titleLink = item.querySelector('.film-detail .film-name a');
        const posterImg = item.querySelector('.film-poster img');

        if (titleLink) {
          const href = titleLink.getAttribute('href') || '';
          const id = href.replace(/^\/watch\//, '').replace(/^\/detail\//, '').split('?')[0];
          const title = titleLink.getAttribute('title') || titleLink.textContent?.trim() || '';
          const poster = posterImg?.getAttribute('data-src') || posterImg?.getAttribute('src') || undefined;

          if (id && title) {
            results.push({ id, title, poster });
          }
        }
      });

      if (results.length > 0) return results;
    }

    // Regex fallback for non-DOM / SSR environments
    const itemBlockRegex = /<div class="flw-item">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match: RegExpExecArray | null;

    while ((match = itemBlockRegex.exec(html)) !== null) {
      const block = match[1];
      const hrefMatch = block.match(/href="\/watch\/([^"?]+)/);
      const titleMatch = block.match(/title="([^"]+)"/) || block.match(/class="dynamic-name"[^>]*>([^<]+)<\/a>/);
      const posterMatch = block.match(/data-src="([^"]+)"/) || block.match(/src="([^"]+)"/);

      if (hrefMatch && titleMatch) {
        results.push({
          id: hrefMatch[1],
          title: titleMatch[1].trim(),
          poster: posterMatch ? posterMatch[1] : undefined,
        });
      }
    }

    return results;
  } catch (error) {
    console.warn('[anime.extractor] searchAnime failed:', error);
    return [];
  }
}

/**
 * Retrieves the episode list for a given anime slug or ID.
 * Uses HiAnime /api/theme/episode/list/${id}.
 */
export async function getAnimeEpisodes(animeSlug: string): Promise<AnimeEpisode[]> {
  try {
    // If slug ends with numeric id (e.g. solo-leveling-18718), extract it
    const idMatch = animeSlug.match(/(\d+)$/);
    const animeId = idMatch ? idMatch[1] : animeSlug;

    const apiUrl = `${BASE_URL}/api/theme/episode/list/${encodeURIComponent(animeId)}`;
    const raw = await fetchWithFallback(apiUrl, { 'X-Requested-With': 'XMLHttpRequest' });

    let html = raw;
    try {
      const json = JSON.parse(raw);
      if (json.html) html = json.html;
    } catch {
      // raw was already HTML
    }

    const episodes: AnimeEpisode[] = [];

    // Browser DOMParser approach
    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const items = doc.querySelectorAll('.ep-item');

      items.forEach((item) => {
        const id = item.getAttribute('data-id') || item.getAttribute('data-number') || '';
        const number = item.getAttribute('data-number') || '';
        const title = item.getAttribute('title') || item.querySelector('.ep-name')?.textContent?.trim() || undefined;

        if (id) {
          episodes.push({
            id,
            number: number || episodes.length + 1,
            title,
          });
        }
      });

      if (episodes.length > 0) return episodes;
    }

    // Regex fallback
    const epRegex = /data-id="([^"]+)"[^>]*data-number="([^"]+)"(?:[^>]*title="([^"]+)")?/g;
    let match: RegExpExecArray | null;

    while ((match = epRegex.exec(html)) !== null) {
      episodes.push({
        id: match[1],
        number: match[2],
        title: match[3]?.trim(),
      });
    }

    return episodes;
  } catch (error) {
    console.warn('[anime.extractor] getAnimeEpisodes failed:', error);
    return [];
  }
}

/**
 * Resolves direct HLS stream (.m3u8) and subtitles for a specific episode.
 * Queries HiAnime servers endpoint, extracts ZokoAnime data-hash, decodes base64,
 * extracts window.__P and deobfuscates via XOR "otaku-embed-v1".
 */
export async function resolveAnimeStream(
  epId: string,
  dub = false
): Promise<DirectStreamResult | null> {
  try {
    // 1. Fetch servers list
    const serversUrl = `${BASE_URL}/api/theme/episode/servers?episodeId=${encodeURIComponent(epId)}`;
    const serversRaw = await fetchWithFallback(serversUrl, { 'X-Requested-With': 'XMLHttpRequest' });

    let serversHtml = serversRaw;
    try {
      const json = JSON.parse(serversRaw);
      if (json.html) serversHtml = json.html;
    } catch {
      // serversRaw was HTML
    }

    // 2. Identify target server (ZokoAnime / MegaCloud / preferred server)
    const targetType = dub ? 'dub' : 'sub';

    // Parse server element attributes (data-hash, data-id, data-server-id)
    let dataHash: string | null = null;
    let serverId: string | null = null;
    let embedUrl: string | null = null;

    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(serversHtml, 'text/html');
      const serverBlock = doc.querySelector(`.servers-${targetType}, .ps_-block-${targetType}`) || doc;
      
      // Look for ZokoAnime or any active server item
      const serverItem =
        serverBlock.querySelector('.server-item[data-server-name*="Zoko" i]') ||
        serverBlock.querySelector('.server-item[data-hash]') ||
        serverBlock.querySelector('.server-item');

      if (serverItem) {
        dataHash = serverItem.getAttribute('data-hash');
        serverId = serverItem.getAttribute('data-id') || serverItem.getAttribute('data-server-id');
      }
    }

    if (!dataHash) {
      // Regex search for data-hash and data-id
      const hashMatch = serversHtml.match(/data-hash="([^"]+)"/);
      if (hashMatch) dataHash = hashMatch[1];

      const idMatch = serversHtml.match(/class="[^"]*server-item[^"]*"[^>]*data-id="([^"]+)"/);
      if (idMatch) serverId = idMatch[1];
    }

    let obfuscatedBlob: string | null = null;

    // 3. If dataHash is base64 of an embed URL or endpoint
    if (dataHash) {
      try {
        const decoded = typeof atob === 'function' ? atob(dataHash) : Buffer.from(dataHash, 'base64').toString('utf-8');
        if (decoded.startsWith('http')) {
          embedUrl = decoded;
        } else if (decoded.startsWith('{') || decoded.includes('.m3u8')) {
          // dataHash is directly the payload or stream data
          obfuscatedBlob = dataHash;
        }
      } catch {
        // dataHash is not base64 or is a raw token
      }
    }

    // If we have a serverId and need the embed URL / sources
    if (!embedUrl && serverId) {
      try {
        const sourceResp = await fetchWithFallback(
          `${BASE_URL}/api/theme/episode/server?id=${encodeURIComponent(serverId)}`,
          { 'X-Requested-With': 'XMLHttpRequest' }
        );
        const sourceJson = JSON.parse(sourceResp);
        if (sourceJson.link) {
          embedUrl = sourceJson.link;
        }
      } catch {
        // Ignore and continue with whatever data is available
      }
    }

    // 4. If embedUrl found, fetch embed page and extract window.__P
    if (embedUrl) {
      try {
        const embedHtml = await fetchWithFallback(embedUrl, { Referer: BASE_URL });
        const pMatch = embedHtml.match(/(?:window\.__P|var\s+__P|let\s+__P|const\s+__P)\s*=\s*["']([^"']+)["']/);
        if (pMatch) {
          obfuscatedBlob = pMatch[1];
        }
      } catch (err) {
        console.warn('[anime.extractor] Failed to fetch embed page:', err);
      }
    }

    // If obfuscatedBlob was not found on embed page, check if dataHash itself was the blob
    if (!obfuscatedBlob && dataHash) {
      obfuscatedBlob = dataHash;
    }

    if (!obfuscatedBlob) {
      return null;
    }

    // 5. Deobfuscate using XOR key "otaku-embed-v1"
    let deobfuscated = '';
    try {
      deobfuscated = deobfuscateOtakuBlob(obfuscatedBlob);
    } catch (err) {
      console.warn('[anime.extractor] XOR deobfuscation failed:', err);
      return null;
    }

    let streamUrl = '';
    const subtitles: SubtitleTrack[] = [];

    // 6. Parse deobfuscated payload (JSON or direct stream string)
    try {
      const parsed = JSON.parse(deobfuscated);

      if (Array.isArray(parsed.sources) && parsed.sources.length > 0) {
        streamUrl = parsed.sources[0].file || parsed.sources[0].url || '';
      } else if (typeof parsed.file === 'string') {
        streamUrl = parsed.file;
      }

      if (Array.isArray(parsed.tracks)) {
        for (const track of parsed.tracks) {
          if (track.file && (track.kind === 'captions' || track.kind === 'subtitles' || track.file.endsWith('.vtt'))) {
            subtitles.push({
              url: track.file,
              label: track.label || track.language || 'Subtitles',
              lang: track.kind || 'en',
              default: Boolean(track.default),
            });
          }
        }
      }
    } catch {
      // If deobfuscated string is not JSON, check for direct .m3u8 URL inside
      const m3u8Match = deobfuscated.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
      if (m3u8Match) {
        streamUrl = m3u8Match[0];
      }
    }

    if (!streamUrl) {
      return null;
    }

    return {
      streamUrl,
      subtitles,
      headers: {
        Referer: embedUrl || `${BASE_URL}/`,
        Origin: BASE_URL,
      },
      serverName: 'ZokoAnime / HiAnime (Direct HLS)',
    };
  } catch (error) {
    console.warn('[anime.extractor] resolveAnimeStream error:', error);
    return null;
  }
}
