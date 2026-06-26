import React, { useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { APP_NAME, BRAND_LOGO_PNG } from "../../config/constants";
import { DEFAULT_OG_IMAGE, ORGANIZATION_SCHEMA, SITE_URL } from "../../config/seoConfig";
import {
  buildHreflangLinks,
  buildLocalizedUrl,
  getSiteBaseUrl,
  resolveRouteSeoKey,
  truncateMeta,
} from "../../helpers/seoHelper";
import { getLanguageCode, setSiteLanguage } from "../../helpers/languageHelper";
import ROUTES from "../../helpers/routesHelper";
import { QUICK_LINKS } from "../../helpers/seoLinks";

export default function SeoManager() {
  const { t, i18n } = useTranslation();
  const { pathname, search } = useLocation();
  const lang = getLanguageCode();
  const baseUrl = getSiteBaseUrl();
  const routeSeo = useMemo(() => resolveRouteSeoKey(pathname), [pathname]);
  const pageKey = routeSeo.key;

  useEffect(() => {
    const langParam = new URLSearchParams(search).get("lang");
    if (langParam === "fr" || langParam === "en") {
      if (getLanguageCode() !== langParam) {
        setSiteLanguage(langParam);
      }
    }
  }, [search]);

  const title = t(`seo.pages.${pageKey}.title`, { appName: APP_NAME });
  const description = truncateMeta(
    t(`seo.pages.${pageKey}.description`, { appName: APP_NAME }),
    165
  );
  const keywords = t(`seo.pages.${pageKey}.keywords`, { appName: APP_NAME });
  const siteKeywords = t("seo.siteKeywords", { appName: APP_NAME });
  const combinedKeywords = [keywords, siteKeywords].filter(Boolean).join(", ");

  const canonicalUrl = buildLocalizedUrl(pathname, lang, { baseUrl, search });
  const hreflangLinks = buildHreflangLinks(pathname, search);
  const robots = routeSeo.noindex ? "noindex, nofollow" : "index, follow";
  const ogImage = DEFAULT_OG_IMAGE || `${baseUrl}${BRAND_LOGO_PNG}`;
  const ogLocale = lang === "fr" ? "fr_FR" : "en_US";
  const ogLocaleAlt = lang === "fr" ? "en_US" : "fr_FR";

  const organizationJsonLd = {
    "@context": "https://schema.org",
    ...ORGANIZATION_SCHEMA,
    url: baseUrl || SITE_URL,
    logo: ogImage,
    inLanguage: ["en", "fr"],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: baseUrl || SITE_URL,
    inLanguage: ["en", "fr"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}${ROUTES.PRODUCT_LISTING}?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const siteNavigationJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: QUICK_LINKS.map((item, index) => ({
      "@type": "SiteNavigationElement",
      position: index + 1,
      name: t(item.labelKey),
      url: buildLocalizedUrl(item.to, lang, { baseUrl }),
    })),
  };

  return (
    <Helmet prioritizeSeoTags htmlAttributes={{ lang: i18n.language || lang }}>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={combinedKeywords} />
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <meta name="language" content={lang === "fr" ? "French" : "English"} />
      <meta httpEquiv="content-language" content={lang} />
      <meta name="author" content={APP_NAME} />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />
      <meta name="revisit-after" content="7 days" />
      <meta name="geo.region" content="RW" />
      <meta name="geo.placename" content="Rwanda, East Africa, Francophone Africa" />
      <meta name="target" content="all" />
      <meta name="audience" content="all" />
      <link rel="canonical" href={canonicalUrl} />
      {hreflangLinks.map((link) => (
        <link key={link.hreflang} rel="alternate" hrefLang={link.hreflang} href={link.href} />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={buildLocalizedUrl(pathname, "en", { baseUrl, search })}
      />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={APP_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={APP_NAME} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:locale:alternate" content={ogLocaleAlt} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      <script type="application/ld+json">{JSON.stringify(organizationJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(websiteJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(siteNavigationJsonLd)}</script>
    </Helmet>
  );
}
