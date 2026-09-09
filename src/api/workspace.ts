import { isMobilePurchaseUrl } from "./mobilePurchases";

export function workspaceUrl(site: string, path: string) {
  const origin = new URL(site).origin;
  const url = new URL(path, origin);
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    isMobilePurchaseUrl(url.href, origin) ||
    !(
      url.pathname === "/app" ||
      url.pathname.startsWith("/app/") ||
      url.pathname === "/support"
    )
  )
    throw new Error("This link is not a workspace page.");
  return url.href;
}

/** Wait for the web shell to finish hydration, instead of exposing its second splash screen. */
export function workspaceReadinessScript(origin: string) {
  return `(function(){
    if(location.origin !== ${JSON.stringify(origin)}) return;
    if(window.__kshanaCheckWorkspace) { window.__kshanaCheckWorkspace(true); return; }
    var previous;
    function check(force) {
      var loading = !!document.querySelector('.onboarding-loader-shell');
      var main = document.querySelector('main');
      var ready = !loading && !!(main && main.children.length);
      if(location.pathname === '/support') ready = !loading && !!document.querySelector('h1');
      if(force || ready !== previous) {
        previous = ready;
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'kshana-workspace-state',ready:ready}));
      }
    }
    window.__kshanaCheckWorkspace=check;
    new MutationObserver(function(){check(false);}).observe(document.documentElement,{childList:true,subtree:true});
    check(true);
  })();true;`;
}
