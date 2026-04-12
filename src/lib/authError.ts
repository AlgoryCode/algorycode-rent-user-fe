/**
 * AuthService {@code ErrorResponse}, Spring {@code ProblemDetail} ve düz metin hatalarından kullanıcı mesajı.
 */
export function parseAuthServiceError(data: unknown): string {
  if (data == null) return "";
  if (typeof data === "string") return data.trim();

  if (typeof data === "object") {
    const o = data as Record<string, unknown>;

    if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
    if (typeof o.detail === "string" && o.detail.trim()) return o.detail.trim();

    if (Array.isArray(o.errors) && o.errors.length > 0) {
      const first = o.errors[0];
      if (typeof first === "string" && first.trim()) return first.trim();
    }

    const fe = o.fieldErrors;
    if (fe && typeof fe === "object") {
      for (const v of Object.values(fe as Record<string, unknown>)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return String(v[0]).trim();
      }
    }

    if (typeof o.title === "string" && typeof o.detail === "string") {
      return `${o.title}: ${o.detail}`.trim();
    }
  }

  return "";
}
