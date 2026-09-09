export const MAX_EXPORT_BYTES = 20 * 1024 * 1024;
export function parseWorkspaceExport(data: string) {
  if (data.length > MAX_EXPORT_BYTES * 1.4 + 2048)
    throw new Error("This export exceeds the 20 MB mobile limit.");
  const payload = JSON.parse(data);
  if (payload.type !== "kshana-export") return null;
  if (
    typeof payload.base64 !== "string" ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(payload.base64) ||
    payload.base64.length % 4 !== 0
  )
    throw new Error("The export could not be read.");
  const name =
    String(payload.name || "export.txt")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/^\.+/, "")
      .slice(0, 120) || "export.txt";
  return {
    name,
    base64: payload.base64,
    mime: String(payload.mime || "application/octet-stream").split(";")[0],
  };
}
export function workspaceScript(origin: string) {
  return `(function(){
    if(location.origin !== ${JSON.stringify(origin)} || !location.pathname.startsWith('/app')) return;
    if(!document.getElementById('kshana-mobile-shell')) {
      var style=document.createElement('style'); style.id='kshana-mobile-shell';
      style.textContent='.h-screen > header, .h-screen > aside { display:none !important; }';
      (document.head || document.documentElement).appendChild(style);
    }
    if(window.__kshanaMobileExports) return;
    window.__kshanaMobileExports=true;
    var blobs=new Map(), create=URL.createObjectURL.bind(URL), revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=function(blob){var url=create(blob);blobs.set(url,blob);return url;};
    URL.revokeObjectURL=function(url){blobs.delete(url);return revoke(url);};
    function download(anchor){
      if(!anchor.download || !anchor.href.startsWith('blob:')) return false;
      var blob=blobs.get(anchor.href);
      if(!blob) return false;
      if(blob.size > ${MAX_EXPORT_BYTES}) { alert('This export exceeds the 20 MB mobile limit.'); return true; }
      var reader=new FileReader();
      reader.onload=function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'kshana-export',name:anchor.download,mime:blob.type,base64:String(reader.result).split(',')[1]}));};
      reader.onerror=function(){alert('Could not read this export. Please try again.');};
      reader.readAsDataURL(blob);return true;
    }
    var click=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){if(!download(this)) return click.call(this);};
    document.addEventListener('click',function(event){var anchor=event.target.closest && event.target.closest('a[download]');if(anchor && download(anchor)){event.preventDefault();event.stopPropagation();}},true);
  })();true;`;
}
