import { lazy, Suspense } from 'react';
import TVApp from './TVApp';

const PhoneApp = lazy(() => import('./PhoneApp'));
const VisionCheck = lazy(() => import('./VisionCheck'));
export default function App() {
  if (window.location.pathname === '/diagnostics') return <Suspense fallback={<div className="loading-screen">Opening vision check…</div>}><VisionCheck/></Suspense>;
  if (window.location.pathname.startsWith('/phone')) return <Suspense fallback={<div className="loading-screen">Opening your movement controller…</div>}><PhoneApp /></Suspense>;
  return <TVApp />;
}
