import sanitizeHtml from "sanitize-html";

export function sanitize(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "recursiveEscape",
  });
}

export function sanitizeObject<T extends Record<string, any>>(obj: T, fields: string[]): T {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      (result as any)[field] = sanitize(result[field]);
    }
  }
  return result;
}
