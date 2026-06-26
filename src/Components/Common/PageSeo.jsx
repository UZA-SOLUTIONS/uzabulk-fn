import React from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { APP_NAME, BRAND_LOGO_PNG } from "../../config/constants";
import { DEFAULT_OG_IMAGE } from "../../config/seoConfig";
import {
  buildHreflangLinks,
  buildLocalizedUrl,
  getSiteBaseUrl,
  truncateMeta,
} from "../../helpers/seoHelper";
import { getLanguageCode } from "../../helpers/languageHelper";

export default function PageSeo({
  title,
  description,
  keywords,
  image,
  noindex = false,
  jsonLd = null,
  type = "website",
}) {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const lang = getLanguageCode();
  const baseUrl = getSiteBaseUrl();
  const canonicalUrl = buildLocalizedUrl(pathname, lang, { baseUrl, search });
  const hreflangLinks = buildHreflangLinks(pathname, search);
  const ogLocale = lang === "fr" ? "fr_FR" : "en_US";
  const ogLocaleAlt = lang === "fr" ? "en_US" : "fr_FR";
  const robots = noindex ? "noindex, nofollow" : "index, follow";
  const metaTitle = title || APP_NAME;
  const metaDescription = truncateMeta(description || "", 165);
  const ogImage = image || DEFAULT_OG_IMAGE || `${baseUrl}${BRAND_LOGO_PNG}`;

  return (
    <Helmet prioritizeSeoTags htmlAttributes={{ lang }}>
      <title>{metaTitle}</title>
      {metaDescription ? <meta name="description" content={metaDescription} /> : null}
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <meta name="language" content={lang === "fr" ? "French" : "English"} />
      <meta httpEquiv="content-language" content={lang} />
      <link rel="canonical" href={canonicalUrl} />
      {hreflangLinks.map((link) => (
        <link key={link.hreflang} rel="alternate" hrefLang={link.hreflang} href={link.href} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={buildLocalizedUrl(pathname, "en", { baseUrl, search })} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={APP_NAME} />
      <meta property="og:title" content={metaTitle} />
      {metaDescription ? <meta property="og:description" content={metaDescription} /> : null}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:locale:alternate" content={ogLocaleAlt} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      {metaDescription ? <meta name="twitter:description" content={metaDescription} /> : null}
      <meta name="twitter:image" content={ogImage} />

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
