"use client";

import { FormEvent, useState } from "react";
import { trackEvent } from "@/lib/client-state";

export function NewsletterSignup() {
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), website: form.get("website"), consent: form.get("consent") === "on", source: "homepage" }) });
    setPending(false);
    if (!response.ok) { setError("Die Anmeldung konnte gerade nicht gespeichert werden. Bitte versuche es später erneut."); return; }
    trackEvent("newsletter_submitted", { entityType: "newsletter" });
    setSubmitted(true);
  }

  return submitted ? (
    <p className="newsletter-success" role="status">Danke. Du bist für Produktupdates vorgemerkt.</p>
  ) : (
    <form className="newsletter-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="newsletter-email">E-Mail-Adresse</label>
      <input id="newsletter-email" name="email" placeholder="deine@email.de" required type="email" />
      <input aria-hidden="true" autoComplete="off" className="honeypot" name="website" tabIndex={-1} type="text" />
      <label className="newsletter-consent"><input name="consent" required type="checkbox" /><span>Ich möchte gelegentliche Produktupdates erhalten und kann mich jederzeit abmelden.</span></label>
      <button disabled={pending} type="submit">{pending ? "Wird gespeichert..." : "Updates erhalten"}</button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
}
