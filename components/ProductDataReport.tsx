"use client";

import { FormEvent, useState } from "react";
import { pick } from "@/lib/i18n";
import type { SiteLocale } from "@/lib/types";

export function ProductDataReport({ locale, productName, productSlug }: { locale: SiteLocale; productName: string; productSlug: string }) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const c = (de: string, en: string) => pick(locale, de, en);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState("sending");
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/product-data-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug,
          locale,
          issueType: form.get("issueType"),
          details: form.get("details"),
          website: form.get("website"),
        }),
      });
      setState(response.ok ? "success" : "error");
      if (response.ok) formElement.reset();
    } catch {
      setState("error");
    }
  }

  return (
    <details className="product-data-report">
      <summary>{c("Datenproblem melden", "Report a data issue")}</summary>
      <div className="product-data-report-body">
        <div><h3>{c(`Was stimmt bei ${productName} nicht?`, `What is incorrect about ${productName}?`)}</h3><p>{c("Die Meldung enthält keine Kontaktdaten. Bitte schreibe keine persönlichen oder medizinischen Informationen in das Freitextfeld.", "The report does not include contact details. Do not enter personal or medical information in the text field.")}</p></div>
        {state === "success" ? <div className="report-success" role="status"><strong>{c("Danke für den Hinweis.", "Thanks for the report.")}</strong><span>{c("Wir haben ihn zur Datenprüfung vorgemerkt.", "It has been added to the data review queue.")}</span></div> : (
          <form onSubmit={submit}>
            <label><span>{c("Art des Problems", "Issue type")}</span><select defaultValue="" name="issueType" required><option disabled value="">{c("Bitte auswählen", "Select an issue")}</option><option value="package_changed">{c("Verpackung oder Produkt geändert", "Package or product changed")}</option><option value="nutrition_incorrect">{c("Nährwerte stimmen nicht", "Nutrition values are incorrect")}</option><option value="ingredients_allergens_incorrect">{c("Zutaten oder Allergene stimmen nicht", "Ingredients or allergens are incorrect")}</option><option value="image_incorrect">{c("Falsches Produktbild", "Incorrect product image")}</option><option value="product_unavailable">{c("Produkt nicht mehr erhältlich", "Product is no longer available")}</option><option value="other">{c("Anderes Datenproblem", "Other data issue")}</option></select></label>
            <label><span>{c("Kurzer Hinweis (optional)", "Short note (optional)")}</span><textarea maxLength={500} name="details" placeholder={c("Was steht aktuell auf der Verpackung?", "What does the current package say?")} rows={4} /></label>
            <input aria-hidden="true" autoComplete="off" className="honeypot" name="website" tabIndex={-1} type="text" />
            <div><button disabled={state === "sending"} type="submit">{state === "sending" ? c("Wird gesendet …", "Sending …") : c("Hinweis senden", "Send report")}</button><small>{c("Keine E-Mail-Adresse, kein Konto, keine Barcode- oder Kameradaten.", "No email address, account, barcode, or camera data.")}</small></div>
            {state === "error" ? <p className="form-error" role="alert">{c("Der Hinweis konnte gerade nicht gespeichert werden. Bitte versuche es später erneut.", "The report could not be saved. Try again later.")}</p> : null}
          </form>
        )}
      </div>
    </details>
  );
}
