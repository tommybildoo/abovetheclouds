import React from 'react';

export default function SpotterMode() {
  return (
    <section id="spotter">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">Test Your Eye</div>
            <h2>Spotter</h2>
          </div>
          <p>Quick-fire aircraft ID mini-games. Daily, weekly and monthly spotter stats.</p>
        </div>
        <div className="spotter__card reveal">
          <p>Spotter mode reuses the same challenge engine as the Daily Challenge (see server/lib/challenges.js) —
            architecture is in place for unlimited practice rounds distinct from the once-a-day scored challenge.</p>
          <a href="#challenge" className="btn btn--ghost" style={{ marginTop: 20 }}>Try Today's Challenge</a>
        </div>
      </div>
    </section>
  );
}
