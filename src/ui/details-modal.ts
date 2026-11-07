/**
 * PelisStream v2 - Details Modal Component
 * Complete film technical sheet, cast credits, season tabs and episode rails.
 */



export function renderDetailsModal(): string {
  return `
    <div 
      class="tv-details-modal" 
      id="details-modal" 
      role="dialog" 
      aria-modal="true" 
      aria-label="Ficha Técnica"
    >
      <!-- Background Ambient Glow -->
      <div class="tv-details-backdrop-blur" id="details-backdrop" aria-hidden="true"></div>

      <!-- Main Card Container -->
      <div class="tv-details-card">
        <!-- Header -->
        <header class="tv-details-header">
          <div class="tv-details-title-row">
            <h2 class="tv-details-title" id="details-title">Título</h2>
            <div id="details-meta-header" class="tv-details-meta-chips"></div>
          </div>

          <button 
            type="button" 
            class="tv-btn tv-btn-secondary tv-btn-close tv-focusable" 
            id="details-btn-close"
            data-action="close-details"
            tabindex="0"
          >
            <svg class="tv-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            <span>Cerrar (Esc)</span>
          </button>
        </header>

        <!-- Body split in Left (Poster & Actions) and Right (Info & Episodes) -->
        <div class="tv-details-body">
          <div class="tv-details-left">
            <img 
              id="details-poster" 
              src="" 
              alt="Póster" 
              class="tv-details-poster" 
            />

            <div class="tv-details-actions">
              <button 
                type="button" 
                class="tv-btn tv-btn-primary tv-focusable" 
                id="details-btn-play"
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
                id="details-btn-watchlist"
                tabindex="0"
              >
                <svg class="tv-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span>Añadir a Mi Lista</span>
              </button>
            </div>
          </div>

          <div class="tv-details-right">
            <!-- Full Synopsis -->
            <div>
              <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--tv-text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Sinopsis</h3>
              <p class="tv-details-synopsis" id="details-synopsis">Descripción completa...</p>
            </div>

            <!-- Credits Grid -->
            <div class="tv-details-credits">
              <div class="tv-credit-item">
                <span class="tv-credit-label">Director</span>
                <span class="tv-credit-value" id="details-director">-</span>
              </div>
              <div class="tv-credit-item">
                <span class="tv-credit-label">Géneros</span>
                <span class="tv-credit-value" id="details-genres">-</span>
              </div>
              <div class="tv-credit-item" style="grid-column: span 2;">
                <span class="tv-credit-label">Reparto Principal</span>
                <span class="tv-credit-value" id="details-cast">-</span>
              </div>
            </div>

            <!-- Season & Episode Rail (Hidden for movies, shown for series) -->
            <div class="tv-details-seasons" id="details-series-section" style="display: none;">
              <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--tv-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Temporadas y Capítulos</h3>
              
              <!-- Season Tabs -->
              <div class="tv-seasons-tab-bar" id="details-season-tabs">
                <!-- Injected tabs -->
              </div>

              <!-- Episodes Rail -->
              <div class="tv-episodes-rail" id="details-episodes-rail">
                <!-- Injected episode cards -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
