export type StoreId =
  | "amazon"
  | "topachat"
  | "ldlc"
  | "cdiscount"
  | "materielnet"
  | "rueducommerce"
  | "backmarket";

export interface StoreDef {
  id: StoreId;
  name: string;
  origin: string;
  searchUrl: (q: string) => string;
}

const enc = encodeURIComponent;

export const STORES: StoreDef[] = [
  { id: "amazon", name: "Amazon France", origin: "https://www.amazon.fr", searchUrl: (q) => `https://www.amazon.fr/s?k=${enc("carte graphique " + q)}` },
  { id: "topachat", name: "TopAchat", origin: "https://www.topachat.com", searchUrl: (q) => `https://www.topachat.com/pages/recherche.php?cat=micro&etou=0&mc=${enc(q)}` },
  { id: "ldlc", name: "LDLC", origin: "https://www.ldlc.com", searchUrl: (q) => `https://www.ldlc.com/recherche/${enc(q)}/` },
  { id: "cdiscount", name: "Cdiscount", origin: "https://www.cdiscount.com", searchUrl: (q) => `https://www.cdiscount.com/search/10/${enc("carte graphique " + q)}.html` },
  { id: "materielnet", name: "Materiel.net", origin: "https://www.materiel.net", searchUrl: (q) => `https://www.materiel.net/recherche/${enc(q)}/` },
  { id: "rueducommerce", name: "Rue du Commerce", origin: "https://www.rueducommerce.fr", searchUrl: (q) => `https://www.rueducommerce.fr/r/${enc(q)}.html` },
  { id: "backmarket", name: "Back Market", origin: "https://www.backmarket.fr", searchUrl: (q) => `https://www.backmarket.fr/fr-fr/search?q=${enc(q)}` },
];

export const storeName = (id: string) => STORES.find((s) => s.id === id)?.name ?? id;

export const BRANDS = ["NVIDIA", "AMD", "Intel"] as const;

export const eur = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n));

export const discountPct = (price: number, old?: number | null) =>
  old && old > price ? Math.round(((old - price) / old) * 100) : 0;

/** Does a product title match the tracked GPU (and not a stronger sibling like "Ti"/"XT")? */
export function titleMatches(title: string, token: string): boolean {
  const t = ` ${title.toLowerCase().replace(/\s+/g, " ")} `;
  const tok = token.toLowerCase();
  if (!t.includes(tok)) return false;
  if (!/(ti|xt|super)$/.test(tok)) {
    const re = new RegExp(`${tok.replace(/\s/g, "\\s?")}\\s?(ti|xt|super)\\b`);
    if (re.test(t)) return false;
  }
  return true;
}
