/** Limit the embedded web shell and dialogs to the actual keyboard-visible area. */
export function workspaceViewportScript(origin: string) {
  return `(function(){
    if(location.origin!==${JSON.stringify(origin)} || window.__kshanaViewport) return;
    window.__kshanaViewport=true;
    function mount(){
      if(!document.head) return;
      if(!document.getElementById('kshana-mobile-viewport')){
        var style=document.createElement('style');
        style.id='kshana-mobile-viewport';
        style.textContent='html,body{max-width:100%;} .h-screen{height:var(--kshana-visible-height,100dvh)!important;} main{min-height:0;min-width:0;overscroll-behavior-y:contain;} [role="dialog"]{max-width:calc(100vw - 24px)!important;max-height:calc(var(--kshana-visible-height,100dvh) - 24px)!important;overflow-y:auto!important;} input,textarea,select{scroll-margin-block:24px;} @media(max-width:600px){input,textarea,select{font-size:16px!important;}}';
        document.head.appendChild(style);
      }
      document.documentElement.style.setProperty('--kshana-visible-height',Math.round(window.visualViewport?window.visualViewport.height:window.innerHeight)+'px');
    }
    function reveal(){
      mount();
      var active=document.activeElement;
      if(active && active.matches('input,textarea,select,[contenteditable="true"]')){
        var rect=active.getBoundingClientRect();
        var viewport=window.visualViewport;
        var top=viewport?viewport.offsetTop:0;
        var bottom=top+(viewport?viewport.height:window.innerHeight);
        if(rect.bottom>bottom-20 || rect.top<top+20) active.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});
      }
    }
    document.addEventListener('DOMContentLoaded',mount);
    document.addEventListener('focusin',function(){requestAnimationFrame(reveal);});
    window.addEventListener('resize',reveal);
    if(window.visualViewport) window.visualViewport.addEventListener('resize',reveal);
    mount();
  })();true;`;
}
