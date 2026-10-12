export function focusScope(): HTMLElement | Document {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
    .filter(el => !el.closest('[aria-hidden="true"]') && el.getBoundingClientRect().width > 0);
  return dialogs[dialogs.length - 1] || document;
}
export function moveFocus(key: string) {
  const scope = focusScope();
  const elements = Array.from(scope.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'))
    .filter(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && !el.closest('[aria-hidden="true"]'));
  if (!elements.length) return;
  const current = document.activeElement as HTMLElement;
  if (!elements.includes(current)) { elements[0].focus(); return; }
  const a = current.getBoundingClientRect(), x = a.x + a.width / 2, y = a.y + a.height / 2;
  const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
  const positive = key === 'ArrowRight' || key === 'ArrowDown';
  const candidates = elements.filter(el => el !== current).map(el => {
    const b = el.getBoundingClientRect(), dx = b.x + b.width / 2 - x, dy = b.y + b.height / 2 - y;
    const forward = horizontal ? dx : dy, cross = horizontal ? dy : dx;
    return { el, forward, distance: Math.abs(forward) + Math.abs(cross) * 2.5 };
  }).filter(v => positive ? v.forward > 5 : v.forward < -5).sort((a, b) => a.distance - b.distance);
  candidates[0]?.el.focus();
}
