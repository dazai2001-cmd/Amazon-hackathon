import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { readClanHistory, type ClanHistory } from '../../shared/clanHistory';

export default function ClanRecords({ revision }: { revision: string }) {
  const [history, setHistory] = useState<ClanHistory | null>(null), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/clans', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Clan records could not be reached.');
      const value = await response.json(), parsed = readClanHistory(value);
      if (!parsed) throw new Error('Clan records could not be read.');
      if (!controller.signal.aborted) { setHistory(parsed); setError(value.warning || ''); }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [revision, refresh]);
  return <section className="clan-records" aria-label="Saved clan records"><header><span className="chapter-eyebrow">THE ORDER’S RECORD</span><button className="chapter-text-button" onClick={() => setRefresh(n => n + 1)}><RefreshCw size={15}/> Refresh records</button></header>
    <p>Clan names, member names and completed war scores are saved on this game server. Active duels end if it restarts.</p>
    {error && <p role="alert">{error}</p>}
    {history && <><div className="clan-standings">{[...history.clans].sort((a, b) => b.wins - a.wins || b.draws - a.draws).slice(0, 6).map(clan => <div key={clan.name}><strong>{clan.name}</strong><span>{clan.wins} wins · {clan.draws} draws · {clan.wars} wars</span><small>{clan.members.join(', ')}</small></div>)}</div><ul>{history.results.slice(-5).reverse().map(result => <li key={result.id}><span>{result.clans[0]} vs {result.clans[1]}</span><b>{result.score[0]} : {result.score[1]}</b><time>{new Date(result.completedAt).toLocaleDateString()}</time></li>)}</ul>{!history.results.length && <p>The next completed clan war begins your history.</p>}</>}
  </section>;
}
