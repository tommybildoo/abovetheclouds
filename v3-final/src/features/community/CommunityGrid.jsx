import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import SafeImage from '../../components/SafeImage.jsx';

export default function CommunityGrid() {
  const [photos, setPhotos] = useState(null);
  const { user } = useAuth();
  const showToast = useToast();

  useEffect(() => {
    api('/photos').then((d) => setPhotos(d.photos)).catch(() => setPhotos([]));
  }, []);

  const submit = async () => {
    if (!user) { showToast('Sign in to submit a photo.'); return; }
    showToast('Photo submission form coming soon — architecture is ready (see /api/photos).');
  };

  return (
    <section id="community">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">The Spotter Community</div>
            <h2>From The Aviation Community</h2>
          </div>
          <p>Spotted, shot and shared. Every photo is moderated before it goes public.</p>
        </div>
        <div className="cg__grid reveal">
          {photos === null && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>Loading community photos…</p>}
          {photos && photos.length === 0 && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>No approved photos yet — be the first to submit one.</p>}
          {photos && photos.map((p) => (
            <div className="cg__card" key={p.id}>
              <SafeImage src={p.image_url} alt={`${p.username} — ${p.aircraft || ''}`} kind="photo" className="cg__card-img" />
              <div className="cg__info">
                <span className="cg__user">@{p.username}</span>
                <span className="cg__meta">{p.aircraft} · {p.airport || p.location}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button className="btn btn--ghost" onClick={submit}>Submit Your Photo</button>
        </div>
      </div>
    </section>
  );
}
