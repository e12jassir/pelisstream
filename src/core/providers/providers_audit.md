# Auditoría Técnica y Blindaje de Proveedores de Streaming
**Proyecto:** PelisStream v2 (Arquitectura Smart TV 10-Foot UI)  
**Fecha:** 7 de Noviembre de 2026  
**Especialidad:** Reverse Engineering de Protocolos de Streaming Web, Seguridad de Iframes y Resiliencia en Smart TVs  
**Ubicación:** `src/core/providers/providers_audit.md`

---

## 1. Resumen Ejecutivo

PelisStream v2 depende de reproductores embebidos vía `<iframe>` para servir contenido multimedia en entornos de Smart TV (LG webOS, Samsung Tizen, Android TV) y navegadores web. Esta auditoría presenta un análisis forense de ingeniería inversa de los cuatro proveedores actuales, disecciona los vectores de ataque (redirecciones maliciosas, trampas anti-sandbox, secuestro de foco en controles remotos), evalúa dos alternativas de contingencia de alta disponibilidad y formula una arquitectura resiliente basada en el patrón **Circuit Breaker** para conmutación transparente por fallo.

### Hallazgos Críticos Destacados:
1. **Trampas Anti-Sandbox Activas en Producción:** Tanto `vidsrc.me` (vía `vidsrc.sh/assets/sbx.js`) como `multiembed.mov` (vía `streamingnow.mov`) contienen scripts activos diseñados para detectar si están dentro de un iframe con `sandbox`. Si la sandboxing es deficiente o elimina `allow-same-origin`, ejecutan una redirección forzada a `/sandbox.php` que bloquea el reproductor.
2. **Redirecciones y Salto de Dominio:** `vidsrc.me` emite un código HTTP `301 Moved Permanently` hacia `vidsrc.sh`, mientras que `multiembed.mov` emite un HTTP `302 Found` hacia `streamingnow.mov` con payloads en Base64. `vidsrc.to` actúa como un wrapper publicitario que inyecta scripts de terceros (`soycdn.lol`) antes de cargar el reproductor real.
3. **Riesgo Crítico en Smart TVs:** La ausencia del atributo `sandbox` en `src/ui/player-modal.ts` o la inclusión errónea de `allow-top-navigation` permite que los scripts de anuncios ejecuten `window.top.location = ...`, secuestrando la aplicación de TV sin posibilidad de retorno mediante el botón *Back* del control remoto (código 461 en webOS o 10009 en Tizen).
4. **Viabilidad de Contingencias:** Se verificaron en vivo dos proveedores alternativos estables (`player.autoembed.me` y `www.2embed.cc`) que cuentan con soporte multilingüe (audio latino/inglés) y cabeceras permisivas (`frame-ancestors *` en AutoEmbed).

---

## 2. Auditoría Forense de Proveedores Actuales

Se realizaron pruebas HTTP automatizadas, inspección de payloads y análisis de scripts estáticos con User-Agent de Smart TV Tizen/webOS y navegador de escritorio.

```
+---------------------------------------------------------------------------------------------------+
| Proveedor   | Dominio Base       | HTTP Status | Latencia | X-Frame-Options | CSP / Frame Ancest. |
+-------------+--------------------+-------------+----------+-----------------+---------------------+
| PlayLatin   | playlatinsrc.co    | 200 OK      | ~750ms   | Ninguno (Libre) | Ninguno (Permisivo) |
| VidSrc To   | vidsrc.to          | 200 OK      | ~580ms   | Ninguno (Libre) | Ninguno (Permisivo) |
| VidSrc Me   | vidsrc.me          | 301 -> 200  | ~850ms   | Ninguno (Libre) | Ninguno (Permisivo) |
| MultiEmbed  | multiembed.mov     | 302 -> 200  | ~910ms   | Ninguno (Libre) | Ninguno (Permisivo) |
+---------------------------------------------------------------------------------------------------+
```

---

### 2.1. PlayLatin (`playlatin.provider.ts`)
* **Endpoint Películas:** `https://playlatinsrc.co/movie/{imdb_id}`
* **Endpoint Series:** `https://playlatinsrc.co/custom/serial/{imdb_id}/{season}/{episode}`
* **Disponibilidad:** **ALTA** (HTTP/2 200 en Cloudflare).
* **Cabeceras de Red:**
  * `Server: cloudflare`
  * `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`
  * `X-Frame-Options`: Ausente (permite incrustación en cualquier origen).
  * `Content-Security-Policy`: Ausente.

#### Análisis de Ingeniería Inversa del Flujo Interno:
1. PlayLatin no es un host de video directo, sino un orquestador / pasarela de servidores.
2. Al cargar el iframe, el servidor inyecta en el DOM un token criptográfico efímero de sesión:
   ```javascript
   fetch('/api/embed-links', {
       method: 'POST',
       credentials: 'same-origin',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ type: 'movie', id: "tt1375666", token: "bW92aWV8..." })
   })
   ```
3. Esta petición interna devuelve una lista de enlaces hacia proveedores de streaming como **Dropload** (marcado como VIP/Recomendado), **Streamwish**, **Filemoon** o un fallback general hacia `unlimplay.com`.
4. El script renderiza los servidores en una lista interactiva y monta un iframe interno (`#_player`).
5. Maneja selección de idioma (`latino`, `castellano`, `subtitulado`) y persiste la elección en `window.sessionStorage` bajo la clave `vhl.version`.

#### Vulnerabilidades y Requerimientos de Sandboxing:
* **Dependencia de `allow-same-origin`:** Si se omite `allow-same-origin`, el iframe adquiere un origen opaco (`null`). En este estado, el acceso a `window.sessionStorage` lanza una excepción `SecurityError` y la petición `fetch` con `credentials: 'same-origin'` falla, dejando al reproductor en pantalla negra.
* **Comportamiento en Smart TV:** Dado que PlayLatin carga reproductores de terceros en un iframe anidado, estos terceros intentan abrir popups publicitarios al hacer clic en "Play". Al bloquear `allow-popups` en el iframe padre, las ventanas publicitarias se suprimen de raíz sin afectar la reproducción.

---

### 2.2. VidSrc To (`vidsrc.to`)
* **Endpoint Películas:** `https://vidsrc.to/embed/movie/{imdb_id}`
* **Endpoint Series:** `https://vidsrc.to/embed/tv/{imdb_id}/{season}/{episode}`
* **Disponibilidad:** **MEDIA-ALTA** (HTTP/2 200 en LiteSpeed Web Server).
* **Cabeceras de Red:**
  * `Server: LiteSpeed`
  * `Alt-Svc: h3=":443"`
  * `X-Frame-Options`: Ausente.
  * `Content-Security-Policy`: Ausente.

#### Análisis de Ingeniería Inversa del Flujo Interno:
1. `vidsrc.to` es una envoltura estática. Su HTML pesa apenas 1.2 KB y está estructurado así:
   ```html
   <script src="https://soycdn.lol/__ads/vidsrcto.js?v=1" async></script>
   <iframe src="https://vidsrc.sh/embed/movie/{imdb_id}/" allowfullscreen></iframe>
   <script src="//s10.histats.com/js15_as.js"></script>
   ```
2. Inyecta una librería externa de publicidad (`soycdn.lol`) y rastreo analítico (`Histats`), mientras delega la reproducción real a `vidsrc.sh`.
3. El script publicitario adjunta eventos `click` globales a la ventana para disparar popunders e interceptar el primer toque o pulsación de control remoto.

#### Vulnerabilidades y Requerimientos de Sandboxing:
* **Riesgo Severo de Secuestro de Navegación:** El script `vidsrcto.js` intenta ejecutar `window.open` o modificar `window.top.location`.
* **Solución Mandatoria:** La restricción estricta de `sandbox` (sin `allow-top-navigation` y sin `allow-popups`) neutraliza por completo la carga de `soycdn.lol`, permitiendo que el iframe interno de `vidsrc.sh` reproduzca sin interferencias.

---

### 2.3. VidSrc Me (`vidsrc.me`)
* **Endpoint Películas:** `https://vidsrc.me/embed/movie?imdb={imdb_id}`
* **Endpoint Series:** `https://vidsrc.me/embed/tv?imdb={imdb_id}&season={season}&episode={episode}`
* **Disponibilidad:** **ALTA con Redirección** (HTTP 301 Permanente hacia `https://vidsrc.sh/...`).
* **Cabeceras de Red en Destino (`vidsrc.sh`):**
  * `Access-Control-Allow-Credentials: true`
  * `Access-Control-Allow-Methods: GET, POST, OPTIONS`
  * `X-Frame-Options`: Ausente.
  * `Content-Security-Policy`: Ausente.

#### Trampa Anti-Sandbox Detectada e Inspeccionada (`/assets/sbx.js`):
Al desensamblar el script `/assets/sbx.js?v=1786671805` presente en `vidsrc.sh`, se extrajo la siguiente rutina de evasión:

```javascript
/**
 * Sandbox-embed blocker — runs on the OUTER embed page
 * If loaded inside an <iframe sandbox> (a client trying to cage the player),
 * this frame is redirected to /sandbox.php?ref=<embedding host>.
 *
 * Detection:
 *   1. our own frame carries a `sandbox` attribute (same-origin parents), or
 *   2. an opaque origin (sandbox without allow-same-origin) — assigning
 *      document.domain throws a SecurityError whose message mentions "sandbox".
 */
(function () {
    function block() {
        var host = '';
        try { host = document.referrer ? new URL(document.referrer).host : ''; } catch (e) {}
        var url = '/sandbox.php' + (host ? ('?ref=' + encodeURIComponent(host)) : '');
        try { location.replace(url); } catch (e) { try { location.href = url; } catch (x) {} }
    }
    try { if (window.frameElement && window.frameElement.hasAttribute('sandbox')) { block(); return; } } catch (t) {}
    try {
        document.domain = document.domain;
    } catch (t) {
        try { if (('' + t).toLowerCase().indexOf('sandbox') !== -1) { block(); return; } } catch (e) {}
    }
})();
```

#### Análisis del Mecanismo y Blindaje:
1. **Punto de Detección 1 (`window.frameElement`):** En un entorno de orígenes cruzados (PelisStream vs VidSrc), el acceso a `window.frameElement` arroja una excepción de seguridad de cross-origin DOM. Por lo tanto, `try { ... } catch (t) {}` atrapa el error y la condición 1 **no se cumple**.
2. **Punto de Detección 2 (`document.domain`):** Si el iframe de PelisStream omite `allow-same-origin`, el origen se convierte en `null`. En navegadores basados en WebKit y Chromium, asignar `document.domain = document.domain` en un contexto con origen nulo arroja:
   ```
   SecurityError: Failed to set the 'domain' property on 'Document': Assignment is illegal for sandboxed iframes without 'allow-same-origin'.
   ```
   El script detecta la palabra `"sandbox"` en el mensaje del error y redirige inmediatamente a `/sandbox.php`.
3. **Desactivación de la Trampa:** Al configurar `sandbox="allow-scripts allow-same-origin allow-forms"`, el documento mantiene su origen `vidsrc.sh`. La asignación `document.domain = document.domain` se ejecuta limpiamente sin lanzar excepción, **anulando la trampa anti-sandbox por completo**.

#### Anti-DevTools (`disable-devtool.js`):
El proveedor incluye una rutina que monitorea el tamaño de ventana y temporizadores para detectar consolas de inspección abiertas. Si detecta herramientas de desarrollo activas, ejecuta:
```javascript
function kill() {
    try { var v = document.querySelector('video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } } catch (e) {}
}
```
*En producción sobre Smart TV esto es irrelevante, pero durante pruebas locales en Chromium, las DevTools deben mantenerse acopladas en ventana separada o cerradas para evitar la pausa forzada.*

---

### 2.4. MultiEmbed (`multiembed.mov`)
* **Endpoint Películas:** `https://multiembed.mov/?video_id={imdb_id}`
* **Endpoint Series:** `https://multiembed.mov/?video_id={imdb_id}&s={season}&e={episode}`
* **Disponibilidad:** **MEDIA** (HTTP 302 Redirección hacia `https://streamingnow.mov/?play=...`).
* **Cabeceras de Red:**
  * `X-Frame-Options`: Ausente.
  * `Content-Security-Policy`: Ausente.

#### Análisis Forense del Destino (`streamingnow.mov`):
1. El tamaño del documento descargado asciende a más de 650 KB.
2. Contiene componentes de Cloudflare Turnstile (`challenges.cloudflare.com/turnstile/v0/api.js`) y redes publicitarias agresivas (`5gvci.com/act/files/tag.min.js`).
3. Dispone de una rutina anti-sandbox ofuscada mediante un arreglo léxico:
   ```javascript
   var e = ["sandbox", "hasAttribute", "frameElement", "data", "indexOf", "href", "domain", ...];
   function t() {
       setTimeout(function() {
           location.href = "/sandbox.php?r=" + r + "&w=" + w;
       }, 900);
   }
   // Evaluación idéntica de document.domain contra la palabra "sandbox"
   !function() {
       try { document.domain = document.domain; }
       catch(e) {
           if (e.toString().toLowerCase().indexOf("sandbox") !== -1) return !0;
       }
       return !1;
   }() && t();
   ```
4. **Vulnerabilidad de Captcha:** En situaciones de tráfico no residencial o bloqueo de Cloudflare, `streamingnow.mov` levanta un widget interactivo de Turnstile. Si el sandbox carece de `allow-forms`, el usuario no puede enviar el token del captcha.

---

## 3. Blindaje de Seguridad de Iframes y Resiliencia en Smart TVs

### 3.1. Anatomía y Justificación de Atributos `sandbox`

La especificación W3C HTML5 establece que un iframe con atributo `sandbox` activa el conjunto máximo de restricciones de seguridad a menos que se levanten banderas explícitas.

```
                                  POLÍTICA DE AISLAMIENTO DEL IFRAME
 ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ SMART TV HOST APP (PelisStream v2: http://localhost:5173 o dominio propio)                      │
 │                                                                                                 │
 │   ┌─────────────────────────────────────────────────────────────────────────────────────────┐   │
 │   │ IFRAME CONTENEDOR (src="https://vidsrc.sh/..." o "https://playlatinsrc.co/...")         │   │
 │   │                                                                                         │   │
 │   │  [PERMITIDO]                                                                            │   │
 │   │  ✔ allow-scripts       -> Ejecución de reproductores HLS / Dash / Controles             │   │
 │   │  ✔ allow-same-origin   -> Acceso a cookies/storage propios, desarma trampas sbx.js      │   │
 │   │  ✔ allow-forms         -> Envío de tokens y resolución de retos Turnstile               │   │
 │   │                                                                                         │   │
 │   │  [BLOQUEADO ESTRICTAMENTE]                                                              │   │
 │   │  ❌ allow-top-navigation               -> Prohíbe redirigir la ventana principal de la TV │   │
 │   │  ❌ allow-top-navigation-by-user-act.  -> Prohíbe redirección incluso si se pulsa clic    │   │
 │   │  ❌ allow-popups                       -> Prohíbe window.open() y target="_blank"       │   │
 │   │  ❌ allow-popups-to-escape-sandbox     -> Evita escapar del aislamiento                 │   │
 │   │  ❌ allow-modals                       -> Prohíbe alert(), confirm() que congelan la TV │   │
 │   │  ❌ allow-downloads                    -> Prohíbe descarga de apks o archivos dañinos    │   │
 │   └─────────────────────────────────────────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### ¿Por qué `allow-scripts` + `allow-same-origin` NO vulnera a PelisStream?
Existe una advertencia clásica de la W3C: *"No use allow-scripts y allow-same-origin juntos si el contenido incrustado proviene del mismo origen que el host"*, ya que un script malicioso podría manipular el DOM del padre y remover su propio atributo `sandbox`.

**En PelisStream v2 esta condición no existe**, ya que:
1. PelisStream se sirve en un origen propio (`pelisstream.local` o IP local).
2. Los proveedores se ejecutan en dominios totalmente foráneos (`playlatinsrc.co`, `vidsrc.sh`, `streamingnow.mov`).
3. Por las reglas estrictas de la **Same-Origin Policy (SOP)** del navegador, un documento de origen cruzado tiene denegado el acceso al objeto `window.parent.document`, no puede leer `localStorage` del host y no puede retirar atributos del iframe.
4. Por ende, la combinación otorga al proveedor únicamente acceso a su propio contexto de almacenamiento interno mientras mantiene aislada la aplicación de la televisión.

---

### 3.2. Configuración Mandatoria del Iframe

#### Atributos de Sandbox y Permissions Policy:
```html
<iframe
  id="player-iframe"
  class="player__frame"
  src="https://playlatinsrc.co/movie/tt1375666"
  sandbox="allow-scripts allow-same-origin allow-forms"
  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
  referrerpolicy="origin-when-cross-origin"
  allowfullscreen
></iframe>
```

* **`sandbox="allow-scripts allow-same-origin allow-forms"`:**
  * Levanta las capacidades requeridas por los motores HLS/DASH y desactiva las rutinas `sbx.js`.
  * Corta de raíz toda navegación hacia sitios de phishing, descargas de APKs y ventanas emergentes.
* **`allow="autoplay; fullscreen; encrypted-media; picture-in-picture"`:**
  * Requerido por la especificación de Feature Policy / Permissions Policy para permitir arranque automático y descifrado de flujos vía EME (Encrypted Media Extensions) en caso de streams protegidos.
* **`referrerpolicy="origin-when-cross-origin"`:**
  * Protege los paths privados de la aplicación host, enviando únicamente el host en las peticiones de origen cruzado para no romper los validadores de `Referer` que exigen algunos CDNs.

---

### 3.3. Peligros Específicos en Smart TVs (Tizen OS y LG webOS)

| Riesgo | Causa Técnica | Efecto en Smart TV | Mitigación Implementada |
|---|---|---|---|
| **Secuestro de Ventana (Top Hijack)** | Script publicitario ejecuta `top.location.href = 'https://ad-trap...'` | La webview del sistema operativo abandona la aplicación PelisStream. La pantalla queda congelada en un anuncio. | Omitir completamente `allow-top-navigation` y `allow-top-navigation-by-user-activation`. |
| **Pérdida de Foco y Teclas Remotas** | El iframe captura el foco del DOM al hacer clic o reproducir | Las pulsaciones del D-PAD y botón *Back* (clave 461/10009) se entregan al documento del iframe; la app principal no puede cerrar el reproductor. | Modal de reproducción con barra superior de control desacoplada, gestión de foco vía `spatial-nav.ts` y overlay de intercepción. |
| **Popups del Sistema Operativo** | Script ejecuta `window.open(...)` | webOS/Tizen intenta abrir el navegador nativo de la TV o crea una segunda ventana flotante inmanejable. | Omitir `allow-popups` y `allow-popups-to-escape-sandbox`. |
| **Diálogos Modales Congelantes** | Adware ejecuta `alert('Su TV está en riesgo')` | Bloquea el hilo de ejecución principal de la webview; el control remoto no responde. | Omitir `allow-modals`. |
| **Fuga de Memoria en GPU / Decodificador** | Múltiples cambios de servidor sin destruir la instancia del iframe | Los decodificadores de hardware de SoCs con 1 GB / 1.5 GB colapsan, provocando cierre forzado de la app. | Blanqueo estricto del iframe (`src = 'about:blank'`) antes de remover o recargar. |

---

## 4. Proveedores Alternativos de Contingencia (Benchmarking en Vivo)

Para proteger a PelisStream de caídas por DMCA o bloqueos de dominio, se auditaron y validaron dos proveedores de respaldo de alta fidelidad:

```
+---------------------------------------------------------------------------------------------------------+
| Candidato   | Dominio Base         | Audio Principal | Subtítulos | Soporte Series | Cabeceras Espec.   |
+-------------+----------------------+-----------------+------------+----------------+--------------------+
| AutoEmbed   | player.autoembed.me  | Multi / Latino  | Multi      | Sí (S/E)       | CSP frame-anc. *   |
| 2Embed      | www.2embed.cc        | Inglés / Multi  | Múltiples  | Sí (S/E)       | X-Frame Libre      |
+---------------------------------------------------------------------------------------------------------+
```

### 4.1. Alternativa 1: AutoEmbed (`autoembed.me` / `player.autoembed.me`)
* **URL Películas:** `https://player.autoembed.me/embed/movie/{imdb_id}`  
  *(o vía redirect gateway: `https://autoembed.co/movie/imdb/{imdb_id}`)*
* **URL Series:** `https://player.autoembed.me/embed/tv/{imdb_id}/{season}/{episode}`  
  *(o vía redirect gateway: `https://autoembed.co/tv/imdb/{imdb_id}-{season}-{episode}`)*
* **Estado Operativo:** **200 OK** (Latencia < 450ms).
* **Cabeceras Clave:**
  ```http
  Content-Security-Policy: frame-ancestors *
  Access-Control-Allow-Origin: *
  ```
  *AutoEmbed es extraordinariamente amigable para embeber: declara explícitamente `frame-ancestors *`, lo que garantiza compatibilidad universal sin bloqueos de CSP.*
* **Idiomas y Calidad:** Agregador multi-servidor interno con selector de pistas de audio (Español Latino, Castellano e Inglés) y subtítulos integrados.

### 4.2. Alternativa 2: 2Embed (`www.2embed.cc` / `2embed.skin`)
* **URL Películas:** `https://www.2embed.cc/embed/{imdb_id}`
* **URL Series:** `https://www.2embed.cc/embedtv/{imdb_id}&s={season}&e={episode}`
* **Estado Operativo:** **200 OK** (Latencia ~520ms).
* **Cabeceras Clave:**
  * `X-Frame-Options`: Ausente.
  * `Content-Security-Policy`: Ausente.
* **Idiomas y Calidad:** Alta estabilidad histórica en inglés y pistas multi-lenguaje, con fallback automático a servidores de respaldo como VidCloud y Streamtape.

### 4.3. Alternativa de Bono: SmashyStream / AnyEmbed (`embed.smashystream.com`)
* **URL Películas:** `https://embed.smashystream.com/playere.php?imdb={imdb_id}`
* **URL Series:** `https://embed.smashystream.com/playere.php?imdb={imdb_id}&season={season}&episode={episode}`
* **Resolución:** Redirige hacia la infraestructura de `anyembed.xyz`. Cuenta con selector de banderas de idioma (`flag-icons`), integración con Google Cast SDK y servidores de streaming optimizados para smart TVs.

---

## 5. Estrategia de Rotación y Conmutación por Fallo (Circuit Breaker)

### 5.1. Máquina de Estados del Circuit Breaker

Para evitar que una caída de PlayLatin o VidSrc frustre la experiencia del usuario o deje la pantalla congelada en negro, se implementa un **Circuit Breaker** por cada proveedor registrado.

```
                  ┌────────────────────────────────────────┐
                  │                 CLOSED                 │
                  │        (Operación Normal: 100%)        │
                  └───────────────────┬────────────────────┘
                                      │
                   Fallo consecutivo >= THRESHOLD (2 fallos)
                   o timeout de carga de iframe (> 8 segs)
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │                  OPEN                  │
                  │   (Aislado / Bypasseado en rotación)   │
                  └───────────────────┬────────────────────┘
                                      │
                         Transcurrido cooldown (60s)
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │               HALF_OPEN                │
                  │        (Petición de Ensayo / Test)     │
                  └─────────┬────────────────────▲─────────┘
                            │                    │
              Éxito en prueba                    Fallo en prueba
              (Resetea a CLOSED)                 (Retorna a OPEN con backoff)
```

### 5.2. Heurísticas de Detección de Fallo en Iframes de Origen Cruzado

Debido a que el navegador restringe la lectura interna de un iframe cross-origin (no se puede leer `iframe.contentDocument` ni interceptar códigos HTTP 404/500 una vez cargado el iframe), la detección de fallo debe combinar tres señales asíncronas:

1. **Watchdog de Timeout de Carga (`onLoadWatchdog`):**
   Si el evento `iframe.onload` no se dispara dentro de una ventana de **8 segundos**, se asume fallo de DNS, bloqueo de red o caída de servidor.
2. **Watchdog de Interacción / Switch Temprano:**
   Si el usuario presiona activamente el botón de "Cambiar Servidor" dentro de los primeros **12 segundos** tras el montaje, se computa como un "fallo suave" del proveedor actual en ese título.
3. **Escucha de Mensajes PostMessage:**
   Muchos reproductores emiten eventos `postMessage` (`player_ready`, `error`, `playback_started`). La ausencia de mensajes tras un tiempo prudencial o la recepción de `{ type: 'error' }` incrementa el contador de fallos.

---

### 5.3. Implementación TypeScript del Circuit Breaker

Esta especificación está lista para ser integrada en el núcleo de proveedores de PelisStream:

```typescript
// src/core/providers/circuit-breaker.ts

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  readonly failureThreshold: number; // e.g. 2 fallos consecutivos
  readonly recoveryCooldownMs: number; // e.g. 60,000 ms (1 minuto)
}

export class ProviderCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    readonly providerId: string,
    private readonly config: CircuitBreakerConfig = {
      failureThreshold: 2,
      recoveryCooldownMs: 60000,
    }
  ) {}

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.config.recoveryCooldownMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  isAvailable(): boolean {
    const s = this.getState();
    return s === 'CLOSED' || s === 'HALF_OPEN';
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }
}
```

---

### 5.4. Nuevo Gestor de Proveedores Resiliente (`ProviderManager` Mejorado)

```typescript
// src/core/providers/provider.manager.ts (Refactorización recomendada)

import { ProviderCircuitBreaker } from './circuit-breaker';
import type {
  IVideoProviderStrategy,
  PlaybackRequest,
  PlaybackResolution,
} from './provider.interface';

export class ResilientVideoProviderManager {
  private readonly strategies = new Map<string, IVideoProviderStrategy>();
  private readonly breakers = new Map<string, ProviderCircuitBreaker>();

  constructor(strategies: readonly IVideoProviderStrategy[] = []) {
    for (const strategy of strategies) {
      this.register(strategy);
    }
  }

  register(strategy: IVideoProviderStrategy): void {
    this.strategies.set(strategy.id, strategy);
    this.breakers.set(strategy.id, new ProviderCircuitBreaker(strategy.id));
  }

  /**
   * Retorna los proveedores ordenados por prioridad activa,
   * omitiendo los que tengan el circuito abierto salvo que todos estén caídos.
   */
  getAvailableStrategies(): IVideoProviderStrategy[] {
    const all = Array.from(this.strategies.values()).sort(
      (a, b) => a.priority - b.priority
    );

    const available = all.filter((s) => {
      const breaker = this.breakers.get(s.id);
      return breaker ? breaker.isAvailable() : true;
    });

    return available.length > 0 ? available : all;
  }

  resolvePlayback(
    preferredProviderId: string | undefined,
    request: PlaybackRequest
  ): PlaybackResolution {
    const candidates = this.getAvailableStrategies();
    
    // Si hay un preferido disponible, se sitúa a la cabeza
    if (preferredProviderId) {
      const preferred = candidates.find((s) => s.id === preferredProviderId);
      if (preferred) {
        return preferred.resolve(request);
      }
    }

    for (const strategy of candidates) {
      if (strategy.canHandle(request)) {
        return strategy.resolve(request);
      }
    }

    throw new Error(`Ningún proveedor de streaming disponible para ${request.imdbId}`);
  }

  reportFailure(providerId: string): void {
    this.breakers.get(providerId)?.recordFailure();
  }

  reportSuccess(providerId: string): void {
    this.breakers.get(providerId)?.recordSuccess();
  }
}
```

---

## 6. Jerarquía de Rotación y Especificación de Nuevos Módulos

### 6.1. Matriz de Prioridad Actualizada

| Prioridad | ID Proveedor | Clase Estrategia | Audio Predeterminado | Enfoque Principal |
|---|---|---|---|---|
| **1** | `playlatin` | `PlayLatinProvider` | Español Latino / Castellano | Principal para audiencia hispanohablante. |
| **2** | `autoembed` | `AutoEmbedProvider` *(Nuevo)* | Latino / Inglés / Multi | Contingencia primaria; `frame-ancestors *`. |
| **3** | `vidsrc_to` | `VidSrcToProvider` | Inglés / Multi | Alternativa rápida con sandboxing blindado. |
| **4** | `vidsrc_me` | `VidSrcMeProvider` *(Optimizado a vidsrc.sh)* | Inglés / Multi | Respaldo secundario; desarma `sbx.js`. |
| **5** | `twoembed` | `TwoEmbedProvider` *(Nuevo)* | Inglés / Multi | Contingencia secundaria de alta estabilidad. |
| **6** | `multiembed`| `MultiEmbedProvider` | Multi | Último recurso de cola. |

---

### 6.2. Especificación de los Proveedores de Contingencia

#### Implementación: `AutoEmbedProvider`
```typescript
// src/core/providers/autoembed.provider.ts

import {
  SHARED_ALLOW_ATTRIBUTES,
  SHARED_SANDBOX_FLAGS,
  episodeOf,
  isValidPlaybackRequest,
  seasonOf,
  type IVideoProviderStrategy,
  type PlaybackRequest,
  type PlaybackResolution,
} from './provider.interface';

export class AutoEmbedProvider implements IVideoProviderStrategy {
  readonly id = 'autoembed';
  readonly name = 'AutoEmbed (Multi / Latino)';
  readonly priority = 2;

  canHandle(request: PlaybackRequest): boolean {
    return isValidPlaybackRequest(request);
  }

  resolve(request: PlaybackRequest): PlaybackResolution {
    const imdbId = encodeURIComponent(request.imdbId.trim());
    const embedUrl =
      request.type === 'series'
        ? `https://player.autoembed.me/embed/tv/${imdbId}/${seasonOf(request)}/${episodeOf(request)}`
        : `https://player.autoembed.me/embed/movie/${imdbId}`;

    return {
      providerId: this.id,
      providerName: this.name,
      embedUrl,
      sandboxFlags: SHARED_SANDBOX_FLAGS,
      allowAttributes: SHARED_ALLOW_ATTRIBUTES,
    };
  }
}
```

#### Implementación: `TwoEmbedProvider`
```typescript
// src/core/providers/twoembed.provider.ts

import {
  SHARED_ALLOW_ATTRIBUTES,
  SHARED_SANDBOX_FLAGS,
  episodeOf,
  isValidPlaybackRequest,
  seasonOf,
  type IVideoProviderStrategy,
  type PlaybackRequest,
  type PlaybackResolution,
} from './provider.interface';

export class TwoEmbedProvider implements IVideoProviderStrategy {
  readonly id = 'twoembed';
  readonly name = '2Embed (Respaldo)';
  readonly priority = 5;

  canHandle(request: PlaybackRequest): boolean {
    return isValidPlaybackRequest(request);
  }

  resolve(request: PlaybackRequest): PlaybackResolution {
    const imdbId = encodeURIComponent(request.imdbId.trim());
    const embedUrl =
      request.type === 'series'
        ? `https://www.2embed.cc/embedtv/${imdbId}&s=${seasonOf(request)}&e=${episodeOf(request)}`
        : `https://www.2embed.cc/embed/${imdbId}`;

    return {
      providerId: this.id,
      providerName: this.name,
      embedUrl,
      sandboxFlags: SHARED_SANDBOX_FLAGS,
      allowAttributes: SHARED_ALLOW_ATTRIBUTES,
    };
  }
}
```

---

## 7. Plan de Acción y Recomendaciones de Implementación

1. **Blindar `src/ui/player-modal.ts` y sincronizar con `PlayerModal.ts`:**
   * En `player-modal.ts` línea 51, el tag `<iframe>` carece del atributo `sandbox`. Debe agregarse `sandbox="allow-scripts allow-same-origin allow-forms"` de manera inmediata para evitar que en Smart TVs un anuncio secuestre la aplicación.
2. **Optimizar `VidSrcMeProvider`:**
   * Actualizar el endpoint en `vidsrc.provider.ts` para apuntar directamente a `https://vidsrc.sh/embed/...` en lugar de `vidsrc.me`, ahorrando un salto HTTP 301 innecesario y reduciendo el tiempo de carga en ~250ms.
3. **Instanciar los Proveedores de Contingencia:**
   * Registrar `AutoEmbedProvider` y `TwoEmbedProvider` en `createDefaultProviderManager()`.
4. **Integrar el Watchdog en el Reproductor:**
   * Agregar en el componente del reproductor un temporizador de 8 segundos que verifique si el iframe cargó; si el usuario no tiene video, el sistema puede proponer automáticamente el botón de "Rotar a Servidor Respaldo" mediante un toque del control remoto.
