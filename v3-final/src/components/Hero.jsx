import React from 'react';
import { CONFIG } from '../lib/config.js';

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero__bg"></div>
      <div className="container hero__content">
        <div className="eyebrow">The Home Of Aviation Enthusiasts</div>
        <h1 className="hero__title">ABOVE<span>THE CLOUDS</span></h1>
        <div className="hero__tagline">Aviation beyond the ordinary.</div>
        <p className="hero__sub">Live flight tracking, daily aviation challenges, aircraft encyclopedia and aviation news — for people who never stop looking up.</p>
        <div className="hero__actions">
          <a href="#flying-now" className="btn btn--primary">See What's Flying Now</a>
          <a href={CONFIG.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">Follow on Instagram</a>
        </div>
      </div>
    </section>
  );
}
