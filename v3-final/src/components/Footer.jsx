import React from 'react';
import { CONFIG } from '../lib/config.js';

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer__top">
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 9, height: 9, background: 'var(--amber)', transform: 'rotate(45deg)', display: 'inline-block' }}></span>
              ABOVE THE CLOUDS
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--amber)', marginTop: 12, textTransform: 'uppercase' }}>
              Aviation beyond the ordinary.
            </div>
          </div>
          <div className="footer__col">
            <h4>Platform</h4>
            <a href="/#flying-now">What's Flying Now</a>
            <a href="/aircraft">Aircraft</a>
            <a href="/#argentina">Argentina From Above</a>
            <a href="/#game">Game</a>
          </div>
          <div className="footer__col">
            <h4>Connect</h4>
            <a href={CONFIG.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="#" target="_blank" rel="noopener noreferrer">TikTok</a>
            <a href="#" target="_blank" rel="noopener noreferrer">YouTube</a>
          </div>
          <div className="footer__col">
            <h4>Company</h4>
            <a href="/#about">About</a>
            <a href="#">Contact</a>
            <a href="#">Privacy</a>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© 2026 ABOVETHECLOUDS</span>
          <span>FOR PEOPLE WHO NEVER STOP LOOKING UP</span>
        </div>
      </div>
    </footer>
  );
}
