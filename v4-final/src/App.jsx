import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';
import AircraftExplorer from './features/aircraft/AircraftExplorer.jsx';
import AircraftPage from './features/aircraft/AircraftPage.jsx';
import Admin from './pages/Admin.jsx';
import CountrySelector from './features/country/CountrySelector.jsx';
import { useCountry } from './features/country/CountryContext.jsx';

import './styles/hero.css';
import './features/country/country.css';
import './features/live-flights/whats-flying-now.css';
import './features/challenges/daily-challenge.css';
import './features/news/news.css';
import './features/aircraft/aircraft.css';
import './features/argentina/argentina.css';
import './features/game/game.css';
import './features/spotter/spotter.css';
import './features/community/community.css';
import './features/tags/tags.css';
import './features/leaderboard/leaderboard.css';
import './pages/profile.css';

export default function App() {
  const { pickerOpen, setPickerOpen } = useCountry();

  return (
    <ToastProvider>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/aircraft" element={<AircraftExplorer />} />
          <Route path="/aircraft/:slug" element={<AircraftPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <Footer />
      {pickerOpen && <CountrySelector dismissible onClose={() => setPickerOpen(false)} />}
    </ToastProvider>
  );
}
