import React, { useEffect } from 'react';
import Hero from '../components/Hero.jsx';
import WhatsFlyingNow from '../features/live-flights/WhatsFlyingNow.jsx';
import AviationNews from '../features/news/AviationNews.jsx';
import DailyChallenge from '../features/challenges/DailyChallenge.jsx';
import AircraftExplorer from '../features/aircraft/AircraftExplorer.jsx';
import ArgentinaSection from '../features/argentina/ArgentinaSection.jsx';
import SpotterMode from '../features/spotter/SpotterMode.jsx';
import GameHub from '../features/game/GameHub.jsx';
import CommunityGrid from '../features/community/CommunityGrid.jsx';
import AviationTags from '../features/tags/AviationTags.jsx';
import Leaderboard from '../features/leaderboard/Leaderboard.jsx';

export default function Home() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Hero />
      <WhatsFlyingNow />
      <AviationNews />
      <DailyChallenge />
      <AircraftExplorer />
      <ArgentinaSection />
      <SpotterMode />
      <GameHub />
      <CommunityGrid />
      <Leaderboard />
      <AviationTags />
      <section id="about">
        <div className="container">
          <div className="eyebrow">About</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,44px)', textTransform: 'uppercase', margin: '12px 0 20px', maxWidth: 700 }}>
            The home of aviation enthusiasts on the internet.
          </h2>
          <p style={{ color: 'var(--text-dim)', maxWidth: 620, fontWeight: 300, lineHeight: 1.7 }}>
            AboveTheClouds combines live flight tracking, daily challenges, aircraft knowledge, aviation news
            and a real community — built by aviation enthusiasts, for aviation enthusiasts.
          </p>
        </div>
      </section>
    </>
  );
}
