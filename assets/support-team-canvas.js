(() => {
  'use strict';
  const S=SupportTeam,entryParams=new URLSearchParams(location.search);
  Object.assign(FIELD_LABELS,{tone:'语言风格',empathy:'适度回应催问情绪',role:'Agent 职责',stage:'处理阶段',agent_code:'被调用 Agent',knowledge_agent:'知识 Agent',order_agent:'订单 Agent',budget_ms:'订单查询等待预算（毫秒）',max_attempts:'查询最多尝试次数',retry_backoff_ms:'重试退避（毫秒）'});
  for(const [type,[label,desc]]of Object.entries(S.definitions)){
    const fields={input_path:{type:'string',required:true,default:type==='ma_intake'||type==='ma_step'?'input':'variables.team',desc:'从明确的上游变量读取，不能跨会话取值'},output_path:{type:'string',required:true,default:['ma_report','ma_child_output'].includes(type)?'variables.result':type==='ma_step'?'variables.child':'variables.team',desc:'当前步骤输出路径'}};
    if(['ma_call','ma_step','ma_child_output'].includes(type))fields.role={type:'string',enum:Object.keys(S.roleInfo),default:'understanding',desc:'子Agent的明确职责，不能跨角色替换阶段'};
    if(type==='ma_call')fields.agent_code={type:'string',default:S.roleInfo.understanding.code,required:true,desc:'指向已注册的专职Agent；运行开始固定其已保存子图快照'};
    if(type==='ma_intake')for(const [k,v]of Object.entries({first_reply_ms:2000,progress_after_ms:6000,budget_ms:12000}))fields[k]={type:'integer',minimum:100,maximum:60000,default:v,desc:'阈值：首响 < 进度 < 查询预算；耗尽后停止等待订单，仍完成质检与交接。不是生产SLA'};
    if(type==='ma_parallel')Object.assign(fields,{knowledge_agent:{type:'string',default:S.roleInfo.knowledge.code,required:true,desc:'知识查询职责'},order_agent:{type:'string',default:S.roleInfo.order.code,required:true,desc:'订单只读职责'},max_attempts:{type:'integer',minimum:1,maximum:3,default:2,desc:'包括第一次调用；持续失败保留成功结果转人工'},retry_backoff_ms:{type:'integer',minimum:0,maximum:2000,default:250,desc:'演示递增等待；生产应结合限流与抖动'}});
    if(type==='ma_step')Object.assign(fields,{stage:{type:'string',enum:[...new Set(Object.values(S.roleInfo).flatMap(r=>r.stages.map(s=>s[0])))],default:'language',desc:'执行该阶段处理，专职图必须保持阶段顺序'},prompt_version:{type:'string',default:S.prompts.understanding.version,desc:'与子运行一起记录'},system_prompt:{type:'string',multiline:true,default:S.prompts.understanding.system,required:true,desc:'模型接入规范；当前使用内置规则，不解释自由Prompt'},user_prompt:{type:'string',multiline:true,default:S.prompts.understanding.user,required:true,desc:'变量及输出要求'},model_output_schema:{type:'object',default:S.childOutputs.understanding,desc:'角色结果约束'}});
    if(type==='ma_step')Object.assign(fields,{tone:{type:'string',enum:['natural','concise'],default:'natural',desc:'语言润色 Agent 的 tone 阶段生效：natural 自然亲切；concise 简洁直接。其他角色不使用。'},empathy:{type:'boolean',default:true,desc:'仅在催问且回复订单进度时加一句回应，不重复道歉；在 tone 阶段生效'}});
    TYPE_META[type]={label,desc,cat:'客服协作',color:'#0f766e',enabled:true,creatable:true,lifecycle:'active',config:fields};
  }
  const styleOptionName=fieldOptionDisplayName;fieldOptionDisplayName=(k,v)=>k==='tone'?({natural:'自然亲切',concise:'简洁直接'}[v]||v):styleOptionName(k,v);
  $('#palette').innerHTML=creatableNodeTypes().map(t=>`<option value="${t}">${esc(TYPE_META[t].label)} · ${t}</option>`).join('');
  const isTeam=()=>GRAPH.nodes.some(n=>n.type==='ma_intake');
  const isChild=()=>GRAPH.nodes.some(n=>n.type==='ma_step');
  let parentCode='demo.support_orchestrator',workspaceAgent='',activeTab='canvas';
  const view=$('#view-canvas'),nav=document.createElement('nav'),workspace=document.createElement('section');
  nav.className='support-canvas-tabs';nav.dataset.workflowControl='true';nav.hidden=true;
  nav.innerHTML='<div class="support-main-tabs"><button class="btn active" data-support-tab="canvas">编排画布</button><button class="btn" data-support-tab="collaboration">协作运行</button></div><span class="hint">执行方式：内置规则</span><button class="btn sm" id="supportBack">返回多 Agent 总控</button>';
  view.querySelector('.page-h').after(nav);
  workspace.id='supportWorkspace';workspace.className='team-app support-embedded';workspace.dataset.workflowControl='true';workspace.hidden=true;view.append(workspace);
  function updateURL(job){const u=new URL(location.href);u.searchParams.set('agent',canvasAgentCode());if(activeTab==='collaboration')u.searchParams.set('workspace',activeTab);else u.searchParams.delete('workspace');if(job)u.searchParams.set('job',job);else u.searchParams.delete('job');history.replaceState(null,'',u.pathname+u.search);}
  function showTab(tab){if(tab==='collaboration'&&!isTeam())return;activeTab=tab;view.classList.toggle('support-run-mode',tab==='collaboration');workspace.hidden=tab!=='collaboration';for(const b of nav.querySelectorAll('[data-support-tab]'))b.classList.toggle('active',b.dataset.supportTab===tab);updateURL(selectedJob);if(tab==='collaboration')ui.refresh();else requestAnimationFrame(fitZoom);}
  let selectedJob=new URLSearchParams(location.search).get('job')||'';
  async function openAgent(code){if(isTeam())parentCode=canvasAgentCode();await switchAgent(code,{silent:true});go('canvas');showTab('canvas');}
  const ui=SupportTeamWorkspace.mount(workspace,{agentCode:()=>canvasAgentCode(),graph:()=>isTeam()?structuredClone(GRAPH):null,visible:()=>view.classList.contains('active')&&isTeam(),onSelect:job=>{selectedJob=job;updateURL(job);},openAgent,openCanvas:()=>showTab('canvas')});
  nav.addEventListener('click',e=>{const b=e.target.closest('[data-support-tab]');if(b)showTab(b.dataset.supportTab);});
  $('#supportBack').onclick=()=>openAgent(parentCode);
  function sync(){
    const team=isTeam(),child=isChild();nav.hidden=!(team||child);$('#supportBack').hidden=!child;nav.querySelector('[data-support-tab="collaboration"]').hidden=!team;
    if(!team){activeTab='canvas';workspace.hidden=true;view.classList.remove('support-run-mode');}
    if(team&&workspaceAgent!==canvasAgentCode()){workspaceAgent=canvasAgentCode();ui.reset();}
    for(const b of nav.querySelectorAll('[data-support-tab]'))b.classList.toggle('active',b.dataset.supportTab===activeTab);
  }
  const originalSwitch=switchAgent;switchAgent=async function(...args){await originalSwitch(...args);sync();updateURL(selectedJob);};
  const originalLoad=loadGraph;loadGraph=async function(...args){const result=await originalLoad(...args);sync();return result;};
  const banner=document.createElement('div');banner.className='workflow-guide';banner.dataset.workflowControl='true';banner.innerHTML='<b>智能客服</b><span class="hint"> · 多 Agent 总控与七个专职 Agent</span><button class="btn sm" id="openSupportTeam">进入总控</button>';$('#view-govern .page-h').after(banner);
  $('#openSupportTeam').onclick=()=>openAgent('demo.support_orchestrator');
  const help=document.createElement('div');help.className='workflow-guide';help.dataset.workflowControl='true';help.hidden=true;
  help.innerHTML='<b>测试场景</b><div class="workflow-actions"><select id="teamScenario">'+S.scenarios.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')+'</select><button class="btn" id="teamSample">填入场景</button></div><p class="hint">按当前 Agent 生成完整输入。可直接运行，无需选择模型。</p>';
  $('#runInputEditor').before(help);
  const sample=()=>S.sampleForRole(GRAPH.nodes.find(n=>n.type==='ma_step')?.config.role,$('#teamScenario').value);
  const baseInput=generatedRunInput;generatedRunInput=function(){return isTeam()||isChild()?sample():baseInput();};
  $('#teamSample').onclick=()=>{RUN_INPUT.text=JSON.stringify(sample(),null,2);$('#runInputEditor').value=RUN_INPUT.text;runInputEdited(RUN_INPUT.text);};
  const baseOpen=openRunInput;openRunInput=function(){baseOpen();help.hidden=!(isTeam()||isChild());};
  const baseRun=runGraph;runGraph=function(){if(activeTab==='collaboration'&&isTeam())return ui.submitCurrent();return baseRun();};
  const basePanel=nodeTestPanel;nodeTestPanel=function(gn){
    if(!gn.type.startsWith('ma_'))return basePanel(gn);
    if(!isChild())return '<div class="node-test" data-workflow-control="true"><p>此节点需要完整协作上下文，请从总控运行。</p><button class="btn primary" onclick="closeNodeEditor();openRunInput()">运行总控流程</button></div>';
    let saved=NODE_TESTS[gn.id];if(!saved||saved.graphId!==GRAPH.id){saved={graphId:GRAPH.id,input:JSON.stringify({input:sample()},null,2)};NODE_TESTS[gn.id]=saved;}
    return `<div class="node-test" data-workflow-control="true"><div class="sub-t">节点试运行</div><p class="hint">使用当前 Agent 输入，自动执行必要前置步骤，到当前节点停止。</p><textarea class="inp" data-json-editor="true" data-testid="node-test-state" oninput="setNodeTestInput('${gn.id}',this.value)">${esc(saved.input)}</textarea><button class="btn primary" data-testid="node-test-run" onclick="runNodeTest('${gn.id}')">运行当前节点</button>${jsonViewerMarkup(saved.result,{empty:'尚未试运行',testid:'node-test-result'})}</div>`;
  };
  const baseTest=runNodeTest;runNodeTest=async function(id){
    const node=GRAPH.nodes.find(n=>n.id===id);if(!node?.type.startsWith('ma_'))return baseTest(id);
    if(!isChild()){closeNodeEditor();openRunInput();return false;}
    try{const state=JSON.parse(NODE_TESTS[id]?.input||'{}');const result=await WorkflowAPI.request('/v1/graphs/node-test','POST',{agent:canvasAgentCode(),version:CUR.version,node,graph:GRAPH,state});NODE_TESTS[id].result=result;setState(id,'done');renderDetail();toast('节点试运行完成');return true;}
    catch(error){NODE_TESTS[id].result={ok:false,message:error.message};renderDetail();toast('节点试运行失败：'+error.message);return false;}
  };
  window.SupportTeamConsole=Object.freeze({canTestNode:isChild,show(job){go('canvas');showTab('collaboration');if(job){selectedJob=job;ui.select(job);updateURL(job);}},openAgent});
  window.SupportTeamUI=Object.freeze({renderResult(r){if(!r.team)return '';const j=r.team;return `<div class="voc-summary"><b>${j.calls.length} 次子 Agent 调用</b><p>${j.metrics.answered_intents}/${j.metrics.total_intents} 个问题已答 · ${j.metrics.quality_blocked} 项质检拦截</p><button class="btn primary" onclick="SupportTeamConsole.show('${j.id}')">查看协作运行</button></div>`;}});
  window.addEventListener('workflow-run',e=>{if(e.detail.team&&isTeam()){selectedJob=e.detail.team.id;ui.select(selectedJob);}});
  window.consoleReady.then(async ready=>{if(!ready)return;const params=entryParams,code=params.get('agent'),tab=params.get('workspace'),job=params.get('job');if(!code){sync();return;}try{await switchAgent(code,{silent:true});go('canvas');if(tab==='collaboration'&&isTeam()){showTab(tab);if(job){selectedJob=job;ui.select(job);updateURL(job);}}else fitZoom();}catch(e){toast(e.message);}}).catch(e=>toast('工作区加载失败：'+e.message));
})();
