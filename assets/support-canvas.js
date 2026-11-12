/* Support is a peer Agent using the same wizard, graph and execution inspector. */
(() => {
  'use strict';
  const S=SupportCore;
  Object.assign(FIELD_LABELS,{window_ms:'归并窗口（毫秒）',reply_mode:'回复组织方式',first_reply_ms:'首响提醒（毫秒）',progress_after_ms:'进度提醒（毫秒）',handoff_after_ms:'超时转人工（毫秒）',demo_delay_ms:'演示查询延迟（毫秒）'});
  for(const [type,[label,desc]] of Object.entries(S.definitions)){
    const fields={input_path:{type:'string',default:type==='cs_intake'?'input':'variables.support',required:true,desc:'读取本批次或上游客服上下文'},output_path:{type:'string',default:type==='cs_report'?'variables.result':'variables.support',required:true,desc:'结果写入变量，结束节点读取 variables.result'}};
    const key={cs_language:'language',cs_intents:'intents',cs_compose:'compose',cs_quality:'quality'}[type];
    if(key){const p=S.prompts[key];Object.assign(fields,{prompt_version:{type:'string',default:p.version,desc:'与图快照一起保存'},system_prompt:{type:'string',multiline:true,default:p.system,required:true,desc:'模型接入规范；当前规则演示器不解释自由Prompt'},user_prompt:{type:'string',multiline:true,default:p.user,required:true,desc:'模型适配时注入上下文；编辑只保存规范'},model_output_schema:{type:'object',default:S.modelSchemas[key],desc:'该步骤模型输出约束，与整个Agent输出不同'}});}
    if(type==='cs_merge')fields.window_ms={type:'integer',minimum:0,maximum:5000,default:800,desc:'归并当前输入快照；没有实时渠道消息接入'};
    if(type==='cs_plan')fields.reply_mode={type:'string',enum:['auto','combined','per_intent','hybrid'],default:'hybrid',desc:'auto按意图数选择；combined汇总；per_intent逐意图；hybrid明确FAQ先答'};
    if(type==='cs_wait')for(const [k,v]of Object.entries({first_reply_ms:3000,progress_after_ms:8000,handoff_after_ms:20000}))fields[k]={type:'integer',minimum:100,maximum:60000,default:v,desc:'从服务端接收开始计时，包含排队；首响 < 进度 < 转人工。最多两条等待提醒'};
    if(type==='cs_lookup')fields.demo_delay_ms={type:'integer',minimum:0,maximum:30000,default:6000,desc:'订单核对的模拟延迟；无需查询的会话可提前回复'};
    TYPE_META[type]={label,desc,cat:'客服',color:'#087e8b',enabled:true,creatable:true,lifecycle:'demo',config:fields};
  }
  const baseName=fieldOptionDisplayName;fieldOptionDisplayName=(k,v)=>k==='reply_mode'?({auto:'自动选择',combined:'汇总回答',per_intent:'逐个意图回答',hybrid:'明确先答，剩余汇总'}[v]||v):baseName(k,v);
  $('#palette').innerHTML=creatableNodeTypes().map(t=>`<option value="${t}">${esc(TYPE_META[t].label)} · ${t}</option>`).join('');
  const isSupport=()=>GRAPH.nodes.some(n=>n.type==='cs_intake');
  const sample=()=>{const x=S.cp(S.sample),suffix=Date.now().toString(36);x.batch_id='SUPPORT-'+suffix;for(const c of x.conversations)c.conversation_id+='-'+suffix;return x;};
  const baseInput=generatedRunInput;generatedRunInput=function(){return isSupport()?sample():baseInput();};
  const help=document.createElement('div');help.className='workflow-guide';help.hidden=true;help.dataset.workflowControl='true';
  help.innerHTML='<b>多条消息按意图处理 · 四语会话样例</b><p>包含中文重复催问与洗护、英文尺码与退换、西语人工请求、日语缺少订单号。每次填入新会话ID，方便反复演示。</p><div class="workflow-actions"><button class="btn sm" type="button" id="supportSample">填入新的四语样例</button><a href="./support-guide.html" target="_blank" rel="noopener">流程、Schema与Prompt说明</a><a href="./support-inbox.html" target="_blank" rel="noopener">模拟客服收件箱</a></div><p class="hint">规则与模板演示；未连接模型、真实客服渠道或订单系统。</p>';
  $('#runInputEditor').before(help);
  $('#supportSample').onclick=()=>{RUN_INPUT.text=JSON.stringify(sample(),null,2);$('#runInputEditor').value=RUN_INPUT.text;runInputEdited(RUN_INPUT.text);};
  const baseOpen=openRunInput;openRunInput=function(){baseOpen();help.hidden=!isSupport();};
  const state={processing:'处理中',answered:'已提供答复',needs_clarification:'等待客户补充',handoff_pending:'待人工接管',no_new_messages:'无新消息',cancelled:'已取消'};
  const kind={acknowledgement:'等待安抚',progress:'进度提醒',quick_answer:'快捷答案',answer:'完整答复',clarification:'澄清问题',handoff:'人工跟进提示',human_reply:'人工答复'};
  const ms=v=>v===null||v===undefined?'尚无':(v/1000).toFixed(1)+' 秒';
  window.SupportUI=Object.freeze({renderResult(run){
    if(!run.support)return '';const j=run.support;
    return `<div class="voc-summary"><b>${j.conversations.length} 个独立会话 · 实时模拟消息</b><p class="hint">首响包含安抚；实质回答仅统计快捷答案与完整答复。运行完成不等于客户问题已解决。</p>${j.conversations.map(c=>`<details class="voc-review" open><summary>${esc(c.conversation_id)} · ${esc(c.language.toUpperCase())} · ${esc(state[c.state]||c.state)}</summary><p>${c.intents.length} 个意图 · 首响 ${ms(c.metrics.first_response_ms)} · 首个实质回答 ${ms(c.metrics.first_substantive_ms)}</p>${c.replies.map(r=>`<blockquote><b>${esc(kind[r.kind])}</b> · ${new Date(r.emitted_at).toLocaleTimeString()}<p style="white-space:pre-wrap">${esc(r.text)}</p></blockquote>`).join('')||'<p>等待识别/核对中，长等待将自动发出提醒。</p>'}</details>`).join('')}<a class="btn primary" href="./support-inbox.html?job=${encodeURIComponent(j.id)}">查看会话与处理人工接管</a>${run.output?.schema_version==='support-v1'?`<details><summary>完整输出 JSON</summary><pre>${esc(JSON.stringify(run.output,null,2))}</pre></details>`:''}</div>`;
  }});
})();
