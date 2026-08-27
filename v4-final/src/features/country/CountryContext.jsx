import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { findCountry } from './countries.js';

const STORAGE_KEY = 'atc_country';
const CountryCtx = createContext(null);

export function CountryProvider({ children }) {
  const [countryCode, setCountryCodeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null; // e.g. localStorage disabled — degrade to "no country selected" rather than throwing
    }
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const setCountryCode = useCallback((code) => {
    setCountryCodeState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore — localStorage may be unavailable (private mode, etc.); the
         in-memory state still personalizes this session */
    }
    // Best-effort sync to the user's profile if logged in. Silently
    // ignored if not authenticated (401) — anonymous personalization via
    // localStorage still works either way, per the V4 spec.
    api('/profile/country', { method: 'POST', body: JSON.stringify({ countryCode: code }) }).catch(() => {});
  }, []);

  // If the user is already logged in and their profile already has a
  // country saved, prefer that over whatever's in localStorage on this
  // device (keeps personalization consistent across devices).
  useEffect(() => {
    api('/auth/me')
      .then((d) => {
        if (d.profile?.country_code && findCountry(d.profile.country_code)) {
          setCountryCodeState(d.profile.country_code);
          try { localStorage.setItem(STORAGE_KEY, d.profile.country_code); } catch { /* ignore */ }
        }
      })
      .catch(() => {}); // not logged in — fine, localStorage-only personalization stands
  }, []);

  useEffect(() => {
    if (!countryCode) setPickerOpen(true);
  }, [countryCode]);

  const country = findCountry(countryCode);

  return (
    <CountryCtx.Provider value={{ countryCode, country, setCountryCode, pickerOpen, setPickerOpen }}>
      {children}
    </CountryCtx.Provider>
  );
}

export function useCountry() {
  return useContext(CountryCtx);
}
