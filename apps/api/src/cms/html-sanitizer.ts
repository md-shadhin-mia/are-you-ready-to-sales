import DOMPurify from "isomorphic-dompurify";

/** Server-side sanitization of CMS HTML: strips scripts, frames, embeds and inline event handlers. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "iframe", "frame", "object", "embed", "style", "form", "input"],
    FORBID_ATTR: ["style", "srcdoc"],
  });
}
