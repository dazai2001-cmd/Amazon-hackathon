export default function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}><svg viewBox="0 0 48 58" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 5H43V31Q39 44 24 53Q9 44 5 31Z"/><path d="M24 15V40M24 30L15 22M24 26L34 17"/></svg><span>Earned <span className="brand-valor">Valor</span></span></div>;
}
