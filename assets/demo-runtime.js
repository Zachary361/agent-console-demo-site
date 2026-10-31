/* Local, synthetic demonstration data. This file never forwards requests. */
(() => {
  'use strict';
  const KEY = 'sanitized_agent_console.demo.v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const inputSchema = {type:'object',required:['name'],additionalProperties:false,
    properties:{name:{type:'string',minLength:1,maxLength:80,default:'演示访客',description:'虚构的演示名称'}}};
  const outputSchema = {type:'object',required:['greeting'],properties:{greeting:{type:'string'}}};
  function seed() {
    return {schema:1,graphs:{demo_welcome:{id:'demo_welcome',name:'欢迎语演示编排',version:'v1',status:'draft',
      owner_agent_code:'demo.welcome',node_defaults_version:1,entry:'start',
      nodes:[
        {id:'start',type:'start',x:80,y:160,config:{copy_input:true,load_context:false}},
        {id:'welcome',type:'llm',x:340,y:160,config:{prompt_key:'demo.welcome',
          mock_output:{greeting:'你好，{{input.name}}！这是本地演示。'},output_path:'variables.answer'}},
        {id:'end',type:'end',x:600,y:160,config:{source_path:'variables.answer'}}
      ],edges:[{from:'start',to:'welcome'},{from:'welcome',to:'end'}]}},runs:[]};
  }
  let state = seed();
  try { const stored=JSON.parse(localStorage.getItem(KEY)||'null');
    if(stored?.schema===1&&stored.graphs?.demo_welcome&&Array.isArray(stored.runs)) state=stored;
  } catch (_) { /* Read-only or unavailable storage starts a fresh in-memory session. */ }
  const requests=[];
  function commit(next) {
    // A storage failure must not be reported as a successful save.
    localStorage.setItem(KEY,JSON.stringify(next)); state=next;
  }
  const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  const unavailable=()=>response({code:'DEMO_BACKEND_REQUIRED',message:'此功能需要原系统后端；脱敏演示未接入。'},501);
  const project={code:'demo',name:'演示项目',description:'全部内容为虚构示例',status:'active',owner_dept:'演示团队',owner_user:'演示用户',created_at:'2026-01-01T00:00:00Z'};
  function agent() {
    return {code:'demo.welcome',name:'欢迎语演示',description:'使用本地模板生成欢迎语，不调用大模型。',
      project_code:'demo',project,owner_dept:'演示团队',owner_user:'演示用户',visibility:'internal',tags:['demo'],
      status:'active',access:['view','run','manage'],created_at:'2026-01-01T00:00:00Z',
      aliases:{latest:{version:'v1',weight:100}},health:{state:'ok',message:'本地演示示例'},
      versions:[{version:'v1',status:'testing',eval_pass:false,bump:'major',graph_id:'demo_welcome',
        graph_key:'demo_welcome@'+state.graphs.demo_welcome.version,contract_hash:'demo-contract',input_schema:inputSchema,output_schema:outputSchema}]};
  }
  function validateGraph(graph) {
    const errors=[];
    if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges)) return {ok:false,errors:['编排结构无效'],warnings:[]};
    const nodes=new Map(graph.nodes.map(node=>[node.id,node]));
    if(nodes.size!==graph.nodes.length) errors.push('节点 ID 不可重复');
    if(graph.nodes.length>50) errors.push('演示最多支持 50 个节点');
    if(nodes.get(graph.entry)?.type!=='start') errors.push('入口必须为开始节点');
    for(const node of graph.nodes) {
      if(!['start','llm','end'].includes(node.type)) errors.push('本地演示不执行节点类型：'+node.type);
      if(node.type==='llm'&&(!node.config?.mock_output||typeof node.config.mock_output!=='object')) errors.push(node.id+' 需要配置 mock_output 对象');
    }
    for(const edge of graph.edges) {
      if(!nodes.has(edge.from)||!nodes.has(edge.to)) errors.push('连线引用不存在的节点');
      if(edge.condition) errors.push('本地演示仅支持无条件顺序流程');
    }
    const visited=new Set(); let id=graph.entry;
    while(nodes.has(id)&&!visited.has(id)) {
      visited.add(id); const node=nodes.get(id), next=graph.edges.filter(edge=>edge.from===id);
      if(node.type==='end') { if(next.length) errors.push('结束节点不能有后续连线'); break; }
      if(next.length!==1) { errors.push('每个非结束节点必须有且仅有一条后续连线'); break; }
      id=next[0].to;
      if(visited.has(id)) { errors.push('本地演示不支持循环'); break; }
    }
    if(nodes.get(id)?.type!=='end') errors.push('流程必须到达结束节点');
    if(visited.size!==nodes.size) errors.push('存在未连入流程的节点');
    return {ok:errors.length===0,errors:[...new Set(errors)],warnings:[]};
  }
  function validateInput(input) {
    return input&&typeof input==='object'&&!Array.isArray(input)&&typeof input.name==='string'&&input.name.trim().length>0&&input.name.length<=80&&Object.keys(input).every(key=>key==='name');
  }
  function getPath(object,path) {
    return String(path||'').split('.').reduce((value,key)=>
      ['__proto__','constructor','prototype'].includes(key)?undefined:value?.[key],object);
  }
  function setPath(object,path,value) {
    const keys=String(path||'').split('.');
    if(keys[0]!=='variables'||keys.length<2||keys.some(key=>!key||['__proto__','constructor','prototype'].includes(key))) throw new Error('输出路径必须位于 variables 下');
    let target=object;
    keys.slice(0,-1).forEach(key=>{target[key]??={};if(typeof target[key]!=='object'||target[key]===null)throw new Error('输出路径冲突');target=target[key];});
    target[keys.at(-1)]=value;
  }
  function template(value,input) {
    if(typeof value==='string') return value.replace(/\{\{\s*input\.name\s*\}\}/g,()=>input.name);
    if(Array.isArray(value)) return value.map(item=>template(item,input));
    if(value&&typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,template(item,input)]));
    return value;
  }
  function execute(graph,input) {
    const started=performance.now(), runId='demo_run_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    const traceId='demo_trace_'+runId.slice(9),events=[];
    const context={input:clone(input),variables:{}};
    const emit=(type,extra={})=>events.push({type,run_id:runId,trace_id:traceId,ts:now(),mock:true,...extra});
    let id=graph.entry,output={},error=null;
    emit('run_start');
    while(id) {
      const node=graph.nodes.find(item=>item.id===id),config=node.config||{},start=performance.now();
      emit('node_start',{node:id});emit('node_input',{node:id,input:clone(context)});
      try {
        if(node.type==='start') context.variables=clone(input);
        if(node.type==='llm') setPath(context,config.output_path||'variables.answer',template(config.mock_output,input));
        if(node.type==='end') {
          output=clone(getPath(context,config.source_path||'variables')??{});
          if(typeof output.greeting!=='string') throw new Error('输出契约要求 greeting 字符串');
        }
        emit('node_output',{node:id,output:node.type==='end'?output:clone(context)});
        emit('node_end',{node:id,status:'succeeded',latency_ms:Math.max(1,Math.round(performance.now()-start)),tokens:0,cost_usd:0});
      } catch(e) { error={code:'DEMO_EXECUTION_FAILED',message:e.message,node:id};
        emit('node_end',{node:id,status:'error',error_code:error.code,message:error.message,tokens:0,latency_ms:0});break;
      }
      if(node.type==='end') break;
      id=graph.edges.find(edge=>edge.from===id)?.to;
    }
    const latency=Math.max(1,Math.round(performance.now()-started));
    emit('run_end',{status:error?'failed':'succeeded',output,latency_ms:latency,...(error?{error_code:error.code,message:error.message}:{})});
    const run={run_id:runId,trace_id:traceId,agent:'demo.welcome',version:'v1',status:error?'failed':'succeeded',
      created_at:Date.now()/1000,completed_at:Date.now()/1000,input:clone(input),output,tokens:0,latency_ms:latency,cost_usd:0,mock:true,error,events};
    const next=clone(state);next.runs.unshift(run);next.runs=next.runs.slice(0,30);commit(next);
    return run;
  }
  function stream(events) {
    return new Response(events.map((event,index)=>'id: '+(index+1)+'\nevent: '+event.type+'\ndata: '+JSON.stringify(event)+'\n\n').join(''),
      {headers:{'Content-Type':'text/event-stream'}});
  }
  function summary() {
    const runs=state.runs,success=runs.filter(item=>item.status==='succeeded').length;
    return {runs:runs.length,done:runs.length,pending:0,tokens:0,cost_usd:0,cost_source:'none',mock_runs:runs.length,
      success_rate:runs.length?success/runs.length:null,status_counts:{succeeded:success,failed:runs.length-success},
      p95_latency_ms:runs.length?runs.map(item=>item.latency_ms).sort((a,b)=>a-b)[Math.ceil(runs.length*.95)-1]:null};
  }
  async function dispatch(input,options={}) {
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    const method=String(options.method||input?.method||'GET').toUpperCase();
    requests.push({path:url.pathname,method});if(requests.length>200)requests.shift();
    const origin=location.protocol.startsWith('http')?location.origin:'https://demo.invalid';
    if(url.origin!==origin) return response({code:'DEMO_NETWORK_BLOCKED',message:'脱敏演示禁止外部网络请求'},403);
    const path=url.pathname,parts=path.split('/').filter(Boolean).map(decodeURIComponent);
    let body={};if(options.body) {try{body=JSON.parse(options.body);}catch(_){return response({message:'无效 JSON'},400);}}
    if(path==='/healthz') return response({llm_mode:'本地模拟（无模型调用）',stores:{},storage:{ok:true,backend:'浏览器本地'},
      config_center:{enabled:false},encoder:{ok:false},reranker:{enabled:false},orchestrator:{engine:'demo'}});
    if(path==='/v1/auth/me') return response({authenticated:true,config:{enabled:false},user:{name:'演示用户'}});
    if(path==='/v1/graphs/node-types') return response({message:'使用前端内置节点目录'},503);
    if(parts[1]==='graphs') {
      const id=parts[2];
      if(!id&&method==='GET') return response({items:Object.values(state.graphs).map(graph=>({graph_id:graph.id,name:graph.name||graph.id,
        latest:graph.version,status:'draft',nodes:graph.nodes.length,edges:graph.edges.length,agents:['demo.welcome'],owner_agent_code:'demo.welcome'}))});
      if(parts[3]==='validate'&&method==='POST') return response(validateGraph(body.dsl));
      if(method==='PUT'&&parts.length===3) {
        if(body.publish) return unavailable();
        const validation=validateGraph(body.dsl);if(!validation.ok)return response({message:'图校验失败',details:validation.errors},422);
        if(!/^[a-zA-Z0-9_.-]{1,80}$/.test(id)||['__proto__','constructor','prototype'].includes(id)) return response({message:'无效编排 ID'},422);
        const next=clone(state),prev=next.graphs[id];
        const version='v'+((Number(prev?.version?.slice(1))||0)+1);
        next.graphs[id]={...clone(body.dsl),id,version,status:'draft'};commit(next);
        return response({version,status:'draft',warnings:['仅保存于本浏览器，不会发布到任何服务器']});
      }
      if(method==='GET'&&state.graphs[id]) return response({graph_id:id,version:state.graphs[id].version,status:'draft',dsl:clone(state.graphs[id])});
    }
    if(path==='/v1/agents'&&method==='GET') return response({items:[agent()]});
    if(parts[1]==='agents'&&parts[2]==='demo.welcome') {
      if(parts.at(-1)==='contract')return response({id:'demo-contract',input_schema:inputSchema,output_schema:outputSchema,error_codes:['CONTRACT_INPUT_INVALID']});
      if(parts.at(-1)==='validate-input'&&method==='POST') return validateInput(body.input)?response({version:'v1',ok:true}):response({code:'CONTRACT_INPUT_INVALID',message:'请输入 1–80 字的 name，且不包含其他字段',details:['例如：{"name":"演示访客"}']},422);
      if(method==='GET'&&parts.length===3)return response(agent());
      if(method==='GET'&&parts.at(-1)==='access')return response({items:[],users:[]});
    }
    if(path==='/v1/projects'&&method==='GET')return response({items:[project]});
    if(path==='/v1/projects/demo'&&method==='GET')return response({...project,agents:[agent()]});
    if(path==='/v1/runs'&&method==='POST') {
      if(body.agent!=='demo.welcome')return response({message:'仅支持欢迎语演示 Agent'},422);
      if(!validateInput(body.input))return response({code:'CONTRACT_INPUT_INVALID',message:'name 必须为非空字符串'},422);
      const graph=body.graph||state.graphs[body.graph_id||'demo_welcome'],validation=validateGraph(graph);
      if(!validation.ok)return response({message:'图校验失败',details:validation.errors},422);
      const run=execute(graph,body.input);return body.stream?stream(run.events):response(run);
    }
    if(path==='/v1/runs'&&method==='GET') {
      let rows=state.runs;if(url.searchParams.has('status'))rows=rows.filter(item=>item.status===url.searchParams.get('status'));
      return response({items:rows.map(({events,...run})=>run),total:rows.length});
    }
    if(parts[1]==='runs'&&method==='GET') {
      const run=state.runs.find(item=>item.run_id===parts[2]);if(!run)return response({message:'演示运行不存在'},404);
      if(parts[3]==='events')return stream(run.events.slice(Number(url.searchParams.get('start'))||0));
      return response(run);
    }
    if(path==='/v1/observability/runs/summary')return response(summary());
    if(path==='/v1/observability/runtime')return response({mode:'本地演示',queue:{depth:0,oldest_wait_seconds:0,sampled:[]},
      summary:{online:0,busy:0,online_capacity:0,available_slots:0,utilization:0},workers:[],alerts:[]});
    if(path==='/v1/observability/loadtest')return response({available:false});
    if(path==='/v1/context/recall'&&method==='POST')return response({hits:[],sources:{},trimmed:[],fused_by:'none'});
    if(path==='/v1/memory/stats')return response({total:0,pending_index:0,backend:'本地演示'});
    if(path==='/v1/agent-builder/capabilities')return response({nodes:[],skills:[],models:[],knowledge_bases:[],projects:[project],agents:[agent()],policy:{}});
    if(method==='GET')return response({items:[],total:0,users:[],roles:[],series:[],buckets:[],nodes:[]});
    return unavailable();
  }
  window.fetch=async (...args)=>{try{return await dispatch(...args);}catch(error){return response({code:'DEMO_ERROR',message:error.message},500);}};
  window.DemoConsole=Object.freeze({requests,validateGraph,validateInput,
    reset(){for(const key of Object.keys(localStorage))if(key.startsWith('sanitized_agent_console.'))localStorage.removeItem(key);location.reload();},
    snapshot(){return clone(state);}});
})();
