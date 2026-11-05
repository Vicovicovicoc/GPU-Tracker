import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validateEmail, validatePassword } from "@/lib/password";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — GPU Price Tracker" },
      { name: "description", content: "Connectez-vous pour suivre vos cartes graphiques et recevoir vos alertes." },
      { property: "og:title", content: "Connexion — GPU Price Tracker" },
      { property: "og:description", content: "Accédez à votre tableau de bord de prix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/dashboard" }); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (s) navigate({ to: "/dashboard" }); });
    return () => data.subscription.unsubscribe();
  }, [navigate, supabaseConfigured]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) { toast.error(emailError); return; }
    if (mode === "up") {
      const passwordError = validatePassword(password);
      if (passwordError) { toast.error(passwordError); return; }
    }
    setBusy(true);
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      // Même message que l'adresse existe ou non, pour ne pas révéler quels e-mails ont un compte.
      toast.success("Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d'être envoyé.");
      setMode("in");
      return;
    }
    const { error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin + "/dashboard" } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (mode === "up") toast.success("Vérifiez votre boîte mail pour confirmer votre compte.");
  }

  async function oauth(p: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }

  if (!supabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div role="alert" className="w-full max-w-md rounded-2xl border bg-card-gradient p-8 text-center shadow-glow">
          <div className="font-mono text-xs tracking-[0.3em] text-primary">GPU PRICE TRACKER</div>
          <h1 className="mt-3 text-2xl font-bold">Connexion indisponible</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Supabase n’est pas encore configuré dans Lovable Cloud. La connexion et les comptes seront disponibles dès que les variables SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY seront renseignées.
          </p>
          <Button variant="outline" className="mt-6 w-full" asChild><Link to="/">Retour à l’accueil</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card-gradient p-8 shadow-glow animate-rise">
        <div className="font-mono text-xs tracking-[0.3em] text-primary">GPU PRICE TRACKER</div>
        <h1 className="mt-2 text-2xl font-bold">
          {mode === "in" ? "Connexion" : mode === "up" ? "Créer un compte" : "Mot de passe oublié"}
        </h1>
        {mode === "forgot" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Entrez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.
          </p>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label>Mot de passe</Label>
              <Input
                type="password"
                required
                minLength={mode === "up" ? PASSWORD_MIN_LENGTH : undefined}
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "up" && (
                <p className="text-xs text-muted-foreground">{PASSWORD_MIN_LENGTH} caractères minimum, avec au moins une lettre et un chiffre.</p>
              )}
            </div>
          )}
          <Button variant="hero" className="w-full" disabled={busy}>
            {mode === "in" ? "Se connecter" : mode === "up" ? "Créer le compte" : "Envoyer le lien"}
          </Button>
          {mode === "in" && (
            <button type="button" className="w-full text-right text-xs text-muted-foreground hover:text-foreground" onClick={() => setMode("forgot")}>
              Mot de passe oublié ?
            </button>
          )}
        </form>
        {mode !== "forgot" && (
          <>
            <div className="my-5 text-center text-xs text-muted-foreground">ou</div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => oauth("google")}>Continuer avec Google</Button>
              <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>Continue with Lovable</button>
            </div>
          </>
        )}
        <button
          className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "Pas de compte ? Inscrivez-vous" : mode === "up" ? "Déjà inscrit ? Connectez-vous" : "Retour à la connexion"}
        </button>
      </div>
    </main>
  );
}
