import Link from "next/link";

/**
 * Reached only for paths the locale middleware does not rewrite. Localised
 * copy lives in app/[locale]/not-found.tsx.
 */
export default function RootNotFound() {
  return (
    <html lang="ru">
      <body style={{fontFamily: "system-ui, sans-serif", margin: 0, display: "grid", placeItems: "center", minHeight: "100vh"}}>
        <main style={{textAlign: "center", padding: "2rem"}}>
          <p style={{fontSize: "3rem", fontWeight: 800, margin: 0}}>404</p>
          <p style={{marginTop: "1rem"}}>Next Path</p>
          <Link href="/ru" style={{display: "inline-block", marginTop: "1.5rem", fontWeight: 700}}>
            /ru
          </Link>
        </main>
      </body>
    </html>
  );
}
