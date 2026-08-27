import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import { CountryProvider } from './features/country/CountryContext.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CountryProvider>
          <App />
        </CountryProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
