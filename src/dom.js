// Tiny element helper: h('div', { class: 'x', onclick: fn }, child, 'text', ...)
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

export function formatMs(ms) {
  return ms == null ? '–' : `${(ms / 1000).toFixed(2)}s`;
}

export function formatPct(ratio) {
  return ratio == null ? '–' : `${Math.round(ratio * 100)}%`;
}
