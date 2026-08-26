import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';

const AIRCRAFT = ['737', '757', 'A320'];
const AIRPORTS = ['AEP', 'EZE', 'USH', 'LHR', 'MAD'];

export default function GameHub() {
  const showToast = useToast();
  const [aircraft, setAircraft] = useState(AIRCRAFT[0]);
  const [airport, setAirport] = useState(AIRPORTS[0]);

  return (
    <section id="game" className="game">
      <div className="container game__grid">
        <div className="reveal">
          <div className="eyebrow">Fly Above The Clouds</div>
          <h2>Ready For Takeoff?</h2>
          <p>Take control. Fly the aircraft. Master the approach.</p>
          <div className="game__selects">
            <div>
              <span>Aircraft</span>
              <div className="game__opts">{AIRCRAFT.map((a) => <button key={a} className={aircraft===a?'active':''} onClick={()=>setAircraft(a)}>{a}</button>)}</div>
            </div>
            <div>
              <span>Airport</span>
              <div className="game__opts">{AIRPORTS.map((a) => <button key={a} className={airport===a?'active':''} onClick={()=>setAirport(a)}>{a}</button>)}</div>
            </div>
          </div>
          <button className="btn btn--primary" style={{marginTop:24}} onClick={() => showToast(`LANDING CHALLENGE — ${aircraft} at ${airport} — coming soon.`)}>
            Play Above The Clouds
          </button>
        </div>
        <div className="cockpit reveal">
          <div className="cockpit__corner tl"></div><div className="cockpit__corner tr"></div>
          <div className="cockpit__corner bl"></div><div className="cockpit__corner br"></div>
          <div className="cockpit__hud">
            <div className="cockpit__ring"><div>{aircraft}</div></div>
            <div className="cockpit__label">Landing Challenge — {airport}</div>
            <div className="cockpit__status">STANDBY — IN DEVELOPMENT</div>
          </div>
        </div>
      </div>
    </section>
  );
}
