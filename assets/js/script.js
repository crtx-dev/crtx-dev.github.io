document.documentElement.classList.add('js');

function cortexCopyText(el){
  let text=(el.dataset.copyText||el.textContent||'').trim();
  text=text.replace(/^$\s+/,'');
  return text;
}

function cortexNormaliseDocsPath(value){
  let path;
  try{path=decodeURIComponent(new URL(value,location.href).pathname)}
  catch{path=String(value)}
  return path.replace(/\/index\.html$/,'').replace(/\.html$/,'').replace(/\/$/,'')||'/';
}

function cortexWireDocs(root){
  const groups=[...root.querySelectorAll('[data-docs-group]')];
  if(!groups.length)return;
  const currentPath=cortexNormaliseDocsPath(location.href);
  const setOpen=(group,open)=>{
    const toggle=group.querySelector('.docs-nav-toggle');
    const links=group.querySelector('.docs-nav-links');
    toggle.setAttribute('aria-expanded',String(open));
    links.hidden=!open;
  };
  let activeGroup=null;
  root.querySelectorAll('.docs-nav-links a').forEach(link=>{
    const active=cortexNormaliseDocsPath(link.href)===currentPath;
    link.classList.toggle('active',active);
    if(active){link.setAttribute('aria-current','page');activeGroup=link.closest('[data-docs-group]')}
  });
  groups.forEach(group=>{
    setOpen(group,group===activeGroup);
    group.querySelector('.docs-nav-toggle').addEventListener('click',()=>{
      setOpen(group,group.querySelector('.docs-nav-toggle').getAttribute('aria-expanded')!=='true');
    });
  });
}
function cortexInitDocsNav(){
  const aside=document.querySelector('.docs-nav');
  if(aside)cortexWireDocs(aside);
}
function cortexInitMobileMenu(){
  const toggle=document.querySelector('[data-menu-toggle]');
  const menu=document.getElementById('mobile-menu');
  const docsToggle=document.querySelector('[data-docs-menu-toggle]');
  const docsMenu=document.getElementById('docs-mobile-nav');
  const setMenu=(panel,btn,open)=>{
    panel.classList.toggle('open',open);
    panel.toggleAttribute('hidden',!open);
    btn.setAttribute('aria-expanded',String(open));
    btn.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  };
  if(toggle&&menu){
    toggle.addEventListener('click',()=>{
      const open=!menu.classList.contains('open');
      if(open&&docsMenu&&docsMenu.classList.contains('open'))setMenu(docsMenu,docsToggle,false);
      setMenu(menu,toggle,open);
      document.body.style.overflow=open?'hidden':'';
    });
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{setMenu(menu,toggle,false);document.body.style.overflow=''}));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('open')){setMenu(menu,toggle,false);document.body.style.overflow='';toggle.focus()}});
  }
  if(docsToggle&&docsMenu){
    docsToggle.addEventListener('click',()=>{
      const open=!docsMenu.classList.contains('open');
      if(open&&menu&&menu.classList.contains('open')){setMenu(menu,toggle,false);document.body.style.overflow=''}
      setMenu(docsMenu,docsToggle,open);
    });
    docsMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(docsMenu,docsToggle,false)));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&docsMenu.classList.contains('open')){setMenu(docsMenu,docsToggle,false);docsToggle.focus()}});
  }
  const source=document.querySelector('.docs-nav');
  const target=document.querySelector('[data-docs-mobile-nav]');
  if(source&&target){
    source.querySelectorAll('[data-docs-group]').forEach(group=>{
      const heading=group.querySelector('.docs-nav-toggle span')?.textContent||'';
      if(!heading)return;
      const section=document.createElement('section');
      section.className='docs-nav-group';
      section.setAttribute('data-docs-group','');
      const btn=document.createElement('button');
      btn.type='button';btn.className='docs-nav-toggle';btn.setAttribute('aria-expanded','false');
      const label=document.createElement('span');label.textContent=heading;
      const icon=document.createElement('i');icon.setAttribute('aria-hidden','true');
      btn.append(label,icon);
      const links=document.createElement('div');
      links.className='docs-nav-links';links.hidden=true;
      links.innerHTML=[...group.querySelectorAll('.docs-nav-links a')].map(a=>a.outerHTML).join('');
      section.append(btn,links);
      target.append(section);
    });
    cortexWireDocs(target);
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  cortexInitDocsNav();
  cortexInitMobileMenu();
  const targets=[...document.querySelectorAll('.docs article pre, .code-card, .install-card')];
  for(const box of targets){
    if(box.querySelector('.copy-code')||box.parentElement?.classList.contains('code-copy-shell'))continue;
    const source=box.querySelector('code,.code-line,.terminal-code')||box;
    let controls=box;
    if(box.matches('pre')){
      controls=document.createElement('div');
      controls.className='code-copy-shell';
      box.before(controls);
      controls.append(box);
    }
    const button=document.createElement('button');
    button.type='button';button.className='copy-code';button.setAttribute('aria-label','Copy code');button.title='Copy code';button.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>';
    button.addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(cortexCopyText(source));
        button.setAttribute('aria-label','Copied');
        setTimeout(()=>button.setAttribute('aria-label','Copy code'),1200);
      }catch{
        button.setAttribute('aria-label','Copy failed');
        setTimeout(()=>button.setAttribute('aria-label','Copy code'),1200);
      }
    });
    controls.append(button);
  }
});

const CORTEX_LOCAL_PORT_KEY='cortex-local-port';
const CORTEX_DEFAULT_PORT=7331;

function cortexValidLocalPort(value){
  const text=String(value??'').trim();
  if(!/^\d+$/.test(text))return null;
  const port=Number(text);
  return Number.isInteger(port)&&port>=1&&port<=65535?port:null;
}

function cortexLauncherQuery(search){
  const raw=String(search||'').replace(/^\?/,'');
  if(!raw)return {mode:'launch'};
  if(raw==='config'||raw.startsWith('config&'))return {mode:'config'};

  const params=new URLSearchParams(raw);
  if(params.has('config'))return {mode:'config'};
  if(params.has('port'))return {mode:'port',value:params.get('port')};
  if(params.has('portno'))return {mode:'port',value:params.get('portno')};

  // Also support the compact documented form: /redirect?8123
  if(!raw.includes('=')&&!raw.includes('&'))return {mode:'port',value:raw};
  return {mode:'invalid',value:raw};
}

function cortexOpenLocal(port){
  window.location.replace(`http://localhost:${port}/`);
}

function cortexInitLauncher(){
  const root=document.querySelector('[data-cortex-launcher]');
  if(!root)return;

  const form=root.querySelector('[data-redirect-form]');
  const input=form?.querySelector('input[name="port"]');
  const error=root.querySelector('[data-redirect-error]');
  const status=root.querySelector('[data-redirect-status]');
  const reset=root.querySelector('[data-reset-port]');
  const query=cortexLauncherQuery(window.location.search);

  const showError=message=>{
    root.classList.add('redirect-config-mode');
    if(error){error.textContent=message;error.hidden=false}
    if(input){input.focus();input.select()}
  };
  const configuredPort=()=>{
    try{return cortexValidLocalPort(localStorage.getItem(CORTEX_LOCAL_PORT_KEY))}
    catch{return null}
  };
  const savePort=port=>{
    try{localStorage.setItem(CORTEX_LOCAL_PORT_KEY,String(port));return true}
    catch{return false}
  };

  if(query.mode==='launch'){
    const port=configuredPort()||CORTEX_DEFAULT_PORT;
    if(input)input.value=String(port);
    if(status)status.textContent=`Opening Cortex on localhost:${port}…`;
    cortexOpenLocal(port);
    return;
  }

  root.classList.add('redirect-config-mode');
  const stored=configuredPort();
  if(input)input.value=String(stored||CORTEX_DEFAULT_PORT);

  if(query.mode==='port'){
    const port=cortexValidLocalPort(query.value);
    if(!port){
      showError('That is not a valid TCP port. Enter a whole number from 1 to 65535.');
    }else{
      savePort(port);
      if(status)status.textContent=`Saved port ${port}. Opening Cortex…`;
      cortexOpenLocal(port);
      return;
    }
  }else if(query.mode==='invalid'){
    showError('The redirect parameters were not recognised. Configure the local Cortex port below.');
  }

  form?.addEventListener('submit',event=>{
    event.preventDefault();
    const port=cortexValidLocalPort(input?.value);
    if(!port){showError('That is not a valid TCP port. Enter a whole number from 1 to 65535.');return}
    if(error)error.hidden=true;
    savePort(port);
    cortexOpenLocal(port);
  });

  reset?.addEventListener('click',()=>{
    if(input)input.value=String(CORTEX_DEFAULT_PORT);
    try{localStorage.removeItem(CORTEX_LOCAL_PORT_KEY)}catch{}
    if(error)error.hidden=true;
    input?.focus();
  });
}

document.addEventListener('DOMContentLoaded',cortexInitLauncher);
