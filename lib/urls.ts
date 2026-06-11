export function parseOptionalHttpUrl(
  input: FormDataEntryValue | string | null | undefined,
  label: string
): string | null {
  const value = String(input ?? "").trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("invalid protocol");
    }

    return url.toString();
  } catch {
    throw new Error(`${label} deve ser uma URL http ou https valida.`);
  }
}
