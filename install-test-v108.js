(()=>{
  'use strict';
  // Temporary diagnostic for Chrome's native PWA install prompt.
  let deferredPrompt=null;
  let isInstalled=false;
  const isAndroid=/Android/i.test(navigator.userAgent||'');
  const inStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
  function status(message){
    const node=document.getElementById('jsInstallStatus');
    if(node)node.textContent=message;
  }
  function updateButton(){
    const button=document.getElementById('jsInstallButton');
    if(!button)return;
    if(isInstalled||inStandalone()){
      button.disabled=true;
      button.textContent='JennySells ist installiert';
      status('JennySells wurde als App geöffnet oder installiert.');
    }else if(deferredPrompt){
      button.disabled=false;
      button.textContent='JennySells als App installieren';
      status('Chrome stellt ein natives Installationsangebot bereit.');
    }else{
      button.disabled=false;
      button.textContent='JennySells installieren (Test)';
      status('Noch kein Installationsangebot von Chrome empfangen. Antippen, um den Status zu prüfen.');
    }
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    updateButton();
  });
  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    isInstalled=true;
    updateButton();
  });
  async function attemptInstall(){
    if(inStandalone()){
      status('JennySells läuft bereits im eigenständigen App-Fenster.');
      return;
    }
    if(!deferredPrompt){
      status('Chrome bietet dieser Seite aktuell keinen Installationsdialog an. Das passt zum Verdacht, dass Chrome die PWA fälschlich als bereits installiert erkennt. Bitte diesen Hinweis als Screenshot senden. Du musst keine Browserdaten löschen.');
      return;
    }
    const promptEvent=deferredPrompt;
    deferredPrompt=null;
    try{
      // Must be called directly from the user's tap.
      const promptResult=promptEvent.prompt();
      status('Installationsdialog wurde angefordert.');
      await promptResult;
      const choice=await promptEvent.userChoice;
      status(choice?.outcome==='accepted'
        ? 'Installationsangebot angenommen. Prüfe, ob JennySells jetzt als App erscheint.'
        : 'Installation abgebrochen oder von Chrome nicht abgeschlossen.');
    }catch(error){
      status('Chrome konnte den Installationsdialog nicht starten: '+(error?.message||String(error)));
    }
    updateButtonAfterAttempt();
  }
  function updateButtonAfterAttempt(){
    const button=document.getElementById('jsInstallButton');
    if(button&&!isInstalled){button.textContent='Installationsstatus erneut prüfen';button.disabled=false;}
  }
  function createUi(){
    if(!isAndroid||inStandalone()||document.getElementById('jsInstallTest'))return;
    const home=document.getElementById('home');
    if(!home)return;
    const style=document.createElement('style');
    style.id='jsInstallTestStyle';
    style.textContent=[
      '#jsInstallTest{margin:11px 0 13px;padding:11px 13px;border:1px solid #e7d8ee;border-radius:16px;background:#fff8ff}',
      '#jsInstallButton{display:block;width:100%;padding:12px 13px;border:0;border-radius:12px;background:#71389b;color:#fff;font-weight:750;font-size:14px}',
      '#jsInstallButton:disabled{opacity:.6}',
      '#jsInstallStatus{margin:8px 2px 0;color:#6d5876;font-size:11px;line-height:1.45}'
    ].join('');
    document.head.appendChild(style);
    const wrap=document.createElement('div');
    wrap.id='jsInstallTest';
    const btn=document.createElement('button');
    btn.id='jsInstallButton';
    btn.type='button';
    btn.textContent='JennySells installieren (Test)';
    btn.addEventListener('click',attemptInstall);
    const info=document.createElement('p');
    info.id='jsInstallStatus';
    info.setAttribute('role','status');
    info.setAttribute('aria-live','polite');
    wrap.append(btn,info);
    home.insertBefore(wrap,home.firstChild);
    updateButton();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',createUi,{once:true});
  }else{
    createUi();
  }
})();