// Reconnaissance des offres : une annonce est-elle bien une carte graphique de BUREAU du modèle suivi ?
// Fonctions pures, partagées par le scraper (à l'ingestion), le rapport quotidien et l'interface.
// Elles sont volontairement prudentes : en cas de doute franc (portable, PC complet, processeur, accessoire,
// carte professionnelle) l'offre est écartée plutôt que d'être présentée comme une carte de bureau.

/** Minuscules, sans accents, mots séparés par un espace ; sépare « 5070ti » → « 5070 ti » et « rtx5070 » → « rtx 5070 ». */
export function normalizeTitle(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(\d)(ti|super|xtx|xt|gre|gb|go|g|kf|ks|k)\b/g, "$1 $2")
    .replace(/\b(rtx|gtx|rx|gt)(\d)/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mots qui, juste après le numéro du modèle, désignent un autre modèle (5070 → 5070 Ti) ou un processeur (7600 → 7600X). */
const SIBLING_SUFFIXES = new Set(["ti", "super", "xt", "xtx", "gre", "x", "k", "kf", "ks", "x3d"]);

/** Le titre désigne-t-il le GPU suivi (et pas un modèle voisin : Ti, Super, XT, XTX, GRE…) ? */
export function titleMatches(title: string, token: string): boolean {
  const words = normalizeTitle(title).split(" ");
  const wanted = normalizeTitle(token).split(" ");
  if (!wanted[0]) return false;
  for (let i = 0; i + wanted.length <= words.length; i++) {
    if (wanted.every((w, j) => words[i + j] === w)) {
      const next = words[i + wanted.length];
      return !(next && SIBLING_SUFFIXES.has(next));
    }
  }
  return false;
}

export type OfferKind =
  | "desktop_gpu"
  | "laptop"
  | "prebuilt_pc"
  | "cpu"
  | "accessory"
  | "professional"
  | "not_gpu";

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const PROFESSIONAL = /\b(quadro|tesla|radeon pro|firepro|instinct|rtx pro|workstation|station de travail)\b|\brtx a\d{3,4}\b|\brtx \d{4} ada\b/;

// Évalué sur le texte brut (les guillemets et points des tailles d'écran y sont encore).
const LAPTOP_RAW = new RegExp(
  [
    String.raw`\b(laptop|laptops|notebook|portable|portables|ultrabook|chromebook|macbook)\b`,
    String.raw`\bmobile\b`,
    String.raw`\bmax-?q\b`,
    // taille d'écran : 15.6", 16 pouces, 17,3 po
    String.raw`\b\d{2}(?:[.,]\d{1,2})?\s?(?:"|”|''|pouces?|po|inch)(?=\W|$)`,
    // gammes de PC portables dont le nom ne contient pas « portable »
    String.raw`\b(?:zenbook|vivobook|zephyrus|legion|victus|katana|cyborg|raider|loq|ideapad|thinkpad|thinkbook|helios|swift)\b`,
    String.raw`\brog flow\b`,
    String.raw`\bstrix (?:g|scar) ?\d{2}\b`,
    String.raw`\btuf (?:gaming )?[af] ?\d{2}\b`,
    String.raw`\bnitro (?:v ?)?(?:1\d|5)\b`,
    String.raw`\bnitro v\b`,
    String.raw`\bomen (?:\d{2}|max)\b`,
    String.raw`\b(?:stealth|vector|sword|crosshair|thin|aorus|aero|blade|pulse) ?(?:gl)?\d{2}[a-z]?\b`,
    String.raw`\balienware (?:m|x) ?\d{2}\b`,
  ].join("|"),
);

const PREBUILT_PC = new RegExp(
  [
    String.raw`\b(ordinateur|ordinateurs|unite centrale|tour gamer|mini pc|barebone|all in one|tout en un|ssd|nvme|windows 1[01]|ddr[345]|wifi ?[67])\b`,
    // « PC Gamer » comme produit, pas « pour PC Gamer » / « compatible PC Gaming »
    String.raw`(?<!pour |for |de |du |sur |compatible )\bpc (?:gamer|gaming)\b`,
  ].join("|"),
);

const ACCESSORY_ANYWHERE = /\b(waterblock|water block|watercooling|anti ?sag|egpu|boitier externe)\b/;
// Un accessoire commence par son nom (« Câble 12VHPWR… », « Alimentation 850 W… ») : on regarde les 3 premiers mots.
const ACCESSORY_LEAD = /^(?:[a-z0-9]+ ){0,2}(?:cable|adaptateur|alimentation|support|rallonge|riser|bloc|refroidisseur|backplate)\b/;

const GPU_VOCABULARY: Record<string, RegExp> = {
  NVIDIA: /\b(geforce|rtx|gtx)\b/,
  AMD: /\b(radeon|rx)\b/,
  Intel: /\barc\b/,
};
const ANY_GPU_VOCABULARY = /\b(geforce|rtx|gtx|radeon|rx|arc)\b/;

export interface OfferClassification {
  kind: OfferKind;
}

/** Nature d'une annonce. `brand` (NVIDIA / AMD / Intel) renforce la reconnaissance du vocabulaire de la marque. */
export function classifyOffer(title: string, brand?: string | null): OfferClassification {
  const raw = strip(title);
  const text = normalizeTitle(title);
  if (PROFESSIONAL.test(text)) return { kind: "professional" };
  if (LAPTOP_RAW.test(raw) || LAPTOP_RAW.test(text)) return { kind: "laptop" };
  if (PREBUILT_PC.test(raw) || PREBUILT_PC.test(text)) return { kind: "prebuilt_pc" };
  if (/\b(ryzen|intel core|core ultra|processeur|cpu)\b|\bi[3579] ?\d{4,5}[a-z]{0,2}\b/.test(text) && !/\bcarte graphique\b/.test(text)) {
    return { kind: "cpu" };
  }
  if (ACCESSORY_ANYWHERE.test(text) || ACCESSORY_LEAD.test(text)) return { kind: "accessory" };
  const vocabulary = (brand && GPU_VOCABULARY[brand]) || ANY_GPU_VOCABULARY;
  if (!vocabulary.test(text)) return { kind: "not_gpu" };
  return { kind: "desktop_gpu" };
}

/** L'annonce est une carte graphique de bureau ET correspond au modèle suivi. */
export function isDesktopGpuOffer(title: string, gpu: { brand: string; match_token: string }): boolean {
  return classifyOffer(title, gpu.brand).kind === "desktop_gpu" && titleMatches(title, gpu.match_token);
}
