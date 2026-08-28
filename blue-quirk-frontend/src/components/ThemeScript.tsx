// No-FOUC theme bootstrap.
//
// A synchronous inline <script> that runs BEFORE the browser paints the body,
// reading the persisted preference (localStorage "rq-theme") and the OS setting
// and applying the `dark` class + native color-scheme to <html> immediately. Without
// this, a dark-mode visitor would see a white flash on every navigation (each
// route group renders its own <html>, so this is rendered at the top of every
// customer-facing <body>). Keep the storage key / logic in sync with lib/theme.ts.
//
// It also arms the theme-transition (data-theme-ready) on the next frame, so the
// initial paint never animates from a wrong color — only later user toggles do.

const script = `(function(){try{var k="rq-theme";var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"&&t!=="system")t="system";var d=t==="dark"||(t==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);var el=document.documentElement;el.classList.toggle("dark",d);el.style.colorScheme=d?"dark":"light";}catch(e){}requestAnimationFrame(function(){document.documentElement.setAttribute("data-theme-ready","");});})();`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
