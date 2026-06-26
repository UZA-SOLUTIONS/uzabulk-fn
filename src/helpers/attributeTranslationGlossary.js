/**
 * Common 1688 / wholesale product specification labels & values (EN → FR).
 * Used for instant French display; unknown strings still go through the API.
 */

const normalizeKey = (text) => String(text || "").trim().toLowerCase().replace(/\s+/g, " ");

const LABELS = {
  "toe shape": "Forme des orteils",
  "supply category": "Catégorie d'approvisionnement",
  "in stock": "En stock",
  "upper material": "Matériau supérieur",
  "origin": "Origine",
  style: "Style",
  "applicable gender": "Genre concerné",
  "cortical characteristics": "Caractéristiques du cuir",
  "popular elements": "Éléments tendance",
  "heel height": "Hauteur du talon",
  pattern: "Motif",
  "suitable for the season": "Saison adaptée",
  "the fastest shipping time": "Délai d'expédition le plus rapide",
  color: "Couleur",
  size: "Taille",
  "applicable age group": "Tranche d'âge",
  "opening depth": "Profondeur d'ouverture",
  brand: "Marque",
  "item number": "Référence article",
  "sole material": "Matériau de la semelle",
  "inner material": "Matériau intérieur",
  "processing method": "Méthode de traitement",
  "height of the upper": "Hauteur de tige",
  "heel shape": "Forme du talon",
  "sole technology": "Technologie de semelle",
  "wearing method": "Mode de port",
  function: "Fonction",
  "is it for foreign trade?": "Destiné au commerce international ?",
  "foreign trade type": "Type de commerce international",
  "suitable for sports": "Adapté au sport",
  "insole material": "Matériau de la semelle intérieure",
  "quality inspection report": "Rapport de contrôle qualité",
  "quality inspection unit": "Organisme de contrôle qualité",
  "applicable scenarios": "Scénarios d'utilisation",
  "gross weight": "Poids brut",
  "packing volume": "Volume d'emballage",
  "year and season of launch (time of launch)": "Année et saison de lancement",
  "the latest delivery time": "Délai de livraison le plus récent",
  "is it a special supply source for cross-border export?": "Source spéciale pour l'export transfrontalier ?",
  "main downstream platform": "Principale plateforme de vente",
  "main sales areas": "Principales zones de vente",
  "there are authorizable private brands": "Marques privées autorisables",
  "closure method": "Mode de fermeture",
  "product category": "Catégorie de produit",
  material: "Matériau",
  season: "Saison",
  gender: "Genre",
  weight: "Poids",
};

const VALUES = {
  "round head": "Tête ronde",
  "in stock": "En stock",
  "genuine leather": "Cuir véritable",
  "guangzhou, guangdong": "Guangzhou, Guangdong",
  casual: "Décontracté",
  male: "Homme",
  female: "Femme",
  unisex: "Unisexe",
  cowhide: "Peau de vache",
  "leather stitching": "Coutures en cuir",
  "flat heel": "Talon plat",
  "solid color": "Couleur unie",
  summer: "Été",
  winter: "Hiver",
  spring: "Printemps",
  autumn: "Automne",
  fall: "Automne",
  "24 hours": "24 heures",
  black: "Noir",
  blue: "Bleu",
  brown: "Marron",
  "dark brown": "Marron foncé",
  gray: "Gris",
  grey: "Gris",
  white: "Blanc",
  red: "Rouge",
  green: "Vert",
  yellow: "Jaune",
  pink: "Rose",
  "38 45 46 can be customized": "38 45 46 personnalisable",
  "youth (18-40 years old)": "Jeunes (18-40 ans)",
  "shallow mouth (under 7cm)": "Ouverture peu profonde (moins de 7 cm)",
  rubber: "Caoutchouc",
  "first layer of cowhide": "Première couche de peau de vache",
  frosted: "Givré",
  "low ankle": "Cheville basse",
  "flat bottom": "Semelle plate",
  "adhesive rubber shoes": "Chaussures à semelle collée",
  "sleeve/shoe set": "Enfilage / chausson",
  increased: "Surélevant",
  breathable: "Respirant",
  "deodorizing filter": "Filtre désodorisant",
  "shock absorption": "Absorption des chocs",
  yes: "Oui",
  no: "Non",
  export: "Export",
  "jogging/long running": "Jogging / course longue",
  "natural leather": "Cuir naturel",
  loafers: "Mocassins",
  "2kg": "2 kg",
  british: "Britannique",
  "spring 2024": "Printemps 2024",
  "3 days": "3 jours",
  ebay: "eBay",
  amazon: "Amazon",
  wish: "Wish",
  aliexpress: "AliExpress",
  "independent station": "Site indépendant",
  lazada: "Lazada",
  other: "Autre",
  african: "Afrique",
  europe: "Europe",
  "south america": "Amérique du Sud",
  "southeast asia": "Asie du Sud-Est",
  "north america": "Amérique du Nord",
  "northeast asia": "Asie du Nord-Est",
  "middle east": "Moyen-Orient",
  "tie-up": "À lacets",
  sneakers: "Baskets",
};

const labelMap = new Map(Object.entries(LABELS));
const valueMap = new Map(Object.entries(VALUES));

export function translateAttributeLabelToFrench(text) {
  const key = normalizeKey(text);
  if (!key) return "";
  return labelMap.get(key) || "";
}

export function translateAttributeValueToFrench(text) {
  const key = normalizeKey(text);
  if (!key) return "";
  if (valueMap.has(key)) return valueMap.get(key);
  if (/^-?\d+(\.\d+)?$/.test(key)) return String(text).trim();
  if (/^\d+(\s*[-–]\s*\d+)?(\s*(cm|mm|kg|g|ml|l))?$/i.test(String(text).trim())) {
    return String(text).trim();
  }
  return "";
}

export function shouldSkipAttributeApiTranslation(text, kind = "value") {
  const raw = String(text || "").trim();
  const key = normalizeKey(text);
  if (!key) return true;
  if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(raw)) return false;
  if (kind === "label" && labelMap.has(key)) return true;
  if (kind === "value" && valueMap.has(key)) return true;
  if (/^(sgs|ebay|amazon|wish)$/i.test(key)) return true;
  if (/^\d{1,6}$/.test(key)) return true;
  return false;
}

export function containsCjk(text) {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(String(text || ""));
}

export function shouldTranslateAttributeForLang(text, lang = "fr", kind = "value") {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (lang === "en") return containsCjk(raw);
  return !shouldSkipAttributeApiTranslation(raw, kind);
}
