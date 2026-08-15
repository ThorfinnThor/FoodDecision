function value(name: string) {
  return process.env[name]?.trim() ?? "";
}

function addressLines(raw: string) {
  return raw
    .split(/\r?\n|\s*\|\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const defaultLegalIdentity = {
  operatorName: "Schayan Yousefian",
  operatorAddress: ["Freienwalder Str. 34", "13359 Berlin", "Deutschland"],
  legalEmail: "info@compareyourfood.com",
  privacyEmail: "info@compareyourfood.com",
  editorialResponsible: "Schayan Yousefian",
} as const;

export function getLegalIdentity() {
  const operatorName = value("NEXT_PUBLIC_OPERATOR_NAME") || defaultLegalIdentity.operatorName;
  const configuredAddress = addressLines(value("NEXT_PUBLIC_OPERATOR_ADDRESS"));
  const operatorAddress = configuredAddress.length ? configuredAddress : [...defaultLegalIdentity.operatorAddress];
  const legalEmail = value("NEXT_PUBLIC_LEGAL_CONTACT") || defaultLegalIdentity.legalEmail;
  const privacyEmail = value("NEXT_PUBLIC_PRIVACY_CONTACT") || defaultLegalIdentity.privacyEmail;

  return {
    operatorName,
    operatorAddress,
    legalEmail,
    privacyEmail,
    editorialResponsible: value("NEXT_PUBLIC_EDITORIAL_RESPONSIBLE") || defaultLegalIdentity.editorialResponsible,
    registerName: value("NEXT_PUBLIC_REGISTER_NAME"),
    registerNumber: value("NEXT_PUBLIC_REGISTER_NUMBER"),
    vatId: value("NEXT_PUBLIC_VAT_ID"),
    isComplete: Boolean(operatorName && operatorAddress.length && legalEmail),
  };
}
