import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { deleteAccount } from "@/lib/account.functions";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validateEmail, validatePassword } from "@/lib/password";

export const Route = createFileRoute("/_authenticated/compte")({
  head: () => ({ meta: [{ title: "Mon compte — GPU Price Tracker" }] }),
  component: Compte,
});

const DELETE_CONFIRMATION = "SUPPRIMER";

function Compte() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  if (!user) return null;
  // Un compte créé uniquement via Google ou Lovable n'a pas de mot de passe à vérifier.
  const hasPassword = (user.app_metadata?.providers as string[] | undefined)?.includes("email") ?? false;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Mon compte</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connecté avec {user.email}</p>
      </div>
      <EmailSection currentEmail={user.email ?? ""} />
      <PasswordSection email={user.email ?? ""} hasPassword={hasPassword} />
      <DeleteSection />
    </div>
  );
}

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) { toast.error(emailError); return; }
    if (email.trim().toLowerCase() === currentEmail.toLowerCase()) {
      toast.error("C'est déjà votre adresse e-mail.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: window.location.origin + "/compte" },
    );
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setEmail("");
    toast.success("Un e-mail de confirmation a été envoyé. L'adresse ne change qu'après validation du lien.");
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card-gradient p-5">
      <h2 className="font-semibold">Adresse e-mail de connexion</h2>
      <p className="text-sm text-muted-foreground">
        Elle sert uniquement à vous connecter. L'adresse qui reçoit les alertes et le rapport quotidien se règle dans les Paramètres.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="new-email">Nouvelle adresse e-mail</Label>
        <Input id="new-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button variant="outline" disabled={busy}>Changer l'adresse e-mail</Button>
    </form>
  );
}

function PasswordSection({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) { toast.error(passwordError); return; }
    if (password !== confirm) { toast.error("Les deux mots de passe ne correspondent pas."); return; }
    setBusy(true);
    if (hasPassword) {
      // On redemande le mot de passe actuel : une session laissée ouverte ne suffit pas à le changer.
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (verifyError) {
        setBusy(false);
        toast.error("Le mot de passe actuel est incorrect.");
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setCurrent("");
    setPassword("");
    setConfirm("");
    toast.success(hasPassword ? "Mot de passe mis à jour." : "Mot de passe défini.");
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card-gradient p-5">
      <h2 className="font-semibold">{hasPassword ? "Changer le mot de passe" : "Définir un mot de passe"}</h2>
      {hasPassword && (
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Mot de passe actuel</Label>
          <Input id="current-password" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="account-new-password">Nouveau mot de passe</Label>
          <Input
            id="account-new-password"
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="account-confirm-password">Confirmation</Label>
          <Input
            id="account-confirm-password"
            type="password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{PASSWORD_MIN_LENGTH} caractères minimum, avec au moins une lettre et un chiffre.</p>
      <Button variant="outline" disabled={busy}>{hasPassword ? "Changer le mot de passe" : "Définir le mot de passe"}</Button>
    </form>
  );
}

function DeleteSection() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const remove = useServerFn(deleteAccount);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    try {
      await remove();
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le compte.");
      return;
    }
    await qc.cancelQueries();
    qc.clear();
    // Le compte n'existe plus côté serveur : on efface seulement la session locale.
    await supabase.auth.signOut({ scope: "local" });
    toast.success("Votre compte a été supprimé.");
    navigate({ to: "/", replace: true });
  }

  return (
    <section className="space-y-4 rounded-xl border border-destructive/40 bg-card-gradient p-5">
      <h2 className="font-semibold text-destructive">Supprimer mon compte</h2>
      <p className="text-sm text-muted-foreground">
        Cette action est définitive : votre compte, votre liste de suivi, vos réglages et l'historique de vos alertes seront effacés.
      </p>
      <AlertDialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setConfirmation(""); }}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Supprimer mon compte</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement le compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Pour confirmer, tapez <span className="font-mono font-semibold">{DELETE_CONFIRMATION}</span> ci-dessous.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            aria-label="Confirmation de suppression"
            autoComplete="off"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            {/* Bouton simple plutôt qu'AlertDialogAction : la boîte ne doit pas se fermer avant la fin de la suppression. */}
            <Button variant="destructive" disabled={busy || confirmation.trim() !== DELETE_CONFIRMATION} onClick={confirmDelete}>
              {busy ? "Suppression…" : "Supprimer définitivement"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
