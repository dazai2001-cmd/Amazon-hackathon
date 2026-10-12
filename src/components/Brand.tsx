export default function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}><svg viewBox="0 0 38 38" aria-hidden="true"><path d="M7 29V9h6l6 9 6-9h6v20h-7V20l-5 7-5-7v9z" fill="currentColor" /></svg><span>move<span className="brand-room">room</span><span className="brand-dot">.</span></span></div>;
}
