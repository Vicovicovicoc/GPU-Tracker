export interface ParsedProduct { title: string; price: number; old_price: number | null; in_stock: boolean; url: string }

const PRICE_RE = /(\d{1,2}[\s\u00a0\u202f.]?\d{3}|\d{2,4})(?:[,.](\d{2})|\s?€\s?(\d{2}))?\s?€?/g;

/** Extract euro prices from a text fragment ("1 299,99 €", "449€90", "529.00 €"). */
export function extractPrices(text: string): number[] {
  const out: number[] = [];
  for (const line of text.split("\n")) {
    if (!line.includes("€")) continue;
    for (const m of line.matchAll(PRICE_RE)) {
      if (!m[0].includes("€") && !m[2]) continue;
      const euros = Number(m[1]!.replace(/[\s\u00a0\u202f.]/g, ""));
      const cents = Number(m[2] ?? m[3] ?? 0);
      const v = euros + cents / 100;
      if (v >= 60 && v <= 6000) out.push(v);
    }
  }
  return out;
}

/**
 * A stock reconciliation is safe only when at least one matching product was parsed.
 * An empty/unrecognized result must not be interpreted as proof that every offer vanished.
 */
export function shouldReconcileMissingOffers(matchingProducts: readonly unknown[]): boolean {
  return matchingProducts.length > 0;
}

/** Parse a shop search-results page (Firecrawl markdown) into products, without AI. */
export function parseListing(md: string, origin: string): ParsedProduct[] {
  const links = [...md.matchAll(/\[([^\]\n]{12,300})\]\(([^)\s]+)/g)];
  const seen = new Set<string>();
  const out: ParsedProduct[] = [];
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(origin).origin;
  } catch {
    return out;
  }

  links.forEach((m, i) => {
    const title = m[1]!.replace(/[*_#!]/g, "").trim();
    if (/^image|^!\[/i.test(title)) return;
    let parsedUrl: URL;
    try { parsedUrl = new URL(m[2]!, origin); } catch { return; }
    // A prefix check would also accept lookalike hosts such as "shop.example.evil".
    if (parsedUrl.origin !== expectedOrigin) return;
    const url = parsedUrl.toString();
    if (seen.has(url)) return;
    const end = links[i + 1]?.index ?? m.index! + 800;
    const windowText = md.slice(m.index! + m[0].length, Math.min(end, m.index! + 800));
    const prices = extractPrices(windowText);
    if (!prices.length) return;
    seen.add(url);
    const price = prices[0]!;
    const higher = prices.slice(1).find((p) => p > price && p < price * 2);
    out.push({ title, url, price, old_price: higher ?? null, in_stock: !/rupture|indisponible|épuisé/i.test(windowText) });
  });
  return out;
}
