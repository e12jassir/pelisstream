import type { DirectStreamResult, MovieStreamRequest, SubtitleTrack } from './types';

const TIMEOUT_MS = 9000;

/**
 * Resilient fetch helper that handles timeouts and CORS proxies.
 */
async function safeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ...(init.headers || {}),
      },
    });
    if (res.ok) return res;
    throw new Error(`HTTP ${res.status}`);
  } catch (primaryErr) {
    // If in restricted browser environment, try via proxy
    const proxies = [
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    ];

    for (const proxy of proxies) {
      try {
        const proxyRes = await fetch(proxy(url), {
          ...init,
          signal: controller.signal,
        });
        if (proxyRes.ok) return proxyRes;
      } catch {
        // try next
      }
    }
    throw primaryErr;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Normalizes input request into a standard MovieStreamRequest.
 */
function normalizeRequest(input: MovieStreamRequest | string): MovieStreamRequest {
  if (typeof input === 'string') {
    return {
      imdbId: input,
      type: 'movie',
    };
  }
  return input;
}

/**
 * Fetches external VTT subtitles (Spanish, English, etc.) for a given IMDb ID.
 * Queries public subtitle API mirrors (e.g. Wyzie / OpenSubtitles mirror).
 */
export async function fetchSubtitlesForImdb(imdbId: string): Promise<SubtitleTrack[]> {
  if (!imdbId || !imdbId.startsWith('tt')) return [];

  const subtitles: SubtitleTrack[] = [];
  try {
    const res = await safeFetch(`https://sub.wyzie.ru/search?id=${encodeURIComponent(imdbId)}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.url && item.display) {
          subtitles.push({
            url: item.url,
            label: item.display,
            lang: item.lang || item.display.toLowerCase().slice(0, 2),
            default: item.lang === 'es' || item.lang === 'en',
          });
        }
      }
    }
  } catch {
    // Non-critical helper, fail silently
  }
  return subtitles;
}

/**
 * Candidate 1: EmbedSu API resolver
 */
async function resolveEmbedSu(req: MovieStreamRequest): Promise<DirectStreamResult | null> {
  const id = req.tmdbId || req.imdbId;
  if (!id) return null;

  const endpoint =
    req.type === 'series'
      ? `https://embed.su/api/e/tv/${id}/${req.season || 1}/${req.episode || 1}`
      : `https://embed.su/api/e/movie/${id}`;

  const res = await safeFetch(endpoint, {
    headers: {
      Referer: 'https://embed.su/',
      Origin: 'https://embed.su',
    },
  });

  const data = await res.json();
  const streamUrl = data?.source || data?.stream || data?.url;

  if (typeof streamUrl === 'string' && streamUrl.includes('.m3u8')) {
    const subtitles: SubtitleTrack[] = [];
    if (Array.isArray(data.subtitles)) {
      for (const sub of data.subtitles) {
        if (sub.file || sub.url) {
          subtitles.push({
            url: sub.file || sub.url,
            label: sub.label || sub.lang || 'Subtitle',
            lang: sub.lang || 'en',
            default: Boolean(sub.default),
          });
        }
      }
    }

    return {
      streamUrl,
      subtitles,
      headers: {
        Referer: 'https://embed.su/',
        Origin: 'https://embed.su',
      },
      serverName: 'EmbedSu (Direct HLS)',
    };
  }

  return null;
}

/**
 * Candidate 2: PlayLatin Embed / Internal Streams resolver
 */
async function resolvePlayLatin(req: MovieStreamRequest): Promise<DirectStreamResult | null> {
  const imdbId = req.imdbId;
  if (!imdbId) return null;

  const res = await safeFetch('https://playlatinsrc.co/api/embed-links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: 'https://playlatinsrc.co/',
    },
    body: JSON.stringify({
      type: req.type === 'series' ? 'tv' : 'movie',
      id: imdbId,
      season: req.season,
      episode: req.episode,
    }),
  });

  const data = await res.json();
  if (Array.isArray(data.links) || Array.isArray(data.servers)) {
    const list = data.links || data.servers;
    for (const item of list) {
      const link = item.link || item.url || item.file;
      if (typeof link === 'string' && link.includes('.m3u8')) {
        return {
          streamUrl: link,
          subtitles: [],
          headers: {
            Referer: 'https://playlatinsrc.co/',
          },
          serverName: `PlayLatin (${item.name || item.server || 'Direct'})`,
        };
      }
    }
  }

  return null;
}

/**
 * Candidate 3: VidSrc / RabbitStream page scraping for .m3u8
 */
async function resolveVidSrc(req: MovieStreamRequest): Promise<DirectStreamResult | null> {
  const imdbId = req.imdbId;
  if (!imdbId) return null;

  const url =
    req.type === 'series'
      ? `https://vidsrc.me/embed/tv?imdb=${encodeURIComponent(imdbId)}&season=${req.season || 1}&episode=${req.episode || 1}`
      : `https://vidsrc.me/embed/movie?imdb=${encodeURIComponent(imdbId)}`;

  const html = await (await safeFetch(url, { headers: { Referer: 'https://vidsrc.me/' } })).text();

  // Search for HLS master playlist URL in script sources
  const m3u8Match = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
  if (m3u8Match) {
    return {
      streamUrl: m3u8Match[0],
      subtitles: [],
      headers: {
        Referer: 'https://vidsrc.me/',
        Origin: 'https://vidsrc.me',
      },
      serverName: 'VidSrc Direct Stream',
    };
  }

  return null;
}

/**
 * Candidate 4: AutoEmbed HLS stream extractor
 */
async function resolveAutoEmbed(req: MovieStreamRequest): Promise<DirectStreamResult | null> {
  const imdbId = req.imdbId;
  if (!imdbId) return null;

  const url =
    req.type === 'series'
      ? `https://player.autoembed.me/embed/tv/${imdbId}/${req.season || 1}/${req.episode || 1}`
      : `https://player.autoembed.me/embed/movie/${imdbId}`;

  const html = await (await safeFetch(url, { headers: { Referer: 'https://player.autoembed.me/' } })).text();

  const m3u8Match = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
  if (m3u8Match) {
    return {
      streamUrl: m3u8Match[0],
      subtitles: [],
      headers: {
        Referer: 'https://player.autoembed.me/',
      },
      serverName: 'AutoEmbed Direct Stream',
    };
  }

  return null;
}

/**
 * Candidate 5: SmashyStream resolver
 */
async function resolveSmashyStream(req: MovieStreamRequest): Promise<DirectStreamResult | null> {
  const id = req.imdbId || req.tmdbId;
  if (!id) return null;

  const url =
    req.type === 'series'
      ? `https://embed.smashystream.com/cf.php?video_id=${id}&s=${req.season || 1}&e=${req.episode || 1}`
      : `https://embed.smashystream.com/cf.php?video_id=${id}`;

  const html = await (await safeFetch(url, { headers: { Referer: 'https://embed.smashystream.com/' } })).text();

  const m3u8Match = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
  if (m3u8Match) {
    return {
      streamUrl: m3u8Match[0],
      subtitles: [],
      headers: {
        Referer: 'https://embed.smashystream.com/',
      },
      serverName: 'SmashyStream HLS',
    };
  }

  return null;
}

/**
 * Resolves direct HLS (.m3u8) stream and subtitles for movies and TV series.
 * Evaluates candidate sources sequentially with clean fallbacks.
 * Never throws uncaught exceptions; returns null if all sources fail.
 */
export async function resolveMovieStream(
  input: MovieStreamRequest | string
): Promise<DirectStreamResult | null> {
  const req = normalizeRequest(input);

  const candidateResolvers: Array<() => Promise<DirectStreamResult | null>> = [
    () => resolveEmbedSu(req),
    () => resolvePlayLatin(req),
    () => resolveVidSrc(req),
    () => resolveAutoEmbed(req),
    () => resolveSmashyStream(req),
  ];

  for (const resolver of candidateResolvers) {
    try {
      const result = await resolver();
      if (result && result.streamUrl) {
        // If subtitles are missing or empty, try enhancing with external subtitles
        if (result.subtitles.length === 0 && req.imdbId) {
          const externalSubs = await fetchSubtitlesForImdb(req.imdbId);
          if (externalSubs.length > 0) {
            result.subtitles = externalSubs;
          }
        }
        return result;
      }
    } catch (err) {
      // Gracefully catch and continue to the next candidate provider
      console.warn('[movie.extractor] Candidate resolver failed, trying fallback:', err);
    }
  }

  return null;
}
