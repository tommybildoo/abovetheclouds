import React from 'react';
import { CONFIG } from '../lib/config.js';
import { useCountry } from '../features/country/CountryContext.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Hero() {
  const { country } = useCountry();
  const { user } = useAuth();

  return (
    <section className="hero">
      <div className="hero__bg"></div>
      <div className="container hero__content">
        {user && <div className="hero__greeting">{greeting()}, {user.username.toUpperCase()}</div>}
        <div className="eyebrow">{country ? `Aviation In ${country.name}` : 'The Home Of Aviation Enthusiasts'}</div>
        <h1 className="hero__title">{country ? <>{country.flag} {country.name.split(' ')[0].toUpperCase()}<span>FROM ABOVE</span></> : <>ABOVE<span>THE CLOUDS</span></>}</h1>
        <div className="hero__tagline">Your aviation world, personalized.</div>
        <p className="hero__sub">Live flight tracking, daily aviation challenges, aircraft encyclopedia and aviation news — for people who never stop looking up.</p>
        <div className="hero__actions">
          <a href="#flying-now" className="btn btn--primary">See What's Flying Now</a>
          <a href={CONFIG.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">Follow on Instagram</a>
        </div>
      </div>
    </section>
  );
}
