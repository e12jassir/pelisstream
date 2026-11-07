/**
 * PelisStream v2 - Player Modal Component
 * Fullscreen 10-Foot Video Player with Server Switcher & Minimalist Top Bar.
 */

import { ServerSource } from '../types';

export function renderPlayerModal(): string {
  return `
    <div 
      class="tv-player-modal" 
      id="player-modal" 
      role="dialog" 
      aria-modal="true" 
      aria-label="Reproductor de Video"
    >
      <!-- Minimalist Top Bar -->
      <header class="tv-player-topbar">
        <div style="display: flex; align-items: center; gap: 24px;">
          <button 
            type="button" 
            class="tv-btn tv-btn-secondary tv-btn-close tv-focusable" 
            id="player-btn-back"
            data-action="close-player"
            tabindex="0"
          >
            <svg class="tv-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Atrás</span>
          </button>

          <div class="tv-player-title-info">
            <h2 class="tv-player-content-title" id="player-title">Título de Película</h2>
            <span class="tv-player-episode-info" id="player-subtitle">Audio Latino · 1080p</span>
          </div>
        </div>

        <div class="tv-player-status-badges">
          <span class="tv-badge tv-badge-hd" id="player-quality-badge">1080P 60FPS</span>
          <span class="tv-badge tv-badge-latino" id="player-server-badge">LATINO VIP</span>
          <span class="tv-badge tv-badge-subtle">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; margin-right: 6px;"></span>
            SEÑAL ÓPTIMA
          </span>
        </div>
      </header>

      <!-- Video Player Stage (16:9 Iframe Container) -->
      <main class="tv-player-stage">
        <iframe 
          id="player-iframe" 
          class="tv-player-iframe" 
          src="about:blank"
          title="Video Player Stream"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" 
          allowfullscreen
        ></iframe>
      </main>

      <!-- Bottom Bar: Server Selector and Episode Jump -->
      <footer class="tv-player-bottombar">
        <div class="tv-server-selector">
          <span class="tv-server-label">Servidor:</span>
          <div class="tv-server-list" id="player-servers-container" role="radiogroup" aria-label="Servidores de Video">
            <!-- Dynamic server pills injected here -->
          </div>
        </div>
      </footer>
    </div>
  `;
}

export function generateServerPills(sources: ServerSource[], activeIndex: number = 0): string {
  return sources.map((src, index) => {
    const isActive = index === activeIndex;
    const activeClass = isActive ? 'tv-server-active' : '';
    const badge = src.quality;

    return `
      <button 
        type="button" 
        class="tv-server-pill tv-focusable ${activeClass}" 
        id="player-server-${index}"
        data-server-index="${index}"
        data-server-url="${src.url}"
        tabindex="0"
        role="radio"
        aria-checked="${isActive}"
      >
        <span>${src.name}</span>
        <span class="tv-badge ${badge === '4K' ? 'tv-badge-4k' : 'tv-badge-hd'}" style="font-size: 0.6875rem; padding: 2px 5px;">${badge}</span>
      </button>
    `;
  }).join('');
}
