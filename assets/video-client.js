// Capture native fetch before the legacy welcome-demo adapter replaces it.
(() => {
  const nativeFetch=window.fetch.bind(window);
  const base=(window.VIDEO_API_BASE||'').replace(/\/$/,'');
  const key='agent_video_workspace.v2:'+base;
  let token='';
  try{token=localStorage.getItem(key)||'';}catch{}
  async function request(route,method='GET',data,asBlob=false){
    const response=await nativeFetch(base+route,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
    if(!response.ok){const body=await response.json().catch(()=>({}));const e=new Error(body.error||'服务连接失败');e.status=response.status;throw e;}
    return asBlob?response.blob():response.json();
  }
  let connecting;
  async function connect(){
    if(connecting)return connecting;
    connecting=(async()=>{
      const health=await request('/api/video/health');
      if(token){try{await request('/api/video/agents');return health;}catch(e){if(e.status!==401)throw e;token='';}}
      const session=await request('/api/video/session','POST',{});token=session.token;
      try{localStorage.setItem(key,token);}catch{throw new Error('浏览器无法保存工作区，请允许此站点使用本地存储后重试。');}
      return health;
    })();
    try{return await connecting;}finally{connecting=null;}
  }
  window.VideoAPI=Object.freeze({request,connect,nativeFetch});
})();
