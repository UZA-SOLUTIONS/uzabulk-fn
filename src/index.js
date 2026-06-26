import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import { initDocumentLanguage } from './helpers/languageHelper';
import { bumpHomeFeedRefreshTokenOnReload } from './helpers/homeFeedHelper';
import { clearHomeCategoryCircleImageCache } from './helpers/homeCategoryCircleImageCache';
import App from './App';
import reportWebVitals from './reportWebVitals';

initDocumentLanguage();

const nav = typeof performance !== 'undefined'
  ? performance.getEntriesByType?.('navigation')?.[0]
  : null;
bumpHomeFeedRefreshTokenOnReload();
if (nav?.type === 'reload') {
  clearHomeCategoryCircleImageCache();
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);

reportWebVitals();
