import slugifyLib from "slugify";

/** Turn a title into a filesystem-safe slug for the card filename. */
export function slugify(text: string): string {
  const slug = slugifyLib(text, { lower: true, strict: true }).slice(0, 80);
  return slug || "card";
}
