export type BarcodeIndexItem = {
  gtin: string;
};

const supportedLengths = new Set([8, 12, 13, 14]);
export type BarcodeValidationReason = "characters" | "length" | "checksum";

export function normalizeBarcode(value: string) {
  return value.replace(/\D/g, "").slice(0, 14);
}

export function barcodeValidationReason(value: string): BarcodeValidationReason | null {
  const compact = value.trim().replace(/[\s-]+/g, "");
  if (compact && /\D/.test(compact)) return "characters";
  if (!supportedLengths.has(compact.length)) return "length";
  return barcodeCheckDigitIsValid(compact) ? null : "checksum";
}

export function barcodeCheckDigitIsValid(value: string) {
  const code = normalizeBarcode(value);
  if (!supportedLengths.has(code.length)) return false;
  const digits = [...code].map(Number);
  const supplied = digits.pop();
  if (supplied === undefined) return false;
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === supplied;
}

export function barcodeVariants(value: string) {
  const code = normalizeBarcode(value);
  const variants = new Set([code]);
  if (code.length === 12) variants.add(`0${code}`);
  if (code.length === 13 && code.startsWith("0")) variants.add(code.slice(1));
  if (code.length === 14 && code.startsWith("0")) {
    variants.add(code.slice(1));
    if (code.startsWith("00")) variants.add(code.slice(2));
  }
  return [...variants].filter(Boolean);
}

export function findBarcodeItem<T extends BarcodeIndexItem>(items: T[], value: string) {
  const requested = new Set(barcodeVariants(value));
  return items.find((item) => barcodeVariants(item.gtin).some((variant) => requested.has(variant))) ?? null;
}

export function barcodeFormatLabel(value: string) {
  const length = normalizeBarcode(value).length;
  if (length === 8) return "EAN-8";
  if (length === 12) return "UPC-A";
  if (length === 13) return "EAN-13";
  if (length === 14) return "GTIN-14";
  return null;
}
