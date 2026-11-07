/**
 * PelisStream v2 - Card Components
 * Standard 2:3 Movie Cards and 16:9 Episode Cards.
 * Hardware-accelerated scaling and high-contrast badges for TV screens.
 */

import { ContentItem, Episode } from '../types';

export function renderMovieCard(item: ContentItem, railId: string, index: number): string {
  // Badges logic
  const isLatino = item.audio.includes('Latino');
  const qualityBadge = item.quality === '4K' ? '4K' : 'HD';

  // Series progress bar logic (for "Continuar viendo")
  const progressBarHtml = item.progress ? `
    <div class="tv-card-progress-bar" aria-hidden="true">
      <div class="tv-card-progress-fill" style="width: ${Math.min(100, Math.max(5, item.progress.percentage))}%;"></div>
    </div>
  ` : '';

  // Episode label if continuing a series
  const progressLabel = item.progress?.seasonNumber && item.progress?.episodeNumber
    ? `T${item.progress.seasonNumber}:E${item.progress.episodeNumber}`
    : item.year;

  return `
    <article 
      class="tv-card tv-focusable" 
      id="card-${railId}-${index}"
      data-content-id="${item.id}"
      data-rail-id="${railId}"
      data-card-index="${index}"
      tabindex="0"
      role="button"
      aria-label="${item.title} (${item.year}) - Calificación IMDb ${item.ratingImdb}"
    >
      <!-- Poster Container (2:3 aspect ratio) -->
      <div class="tv-card-poster-wrapper">
        <img 
          src="${item.posterUrl}" 
          alt="${item.title}" 
          class="tv-card-poster"
          loading="lazy"
          decoding="async"
        />

        <!-- Bottom Scrim for contrast -->
        <div class="tv-card-scrim" aria-hidden="true"></div>

        <!-- Badges Top Row -->
        <div class="tv-card-badges-top">
          <span class="tv-badge ${item.quality === '4K' ? 'tv-badge-4k' : 'tv-badge-hd'}">${qualityBadge}</span>
          ${isLatino ? '<span class="tv-badge tv-badge-latino">LATINO</span>' : ''}
        </div>

        <!-- Rating Bottom Left -->
        <div class="tv-card-badge-rating">
          <span class="tv-badge tv-badge-imdb">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span>${item.ratingImdb.toFixed(1)}</span>
          </span>
        </div>

        <!-- Progress bar if in progress -->
        ${progressBarHtml}
      </div>

      <!-- Card Information -->
      <div class="tv-card-info">
        <h3 class="tv-card-title tv-clamp-1">${item.title}</h3>
        <div class="tv-card-meta">
          <span>${progressLabel}</span>
          <span>•</span>
          <span>${item.genres[0] || 'Película'}</span>
        </div>
      </div>
    </article>
  `;
}

export function renderEpisodeCard(episode: Episode, _index: number = 0): string {
  return `
    <article 
      class="tv-episode-card tv-focusable" 
      id="episode-card-${episode.id}"
      data-episode-id="${episode.id}"
      data-episode-num="${episode.episodeNumber}"
      data-season-num="${episode.seasonNumber}"
      tabindex="0"
      role="button"
      aria-label="Episodio ${episode.episodeNumber}: ${episode.title} - Duración ${episode.duration}"
    >
      <div class="tv-episode-poster-wrapper">
        <img 
          src="${episode.thumbnailUrl}" 
          alt="${episode.title}" 
          class="tv-episode-poster"
          loading="lazy"
          decoding="async"
        />
        <span class="tv-episode-duration">${episode.duration}</span>
      </div>

      <div class="tv-card-info">
        <span class="tv-episode-number">Episodio ${episode.episodeNumber}</span>
        <h4 class="tv-card-title tv-clamp-1">${episode.title}</h4>
      </div>
    </article>
  `;
}
