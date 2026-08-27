import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { findCountry } from '../features/country/countries.js';

/**
 * V4 — a real /profile page. V3 only had a placeholder that pointed to
 * the leaderboard section with a tooltip explaining a profile page
 * wasn't built yet (see FINAL_AUDIT.md history) — this replaces that
 * placeholder with the actual page.
 */
export default function Profile() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="container" style={{ paddingTop: 140 }}>Loading…</div>;

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 140, paddingBottom: 100 }}>
        <div className="eyebrow">Profile</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, textTransform: 'uppercase', margin: '10px 0 20px' }}>Sign in to see your profile</h1>
        <Link to="/" className="btn btn--primary">Back Home</Link>
      </div>
    );
  }

  const country = findCountry(profile?.country_code);
  const progressPct = profile?.nextLevelXp ? Math.round((profile.progress || 0) * 100) : 100;

  return (
    <div className="container profile-page">
      <div className="profile-header reveal">
        <div className="profile-avatar">{user.username?.[0]?.toUpperCase() || '?'}</div>
        <div>
          <h1 className="profile-username">{user.username}</h1>
          <div className="profile-country">{country ? `${country.flag} ${country.name.toUpperCase()}` : 'No country set'}</div>
        </div>
      </div>

      <div className="profile-level reveal">
        <div className="profile-level__top">
          <span>LEVEL {profile?.level ?? 1}</span>
          <span>{profile?.xp?.toLocaleString() ?? 0} XP</span>
        </div>
        <div className="profile-level__bar"><div style={{ width: `${progressPct}%` }} /></div>
        <div className="profile-level__name">{profile?.name || 'Passenger'}{profile?.nextLevelXp ? ` · ${profile.nextLevelXp.toLocaleString()} XP to next level` : ' · Max level'}</div>
      </div>

      {profile?.current_streak > 0 && (
        <div className="profile-streak reveal">🔥 {profile.current_streak} DAY STREAK</div>
      )}

      <div className="profile-stats reveal">
        <StatCard label="Aircraft" value={profile?.aircraft_identified ?? 0} sub="discovered" />
        <StatCard label="Airports" value={profile?.airports_discovered ?? 0} sub="discovered" />
        <StatCard label="Challenges" value={profile?.challenges_completed ?? 0} sub="completed" />
        <StatCard label="Longest Streak" value={profile?.longest_streak ?? 0} sub="days" />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="profile-stat">
      <b>{value}</b>
      <span>{label}</span>
      <small>{sub}</small>
    </div>
  );
}
