import { resolveMeta } from "@/lib/config";

/**
 * Server-rendered Meta Pixel base code. Emitting the pixel into the INITIAL HTML
 * (rather than injecting it client-side after a config fetch) is what lets Meta's
 * crawler, the Events Manager "Event Setup Tool" and the Pixel Helper detect the
 * pixel — a static detector never waits for our hydration + XHR chain.
 *
 * The Pixel ID + enable flag still come from the admin dashboard: the [lang]
 * layout already fetches the public shop config on the server and passes the two
 * fields here. `resolveMeta` applies the same fail-closed / dev-gate rules as the
 * client, so nothing renders unless Meta is active.
 *
 * This fires `init` + the initial `PageView` exactly once per full page load.
 * Subsequent SPA route changes are handled by the client TrackingProvider (which
 * deliberately no longer injects the base code, so there is no double init).
 */
export function MetaPixelBase({
  enabled,
  pixelId,
}: {
  enabled: boolean;
  pixelId: string | null;
}) {
  const { active, pixelId: resolved } = resolveMeta({ enabled, pixelId: pixelId ?? "" });
  if (!active) return null;

  // Defensive: the id is validated to digits on save, but it lands in an inline
  // script here, so strip anything non-numeric before interpolating.
  const id = resolved.replace(/[^0-9]/g, "");
  if (!id) return null;

  const snippet = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${id}');fbq('track','PageView');`;

  return (
    <>
      <script id="meta-pixel-base" dangerouslySetInnerHTML={{ __html: snippet }} />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
