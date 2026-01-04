import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { DailyMemo as DailyMemoType } from '../../types/db';

interface DailyMemoProps {
  date: string;
}

export const DailyMemo: React.FC<DailyMemoProps> = ({ date }) => {
  const memo = useLiveQuery<DailyMemoType | undefined>(() => db.dailyMemos.get(date), [date]);
  const [text, setText] = React.useState('');
  const [hydrated, setHydrated] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  // Sync local state when the queried memo changes.
  React.useEffect(() => {
    setText(memo?.content ?? '');
    setHydrated(true);
  }, [memo, date]);

  // Debounced auto-save to the database.
  React.useEffect(() => {
    if (!hydrated) return;

    const currentContent = memo?.content ?? '';
    if (text === currentContent) return;

    const handle = setTimeout(async () => {
      if (!text.trim() && !memo) return; // Do not create empty rows for untouched days.
      await db.dailyMemos.put({ date, content: text, updatedAt: Date.now() });
      setSavedAt(Date.now());
    }, 600);

    return () => clearTimeout(handle);
  }, [text, date, memo, hydrated]);

  const helper = savedAt
    ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Auto-saves';

  return (
    <div className="panel" style={{ marginBottom: 16, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 'bold' }}>Daily memo</div>
        <div className="text-dim" style={{ fontSize: '0.85em' }}>{helper}</div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jot down thoughts, wins, or a quick summary for this day..."
        className="retro-input"
        style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
      />
    </div>
  );
};
