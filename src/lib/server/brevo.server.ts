const GATEWAY = "https://connector-gateway.lovable.dev/brevo";
const SENDER = { name: "GPU Price Tracker", email: "victor.gloriant@gmail.com" };

export async function sendEmail(to: string, subject: string, html: string) {
  const lov = process.env.LOVABLE_API_KEY;
  const key = process.env.BREVO_API_KEY;
  if (!lov || !key) throw new Error("Brevo n'est pas configuré");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error("Adresse e-mail invalide");
  const res = await fetch(`${GATEWAY}/smtp/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lov}`,
      "X-Connection-Api-Key": key,
    },
    body: JSON.stringify({ sender: SENDER, to: [{ email: to }], subject, htmlContent: html }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Brevo [${res.status}]: ${body}`);
    throw new Error(`Envoi e-mail échoué [${res.status}]: ${body}`);
  }
}

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function emailLayout(title: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1d24">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<div style="background:#14161c;border-radius:12px;padding:20px 24px;margin-bottom:20px">
<div style="color:#5b8cff;font-size:12px;letter-spacing:2px;font-weight:bold">GPU PRICE TRACKER</div>
<div style="color:#ffffff;font-size:22px;font-weight:bold;margin-top:6px">${esc(title)}</div></div>
${inner}
<p style="color:#8a8f99;font-size:12px;margin-top:24px">Prix relevés automatiquement sur les boutiques françaises. Vérifiez toujours le prix final sur le site du marchand.</p>
</div></body></html>`;
}

export function offerRow(o: { title: string; store: string; price: number; old_price?: number | null; url: string; note?: string }) {
  const old = o.old_price && o.old_price > o.price
    ? ` <span style="text-decoration:line-through;color:#8a8f99;font-size:13px">${o.old_price.toFixed(2)} €</span>` : "";
  return `<div style="border:1px solid #e3e5ea;border-radius:10px;padding:12px 14px;margin-bottom:10px">
<div style="font-size:14px;font-weight:bold">${esc(o.title)}</div>
<div style="font-size:13px;color:#5a606b;margin:4px 0">${esc(o.store)}${o.note ? " · " + esc(o.note) : ""}</div>
<div style="font-size:18px;font-weight:bold;color:#2f5bff">${o.price.toFixed(2)} €${old}</div>
<a href="${esc(o.url)}" style="display:inline-block;margin-top:8px;background:#2f5bff;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:13px">Voir l'offre</a></div>`;
}
