/**
 * PelisStream v2 - Hero Banner Component
 * 10-Foot UI Cinematic Showcase with Gradient Scrims and Remote Action Buttons.
 */

import { ContentItem } from '../types';

export function renderHero(item: ContentItem): string {
  const durationOrSeason = item.type === 'movie' 
    ? item.duration || '2h 15m'
    : `${item.seasons?.length || 1} Temporadas`;

  const audioBadges = item.audio.join(' · ');

  return `
    <section class="tv-hero" id="hero-banner" data-content-id="${item.id}">
      <!-- Cinematic Backdrop Image -->
      <div class="tv-hero-backdrop" style="background-image: url('${item.backdropUrl}');" aria-hidden="true"></div>
      
      <!-- Linear Gradient Scrims for TV text contrast -->
      <div class="tv-hero-scrim-left" aria-hidden="true"></div>
      <div class="tv-hero-scrim-bottom" aria-hidden="true"></div>
      <div class="tv-hero-scrim-top" aria-hidden="true"></div>

      <!-- Hero Content & 10-Foot Typography -->
      <div class="tv-hero-content">
        <!-- Badge row -->
        <div class="tv-hero-badge-row">
          <span class="tv-badge tv-badge-4k">${item.quality}</span>
          <span class="tv-badge tv-badge-latino">AUDIO ${audioBadges.toUpperCase()}</span>
          <span class="tv-badge tv-badge-subtle">${item.ageRating}</span>
        </div>

        <!-- 3rem Display Title -->
        <h1 class="tv-hero-title">${item.title}</h1>

        <!-- Metadata chips -->
        <div class="tv-hero-metadata">
          <div class="tv-badge tv-badge-imdb">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span>${item.ratingImdb.toFixed(1)}</span>
          </div>

          <span class="tv-hero-meta-dot"></span>
          <span class="tv-hero-meta-item">${item.year}</span>
          <span class="tv-hero-meta-dot"></span>
          <span class="tv-hero-meta-item">${durationOrSeason}</span>
          <span class="tv-hero-meta-dot"></span>
          <span class="tv-hero-meta-item">${item.genres.slice(0, 3).join(' / ')}</span>
        </div>

        <!-- 3-line clamped synopsis -->
        <p class="tv-hero-synopsis tv-clamp-3">
          ${item.synopsis}
        </p>

        <!-- Focusable Remote Buttons -->
        <div class="tv-hero-actions" data-nav-row="hero-actions">
          <button 
            type="button"
            class="tv-btn tv-btn-primary tv-focusable" 
            id="hero-btn-play"
            data-action="play" 
            data-content-id="${item.id}"
            tabindex="0"
          >
            <svg class="tv-btn-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span>Reproducir Ahora</span>
          </button>

          <button 
            type="button"
            class="tv-btn tv-btn-secondary tv-focusable" 
            id="hero-btn-details"
            data-action="details" 
            data-content-id="${item.id}"
            tabindex="0"
          >
            <svg class="tv-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>Ficha & Capítulos</span>
          </button>

          <button 
            type="button"
            class="tv-btn tv-btn-secondary tv-focusable" 
            id="hero-btn-list"
            data-action="watchlist" 
            data-content-id="${item.id}"
            tabindex="0"
          >
            <svg class="tv-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>Mi Lista</span>
          </button>
        </div>
      </div>
    </section>
  `;
}
