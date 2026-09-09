const purchasePath =
  "^/(?:app/)?(?:billing|usage|meta-payments|pricing|plans|subscription|subscriptions|checkout|payment|payments)(?:/|$)";
const purchaseHost = "(^|\\.)(?:razorpay\\.com|stripe\\.com|paypal\\.com)$";

/** Purchases are managed on the website, outside the mobile workspace. */
export function isMobilePurchaseUrl(value: string, origin: string): boolean {
  try {
    const url = new URL(value, origin);
    const path = decodeURIComponent(url.pathname).toLowerCase();
    return (
      (url.origin === origin && new RegExp(purchasePath).test(path)) ||
      new RegExp(purchaseHost).test(url.hostname)
    );
  } catch {
    return true;
  }
}

export function mobilePurchaseGuardScript(origin: string) {
  return `(function(){
    if(location.origin !== ${JSON.stringify(origin)} || window.__kshanaPurchaseGuard) return;
    window.__kshanaPurchaseGuard=true;
    function blocked(value,origin){
      try {
        var u=new URL(value,origin),path=decodeURIComponent(u.pathname).toLowerCase();
        return (u.origin===origin && new RegExp(${JSON.stringify(purchasePath)}).test(path)) || new RegExp(${JSON.stringify(purchaseHost)}).test(u.hostname);
      } catch (_) { return true; }
    }
    var origin=${JSON.stringify(origin)};
    function hidePurchases(){
      document.querySelectorAll('a[href]').forEach(function(a){
        if(blocked(a.href,origin)) {
          a.style.setProperty('display','none','important');
          var banner=a.closest('section[role="alert"]');
          if(banner) banner.style.setProperty('display','none','important');
        }
      });
    }
    document.addEventListener('click',function(e){
      var a=e.target.closest && e.target.closest('a[href]');
      if(a && blocked(a.href,origin)){e.preventDefault();e.stopImmediatePropagation();}
    },true);
    ['pushState','replaceState'].forEach(function(name){
      var original=history[name];
      history[name]=function(state,title,url){
        if(url != null && blocked(String(url),origin)) return;
        return original.apply(this,arguments);
      };
    });
    var open=window.open;
    window.open=function(url){if(url && blocked(String(url),origin)) return null;return open.apply(this,arguments);};
    new MutationObserver(hidePurchases).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
    hidePurchases();
  })();true;`;
}
