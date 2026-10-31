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
      if(graph.nodes.length>30 || graph.edges.length>30)throw Error('演示最多支持 30 个节点和连线');
      const nodes=new Map(graph.nodes.map(n=>[n.id,n]));
      if(nodes.size!==graph.nodes.length)errors.push('节点 ID 不可重复');
      if(nodes.get(graph.entry)?.type!=='start' || graph.nodes.filter(n=>n.type==='start').length!==1)errors.push('必须有且仅有一个开始节点，并设为入口');
      if(graph.nodes.filter(n=>n.type==='end').length!==1)errors.push('必须有且仅有一个结束节点');
      if(graph.nodes.filter(n=>n.type==='image_to_video').length>1)errors.push('当前演示每张图最多一个图生视频节点');
      for(const n of graph.nodes) {
        if(!/^[a-zA-Z0-9_-]{1,64}$/.test(n.id))errors.push('节点 ID 仅支持字母、数字、下划线与连字符');
        if(!['start','llm','image_to_video','end'].includes(n.type))errors.push('演示尚未实现节点：'+n.type);
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
      }
      for(const e of graph.edges){if(!nodes.has(e.from)||!nodes.has(e.to))errors.push('连线引用不存在的节点');if(e.condition)errors.push('演示仅支持无条件顺序连线');}
      const visited=new Set();let current=graph.entry;
      while(nodes.has(current) && !visited.has(current)) {
        visited.add(current);const n=nodes.get(current),out=graph.edges.filter(e=>e.from===current);
        if(n.type==='end'){if(out.length)errors.push('结束节点不能有后续连线');break;}
        if(out.length!==1){errors.push(n.id+' 必须连接且只能连接一个后续节点');break;}
        current=out[0].to;
        if(visited.has(current))errors.push('演示不支持循环');
      }
      if(nodes.get(current)?.type!=='end')errors.push('流程必须到达结束节点');
      if(visited.size!==nodes.size)errors.push('存在未连入流程的节点');
    }catch(e){errors.push(e.message);}
    return {ok:!errors.length,errors:[...new Set(errors)],warnings:[]};
  }
  const schemaKeys=new Set(['type','properties','required','additionalProperties','items','enum','minLength','maxLength','minimum','maximum','minItems','maxItems','description','title','default','examples']);
  function checkSchema(s,depth=0) {
    safeObject(s);
    if(!s || typeof s!=='object' || Array.isArray(s) || depth>8)throw Error('契约结构无效或嵌套过深');
    for(const k of Object.keys(s))if(!schemaKeys.has(k))throw Error('演示契约暂不支持关键字：'+k);
    if(!['object','array','string','number','integer','boolean','null'].includes(s.type))throw Error('契约需声明支持的 type');
    if(s.properties){if(typeof s.properties!=='object'||Array.isArray(s.properties))throw Error('properties 必须为对象');for(const v of Object.values(s.properties))checkSchema(v,depth+1);}
    if(s.required && (!Array.isArray(s.required)||s.required.some(k=>typeof k!=='string'||forbidden.has(k))))throw Error('required 必须是字段名数组');
    if(s.additionalProperties!==undefined&&typeof s.additionalProperties!=='boolean')throw Error('additionalProperties 仅支持布尔值');
    if(s.items)checkSchema(s.items,depth+1);
    if(s.enum && !Array.isArray(s.enum))throw Error('enum 必须是数组');
    for(const k of ['minLength','maxLength','minimum','maximum','minItems','maxItems'])if(s[k]!==undefined&&(!Number.isFinite(s[k])||Math.abs(s[k])>10000000))throw Error('契约限制无效：'+k);
    return true;
  }
  function validateValue(value,s,path='input') {
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
