import React from 'react';
import { useToast } from '../../components/Toast.jsx';

const TAGS = [
  { name: 'Boeing 737 Aviation Tag', desc: "Inspired by the world's best-selling narrowbody." },
  { name: 'Boeing 757 Aviation Tag', desc: "For the fans of aviation's favorite underdog." },
  { name: 'Airbus A320 Aviation Tag', desc: 'A tribute to the backbone of short-haul flying.' },
  { name: 'Custom Registration Tag', desc: 'Your own aircraft registration, engraved.' },
];

export default function AviationTags() {
  const showToast = useToast();
  return (
    <section id="tags">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">Future Product</div>
            <h2>Your Aircraft. Your Tag.</h2>
          </div>
          <p>Aviation-inspired tags made for people who live and breathe aviation.</p>
        </div>
        <div className="tags__grid reveal">
          {TAGS.map((t) => (
            <div className="tags__card" key={t.name}>
              <span className="tags__badge">Coming Soon</span>
              <div className="tags__shape"></div>
              <div className="tags__name">{t.name}</div>
              <div className="tags__desc">{t.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button className="btn btn--primary" onClick={() => showToast("YOU'RE ON THE WAITLIST — WE'LL BE IN TOUCH.")}>Join The Waitlist</button>
        </div>
      </div>
    </section>
  );
}
