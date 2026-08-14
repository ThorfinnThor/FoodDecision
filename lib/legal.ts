function value(name: string) {
  return process.env[name]?.trim() ?? "";
}

function addressLines(raw: string) {
  return raw
    .split(/\r?\n|\s*\|\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getLegalIdentity() {
  const operatorName = value("NEXT_PUBLIC_OPERATOR_NAME");
  const operatorAddress = addressLines(value("NEXT_PUBLIC_OPERATOR_ADDRESS"));
  const legalEmail = value("NEXT_PUBLIC_LEGAL_CONTACT");
  const privacyEmail = value("NEXT_PUBLIC_PRIVACY_CONTACT");

  return {
    operatorName,
    operatorAddress,
    legalEmail,
    privacyEmail,
    editorialResponsible: value("NEXT_PUBLIC_EDITORIAL_RESPONSIBLE"),
    registerName: value("NEXT_PUBLIC_REGISTER_NAME"),
    registerNumber: value("NEXT_PUBLIC_REGISTER_NUMBER"),
    vatId: value("NEXT_PUBLIC_VAT_ID"),
    isComplete: Boolean(operatorName && operatorAddress.length && legalEmail),
  };
}
