import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import LoginModal from '../features/auth/LoginModal.jsx';
import { useCountry } from '../features/country/CountryContext.jsx';
import CountrySelector from '../features/country/CountrySelector.jsx';

export default function Nav() {
  const { user, profile } = useAuth();
  const { country } = useCountry();
  const [showLogin, setShowLogin] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  return (
    <>
      <header className="nav">
        <div className="nav__inner">
          <Link to="/" className="nav__brand"><span className="mark"></span>ABOVE THE CLOUDS</Link>
          <nav className="nav__links">
            <a href="/#flying-now">Live</a>
            <a href="/#explore">Explore</a>
            <a href="/#challenge">Quiz</a>
            <Link to="/aircraft">Aircraft</Link>
            <a href="/#airports">Airports</a>
            <a href="/#news">News</a>
            <a href="/#community">Community</a>
          </nav>
          <div className="nav__right">
            <button className="nav__country-btn" onClick={() => setShowCountryPicker(true)} title="Change country">
              {country ? country.flag : '🌐'}
            </button>
            {user ? (
              <Link to="/profile" className="btn btn--ghost btn--sm">
                {profile ? `LVL ${profile.level} · ${profile.xp} XP` : user.username}
              </Link>
            ) : (
              <button className="btn btn--primary btn--sm" onClick={() => setShowLogin(true)}>Sign In</button>
            )}
          </div>
          <button className="nav__toggle" aria-label="Menu"><span></span><span></span><span></span></button>
        </div>
      </header>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showCountryPicker && <CountrySelector dismissible onClose={() => setShowCountryPicker(false)} />}
    </>
  );
}
