import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validatePassword } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — GPU Price Tracker" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const supabaseConfigured = isSupabaseConfigured();
  // `null` : vérification en cours, `false` : lien invalide ou expiré, `true` : session de récupération active.
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    // Le lien de l'e-mail ouvre une session de récupération : Supabase la lit dans l'URL
    // puis émet PASSWORD_RECOVERY. Si l'événement est déjà passé, la session existe.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady(true);
    });
    supabase.auth.getSession().then(({ data: current }) => {
      setReady((prev) => (prev === true ? true : current.session ? true : null));
    });
    // Sans session après un court délai, le lien est considéré comme invalide ou expiré.
    const timeout = window.setTimeout(() => setReady((prev) => (prev === null ? false : prev)), 3000);
    return () => {
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, [supabaseConfigured]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) { toast.error(passwordError); return; }
    if (password !== confirm) { toast.error("Les deux mots de passe ne correspondent pas."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe mis à jour.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card-gradient p-8 shadow-glow animate-rise">
        <div className="font-mono text-xs tracking-[0.3em] text-primary">GPU PRICE TRACKER</div>
        <h1 className="mt-2 text-2xl font-bold">Nouveau mot de passe</h1>
        {!supabaseConfigured ? (
          <p role="alert" className="mt-4 text-sm text-muted-foreground">
            La connexion est indisponible : Supabase n’est pas encore configuré.
          </p>
        ) : ready === false ? (
          <div role="alert" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Ce lien est invalide ou a expiré. Demandez un nouveau lien de réinitialisation.</p>
            <Button variant="hero" className="w-full" asChild><Link to="/auth">Retour à la connexion</Link></Button>
          </div>
        ) : ready === null ? (
          <p className="mt-4 text-sm text-muted-foreground">Vérification du lien…</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{PASSWORD_MIN_LENGTH} caractères minimum, avec au moins une lettre et un chiffre.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button variant="hero" className="w-full" disabled={busy}>Enregistrer</Button>
          </form>
        )}
      </div>
    </main>
  );
}
