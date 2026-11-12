/* Route the existing Agent/Graph/Run API to the demo backend. */
(() => {
  'use strict';
  const legacy=window.fetch.bind(window),api=window.VideoAPI;
  let ready;
  const notify=(ok,message)=>window.dispatchEvent(new CustomEvent('workflow-connection',{detail:{ok,message}}));
  async function connect(){
    if(!ready)ready=api.connect().then(h=>{notify(true,window.PagesAPI?'浏览器工作区已连接 · 编排与运行记录保存在当前浏览器':'匿名工作区已连接 · Agent、编排与运行自动保存');return h;}).catch(e=>{ready=null;notify(false,'运行服务暂不可用：'+e.message);throw e;});
    return ready;
  }
  async function request(path,method='GET',body){await connect();return api.request('/api/video/console'+path,method,body);}
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
  function eventsResponse(runId,start=0,follow=false){
    let stopped=false;
    const encoder=new TextEncoder();
    return new Response(new ReadableStream({
      async start(controller){
        let cursor=start;
        try{
          while(!stopped){
            const result=await request('/v1/runs/'+runId+'/events?start='+cursor);
            for(const ev of result.items){if(stopped)return;controller.enqueue(encoder.encode('id: '+(++cursor)+'\nevent: '+ev.type+'\ndata: '+JSON.stringify(ev)+'\n\n'));}
            if(!follow||['succeeded','failed','cancelled','waiting_human'].includes(result.status))break;
            await new Promise(r=>setTimeout(r,350));
          }
          if(!stopped)controller.close();
        }catch(e){if(!stopped)controller.error(e);}
      },cancel(){stopped=true;}
    }),{headers:{'Content-Type':'text/event-stream'}});
  }
  async function merged(path,options){
    const old=await (await legacy(path,options)).json();
    try{const remote=await request(path);return {...old,items:[...(old.items||[]),...(remote.items||[])],total:(old.items?.length||0)+(remote.items?.length||0)};}
    catch(e){notify(false,'后端连接失败，仅显示本地欢迎语：'+e.message);return old;}
  }
  window.fetch=async(input,options={})=>{
    const url=new URL(typeof input==='string'?input:input.url,location.href),method=(options.method||'GET').toUpperCase(),path=url.pathname,parts=path.split('/').filter(Boolean);
    if(url.origin!==location.origin)return legacy(input,options);
    try{
      if(path==='/v1/agents'&&method==='GET')return json(await merged(path+url.search,options));
      if(path==='/v1/graphs'&&method==='GET')return json(await merged(path+url.search,options));
      if(path==='/v1/graphs/node-types')return legacy(input,options);
      if(path==='/v1/projects/demo'&&method==='GET'){
        const project=await (await legacy(input,options)).json(),agents=await merged('/v1/agents',{});return json({...project,agents:agents.items});
      }
      if(path==='/v1/runs'&&method==='GET'){
        const result=await merged(path+url.search,options);result.items.sort((a,b)=>b.created_at-a.created_at);return json(result);
      }
      const data=options.body?JSON.parse(options.body):undefined;
      if(path.startsWith('/v1/voc/')||path==='/v1/reviews')return json(await request(path+url.search,method,data));
      if(path==='/v1/runs'&&method==='POST'&&data.agent!=='demo.welcome'){
        const run=await request(path,method,data);window.dispatchEvent(new CustomEvent('workflow-run',{detail:run}));return data.stream?eventsResponse(run.run_id,0,true):json(run,201);
      }
      if(parts[1]==='runs'&&parts[2]?.startsWith('task_')) {
        if(parts[3]==='events')return eventsResponse(parts[2],Number(url.searchParams.get('start'))||0,false);
        return json(await request(path+url.search,method,data));
      }
      if(parts[1]==='agents'&&parts[2]!=='demo.welcome')return json(await request(path+url.search,method,data),method==='POST'?201:200);
      if(parts[1]==='graphs'&&parts[2]!=='demo_welcome')return json(await request(path+url.search,method,data));
      return legacy(input,options);
    }catch(e){return json({message:e.message,code:e.code||'WORKFLOW_ERROR',details:e.details||[]},e.status||503);}
  };
  window.WorkflowAPI=Object.freeze({connect,request,reconnect:async()=>{ready=null;return connect();}});
})();
