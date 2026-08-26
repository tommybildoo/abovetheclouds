import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import LoginModal from '../auth/LoginModal.jsx';
import SafeImage from '../../components/SafeImage.jsx';

export default function DailyChallenge() {
  const { user, refresh: refreshAuth } = useAuth();
  const [challenge, setChallenge] = useState(undefined); // undefined = loading, null = none available
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api('/challenge/today').then((d) => setChallenge(d.challenge)).catch(() => setChallenge(null));
  }, []);

  const submit = async (option) => {
    if (!user) { setShowLogin(true); return; }
    setSelected(option);
    setSubmitting(true);
    try {
      const data = await api('/challenge/answer', {
        method: 'POST',
        body: JSON.stringify({ challengeId: challenge.id, answer: option }),
      });
      setResult(data);
      refreshAuth();
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="challenge">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">How Well Do You Know Aircraft?</div>
            <h2>Daily Challenge</h2>
          </div>
          <p>One aircraft. One question. Every day.</p>
        </div>

        <div className="dc__card reveal">
          {challenge === undefined && <div className="dc__loading">Loading today's challenge…</div>}
          {challenge === null && <div className="dc__loading">No challenge available yet — check back soon.</div>}

          {challenge && (
            <>
              {challenge.image && <SafeImage src={challenge.image} alt="Challenge aircraft" kind="aircraft" className="dc__image" />}
              <span className="dc__type">{challenge.challenge_type.replaceAll('_', ' ')}</span>
              <h3 className="dc__question">{challenge.question}</h3>

              <div className="dc__options">
                {challenge.options.map((opt) => {
                  const isSelected = selected === opt;
                  const isCorrectShown = result && opt === result.correctAnswer;
                  const isWrongSelected = result && isSelected && !result.isCorrect;
                  return (
                    <button
                      key={opt}
                      className={`dc__option${isSelected ? ' selected' : ''}${isCorrectShown ? ' correct' : ''}${isWrongSelected ? ' wrong' : ''}`}
                      disabled={!!result || submitting}
                      onClick={() => submit(opt)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {result && !result.error && (
                <div className={`dc__result${result.isCorrect ? ' correct' : ''}`}>
                  <div className="dc__result-title">{result.isCorrect ? 'CORRECT' : 'NOT THIS TIME'}</div>
                  {result.isCorrect && <div className="dc__xp">+{result.xpAwarded} XP</div>}
                  <p className="dc__explanation">{result.explanation}</p>
                  {result.streak && <p className="dc__streak">🔥 {result.streak.currentStreak} day streak</p>}
                </div>
              )}
              {result?.error && <div className="dc__result"><p className="dc__explanation">{result.error}</p></div>}

              {!user && !result && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dimmer)', marginTop: 16 }}>
                  Sign in to answer and earn XP.
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </section>
  );
}
