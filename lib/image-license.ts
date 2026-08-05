const OPEN_FOOD_FACTS_IMAGE_HOSTS = new Set([
  "images.openfoodfacts.org",
  "static.openfoodfacts.org",
]);

export function isLicensedProductImageUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && OPEN_FOOD_FACTS_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function licensedProductImage(value: string | null | undefined, gtin: string) {
  if (!isLicensedProductImageUrl(value)) {
    return { imageUrl: null, imageLicense: null, imageSourceUrl: null } as const;
  }
  return {
    imageUrl: value ?? null,
    imageLicense: "CC BY-SA" as const,
    imageSourceUrl: `https://world.openfoodfacts.org/product/${encodeURIComponent(gtin)}`,
  };
}

