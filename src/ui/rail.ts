/**
 * PelisStream v2 - Horizontal Rail Component
 * Netflix & Apple TV style horizontal rail with scrollLeft navigation.
 */

import { RailCategory } from '../types';
import { renderMovieCard } from './card';

export function renderRail(rail: RailCategory, railIndex: number): string {
  const cardsHtml = rail.items
    .map((item, itemIndex) => renderMovieCard(item, rail.id, itemIndex))
    .join('');

  const countBadge = rail.countLabel || `${rail.items.length} títulos`;

  return `
    <section 
      class="tv-rail" 
      id="rail-${rail.id}" 
      data-rail-id="${rail.id}"
      data-rail-index="${railIndex}"
      aria-labelledby="rail-title-${rail.id}"
    >
      <!-- Rail Header -->
      <div class="tv-rail-header">
        <div class="tv-rail-title-group">
          ${rail.icon ? `<span class="tv-rail-icon" aria-hidden="true">${rail.icon}</span>` : ''}
          <h2 class="tv-rail-title" id="rail-title-${rail.id}">${rail.title}</h2>
        </div>
        <span class="tv-rail-count">${countBadge}</span>
      </div>

      <!-- Horizontal Track with smooth scroll behavior -->
      <div class="tv-rail-track-container">
        <div 
          class="tv-rail-track" 
          id="track-${rail.id}" 
          role="region" 
          aria-label="${rail.title}"
        >
          ${cardsHtml}
        </div>
      </div>
    </section>
  `;
}
