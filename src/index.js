import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import { initDocumentLanguage } from './helpers/languageHelper';
import { bumpHomeFeedRefreshToken } from './helpers/homeFeedHelper';
import App from './App';
import reportWebVitals from './reportWebVitals';

initDocumentLanguage();
bumpHomeFeedRefreshToken();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);

reportWebVitals();
