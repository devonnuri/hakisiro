import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DailyHUD } from '../components/today/DailyHUD';
import { TodayList } from '../components/today/TodayList';
import { Button } from '../components/ui/Button';
import { format, addDays, parseISO, isValid } from 'date-fns';

export const DayPage: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();

  // Default to today if no date param (though route should handle this, or we redirect)
  // If used as /today, date is undefined.
  const dateStr = useMemo(() => {
    if (!date) return new Date().toISOString().split('T')[0];
    return date;
  }, [date]);

  // Validation
  const isDateValid = useMemo(() => {
    try {
      return isValid(parseISO(dateStr));
    } catch {
      return false;
    }
  }, [dateStr]);

  const handleNav = (delta: number) => {
    const d = parseISO(dateStr);
    const next = addDays(d, delta);
    navigate(`/day/${format(next, 'yyyy-MM-dd')}`);
  };

  if (!isDateValid) return <div>Invalid Date</div>;

  const isToday = dateStr === new Date().toISOString().split('T')[0];

  return (
    <div
      style={{
        padding: '16px',
        height: '100%',
        overflow: 'auto',
        maxWidth: '600px',
        margin: '0 auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 16 }}>
        <Button onClick={() => handleNav(-1)}>&lt; Prev</Button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>
          {dateStr} {isToday && '(Today)'}
        </div>
        <Button onClick={() => handleNav(1)}>Next &gt;</Button>
      </div>

      <DailyHUD date={dateStr} />
      <TodayList date={dateStr} />
    </div>
  );
};
