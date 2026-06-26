import { APP_NAME, BRAND_LOGO_PNG } from "./constants";

export const SITE_URL = (process.env.REACT_APP_SITE_URL || "https://uzabulk.com").replace(/\/+$/, "");

export const SEO_LOCALES = [
  { code: "en", hreflang: "en", ogLocale: "en_US", label: "English" },
  { code: "fr", hreflang: "fr", ogLocale: "fr_FR", label: "Français" },
];

export const DEFAULT_OG_IMAGE = `${SITE_URL}${BRAND_LOGO_PNG}`;

export const ORGANIZATION_SCHEMA = {
  "@type": "Organization",
  name: APP_NAME,
  alternateName: ["UZA Bulk", "UZABULK"],
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  sameAs: [],
  areaServed: [
    { "@type": "Country", name: "Rwanda" },
    { "@type": "Country", name: "France" },
    { "@type": "Country", name: "Belgium" },
    { "@type": "Country", name: "Canada" },
    { "@type": "Country", name: "Senegal" },
    { "@type": "Country", name: "Côte d'Ivoire" },
    { "@type": "Country", name: "Cameroon" },
    { "@type": "Country", name: "Democratic Republic of the Congo" },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    availableLanguage: ["English", "French"],
  },
};

export const SITEMAP_PUBLIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/categories", changefreq: "weekly", priority: "0.9" },
  { path: "/newArrivals", changefreq: "daily", priority: "0.85" },
  { path: "/topRanking", changefreq: "daily", priority: "0.85" },
  { path: "/dealsOnBestSeller", changefreq: "daily", priority: "0.85" },
  { path: "/savingSpotlight", changefreq: "daily", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/about-us", changefreq: "monthly", priority: "0.6" },
  { path: "/contact-us", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.4" },
  { path: "/term-and-conditions", changefreq: "yearly", priority: "0.4" },
];
