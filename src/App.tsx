import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { DayPage } from './pages/DayPage';
import { PoolPage } from './pages/PoolPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CalendarPage } from './pages/CalendarPage';
import { initializeDatabase } from './db';

function App() {
  useEffect(() => {
    // Initialize database and ensure data continuity on app start
    initializeDatabase().catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="today" element={<DayPage />} />
          <Route path="day/:date" element={<DayPage />} />
          <Route path="pool" element={<PoolPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
