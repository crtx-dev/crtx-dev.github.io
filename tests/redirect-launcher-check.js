const fs=require('fs');
const vm=require('vm');

const script=fs.readFileSync('public/assets/js/script.js','utf8');
const generated=fs.readFileSync('public/redirect.html','utf8');

function loadContext(search='',stored={}){
  const listeners={};
  const storage=new Map(Object.entries(stored));
  const redirects=[];
  const classSet=new Set();
  const input={value:'',focus(){},select(){}};
  const error={textContent:'',hidden:true};
  const status={textContent:''};
  const reset={addEventListener(type,fn){listeners[`reset:${type}`]=fn}};
  const form={
    querySelector(sel){return sel==='input[name="port"]'?input:null},
    addEventListener(type,fn){listeners[`form:${type}`]=fn},
  };
  const root={
    classList:{add(name){classSet.add(name)}},
    querySelector(sel){
      return ({
        '[data-redirect-form]':form,
        '[data-redirect-error]':error,
        '[data-redirect-status]':status,
        '[data-reset-port]':reset,
      })[sel]||null;
    },
  };
  const document={
    documentElement:{classList:{add(){}}},
    addEventListener(){},
    querySelector(sel){return sel==='[data-cortex-launcher]'?root:null},
    querySelectorAll(){return []},
  };
  const context={
    console,
    URL,
    URLSearchParams,
    setTimeout,
    document,
    navigator:{clipboard:{writeText:async()=>{}}},
    location:{href:'https://crtx.dev/redirect',pathname:'/redirect'},
    localStorage:{
      getItem(key){return storage.has(key)?storage.get(key):null},
      setItem(key,value){storage.set(key,String(value))},
      removeItem(key){storage.delete(key)},
    },
  };
  context.window={
    location:{search,replace(url){redirects.push(url)}},
  };
  vm.createContext(context);
  vm.runInContext(script,context,{filename:'script.js'});
  return {context,storage,redirects,input,error,status,classSet,listeners};
}

function assert(condition,message){if(!condition)throw new Error(message)}

for(const [value,want] of [['1',1],['7331',7331],['65535',65535],['0',null],['65536',null],['12.5',null],['abc',null],['',null]]){
  const {context}=loadContext();
  assert(context.cortexValidLocalPort(value)===want,`port validation failed for ${JSON.stringify(value)}`);
}

{
  const t=loadContext();
  t.context.cortexInitLauncher();
  assert(t.redirects[0]==='http://localhost:7331/','default launch must use port 7331');
}
{
  const t=loadContext('',{'cortex-local-port':'8123'});
  t.context.cortexInitLauncher();
  assert(t.redirects[0]==='http://localhost:8123/','stored port must be used');
}
{
  const t=loadContext('?9001');
  t.context.cortexInitLauncher();
  assert(t.storage.get('cortex-local-port')==='9001','compact port query must be stored');
  assert(t.redirects[0]==='http://localhost:9001/','compact port query must launch configured port');
}
{
  const t=loadContext('?portno=9100');
  t.context.cortexInitLauncher();
  assert(t.storage.get('cortex-local-port')==='9100','portno query must be stored');
  assert(t.redirects[0]==='http://localhost:9100/','portno query must launch configured port');
}
{
  const t=loadContext('?99999',{'cortex-local-port':'8123'});
  t.context.cortexInitLauncher();
  assert(t.redirects.length===0,'invalid port must not redirect');
  assert(t.error.hidden===false&&/valid TCP port/.test(t.error.textContent),'invalid port must show config error');
  assert(t.input.value==='8123','invalid port must show existing stored configuration');
}
{
  const t=loadContext('?config',{'cortex-local-port':'8450'});
  t.context.cortexInitLauncher();
  assert(t.redirects.length===0,'config mode must not auto-launch');
  assert(t.input.value==='8450','config mode must load stored port');
  assert(t.classSet.has('redirect-config-mode'),'config mode must show configuration UI');
}

for(const needle of ['data-cortex-launcher','Local Cortex port','Save and open Cortex','Use default port']){
  assert(generated.includes(needle),`generated redirect page missing ${needle}`);
}
assert(!generated.includes('@content')&&!generated.includes('@input('),'generated redirect page contains unresolved Nift syntax');

console.log('cortex redirect launcher check: ok');
