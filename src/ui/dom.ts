export type Child = Node | string | null | undefined | false;

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export const clearChildren = (node: HTMLElement): void => {
  while (node.firstChild) node.removeChild(node.firstChild);
};

export const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450">' +
    '<rect width="300" height="450" fill="#141926"/>' +
    '<circle cx="150" cy="200" r="46" fill="none" stroke="#38bdf8" stroke-width="4"/>' +
    '<path d="M136 176 L176 200 L136 224 Z" fill="#38bdf8"/>' +
    '<text x="150" y="290" fill="#7c8aa3" font-family="sans-serif" font-size="18" text-anchor="middle">PelisStream</text>' +
    '</svg>',
)}`;

export const safeHttpsUrl = (value: string | undefined): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};

/**
 * Assigns an HTTPS-only image with a single fallback attempt. All visible
 * strings are rendered with `textContent`, never HTML concatenation.
 */
export const setImageSource = (
  image: HTMLImageElement,
  source: string | undefined,
  alt: string,
): void => {
  image.alt = alt;
  image.loading = 'lazy';
  image.decoding = 'async';

  let fallbackApplied = false;
  image.addEventListener('error', () => {
    if (fallbackApplied) return;
    fallbackApplied = true;
    image.src = PLACEHOLDER_IMAGE;
  });

  image.src = safeHttpsUrl(source) ?? PLACEHOLDER_IMAGE;
};

export const formatRating = (value: number): string => (value > 0 ? value.toFixed(1) : '—');
