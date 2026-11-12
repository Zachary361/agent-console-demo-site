/* Shared graph rules for the existing canvas and the demo worker. */
(() => {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const forbidden = new Set(['__proto__','prototype','constructor']);
  const safePath = path => typeof path === 'string' && /^(input|variables)(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(path) && !path.split('.').some(k => forbidden.has(k));
  const getPath = (state,path) => {
    if(path === 'variables' || path === 'input') return state[path];
    if(!safePath(path)) throw Error('状态路径无效：'+path);
    return path.split('.').reduce((v,k)=>v && Object.hasOwn(v,k) ? v[k] : undefined,state);
  };
  function setPath(state,path,value) {
    if(!safePath(path) || !path.startsWith('variables.')) throw Error('输出路径必须位于 variables 下');
    const keys=path.split('.');let target=state;
    for(const key of keys.slice(0,-1)) {
      if(!Object.hasOwn(target,key))target[key]={};
      if(!target[key] || typeof target[key]!=='object' || Array.isArray(target[key]))throw Error('输出路径冲突：'+path);
      target=target[key];
    }
    target[keys.at(-1)]=copy(value);
  }
  function safeObject(value,depth=0) {
    if(depth>20)throw Error('配置嵌套过深');
    if(value && typeof value==='object')for(const [k,v] of Object.entries(value)){if(forbidden.has(k))throw Error('配置含不允许的字段');safeObject(v,depth+1);}
  }
  const inputSchema={type:'object',required:['image','prompt'],additionalProperties:false,properties:{image:{type:'string',minLength:1,description:'上传的 PNG/JPEG，由运行参数图片控件提供'},prompt:{type:'string',minLength:1,maxLength:1000,default:'镜头缓慢推进，主体保持清晰。',description:'演示仅保存提示词，镜头效果由画布节点配置决定'}}};
  const outputSchema={type:'object',required:['video_url'],properties:{video_url:{type:'string'},seconds:{type:'number'},width:{type:'integer'},height:{type:'integer'},mode:{type:'string'}}};
  const welcomeInput={type:'object',required:['name'],additionalProperties:false,properties:{name:{type:'string',minLength:1,maxLength:80,default:'演示访客'}}};
  const welcomeOutput={type:'object',required:['greeting'],properties:{greeting:{type:'string'}}};
  function templateGraph(id,name,kind='video',owner='') {
    if(kind==='support_team')return globalThis.SupportTeam.graph(id,name,'orchestrator',owner);
    if(kind==='support')return globalThis.SupportCore.graph(id,name,owner);
    if(['voc_tag','voc_analysis'].includes(kind))return (globalThis.VocV2||globalThis.VocCore).graph(id,name,kind,owner);
    const nodes=[{id:'start',type:'start',x:90,y:150,config:{copy_input:true,load_context:false}}];
    if(kind==='video')nodes.push({id:'video',type:'image_to_video',display_name:'图生视频',x:370,y:150,timeout:90,config:{image_path:'input.image',prompt_path:'input.prompt',seconds:5,ratio:'landscape',motion:'zoom',output_path:'variables.video'}});
    if(kind==='welcome')nodes.push({id:'welcome',type:'llm',x:370,y:150,config:{mock_output:{greeting:'你好，{{input.name}}！这是本地演示。'},output_path:'variables.answer'}});
    nodes.push({id:'end',type:'end',x:kind==='blank'?370:650,y:150,config:{source_path:kind==='video'?'variables.video':kind==='welcome'?'variables.answer':'variables'}});
    return {id,name,version:'v1',status:'draft',entry:'start',owner_agent_code:owner,node_defaults_version:1,nodes,edges:nodes.slice(1).map((n,i)=>({from:nodes[i].id,to:n.id}))};
  }
  function validateGraph(graph) {
    const errors=[];
    try {
      safeObject(graph);
      if(!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges))throw Error('编排结构无效');
      if(graph.nodes.length>30 || graph.edges.length>40)throw Error('演示最多支持30个节点和40条连线');
      const nodes=new Map(graph.nodes.map(n=>[n.id,n]));
      if(nodes.size!==graph.nodes.length)errors.push('节点 ID 不可重复');
      if(nodes.get(graph.entry)?.type!=='start' || graph.nodes.filter(n=>n.type==='start').length!==1)errors.push('必须有且仅有一个开始节点，并设为入口');
      if(graph.nodes.filter(n=>n.type==='end').length!==1)errors.push('必须有且仅有一个结束节点');
      if(graph.nodes.filter(n=>n.type==='image_to_video').length>1)errors.push('当前演示每张图最多一个图生视频节点');
      for(const n of graph.nodes) {
        if(!/^[a-zA-Z0-9_-]{1,64}$/.test(n.id))errors.push('节点 ID 仅支持字母、数字、下划线与连字符');
        if(!['start','llm','image_to_video','voc_tag','voc_aggregate','voc_workorders','voc_review','plm_task','end',...Object.keys(globalThis.VocV2?.definitions||{}),...Object.keys(globalThis.SupportCore?.definitions||{}),...Object.keys(globalThis.SupportTeam?.definitions||{})].includes(n.type))errors.push('演示尚未实现节点：'+n.type);
        const c=n.config || {};
        if(n.type==='start' && c.load_context)errors.push('当前演示未接入上下文加载，请关闭 load_context');
        if(n.type==='llm' && (!c.mock_output || typeof c.mock_output!=='object'))errors.push(n.id+' 需配置 mock_output；未接真实模型');
        if(['llm','image_to_video'].includes(n.type) && (!safePath(c.output_path) || !c.output_path.startsWith('variables.')))errors.push(n.id+' 输出路径必须位于 variables 下');
        if(n.type==='end' && c.source_path!=='variables' && c.source_path!=='input' && !safePath(c.source_path))errors.push('结束节点需配置有效的 source_path');
        if(n.type==='image_to_video') {
          if(c.image_path!=='input.image')errors.push(n.id+' 图片来源须为 input.image');
          if(!safePath(c.prompt_path))errors.push(n.id+' 提示词来源路径无效');
          if(![3,5,8].includes(c.seconds))errors.push(n.id+' 时长仅支持 3、5、8 秒');
          if(!['landscape','portrait','square'].includes(c.ratio))errors.push(n.id+' 画幅无效');
          if(!['zoom','pan','static'].includes(c.motion))errors.push(n.id+' 镜头无效');
        }
        if(n.type.startsWith('voc_')||n.type.startsWith('cs_')||n.type.startsWith('ma_')||n.type==='plm_task'){
          if(c.input_path!=='input'&&c.input_path!=='variables'&&!safePath(c.input_path))errors.push(n.id+' 输入路径无效');
          if(!safePath(c.output_path)||!c.output_path.startsWith('variables.'))errors.push(n.id+' 输出路径必须位于 variables 下');
        }
        if(['voc_aggregate','voc_score'].includes(n.type)){
          const w=c.weights;
          if(!w||Object.keys(w).sort().join(',')!=='frequency,helpful,low_rating,severity'||Object.values(w).some(v=>!Number.isFinite(v)||v<0)||Math.abs(Object.values(w||{}).reduce((a,b)=>a+b,0)-100)>0.001)errors.push('VOC 权重需包含 frequency/low_rating/severity/helpful 且合计100');
          if(!Number.isInteger(c.low_rating_max)||c.low_rating_max<1||c.low_rating_max>3)errors.push('低星阈值为1–3的整数');
        }
        if(n.type==='branch'&&!safePath(c.value_path))errors.push('条件分支需要有效的布尔变量路径');
        if(n.type==='voc_quality'&&(!Number.isFinite(c.confidence_threshold)||c.confidence_threshold<0||c.confidence_threshold>1))errors.push('置信度门槛必须为0–1');
        if(n.type==='voc_score'&&(!Number.isInteger(c.min_issue_reviews)||c.min_issue_reviews<1||c.min_issue_reviews>50))errors.push('样本门槛必须为1–50的整数');
        for(const key of ['system_prompt','user_prompt'])if(c[key]!==undefined&&(typeof c[key]!=='string'||!c[key].trim()||c[key].length>12000))errors.push(n.id+' Prompt必须为1–12000字符');
        if(c.model_output_schema)try{checkSchema(c.model_output_schema);}catch(e){errors.push(n.id+' 模型输出Schema无效：'+e.message);}
        if(n.type==='plm_task'&&c.mode!=='demo')errors.push('PLM 当前仅支持 demo 模式');
        if(n.type==='cs_merge'&&(!Number.isInteger(c.window_ms)||c.window_ms<0||c.window_ms>5000))errors.push('客服归并窗口为0–5000毫秒');
        if(n.type==='cs_lookup'&&(!Number.isInteger(c.demo_delay_ms)||c.demo_delay_ms<0||c.demo_delay_ms>30000))errors.push('演示查询延迟为0–30000毫秒');
        if(n.type==='cs_plan'&&!['auto','combined','per_intent','hybrid'].includes(c.reply_mode))errors.push('客服回复策略无效');
        if(n.type==='cs_wait'&&(![c.first_reply_ms,c.progress_after_ms,c.handoff_after_ms].every(v=>Number.isInteger(v)&&v>=100&&v<=60000)||c.first_reply_ms>=c.progress_after_ms||c.progress_after_ms>=c.handoff_after_ms))errors.push('客服等待阈值需满足100ms≤首响<进度<转人工≤60000ms');
      }
      for(const e of graph.edges){if(!nodes.has(e.from)||!nodes.has(e.to))errors.push('连线引用不存在的节点');if(e.condition&&!['true','false'].includes(e.condition))errors.push('分支条件仅支持true / false');}
      for(const n of graph.nodes){const out=graph.edges.filter(e=>e.from===n.id);if(n.type==='end'){if(out.length)errors.push('结束节点不能有后续连线');}else if(n.type==='branch'){if(out.length!==2||new Set(out.map(e=>e.condition)).size!==2||out.some(e=>!['true','false'].includes(e.condition)))errors.push(n.id+' 分支必须各有一条true和false连线');}else if(out.length!==1||out.some(e=>e.condition))errors.push(n.id+' 非分支节点必须有一个无条件后续节点');}
      const visited=new Set(),visiting=new Set(),ancestors=new Map();
      function walk(id,path=[]){if(visiting.has(id)){errors.push('演示不支持循环');return;}if(!nodes.has(id))return;const n=nodes.get(id);ancestors.set(id,ancestors.has(id)?new Set([...ancestors.get(id)].filter(x=>path.includes(x))):new Set(path));if(visited.has(id))return;visiting.add(id);for(const e of graph.edges.filter(e=>e.from===id))walk(e.to,[...path,id]);visiting.delete(id);visited.add(id);}
      walk(graph.entry);if(visited.size!==nodes.size)errors.push('存在未连入流程的节点');
      // Dominators: every route to a side effect must include its prerequisite.
      const dom=new Map([...nodes.keys()].map(id=>[id,id===graph.entry?new Set([id]):new Set(nodes.keys())]));
      for(let i=0;i<nodes.size;i++)for(const id of nodes.keys()){if(id===graph.entry)continue;const parents=graph.edges.filter(e=>e.to===id).map(e=>dom.get(e.from)).filter(Boolean);let d=parents.length?new Set([...parents[0]].filter(v=>parents.every(p=>p.has(v)))):new Set();d.add(id);dom.set(id,d);}
      const hasBefore=(id,types)=>[...(dom.get(id)||[])].some(p=>p!==id&&types.includes(nodes.get(p)?.type));
      for(const type of ['voc_workorders','voc_review','plm_task','voc_tag_review'])if(graph.nodes.filter(n=>n.type===type).length>1)errors.push('每张图最多一个 '+type+' 节点');
      if(graph.nodes.some(n=>n.type.startsWith('cs_'))){
        for(const type of ['cs_intake','cs_language','cs_merge','cs_intents','cs_plan','cs_wait','cs_lookup','cs_compose','cs_quality','cs_dispatch','cs_report'])if(graph.nodes.filter(n=>n.type===type).length!==1)errors.push('客服图必须有且仅有一个 '+type);
        for(const n of graph.nodes){const prerequisites={cs_language:['cs_intake'],cs_intents:['cs_language','cs_merge'],cs_plan:['cs_intents'],cs_wait:['cs_plan'],cs_quick:['cs_wait','cs_plan'],cs_lookup:['cs_wait'],cs_compose:['cs_lookup'],cs_quality:['cs_compose'],cs_dispatch:['cs_quality'],cs_handoff:['cs_dispatch'],cs_report:['cs_dispatch']}[n.type]||[];for(const type of prerequisites)if(!hasBefore(n.id,[type]))errors.push(n.id+' 所有路径都必须先经过 '+type);}
      }
      if(graph.nodes.some(n=>n.type.startsWith('ma_'))){
        const team=globalThis.SupportTeam;
        if(graph.nodes.some(n=>n.type==='ma_intake')){
          for(const type of ['ma_intake','ma_plan','ma_parallel','ma_reconcile','ma_repair','ma_dispatch','ma_report'])if(graph.nodes.filter(n=>n.type===type).length!==1)errors.push('协作图需要一个 '+type);
          for(const role of ['understanding','writer',...(graph.template_revision>=3?['style']:[]),'quality','handoff'])if(graph.nodes.filter(n=>n.type==='ma_call'&&n.config.role===role).length!==1)errors.push('协作图需要一个 '+role+' Agent调用');
          const beforeRole=(id,role)=>[...(dom.get(id)||[])].some(p=>p!==id&&nodes.get(p)?.type==='ma_call'&&nodes.get(p)?.config.role===role);
          for(const n of graph.nodes){
            if(n.type==='ma_call'&&!Object.hasOwn(team.roleInfo,n.config.role))errors.push('未知子Agent角色');
            if(n.type==='ma_call'&&typeof n.config.agent_code!=='string')errors.push('子Agent缺少绑定');
            const required={ma_plan:['ma_intake'],ma_parallel:['ma_plan'],ma_reconcile:['ma_parallel'],ma_dispatch:['ma_reconcile'],ma_report:['ma_dispatch']}[n.type]||[];
            for(const type of required)if(!hasBefore(n.id,[type]))errors.push(n.id+' 必须先经过 '+type);
            if(n.type==='ma_plan'&&!beforeRole(n.id,'understanding'))errors.push('规划前必须理解会话');
            if(n.type==='ma_call'&&n.config.role==='writer'&&!hasBefore(n.id,['ma_reconcile']))errors.push('答案组织前必须汇合证据');
            if(n.type==='ma_call'&&n.config.role==='style'&&!beforeRole(n.id,'writer'))errors.push('语言润色前必须组织草稿');
            if(n.type==='ma_call'&&n.config.role==='quality'&&graph.nodes.some(x=>x.type==='ma_call'&&x.config.role==='style')&&!beforeRole(n.id,'style'))errors.push('质检前必须完成语言润色');
            if(n.type==='ma_call'&&n.config.role==='quality'&&!beforeRole(n.id,'writer'))errors.push('质检前必须组织草稿');
            if(n.type==='ma_call'&&n.config.role==='handoff'&&!hasBefore(n.id,['ma_dispatch']))errors.push('人工交接前必须完成投递检查');
            if(n.type==='ma_dispatch'&&(!beforeRole(n.id,'writer')||!beforeRole(n.id,'quality')))errors.push('投递前必须组织答案并进行独立质检');
            if(n.type==='ma_report'&&!beforeRole(n.id,'handoff'))errors.push('报告前必须核对人工交接');
            if(n.type==='ma_intake'){const c=n.config;if(![c.first_reply_ms,c.progress_after_ms,c.budget_ms].every(v=>Number.isInteger(v)&&v>=100&&v<=60000)||c.first_reply_ms>=c.progress_after_ms||c.progress_after_ms>=c.budget_ms)errors.push('协作等待需满足100ms≤首响<进度<总预算≤60秒');}
            if(n.type==='ma_parallel'){const c=n.config;if(!Number.isInteger(c.max_attempts)||c.max_attempts<1||c.max_attempts>3||!Number.isInteger(c.retry_backoff_ms)||c.retry_backoff_ms<0||c.retry_backoff_ms>2000)errors.push('核验最多尝试1–3次，退避0–2000ms');}
          }
          if(graph.nodes.some(n=>n.type==='ma_step'||n.type==='ma_child_output'))errors.push('总控不能内嵌专职步骤，请调用子Agent');
        }else{
          const steps=graph.nodes.filter(n=>n.type==='ma_step'),role=steps[0]?.config.role,info=team.roleInfo[role];
          if(!info||steps.some(n=>n.config.role!==role))errors.push('专职子图必须属于同一角色');
          else{
            let cursor=graph.entry;const stages=[],seen=new Set();
            while(cursor&&!seen.has(cursor)){seen.add(cursor);const n=nodes.get(cursor);if(n?.type==='ma_step')stages.push(n.config.stage);cursor=graph.edges.find(e=>e.from===cursor)?.to;}
            for(const n of steps)if(role==='style'&&n.config.stage==='tone'){if(n.config.tone!==undefined&&!['natural','concise'].includes(n.config.tone))errors.push('润色语气仅支持 natural / concise');if(n.config.empathy!==undefined&&typeof n.config.empathy!=='boolean')errors.push('情绪回应必须为布尔值');}
            if(JSON.stringify(stages)!==JSON.stringify(info.stages.map(s=>s[0])))errors.push('专职阶段不能跳过、重复或换序');
          }
          if(graph.nodes.some(n=>!['start','end','ma_step','ma_child_output'].includes(n.type)))errors.push('子图仅允许本角色的固定阶段');
          const output=graph.nodes.filter(n=>n.type==='ma_child_output');if(output.length!==1||output[0]?.config.role!==role||steps.some(n=>!dom.get(output[0]?.id)?.has(n.id)))errors.push('子图必须返回经过完整阶段的角色输出');
        }
      }
      for(const n of graph.nodes){
        if(n.type==='plm_task' &&(!hasBefore(n.id,['voc_review'])||!hasBefore(n.id,['voc_workorders'])))errors.push('PLM之前所有分支必须依次创建工单、完成人工确认');
        if(n.type==='voc_review'&&!hasBefore(n.id,['voc_workorders']))errors.push('人工确认之前必须创建工单');
        if(n.type==='voc_workorders'&&!hasBefore(n.id,['voc_aggregate','voc_proposal_check']))errors.push('创建工单之前必须有归纳或方案校验节点');
      }

    }catch(e){errors.push(e.message);}
    return {ok:!errors.length,errors:[...new Set(errors)],warnings:[]};
  }
  const schemaKeys=new Set(['type','properties','required','additionalProperties','items','enum','minLength','maxLength','minimum','maximum','minItems','maxItems','description','title','default','examples']);
  function checkSchema(s,depth=0) {
    safeObject(s);
    if(!s || typeof s!=='object' || Array.isArray(s) || depth>8)throw Error('契约结构无效或嵌套过深');
    for(const k of Object.keys(s))if(!schemaKeys.has(k))throw Error('演示契约暂不支持关键字：'+k);
    const types=Array.isArray(s.type)?s.type:[s.type];
    if(!types.length||types.some(type=>!['object','array','string','number','integer','boolean','null'].includes(type)))throw Error('契约需声明支持的 type');
    if(s.properties){if(typeof s.properties!=='object'||Array.isArray(s.properties))throw Error('properties 必须为对象');for(const v of Object.values(s.properties))checkSchema(v,depth+1);}
    if(s.required && (!Array.isArray(s.required)||s.required.some(k=>typeof k!=='string'||forbidden.has(k))))throw Error('required 必须是字段名数组');
    if(s.additionalProperties!==undefined&&typeof s.additionalProperties!=='boolean')throw Error('additionalProperties 仅支持布尔值');
    if(s.items)checkSchema(s.items,depth+1);
    if(s.enum && !Array.isArray(s.enum))throw Error('enum 必须是数组');
    for(const k of ['minLength','maxLength','minimum','maximum','minItems','maxItems'])if(s[k]!==undefined&&(!Number.isFinite(s[k])||Math.abs(s[k])>1000000000))throw Error('契约限制无效：'+k);
    return true;
  }
  function validateValue(value,s,path='input') {
    if(Array.isArray(s.type)){
      const options=s.type.map(type=>validateValue(value,{...s,type},path));
      return options.some(errors=>!errors.length)?[]:[path+' 应符合类型 '+s.type.join(' / ')];
    }
    const errors=[];let typeOK=true;
    if(s.type==='object')typeOK=value!==null&&typeof value==='object'&&!Array.isArray(value);
    else if(s.type==='array')typeOK=Array.isArray(value);
    else if(s.type==='integer')typeOK=Number.isInteger(value);
    else if(s.type==='null')typeOK=value===null;
    else typeOK=typeof value===s.type;
    if(!typeOK)return [path+' 应为 '+s.type];
    if(s.enum&&!s.enum.some(x=>JSON.stringify(x)===JSON.stringify(value)))errors.push(path+' 不在允许选项中');
    if(s.type==='object') {
      for(const k of s.required||[])if(!Object.hasOwn(value,k))errors.push(path+'.'+k+' 必填');
      for(const [k,v] of Object.entries(value)){if(forbidden.has(k))errors.push('不允许的字段');else if(s.properties?.[k])errors.push(...validateValue(v,s.properties[k],path+'.'+k));else if(s.additionalProperties===false)errors.push(path+'.'+k+' 不在契约中');}
    }
    if(s.type==='array'){if(s.minItems!==undefined&&value.length<s.minItems||s.maxItems!==undefined&&value.length>s.maxItems)errors.push(path+' 数量超出限制');if(s.items)for(let i=0;i<value.length;i++)errors.push(...validateValue(value[i],s.items,path+'.'+i));}
    if(s.type==='string' && (s.minLength!==undefined&&value.length<s.minLength||s.maxLength!==undefined&&value.length>s.maxLength))errors.push(path+' 长度不符合契约');
    if(['integer','number'].includes(s.type) && (s.minimum!==undefined&&value<s.minimum||s.maximum!==undefined&&value>s.maximum))errors.push(path+' 数值不符合契约');
    return errors;
  }
  function renderTemplate(value,state) {
    if(typeof value==='string')return value.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g,(_,p)=>{const v=getPath(state,p);if(v===undefined)throw Error('模板变量不存在：'+p);return typeof v==='object'?JSON.stringify(v):String(v);});
    if(Array.isArray(value))return value.map(v=>renderTemplate(v,state));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,renderTemplate(v,state)]));
    return value;
  }
  globalThis.WorkflowCore=Object.freeze({copy,safeObject,safePath,getPath,setPath,inputSchema,outputSchema,welcomeInput,welcomeOutput,templateGraph,validateGraph,checkSchema,validateValue,renderTemplate});
})();
