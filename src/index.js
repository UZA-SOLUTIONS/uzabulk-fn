import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import { initDocumentLanguage } from './helpers/languageHelper';
import { bumpHomeFeedRefreshTokenOnReload, getHomeFeedRefreshToken } from './helpers/homeFeedHelper';
import { clearClientFetchCache } from './helpers/fetchCacheHelper';
import { hydratePersistedCategoryImages } from './helpers/homeCategoryImagePersistCache';
import App from './App';
import reportWebVitals from './reportWebVitals';

initDocumentLanguage();

bumpHomeFeedRefreshTokenOnReload();
clearClientFetchCache();
hydratePersistedCategoryImages(getHomeFeedRefreshToken());

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);

reportWebVitals();
