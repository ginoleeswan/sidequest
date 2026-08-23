/**
 * Where this app lives on the web.
 *
 * Anything shareable has to name it. On the web the origin can be read
 * from the document, but a link copied on a phone has no document to
 * read — the plan link used to fall back to an empty origin, which was
 * harmless only for as long as copying on native silently did nothing.
 * The moment the clipboard started working, that fallback would have
 * put "/shared?p=…" on somebody's clipboard.
 *
 * One definition: the share links, the plan link's native fallback
 * and the Open Graph tags all read it. Keep in sync with the `origin`
 * given to expo-router in app.json, which is config rather than code.
 */
export const SITE_ORIGIN = 'https://gosidequest.vercel.app';
