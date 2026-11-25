export function isWorkspaceCallingUrl(value: string, origin: string) {
  try {
    const url = new URL(value, origin);
    return (
      url.origin === origin &&
      /^\/app\/calls(?:\/|$)/.test(decodeURIComponent(url.pathname))
    );
  } catch {
    return false;
  }
}

/** Keep browser-only audio controls out of the native WebView until native calling is supported. */
export function workspaceCallingScript(origin: string) {
  return `(function(){
    if(location.origin!==${JSON.stringify(origin)} || window.__kshanaNativeCalls) return;
    window.__kshanaNativeCalls=true;
    var origin=${JSON.stringify(origin)};
    function calling(value){try{var u=new URL(value,origin);return u.origin===origin && /^\\/app\\/calls(?:\\/|$)/.test(decodeURIComponent(u.pathname));}catch(_){return false;}}
    function openHistory(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'kshana-mobile-call-history'}));}
    function mount(){
      if(!document.head || document.getElementById('kshana-native-calls')) return;
      var style=document.createElement('style');style.id='kshana-native-calls';
      style.textContent='button[aria-label="Call customer"],button[aria-label="New call"],button[aria-label="Calls"],section[aria-label="Incoming WhatsApp call"],section[aria-label="Active WhatsApp call"]{display:none!important;}';
      document.head.appendChild(style);
    }
    document.addEventListener('click',function(e){var a=e.target.closest && e.target.closest('a[href]');if(a && calling(a.href)){e.preventDefault();e.stopImmediatePropagation();openHistory();}},true);
    ['pushState','replaceState'].forEach(function(name){var original=history[name];history[name]=function(state,title,url){if(url!=null && calling(String(url))){openHistory();return;}return original.apply(this,arguments);};});
    var open=window.open;window.open=function(url){if(url && calling(String(url))){openHistory();return null;}return open.apply(this,arguments);};
    document.addEventListener('DOMContentLoaded',mount);mount();
  })();true;`;
}
