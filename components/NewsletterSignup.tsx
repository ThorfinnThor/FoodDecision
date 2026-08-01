"use client";

import { FormEvent, useState } from "react";

export function NewsletterSignup() {
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return submitted ? (
    <p className="newsletter-success" role="status">Danke. Du bist für Produktupdates vorgemerkt.</p>
  ) : (
    <form className="newsletter-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="newsletter-email">E-Mail-Adresse</label>
      <input id="newsletter-email" name="email" placeholder="deine@email.de" required type="email" />
      <button type="submit">Updates erhalten</button>
    </form>
  );
}
