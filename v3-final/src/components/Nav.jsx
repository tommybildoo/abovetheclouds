import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import LoginModal from '../features/auth/LoginModal.jsx';

export default function Nav() {
  const { user, profile } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <header className="nav">
        <div className="nav__inner">
          <Link to="/" className="nav__brand"><span className="mark"></span>ABOVE THE CLOUDS</Link>
          <nav className="nav__links">
            <a href="/#flying-now">What's Flying</a>
            <a href="/#challenge">Challenge</a>
            <Link to="/aircraft">Aircraft</Link>
            <a href="/#argentina">Argentina</a>
            <a href="/#community">Community</a>
            <a href="/#leaderboard">Leaderboard</a>
          </nav>
          <div className="nav__right">
            {user ? (
              <a href="/#leaderboard" className="btn btn--ghost btn--sm" title="A dedicated profile page isn't built yet — see leaderboard for your standing.">
                {profile ? `LVL ${profile.level} · ${profile.xp} XP` : user.username}
              </a>
            ) : (
              <button className="btn btn--primary btn--sm" onClick={() => setShowLogin(true)}>Sign In</button>
            )}
          </div>
          <button className="nav__toggle" aria-label="Menu"><span></span><span></span><span></span></button>
        </div>
      </header>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
