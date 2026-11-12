'use strict';
importScripts('voc-core.js?v=20261112-1','voc-v2.js?v=20261112-1','support-core.js?v=20261112-1','support-team-core.js?v=20261112-1','workflow-core.js?v=20261112-1');
const setImmediate=fn=>setTimeout(fn,0);
const createSupportService=(()=>{
const S=globalThis.SupportCore,C=globalThis.WorkflowCore,copy=S.cp;
function createSupportService({db,save,fail,id,stamp,emit}) {
  db.supportJobs ||= [];db.supportTickets ||= [];
  const active=t=>['queued','running'].includes(t.status),taskFor=j=>db.tasks.find(t=>t.id===j.run_id),get=(owner,key)=>{const j=db.supportJobs.find(j=>j.owner===owner&&j.id===key);if(!j)fail('客服批次不存在',404);return j;};
  const fingerprint=m=>JSON.stringify({role:m.role,text:m.text,order_ref:m.order_ref||'',attachments:m.attachments||[]});
  function checkRequest(owner,input,agentCode){
    try{S.preflight(input);}catch(e){fail(e.message,422);}
    const old=db.supportJobs.find(j=>j.owner===owner&&j.input.batch_id===input.batch_id);
    if(old){if(taskFor(old)?.agentCode!==agentCode)fail('批次ID已用于其他Agent',409);if(JSON.stringify(old.input)!==JSON.stringify(input))fail('同一批次ID内容不同，请使用新的batch_id',409);return taskFor(old);}
    for(const c of input.conversations){
      if(db.supportJobs.some(j=>j.owner===owner&&active(taskFor(j)||{})&&j.conversations.some(x=>x.conversation_id===c.conversation_id)))fail('会话 '+c.conversation_id+' 正在处理，请等待完成后提交后续消息',409);
      if(db.supportTickets.some(t=>t.owner===owner&&t.conversation_id===c.conversation_id&&t.status==='pending'))fail('该会话已转人工，请先在客服收件箱处理人工事项',409);
      for(const m of c.messages)for(const j of db.supportJobs.filter(j=>j.owner===owner)){const previous=j.input.conversations.find(x=>x.conversation_id===c.conversation_id)?.messages.find(x=>x.message_id===m.message_id);if(previous&&fingerprint(previous)!==fingerprint(m))fail('历史消息ID内容冲突：'+m.message_id,409);}
    }
    return null;
  }
  function prepare(t){
    if(t.supportId)return get(t.owner,t.supportId);
    const original=t.parentId&&db.tasks.find(x=>x.id===t.parentId&&x.owner===t.owner);
    if(original?.supportId){const j=get(t.owner,original.supportId);j.run_id=t.id;t.supportId=j.id;j.status='processing';for(const c of j.conversations)c.completed=c.intents.length>0&&c.intents.every(i=>i.status!=='pending');save();return j;}
    const config=t.graph.nodes.find(n=>n.type==='cs_wait')?.config||{};
    const j={id:id('support'),owner:t.owner,run_id:t.id,input:copy(t.input),created_at:stamp(),received_at:Date.now(),config:copy(config),status:'processing',conversations:[]};
    for(const c of j.input.conversations){
      const seen=new Set(),done=new Set(db.supportJobs.filter(x=>x.owner===t.owner&&x.status==='completed').flatMap(x=>x.conversations.filter(y=>y.conversation_id===c.conversation_id).flatMap(y=>y.pending.map(m=>m.message_id))));
      const pending=[],ignored=[];
      for(const m of c.messages){if(m.role!=='customer'||m.answered||seen.has(m.message_id)||done.has(m.message_id)){ignored.push(m.message_id);continue;}seen.add(m.message_id);if(!m.text.trim()&&!m.attachments?.length){ignored.push(m.message_id);continue;}pending.push(copy(m));}
      const x={...copy(c),pending,ignored_message_ids:[...new Set(ignored)],intents:[],replies:[],reply_mode:'hybrid',timed_out:false,completed:!pending.length,handoff_ticket_id:'',state:pending.length?'processing':'no_new_messages'};Object.assign(x,S.language(x));j.conversations.push(x);
    }
    t.supportId=j.id;db.supportJobs.push(j);save();return j;
  }
  function post(t,j,c,key,kind,text,intents=[],sources=[]){
    c.sent_keys ||= {};
    const existing=c.replies.find(r=>r.reply_id===c.sent_keys[key]);
    const replyId=id('cs_reply');if(existing)return existing;
    if(!active(t)&&kind!=='human_reply')return null;
    const r={reply_id:replyId,kind,language:c.language,text,intent_ids:intents.map(i=>i.intent_id),source_message_ids:[...new Set(intents.length?intents.flatMap(i=>i.message_ids):c.pending.map(m=>m.message_id))],source_ids:[...new Set(sources)],emitted_at:stamp(),delivery:'simulated_delivered'};
    S.check(r,S.replySchema);c.sent_keys[key]=replyId;c.replies.push(r);emit(t,'support_reply',{conversation_id:c.conversation_id,reply:r});save();return r;
  }
  function ticket(j,c,reason){
    let x=db.supportTickets.find(x=>x.id===c.handoff_ticket_id);
    const pending=c.intents.filter(i=>i.status==='handoff_pending'||i.status==='pending');
    if(x){if(x.status==='pending'){x.intents=copy(pending);x.already_answered=copy(c.replies.filter(r=>['quick_answer','answer'].includes(r.kind)));x.reasons=[...new Set([...x.reasons,reason])];}return x;}
    x={id:id('cs_ticket'),owner:j.owner,job_id:j.id,run_id:j.run_id,conversation_id:c.conversation_id,language:c.language,status:'pending',revision:1,priority:c.urgent||c.timed_out?'high':'normal',reasons:[reason],intents:copy(pending),messages:copy(c.pending),already_answered:copy(c.replies.filter(r=>['quick_answer','answer'].includes(r.kind))),created_at:stamp(),human_reply:null};c.handoff_ticket_id=x.id;db.supportTickets.push(x);save();return x;
  }
  function tick(){
    for(const j of db.supportJobs){const t=taskFor(j);if(!t||!active(t))continue;const elapsed=Date.now()-j.received_at;
      for(const c of j.conversations){if(c.completed||c.timed_out||!c.pending.length)continue;
        if(elapsed>=j.config.handoff_after_ms){c.timed_out=true;c.state='handoff_pending';for(const i of c.intents)if(i.status!=='answered')i.status='handoff_pending';ticket(j,c,'wait_timeout');post(t,j,c,'timeout','handoff',S.say('timeout',c.language),c.intents.filter(i=>i.status!=='answered'));continue;}
        if(elapsed>=j.config.first_reply_ms&&!c.replies.length)post(t,j,c,'ack','acknowledgement',S.say('ack',c.language));
        if(elapsed>=j.config.progress_after_ms&&!c.replies.some(r=>['progress','handoff'].includes(r.kind)))post(t,j,c,'progress','progress',S.say('progress',c.language));
      }
    }
  }
  const timer=setInterval(()=>{try{tick();}catch{}},200);
  async function wait(ms,t,j,targets=j.conversations){const until=Date.now()+ms;while(Date.now()<until&&active(t)&&targets.some(c=>!c.timed_out&&!c.completed)){tick();await new Promise(r=>setTimeout(r,Math.min(100,until-Date.now())));}return active(t);}
  function snapshot(j){return {job_id:j.id,conversations:j.conversations.map(c=>({conversation_id:c.conversation_id,language:c.language,reply_mode:c.reply_mode,intents:copy(c.intents),replies:copy(c.replies),state:c.state})),has_fast:!!j.has_fast,quality_passed:j.quality_passed!==false,needs_handoff:j.conversations.some(c=>c.handoff_ticket_id||c.intents.some(i=>i.status==='handoff_pending'))};}
  function metrics(j,c){const first=c.replies[0],answer=c.replies.find(r=>['answer','quick_answer'].includes(r.kind));return {first_response_ms:first?Math.max(0,Date.parse(first.emitted_at)-j.received_at):null,first_substantive_ms:answer?Math.max(0,Date.parse(answer.emitted_at)-j.received_at):null,wait_notifications:c.replies.filter(r=>['acknowledgement','progress'].includes(r.kind)).length,answered_intents:c.intents.filter(i=>i.status==='answered').length,total_intents:c.intents.length};}
  function report(j,t){const out={schema_version:'support-v1',batch_id:j.input.batch_id,conversations:j.conversations.map(c=>({conversation_id:c.conversation_id,language:c.language,language_reason:c.language_reason,reply_mode:c.reply_mode,state:c.state,intents:copy(c.intents),replies:copy(c.replies),ignored_message_ids:c.ignored_message_ids,handoff_ticket_id:c.handoff_ticket_id,metrics:metrics(j,c)})),provenance:{executor:'rules-demo',model_connected:false,channel_connected:false,knowledge_version:'support-demo-v1',prompt_versions:[...new Set(t.graph.nodes.map(n=>n.config.prompt_version).filter(Boolean))]},limitations:['有限中英西日规则识别，未接通用翻译或LLM；Prompt只作可编辑接入规范','所有回复仅投递模拟会话；订单事实和FAQ是演示资料，不代表真实品牌政策','窗口归并输入批次，不是实时渠道消息流；人工待办未接企业坐席系统','首响含安抚，不等于实质答复或问题解决；阈值待真实业务验证']};S.check(out,S.outputSchema);return out;}
  function result(j){return {id:j.id,run_id:j.run_id,batch_id:j.input.batch_id,status:taskFor(j)?.status==='failed'?'failed':j.status,received_at:j.received_at,conversations:j.conversations.map(c=>({...copy(c),metrics:metrics(j,c)}))};}
  async function execute(t,type,data,config){
    const j=prepare(t);
    if(type!=='cs_intake'&&data?.job_id!==j.id)throw Error('客服上下文必须来自本次接入节点');
    if(type==='cs_intake')S.preflight(t.input);
    if(type==='cs_language')for(const c of j.conversations)Object.assign(c,S.language(c));
    if(type==='cs_merge')await wait(config.window_ms,t,j);
    if(type==='cs_intents')for(const c of j.conversations){const previous=c.intents;S.identify(c);for(const i of c.intents){const old=previous.find(x=>x.intent_id===i.intent_id);if(old)Object.assign(i,{status:old.status,source_ids:old.source_ids});}}
    if(type==='cs_plan'){
      for(const c of j.conversations){if(c.intents.length>40)throw Error('单会话归并问题超过40个，请拆分批次');c.reply_mode=config.reply_mode==='auto'?(c.intents.length>2?'combined':'hybrid'):config.reply_mode;}
      j.has_fast=j.conversations.some(c=>!c.timed_out&&c.intents.some(i=>i.status==='pending'&&(c.human_requested||c.unsupported||!['shipping','returns','size','care'].includes(i.code)||i.code==='shipping'&&!i.order_ref||c.reply_mode==='hybrid'&&['returns','size','care'].includes(i.code))));
    }
    if(type==='cs_wait')tick();
    if(type==='cs_quick')for(const c of j.conversations){
      if(c.timed_out)continue;
      const ready=c.intents.filter(i=>i.status==='pending'&&(c.human_requested||c.unsupported||!['shipping','returns','size','care'].includes(i.code)||i.code==='shipping'&&!i.order_ref||c.reply_mode==='hybrid'&&['returns','size','care'].includes(i.code)));
      const groups=new Map();
      for(const i of ready){const a=S.resolveIntent(c,i,[]);i.status=a.status;i.source_ids=a.source_ids;const key=c.reply_mode==='per_intent'?i.intent_id:a.kind;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({i,a});}
      if(ready.some(i=>i.status==='handoff_pending'))ticket(j,c,c.unsupported?'unsupported_language':c.human_requested?'customer_request':'needs_verification');
      for(const [key,rows] of groups)post(t,j,c,'early-'+key,rows[0].a.kind==='answer'?'quick_answer':rows[0].a.kind,[...new Set(rows.map(x=>x.a.text))].join('\n\n'),rows.map(x=>x.i),rows.flatMap(x=>x.a.source_ids));
      if(c.intents.length&&c.intents.every(i=>i.status!=='pending')){c.completed=true;c.state=c.intents.some(i=>i.status==='handoff_pending')?'handoff_pending':c.intents.some(i=>i.status==='needs_clarification')?'needs_clarification':'answered';}
    }
    if(type==='cs_lookup'){
      // Only unresolved order checks simulate latency; quick FAQ and human requests need no tool wait.
      const slow=j.conversations.filter(c=>!c.timed_out&&!c.human_requested&&!c.unsupported&&c.intents.some(i=>i.status==='pending'&&i.code==='shipping'&&i.order_ref));
      if(slow.length)await wait(config.demo_delay_ms,t,j,slow);
      for(const c of j.conversations){c.answers=[];for(const i of c.intents){if(i.status!=='pending')continue;const value=c.timed_out?{kind:'handoff',text:S.say('timeout',c.language),status:'handoff_pending',source_ids:[]}:S.resolveIntent(c,i,j.input.business_context?.orders||[]);c.answers.push({intent_id:i.intent_id,...value});}}
    }
    if(type==='cs_compose')for(const c of j.conversations){c.drafts=[];const grouped=new Map();for(const answer of c.answers||[]){const key=c.reply_mode==='per_intent'?answer.intent_id:answer.kind;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(answer);}for(const [key,answers]of grouped){const unique=[...new Set(answers.map(a=>a.text))];c.drafts.push({key,kind:answers[0].kind,language:c.language,text:unique.join('\n\n'),intent_ids:answers.map(a=>a.intent_id),source_ids:[...new Set(answers.flatMap(a=>a.source_ids))]});}}
    if(type==='cs_quality'){
      j.quality_passed=true;
      for(const c of j.conversations){const needed=c.intents.filter(i=>i.status==='pending').map(i=>i.intent_id),covered=(c.drafts||[]).flatMap(d=>d.intent_ids);c.quality_passed=needed.every(id=>covered.filter(x=>x===id).length===1)&&(c.drafts||[]).every(d=>d.language===c.language&&d.text&&d.intent_ids.every(id=>needed.includes(id))&&(d.kind!=='answer'||d.source_ids.length));if(!c.quality_passed)j.quality_passed=false;}
    }
    if(type==='cs_fallback')for(const c of j.conversations)if(!c.quality_passed){const pending=c.intents.filter(i=>i.status==='pending');c.answers=pending.map(i=>({intent_id:i.intent_id,kind:'handoff',text:S.say('handoff',c.language),status:'handoff_pending',source_ids:[]}));c.drafts=[{key:'safe_fallback',kind:'handoff',language:c.language,text:S.say('handoff',c.language),intent_ids:pending.map(i=>i.intent_id),source_ids:[]}];}
    if(type==='cs_dispatch')for(const c of j.conversations){if(!active(t))break;if(!c.timed_out&&c.quality_passed===false&&(c.drafts||[]).some(d=>d.kind!=='handoff'))throw Error('回复未通过质量校验');if(c.timed_out){for(const i of c.intents)if(i.status!=='answered')i.status='handoff_pending';}else{for(const a of c.answers||[]){const intent=c.intents.find(i=>i.intent_id===a.intent_id);Object.assign(intent,{status:a.status,source_ids:a.source_ids});}if(c.intents.some(i=>i.status==='handoff_pending'))ticket(j,c,c.unsupported?'unsupported_language':c.human_requested?'customer_request':'needs_verification');for(const d of c.drafts||[])post(t,j,c,'final-'+d.key,d.kind,d.text,c.intents.filter(i=>d.intent_ids.includes(i.intent_id)),d.source_ids);}
      c.completed=true;c.state=c.handoff_ticket_id||c.intents.some(i=>i.status==='handoff_pending')?'handoff_pending':c.intents.some(i=>i.status==='needs_clarification')?'needs_clarification':c.intents.length?'answered':'no_new_messages';
    }
    if(type==='cs_handoff')for(const c of j.conversations)if(c.state==='handoff_pending')ticket(j,c,c.timed_out?'wait_timeout':'unresolved_intents');
    if(type==='cs_report'){j.status='completed';save();return report(j,t);}
    save();return snapshot(j);
  }
  function cancel(t){if(!t.supportId)return;const j=get(t.owner,t.supportId);j.status='cancelled';for(const c of j.conversations){c.completed=true;c.state=c.handoff_ticket_id?'handoff_pending':c.state==='processing'?'cancelled':c.state;}save();}
  function view(t){return t.supportId?result(get(t.owner,t.supportId)):null;}
  async function route(path,method,owner,b){
    const parts=path.split('/').filter(Boolean);
    if(path==='/v1/support/jobs'&&method==='GET')return {items:db.supportJobs.filter(j=>j.owner===owner).slice().reverse().map(result)};
    if(path==='/v1/support/tickets'&&method==='GET')return {items:db.supportTickets.filter(t=>t.owner===owner).map(({owner,...t})=>copy(t))};
    if(parts[2]==='jobs'&&parts[3]&&method==='GET')return result(get(owner,parts[3]));
    if(parts[2]==='tickets'&&parts[3]&&parts[4]==='resolve'&&method==='POST'){
      const x=db.supportTickets.find(x=>x.owner===owner&&x.id===parts[3]);if(!x)fail('人工单不存在',404);
      if(x.status==='resolved')fail('该人工单已完成，请刷新',409);
      if(b.expected_revision!==x.revision)fail('人工单版本已变化',409);
      if(typeof b.text!=='string'||!b.text.trim()||b.text.length>3000)fail('请填写1–3000字人工回复',422);
      const j=get(owner,x.job_id),c=j.conversations.find(c=>c.conversation_id===x.conversation_id),t=taskFor(j);
      if(active(t))fail('自动编排尚未结束，请等待后再处理人工单',409);
      if(b.language!==c.language)fail('请使用当前会话语言；切换语言需另行核对',422);
      const reply=post(t,j,c,'human-'+x.id,'human_reply',b.text.trim(),c.intents.filter(i=>i.status==='handoff_pending'));
      x.status='resolved';x.revision++;x.resolved_at=stamp();x.human_reply=reply;for(const i of c.intents)if(i.status==='handoff_pending')i.status='answered';c.state=c.intents.some(i=>i.status==='needs_clarification')?'needs_clarification':'answered';save();return {ticket_id:x.id,status:x.status,reply};
    }
    fail('客服接口不存在',404);
  }
  return {checkRequest,prepare,execute,cancel,view,route};
}

return createSupportService;
})();
const createSupportTeamService=(()=>{
const S=globalThis.SupportTeam,C=globalThis.WorkflowCore,copy=S.copy;
function createSupportTeamService({db,save,fail,id,stamp,emit,makeTask}){
  db.teamJobs||=[];db.teamCalls||=[];db.teamTickets||=[];
  const active=t=>t&&['queued','running'].includes(t.status);
  const jobFor=(owner,key)=>{const j=db.teamJobs.find(j=>j.owner===owner&&j.id===key);if(!j)fail('客服协作记录不存在',404);return j;};
  const taskFor=j=>db.tasks.find(t=>t.id===j.run_id);
  const stopped=(t,j)=>!active(t)||(j&&Date.now()-j.cycle_at>=j.config.budget_ms);
  function checkRequest(owner,input,agentCode){
    try{S.validate(input);}catch(e){fail(e.message,422);}
    const old=db.teamJobs.find(j=>j.owner===owner&&j.input.request_id===input.request_id);
    if(old){if(old.agent_code!==agentCode||JSON.stringify(old.input)!==JSON.stringify(input))fail('同一请求ID内容不同，请使用新request_id',409);return taskFor(old);}
    const cid=input.conversation.conversation_id;
    if(db.teamJobs.some(j=>j.owner===owner&&j.input.conversation.conversation_id===cid&&active(taskFor(j))))fail('此会话正在处理，请等待完成或取消',409);
    if(db.teamTickets.some(x=>x.owner===owner&&x.conversation_id===cid&&x.status!=='resolved'))fail('会话已转人工，请在协作台领取和处理',409);
    for(const j of db.teamJobs.filter(j=>j.owner===owner&&j.input.conversation.conversation_id===cid)){
      if(j.input.conversation.customer_id!==input.conversation.customer_id)fail('同一会话不能更换客户身份',409);
      for(const m of input.conversation.messages){const old=j.input.conversation.messages.find(x=>x.message_id===m.message_id);if(old&&JSON.stringify(old)!==JSON.stringify(m))fail('历史消息ID内容冲突',409);}
    }
    return null;
  }
  function bindings(t){
    if(t.teamBindings)return;
    const roles={};for(const n of t.graph.nodes){const c=n.config||{};if(n.type==='ma_call')roles[c.role]=c.agent_code;if(n.type==='ma_parallel'){roles.knowledge=c.knowledge_agent;roles.order=c.order_agent;}}
    t.teamBindings={};
    for(const [role,code]of Object.entries(roles)){
      const a=db.agents.find(a=>a.owner===t.owner&&a.code===code),v=a?.versions.at(-1),g=db.graphs.find(g=>g.owner===t.owner&&g.id===v?.graph_id)?.versions.at(-1);
      if(!a||!v||!g||g.nodes.find(n=>n.type==='ma_step')?.config.role!==role)fail('子Agent绑定无效：'+role,422);
      const validation=C.validateGraph(g);if(!validation.ok)fail('子画布无效：'+validation.errors.join('；'),422);
      t.teamBindings[role]={code,version:v.version,graph:copy(g),input_schema:copy(v.input_schema),output_schema:copy(v.output_schema)};
    }
  }
  function prepare(t){
    if(t.teamId)return jobFor(t.owner,t.teamId);
    const old=t.parentId&&db.tasks.find(x=>x.owner===t.owner&&x.id===t.parentId);
    if(old?.teamId){const j=jobFor(t.owner,old.teamId);t.teamId=j.id;t.teamBindings=copy(old.teamBindings);j.run_id=t.id;j.status='processing';j.cycle_at=Date.now();j.cancelled=false;save();return j;}
    bindings(t);
    const input=copy(t.input),seen=new Set();
    for(const old of db.teamJobs.filter(j=>j.owner===t.owner&&j.input.conversation.conversation_id===input.conversation.conversation_id))for(const m of old.input.conversation.messages){const intents=old.intents.filter(i=>i.message_ids.includes(m.message_id));if(intents.length&&intents.every(i=>i.status==='answered'))seen.add(m.message_id);}
    const pending=input.conversation.messages.filter(m=>!seen.has(m.message_id));
    const j={id:id('team'),owner:t.owner,agent_code:t.agentCode,run_id:t.id,input,conversation:{...copy(input.conversation),messages:pending},received_at:Date.now(),cycle_at:Date.now(),config:copy(t.graph.nodes.find(n=>n.type==='ma_intake').config),status:'processing',state:'processing',language:S.language(input.conversation).language,intents:[],facts:[],drafts:[],replies:[],call_ids:[],sent_keys:[],quality_history:[],repairs:0,reused_calls:0,ticket_id:'',plan:[],audit:[],ignored_message_ids:[...seen],simulation:copy(input.simulation)};
    t.teamId=j.id;db.teamJobs.push(j);save();return j;
  }
  function post(t,j,key,kind,text,intents=[],source_ids=[]){
    if(j.sent_keys.includes(key)||!text)return;
    if(!active(t)&&kind!=='human_reply')return;
    if(j.cancelled&&kind!=='human_reply')return;
    const r={reply_id:id('team_reply'),kind,language:j.language,text,intent_ids:intents.map(i=>i.intent_id),source_ids:[...new Set(source_ids)],emitted_at:stamp(),delivery:'simulated_delivered'};
    const errors=C.validateValue(r,S.replySchema);if(errors.length)throw Error(errors.join('；'));
    j.replies.push(r);j.sent_keys.push(key);emit(t,'team_reply',{job_id:j.id,reply:r});save();return r;
  }
  function tick(){for(const j of db.teamJobs){const t=taskFor(j);if(!active(t)||j.cancelled||j.status!=='processing')continue;const age=Date.now()-j.received_at;if(age>=j.config.first_reply_ms&&!j.replies.length)post(t,j,'ack','acknowledgement',S.notice('ack',j.language));if(age>=j.config.progress_after_ms&&!j.replies.some(r=>r.kind==='progress')&&!j.intents.every(i=>i.status==='answered')&&j.intents.length)post(t,j,'progress','progress',S.notice('progress',j.language));}}
  const timer=setInterval(()=>{try{tick();}catch{}},100);
  async function delay(ms,t,j){const until=Date.now()+ms;while(Date.now()<until&&!stopped(t,j)){tick();await new Promise(r=>setTimeout(r,Math.min(60,Math.max(0,until-Date.now()))));}}
  function envelope(j,intents=j.intents,facts=j.facts,drafts=j.drafts,clean=false){return {request_id:j.input.request_id,conversation:copy({...j.conversation,locale:j.language}),simulation:{...copy(j.simulation),...(clean?{draft_fault:'none'}:{})},intents:copy(intents),facts:copy(facts),drafts:copy(drafts)};}
  async function step(t,j,role,stage,data,record,settings={}){
    let x=copy(data);
    if(role==='order'&&stage==='lookup'&&x.authorized?.some(a=>a.allowed)){
      const max=settings.max_attempts||2,backoff=settings.retry_backoff_ms??250;
      let error='';
      for(let attempt=1;attempt<=max;attempt++){
        if(stopped(t,j)){error='budget_exhausted';break;}
        if(record){record.attempts=attempt;record.attempt_log.push({attempt,at:stamp(),state:'querying'});save();}
        await delay(x.simulation.order_delay_ms,t,j);
        if(!active(t))throw Error('RUN_CANCELLED');
        error=stopped(t,j)?'budget_exhausted':x.simulation.order_fault==='timeout'?'order_timeout':x.simulation.order_fault==='transient'&&attempt===1?'temporary_failure':'';
        if(record){record.attempt_log.at(-1).state=error||'succeeded';emit(t,'team_attempt',{child_run_id:record.id,attempt,result:error||'succeeded'});}
        if(!error||error==='budget_exhausted')break;
        if(attempt<max)await delay(backoff*attempt,t,j);
      }
      x.tool_error=error;
    }
    if(!active(t))throw Error('RUN_CANCELLED');
    return S.runStep(role,stage,x,settings);
  }
  async function invoke(t,j,role,input,settings={}){
    const binding=t.teamBindings?.[role];if(!binding)throw Error('没有固定子Agent快照：'+role);
    const errors=C.validateValue(input,binding.input_schema);if(errors.length)throw Error('子Agent输入不符合契约：'+errors.join('；'));
    const cacheKey=role+':'+(input.intents||[]).map(i=>i.intent_id).sort().join('|');
    const cached=['knowledge','order'].includes(role)&&db.teamCalls.find(c=>c.job_id===j.id&&c.cache_key===cacheKey&&c.status==='succeeded'&&c.output?.facts?.length&&c.output.facts.every(f=>f.status==='verified'));
    if(cached){j.reused_calls++;j.audit.push({at:stamp(),action:'reuse_checkpoint',child_run_id:cached.id,role});save();return copy(cached.output);}
    const call={id:id('child'),owner:t.owner,job_id:j.id,parent_run_id:t.id,parent_node:t.currentNode,cache_key:cacheKey,role,agent_code:binding.code,agent_version:binding.version,graph_id:binding.graph.id,graph_version:binding.graph.version,status:'running',started_at:stamp(),ended_at:null,attempts:0,attempt_log:[],input:copy(input),output:null,steps:[],error:null};
    db.teamCalls.push(call);j.call_ids.push(call.id);emit(t,'team_child_started',{child_run_id:call.id,agent:binding.code,role,graph_version:binding.graph.version});
    try{
      const state={input:copy(input),variables:{}};let result;
      let current=binding.graph.entry;
      while(current){
        // Yield between deterministic stages so waiting reminders and cancellation can run.
        await new Promise(resolve=>setImmediate(resolve));tick();
        if(!active(t))throw Error('RUN_CANCELLED');
        const node=binding.graph.nodes.find(n=>n.id===current),started=Date.now();
        if(node.type==='start')state.variables=node.config.copy_input?copy(input):{};
        if(node.type==='ma_step')C.setPath(state,node.config.output_path,await step(t,j,role,node.config.stage,C.getPath(state,node.config.input_path),call,{...settings,...node.config}));
        if(node.type==='ma_child_output'){const value=C.getPath(state,node.config.input_path);C.setPath(state,node.config.output_path,value.result);}
        if(node.type==='end'){result=copy(C.getPath(state,node.config.source_path));const errors=C.validateValue(result,binding.output_schema,'child_output');if(errors.length)throw Error(errors.join('；'));}
        call.steps.push({node_id:node.id,label:node.display_name,prompt_version:node.config.prompt_version||null,status:'succeeded',latency_ms:Date.now()-started,output:node.type==='end'?copy(result):node.type==='ma_step'||node.type==='ma_child_output'?copy(C.getPath(state,node.config.output_path)):null});save();
        if(node.type==='end')break;
        current=binding.graph.edges.find(e=>e.from===current)?.to;
      }
      call.output=result;call.status=result?.facts?.some(f=>f.status!=='verified')?'needs_attention':'succeeded';call.ended_at=stamp();
      emit(t,'team_child_finished',{child_run_id:call.id,role,status:call.status});return copy(result);
    }catch(e){call.status=!active(t)?'cancelled':'failed';call.error=e.message;call.ended_at=stamp();emit(t,'team_child_finished',{child_run_id:call.id,role,status:call.status,error:e.message});throw e;}
  }
  function mergeFacts(j,facts){for(const f of facts){const at=j.facts.findIndex(x=>x.intent_id===f.intent_id);if(at<0)j.facts.push(copy(f));else j.facts[at]=copy(f);}}
  function pending(j){return j.intents.filter(i=>i.status!=='answered');}
  function quality(j,result){j.quality_history.push({at:stamp(),passed:result.passed,checks:copy(result.checks)});save();}
  async function checkedDraft(t,j,intents,facts,clean=false){
    const writer=await invoke(t,j,'writer',envelope(j,intents,facts,[],clean));
    const styled=t.teamBindings.style?await invoke(t,j,'style',envelope(j,intents,facts,writer.drafts,clean)):{drafts:writer.drafts};
    const checked=await invoke(t,j,'quality',envelope(j,intents,facts,styled.drafts,clean));quality(j,checked);
    return {drafts:styled.drafts,passed:checked.passed,checks:checked.checks};
  }
  function sendDrafts(t,j,drafts,quick=false){
    // Enforce the deterministic contract immediately before any reply, even after graph edits.
    const intents=j.intents.filter(i=>drafts.some(d=>d.intent_id===i.intent_id)&&i.status!=='answered');
    const facts=j.facts.filter(f=>intents.some(i=>i.intent_id===f.intent_id));
    const input=envelope(j,intents,facts,drafts),first=S.runStep('quality','claims',input),check=S.runStep('quality','verdict',first).result;
    if(!check.passed)throw Error('投递门禁拒绝：草稿与核实事实不一致');
    const groups=new Map();for(const d of drafts){if(!intents.some(i=>i.intent_id===d.intent_id))continue;const kind=quick&&d.kind==='answer'?'quick_answer':d.kind,key=j.input.reply_mode==='per_intent'?d.intent_id:kind;if(!groups.has(key))groups.set(key,{kind,items:[]});groups.get(key).items.push(d);}
    for(const g of groups.values()){
      const ids=g.items.map(d=>d.intent_id),target=intents.filter(i=>ids.includes(i.intent_id));
      const key=JSON.stringify([g.kind,...ids.slice().sort()]);
      if(!active(t))break;
      post(t,j,key,g.kind,[...new Set(g.items.map(d=>d.text))].join('\n\n'),target,g.items.flatMap(d=>d.source_ids));
      for(const i of target){const f=facts.find(f=>f.intent_id===i.intent_id);i.status=f.status==='verified'?'answered':f.status;i.source_ids=copy(f.source_ids);}
    }save();
  }
  function openTicket(t,j,result){
    if(!result.required){const existing=db.teamTickets.find(x=>x.id===j.ticket_id);if(existing&&existing.status!=='resolved'){existing.status='resolved';existing.revision++;existing.resolved_at=stamp();existing.resolution='recovered';}return;}
    let x=db.teamTickets.find(x=>x.id===j.ticket_id);
    if(!x){x={id:id('team_ticket'),owner:j.owner,job_id:j.id,conversation_id:j.input.conversation.conversation_id,status:'pending',assigned_to:'',revision:1,created_at:stamp()};db.teamTickets.push(x);j.ticket_id=x.id;}
    x.unresolved_intent_ids=result.unresolved_intent_ids;x.reason_codes=result.reason_codes;x.resume_point=result.resume_point;x.summary=result.summary;x.messages=copy(j.input.conversation.messages);x.already_answered=copy(j.replies.filter(r=>['answer','quick_answer','human_reply'].includes(r.kind)));x.priority=result.reason_codes.includes('budget_exhausted')?'high':'normal';save();
  }
  function metrics(j){const first=j.replies[0],answer=j.replies.find(r=>['answer','quick_answer','human_reply'].includes(r.kind));return {first_response_ms:first?Math.max(0,Date.parse(first.emitted_at)-j.received_at):null,first_substantive_ms:answer?Math.max(0,Date.parse(answer.emitted_at)-j.received_at):null,answered_intents:j.intents.filter(i=>i.status==='answered').length,total_intents:j.intents.length,quality_checks:j.quality_history.reduce((n,q)=>n+q.checks.length,0),quality_blocked:j.quality_history.reduce((n,q)=>n+q.checks.filter(c=>!c.passed).length,0),repairs:j.repairs,child_calls:j.call_ids.length,reused_calls:j.reused_calls,model_cost_usd:null};}
  function report(j){const x={schema_version:'support-team-v7',request_id:j.input.request_id,conversation_id:j.input.conversation.conversation_id,state:j.state,language:j.language,intents:copy(j.intents),facts:copy(j.facts),replies:copy(j.replies),child_run_ids:copy(j.call_ids),ticket_id:j.ticket_id,metrics:metrics(j),provenance:{model_connected:false,channel_connected:false,executor:'deterministic-multi-agent-demo',rules_version:'7.3'}};const errors=C.validateValue(x,S.outputSchema);if(errors.length)throw Error(errors.join('；'));return x;}
  function snapshot(j){return {job_id:j.id,quality_passed:j.quality_passed!==false,intents:copy(j.intents),facts:copy(j.facts),state:j.state,child_run_ids:copy(j.call_ids)};}
  async function execute(t,type,data,config){
    if(type==='ma_step')return step(t,null,config.role,config.stage,data,null,config);
    if(type==='ma_child_output')return data.result;
    const j=prepare(t);if(type!=='ma_intake'&&data?.job_id!==j.id)throw Error('协作上下文必须来自当前接入节点');
    tick();
    if(type==='ma_intake')S.validate(t.input);
    if(type==='ma_call'&&config.role==='understanding'){
      if(!j.intents.length){const result=await invoke(t,j,'understanding',envelope(j));j.language=result.language;j.unsupported=result.unsupported;j.human_requested=result.human_requested;j.intents=result.intents;}
    }
    if(type==='ma_plan'){
      j.plan=j.intents.map(i=>({intent_id:i.intent_id,owner:['returns','care','size'].includes(i.code)?'knowledge':i.code==='shipping'?'order':'handoff',status:i.status,risk:['refund','cancel','address','damage','discount'].includes(i.code)?'human_approval':'read_only',depends_on:['understanding']}));
      for(const i of pending(j)){
        if(j.unsupported||j.human_requested||!['returns','care','size','shipping'].includes(i.code)){
          const status=i.code==='unknown'&&!j.unsupported&&!j.human_requested&&!j.conversation.messages.some(m=>m.attachment_url)?'needs_clarification':'handoff_pending';
          const f=S.emptyFact(i,j.language,status,j.unsupported?'unsupported_language':j.human_requested?'customer_requested_human':i.code==='unknown'?'unknown_or_attachment':'action_requires_human');f.text=S.notice(status==='needs_clarification'?'unknown':j.unsupported?'unsupported':'handoff',j.language);mergeFacts(j,[f]);
        }
      }
    }
    if(type==='ma_parallel'){
      const work=pending(j).filter(i=>!j.facts.some(f=>f.intent_id===i.intent_id&&f.provider==='orchestrator'));
      // One knowledge task and one task per order. Actual read calls overlap; they share only this job.
      const knowledge=work.filter(i=>['returns','care','size'].includes(i.code)),orders=work.filter(i=>i.code==='shipping');
      const groups=[...(knowledge.length?[{role:'knowledge',intents:knowledge}]:[]),...orders.map(i=>({role:'order',intents:[i]}))];
      const results=await Promise.allSettled(groups.map(async group=>{
        const r=await invoke(t,j,group.role,envelope(j,group.intents,[],[]),config);if(!active(t))return;mergeFacts(j,r.facts);
        if(j.input.reply_mode==='hybrid'&&group.role==='knowledge'&&j.simulation.draft_fault==='none'){
          const verified=r.facts.filter(f=>f.status==='verified'),intents=group.intents.filter(i=>verified.some(f=>f.intent_id===i.intent_id));
          if(intents.length){const d=await checkedDraft(t,j,intents,verified);if(d.passed&&active(t))sendDrafts(t,j,d.drafts,true);}
        }
      }));
      for(let n=0;n<results.length;n++)if(results[n].status==='rejected'&&active(t)){mergeFacts(j,groups[n].intents.map(i=>S.emptyFact(i,j.language,'handoff_pending','child_execution_failed')));j.audit.push({at:stamp(),action:'child_failure',role:groups[n].role,error:results[n].reason.message});}
    }
    if(type==='ma_reconcile')for(const i of pending(j))if(!j.facts.some(f=>f.intent_id===i.intent_id))mergeFacts(j,[S.emptyFact(i,j.language,'handoff_pending','missing_result')]);
    if(type==='ma_call'&&config.role==='writer'){const r=await invoke(t,j,'writer',envelope(j,pending(j),j.facts.filter(f=>pending(j).some(i=>i.intent_id===f.intent_id))));j.drafts=r.drafts;j.writer_mode=r.mode;}
    if(type==='ma_call'&&config.role==='style'){const r=await invoke(t,j,'style',envelope(j,pending(j),j.facts.filter(f=>pending(j).some(i=>i.intent_id===f.intent_id)),j.drafts));j.drafts=r.drafts;}
    if(type==='ma_call'&&config.role==='quality'){const r=await invoke(t,j,'quality',envelope(j,pending(j),j.facts.filter(f=>pending(j).some(i=>i.intent_id===f.intent_id)),j.drafts));quality(j,r);j.quality_passed=r.passed;}
    if(type==='ma_repair'){
      j.repairs++;const intents=pending(j),facts=j.facts.filter(f=>intents.some(i=>i.intent_id===f.intent_id));const r=await checkedDraft(t,j,intents,facts,true);j.drafts=r.drafts;j.quality_passed=r.passed;
      if(!r.passed){const safe=intents.map(i=>S.emptyFact(i,j.language,'handoff_pending','quality_failed'));mergeFacts(j,safe);j.drafts=S.runStep('writer','draft',{...envelope(j,intents,safe,[],true),facts:safe}).result.drafts;}
    }
    if(type==='ma_dispatch')sendDrafts(t,j,j.drafts);
    if(type==='ma_call'&&config.role==='handoff'){const r=await invoke(t,j,'handoff',envelope(j));openTicket(t,j,r);}
    if(type==='ma_report'){j.status='completed';j.state=j.intents.some(i=>i.status==='handoff_pending')?'handoff_pending':j.intents.some(i=>i.status==='needs_clarification')?'needs_clarification':j.intents.length?'answered':'no_new_messages';save();return report(j);}
    save();return snapshot(j);
  }
  function cancel(t){if(!t.teamId)return;const j=jobFor(t.owner,t.teamId);j.cancelled=true;j.status='cancelled';j.state='cancelled';j.audit.push({at:stamp(),action:'cancel',run_id:t.id});save();}
  function viewJob(j){return {...copy({id:j.id,agent_code:j.agent_code,run_id:j.run_id,request_id:j.input.request_id,conversation:j.input.conversation,status:taskFor(j)?.status==='failed'?'failed':j.status,state:j.state,language:j.language,received_at:j.received_at,intents:j.intents,facts:j.facts,replies:j.replies,plan:j.plan,quality_history:j.quality_history,writer_mode:j.writer_mode||'',audit:j.audit,ignored_message_ids:j.ignored_message_ids}),metrics:metrics(j),calls:db.teamCalls.filter(c=>c.job_id===j.id).map(({owner,...r})=>copy(r)),ticket:db.teamTickets.filter(t=>t.id===j.ticket_id).map(({owner,...r})=>copy(r))[0]||null};}
  function view(t){return t.teamId?viewJob(jobFor(t.owner,t.teamId)):null;}
  async function route(path,method,owner,b){
    const parts=path.split('/').filter(Boolean),key=parts[3],action=parts[4];
    if(path==='/v1/support-team/jobs'&&method==='GET')return {items:db.teamJobs.filter(j=>j.owner===owner).slice().reverse().map(j=>({id:j.id,agent_code:j.agent_code,request_id:j.input.request_id,state:j.state,status:taskFor(j)?.status==='failed'?'failed':j.status,metrics:metrics(j)}))};
    const j=jobFor(owner,key),t=taskFor(j);
    if(method==='GET'&&!action)return viewJob(j);
    if(method!=='POST')fail('操作不存在',404);
    if(action==='confirm'){
      if(active(t)||j.state!=='answered'||!j.intents.length||j.intents.some(i=>i.status!=='answered'))fail('仍有未结问题，不能确认解决',409);
      j.state='resolved';j.audit.push({at:stamp(),action:'customer_confirmed_resolution'});save();return viewJob(j);
    }
    const ticket=db.teamTickets.find(x=>x.id===j.ticket_id);if(!ticket)fail('此会话没有人工单',409);
    if(b.expected_revision!==ticket.revision)fail('工单已变化，请刷新后再操作',409);
    if(active(t))fail('自动流程尚未结束',409);
    if(action==='claim'){
      if(ticket.status!=='pending')fail('此单不能重复领取',409);
      if(!['演示坐席 A','演示坐席 B'].includes(b.actor))fail('请选择演示坐席',422);
      ticket.status='claimed';ticket.assigned_to=b.actor;ticket.revision++;j.audit.push({at:stamp(),action:'claimed',actor:b.actor});save();return viewJob(j);
    }
    if(ticket.status!=='claimed'||ticket.assigned_to!==b.actor)fail('请由已领取的演示坐席处理',409);
    if(action==='reply'){
      if(typeof b.text!=='string'||!b.text.trim()||b.text.length>3000)fail('请填写1–3000字人工核实后的回复',422);
      if(b.language!==j.language)fail('请使用此会话的回复语言',422);
      const unresolved=j.intents.filter(i=>i.status==='handoff_pending');post(t,j,'human-'+ticket.id,'human_reply',b.text.trim(),unresolved);for(const i of unresolved)i.status='answered';ticket.status='resolved';ticket.revision++;ticket.resolved_at=stamp();ticket.resolution='human_reply';j.state=j.intents.some(i=>i.status==='needs_clarification')?'needs_clarification':'answered';j.audit.push({at:stamp(),action:'human_reply',actor:b.actor});save();return viewJob(j);
    }
    if(action==='recover'){
      if(j.cancelled)fail('已取消的请求不能恢复，请重新提交待处理问题',409);
      if(!ticket.reason_codes.some(r=>['order_timeout','temporary_failure','budget_exhausted'].includes(r)))fail('此问题不能通过服务重试解决，请人工核实',409);
      const a=db.agents.find(a=>a.owner===owner&&a.code===t.agentCode);
      // Create first; a capacity rejection must not partially change the existing ticket.
      const next=await makeTask(owner,a,{prompt:a.name,seconds:0,ratio:'',motion:''},null,a.name,{agentCode:t.agentCode,agentVersion:t.agentVersion,graph:copy(t.graph),input:copy(t.input),inputSchema:copy(t.inputSchema),outputSchema:copy(t.outputSchema),parentId:t.id,teamBindings:copy(t.teamBindings),traceEvents:[],result:{}});
      const result=prepare(next);result.simulation={...result.simulation,order_fault:'none'};for(const i of result.intents)if(i.status==='handoff_pending'&&result.facts.some(f=>f.intent_id===i.intent_id&&['order_timeout','temporary_failure','budget_exhausted'].includes(f.reason)))i.status='pending';
      ticket.revision++;j.audit.push({at:stamp(),action:'resume_failed_order_tasks',actor:b.actor,from_run:t.id,to_run:next.id,simulation_change:'order_fault -> none'});save();return {run_id:next.id,job_id:j.id};
    }
    fail('操作不存在',404);
  }
  return {checkRequest,prepare,execute,cancel,view,route,bindings};
}

return createSupportTeamService;
})();
const createAnnotationService=(()=>{
function createAnnotationService({db,save,fail,stamp,id,resumeTask}){
  db.vocAnnotations ||= [];
  const copy=v=>JSON.parse(JSON.stringify(v));
  const get=(owner,key)=>{const x=db.vocAnnotations.find(x=>x.owner===owner&&x.id===key);if(!x)fail('标签复核不存在或不属于当前工作区',404);return x;};
  const view=x=>{const {owner,...rest}=x;return copy(rest);};
  function ensure(t,batch){let x=db.vocAnnotations.find(x=>x.owner===t.owner&&x.run_id===t.id);if(!x){x={id:id('label'),owner:t.owner,run_id:t.id,batch:copy(batch),status:'pending',revision:1,created_at:stamp(),updated_at:stamp(),history:[]};db.vocAnnotations.unshift(x);}t.annotationId=x.id;save();return x;}
  function cancel(t){if(!t.annotationId)return;const x=get(t.owner,t.annotationId);if(x.status!=='completed'){x.status='cancelled';x.updated_at=stamp();save();}}
  function pending(owner){return db.vocAnnotations.filter(x=>x.owner===owner&&x.status==='pending').map(view);}
  async function route(path,method,owner,b){
    const parts=path.split('/').filter(Boolean);
    if(parts.length===3&&method==='GET')return {items:db.vocAnnotations.filter(x=>x.owner===owner).map(view)};
    const x=get(owner,parts[3]);if(parts.length===4&&method==='GET')return view(x);
    if(parts[4]==='submit'&&method==='POST'){
      if(b.expected_revision!==x.revision)fail('复核版本已变化，请刷新',409);
      if(x.status==='completed')return view(x);
      const run=db.tasks.find(t=>t.id===x.run_id&&t.owner===owner);if(x.status!=='pending'||run?.status!=='waiting_human')fail('当前复核不可提交',409);
      const pendingRows=x.batch.rows.filter(r=>r.review_status==='needs_review');if(!Array.isArray(b.decisions)||b.decisions.length!==pendingRows.length)fail('必须逐条处理全部待复核评论',422);
      const next=copy(x.batch),seen=new Set();
      for(const d of b.decisions){const row=next.rows.find(r=>r.review_id===d.review_id&&r.review_status==='needs_review');if(!row||seen.has(d.review_id))fail('复核评论ID无效或重复',422);seen.add(d.review_id);if(!['accept','exclude'].includes(d.action))fail('请选择接受或排除',422);if(typeof d.note!=='string'||!d.note.trim()||d.note.length>500)fail('每条复核需要填写依据（最多500字）',422);
        if(d.action==='exclude'){next.rows=next.rows.filter(r=>r.review_id!==row.review_id);next.excluded_reviews.push({review_id:row.review_id,reason:'human_excluded',duplicate_of:'',note:d.note.trim()});continue;}
        if(!Array.isArray(d.issue_tags)||d.issue_tags.length>30)fail('问题标签必须为数组且不超过30个',422);
        row.issue_tags=copy(d.issue_tags).map(t=>({...t,origin:'human',confidence:1}));row.review_status='human_confirmed';row.annotation_note=d.note.trim();if(row.images.length)row.image_status='human_checked';row.confidence=1;
        row.sentiment=row.issue_tags.length?(row.positive_signals.length?'mixed':'negative'):row.positive_signals.length?'positive':'unknown';
        try{VocV2.validateTags(row,{human:true});}catch(e){fail(e.message,422);}
      }
      try{VocV2.finalize(next);}catch(e){fail(e.message,422);}
      x.batch=next;x.status='completed';x.revision++;x.updated_at=stamp();x.history.push({at:stamp(),action:'submitted',count:b.decisions.length,revision:x.revision});save();resumeTask(run);return view(x);
    }
    fail('不支持的标签复核操作',405);
  }
  return {ensure,get,cancel,pending,route};
}

return createAnnotationService;
})();
const createVocService=(()=>{
function createVocService({db,save,fail,stamp,id,resumeTask}){
  db.vocPlans ||= [];db.plmTasks ||= [];
  const copy=v=>JSON.parse(JSON.stringify(v));
  const view=p=>{const {owner,...rest}=p;return copy(rest);};
  function getPlan(owner,planId){const p=db.vocPlans.find(p=>p.owner===owner&&p.id===planId);if(!p)fail('改善方案不存在或不属于当前工作区',404);return p;}
  function rootId(t){let r=t;const seen=new Set();while(r.parentId&&!seen.has(r.id)){seen.add(r.id);const parent=db.tasks.find(x=>x.id===r.parentId&&x.owner===t.owner);if(!parent)break;r=parent;}return r.id;}
  function audit(p,action,role,note=''){p.history.push({at:stamp(),action,role,note,revision:p.revision});p.updated_at=stamp();}
  function createPlan(t,summary){
    if(!summary||!Array.isArray(summary.issues)||typeof summary.style_code!=='string')throw Error('工单节点需要款式归纳结果');
    if(!t.graph.nodes.some(n=>['voc_aggregate','voc_proposal_check'].includes(n.type)))throw Error('创建 VOC 工单前需要 VOC 归纳节点');
    const root=rootId(t),existing=db.vocPlans.find(p=>p.owner===t.owner&&p.root_run_id===root);
    if(existing){t.planId=existing.id;if(existing.status!=='completed'&&existing.run_id!==t.id){existing.run_id=t.id;audit(existing,'retry_bound','system','按原快照恢复工单处理');}save();return {plan_id:existing.id};}
    const p={workflow_version:summary.workflow_version||1,source_batch_id:summary.source_batch_id||'',all_issues:copy(summary.all_issues||summary.issues),id:id('voc'),owner:t.owner,run_id:t.id,root_run_id:root,style_code:summary.style_code,status:summary.issues.length?'pending_review':'approved',revision:1,created_at:stamp(),updated_at:stamp(),sample_size:summary.sample_size,scoring:copy(summary.scoring),note:summary.note,approvals:{designer:null,planner:null},history:[],orders:summary.issues.map((issue,i)=>({id:id('wo'),rank:i+1,...copy(issue),original_priority:issue.priority,adjustment_reason:'',plm_task_id:null}))};
    audit(p,'created','system',summary.issues.length?'等待设计师与企划确认':'未发现匹配问题，不创建工单或任务');db.vocPlans.unshift(p);t.planId=p.id;save();return {plan_id:p.id};
  }
  function guard(t,ref){
    const p=getPlan(t.owner,ref?.plan_id);
    if(t.planId!==p.id||p.root_run_id!==rootId(t))fail('不能使用其他运行的确认结果',403);
    if(ref.revision!==p.revision)fail('方案版本已变化，请重新确认',409);
    if(!['approved','completed'].includes(p.status))fail('必须完成双方确认后才能创建 PLM 任务',409);
    if(p.orders.length&&!['designer','planner'].every(role=>p.approvals[role]?.revision===p.revision))fail('缺少当前版本的双方确认',409);
    return p;
  }
  function deliver(t,ref){
    const p=guard(t,ref);
    for(const order of p.orders){
      const existing=db.plmTasks.find(x=>x.owner===t.owner&&x.work_order_id===order.id);
      if(existing){order.plm_task_id=existing.id;continue;}
      const task={id:id('plm'),owner:t.owner,mode:'demo',style_code:p.style_code,plan_id:p.id,work_order_id:order.id,source_run_id:p.run_id,confirmed_revision:p.revision,title:p.style_code+' · '+order.secondary_label,priority:order.priority,description:order.suggestion,acceptance:order.action?.acceptance||'设计师与企划复核改善方案及验证证据后，在演示任务中记录后续处理结果。',owner_role:order.action?.owner_role||'设计师',assignees:['设计师','企划'],status:'待处理',created_at:stamp()};db.plmTasks.push(task);order.plm_task_id=task.id;
    }
    if(p.status!=='completed'){p.status='completed';audit(p,'plm_created','system','已生成 '+p.orders.length+' 项演示任务');save();}
    if(p.workflow_version===2)return {plan_id:p.id,work_orders:p.orders.map(o=>({work_order_id:o.id,issue_id:o.issue_id,priority:o.priority,suggestion:o.suggestion,acceptance:o.action.acceptance,owner_role:o.action.owner_role,adjustment_reason:o.adjustment_reason})),approvals:{plan_id:p.id,revision:p.revision,designer_confirmed:!!p.approvals.designer,planner_confirmed:!!p.approvals.planner},tasks:p.orders.map(order=>{const task=db.plmTasks.find(t=>t.id===order.plm_task_id);return {task_id:task.id,work_order_id:order.id,title:task.title,priority:task.priority,status:task.status,acceptance:task.acceptance,owner_role:task.owner_role,mode:'demo'};})};
    return {style_code:p.style_code,plan_id:p.id,status:'completed',tasks:p.orders.map(order=>{const task=db.plmTasks.find(x=>x.id===order.plm_task_id);return {task_id:task.id,work_order_id:order.id,title:task.title,priority:task.priority,status:task.status};}),message:p.orders.length?'双方确认后创建演示 PLM 任务，未写入真实 PLM':'没有待处理问题，无需创建任务'};
  }
  function cancel(t){if(!t.planId)return;const p=getPlan(t.owner,t.planId);if(p.status==='completed')return;p.status='cancelled';audit(p,'cancelled','requester');save();}
  function revision(p,b){if(b.expected_revision!==p.revision)fail('方案已更新，请刷新后重新操作',409);}
  function active(p){const run=db.tasks.find(x=>x.id===p.run_id&&x.owner===p.owner);if(!run||run.status!=='waiting_human')fail('运行当前不在待确认状态',409);return run;}
  const clean=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail('请填写有效说明（最多 '+max+' 字）',422);return v.trim();};
  async function route(route,method,owner,b){
    if(route==='/v1/reviews'&&method==='GET'){const items=db.vocPlans.filter(p=>p.owner===owner&&['pending_review','needs_changes'].includes(p.status));return {items:items.map(view),total:items.length};}
    if(route==='/v1/voc/plans'&&method==='GET')return {items:db.vocPlans.filter(p=>p.owner===owner).map(view)};
    if(route==='/v1/voc/plm-tasks'&&method==='GET')return {items:db.plmTasks.filter(p=>p.owner===owner).map(({owner,...task})=>copy(task))};
    const parts=route.split('/').filter(Boolean);
    if(parts[2]!=='plans'||!parts[3])fail('VOC 接口不存在',404);
    const p=getPlan(owner,parts[3]);
    if(method==='GET'&&parts.length===4)return view(p);
    if(method==='PATCH'&&parts.length===4){
      revision(p,b);active(p);if(!['pending_review','needs_changes'].includes(p.status))fail('当前方案不可修改',409);
      const reason=clean(b.reason,300);if(!Array.isArray(b.orders)||b.orders.length!==p.orders.length)fail('必须提交全部工单',422);
      const ids=new Set();const changes=b.orders.map(o=>{if(ids.has(o.id)||!p.orders.some(x=>x.id===o.id))fail('工单标识无效或重复',422);ids.add(o.id);if(!['P1','P2','P3'].includes(o.priority))fail('优先级无效',422);if(p.workflow_version===2&&!['设计师','企划','品质'].includes(o.owner_role))fail('责任角色无效',422);return {id:o.id,priority:o.priority,suggestion:clean(o.suggestion,500),...(p.workflow_version===2?{acceptance:clean(o.acceptance,500),owner_role:o.owner_role}:{})};});
      for(const change of changes){const order=p.orders.find(x=>x.id===change.id);Object.assign(order,{priority:change.priority,suggestion:change.suggestion,adjustment_reason:reason});if(p.workflow_version===2)Object.assign(order.action,{suggestion:change.suggestion,acceptance:change.acceptance,owner_role:change.owner_role});}
      p.orders.sort((a,b)=>a.priority.localeCompare(b.priority)||b.score-a.score);p.orders.forEach((o,i)=>o.rank=i+1);
      p.revision++;p.approvals={designer:null,planner:null};p.status='needs_changes';audit(p,'revised','requester',reason);save();return view(p);
    }
    if(method==='POST'&&parts[4]==='resubmit'){
      revision(p,b);active(p);if(p.status!=='needs_changes')fail('只有退回或修改后的方案可以重新提交',409);
      p.revision++;p.approvals={designer:null,planner:null};p.status='pending_review';audit(p,'resubmitted','requester');save();return view(p);
    }
    if(method==='POST'&&parts[4]==='decisions'){
      if(!['designer','planner'].includes(b.role)||!['approve','return'].includes(b.action))fail('角色或确认动作无效',422);
      revision(p,b);
      if(b.action==='approve'&&p.approvals[b.role]?.revision===p.revision&&['pending_review','approved','completed'].includes(p.status))return view(p);
      const run=active(p);if(p.status!=='pending_review')fail('请先修改并重新提交方案',409);
      const note=b.action==='return'?clean(b.note,300):typeof b.note==='string'?b.note.slice(0,300):'';
      if(b.action==='return'){p.status='needs_changes';p.approvals={designer:null,planner:null};audit(p,'returned',b.role,note);}
      else{p.approvals[b.role]={revision:p.revision,at:stamp(),note};audit(p,'approved',b.role,note);if(['designer','planner'].every(role=>p.approvals[role]?.revision===p.revision)){p.status='approved';save();resumeTask(run);}}
      save();return view(p);
    }
    fail('VOC 操作尚未支持',405);
  }
  return {getPlan,createPlan,guard,deliver,cancel,route};
}

return createVocService;
})();
const createWorkflowService=(()=>{
const C=globalThis.WorkflowCore;
function createWorkflowService({db,save,fail,json,body,decodeImage,makeTask,ownTask,cancelTask,stamp,id,resumeTask}) {
  db.graphs ||= [];
  const graphFor=(owner,gid)=>{const g=db.graphs.find(x=>x.owner===owner&&x.id===gid);if(!g)fail('编排图不存在或不属于当前工作区',404);return g;};
  const agentFor=(owner,code)=>{const a=db.agents.find(x=>x.owner===owner&&x.code===code);if(!a)fail('Agent 不存在或不属于当前工作区',404);return a;};
  const versionFor=(a,version)=>{const v=a.versions.find(x=>x.version===(version||a.versions.at(-1)?.version));if(!v)fail('Agent 版本不存在',404);return v;};
  const annotations=createAnnotationService({db,save,fail,stamp,id,resumeTask});
  const support=createSupportService({db,save,fail,stamp,id,emit});
  const team=createSupportTeamService({db,save,fail,stamp,id,emit,makeTask});
  const voc=createVocService({db,save,fail,stamp,id,resumeTask});
  function checkedGraph(graph) {const v=C.validateGraph(graph);if(!v.ok){const e=new Error('编排校验失败');Object.assign(e,{status:422,code:'GRAPH_INVALID',details:v.errors});throw e;}}
  function field(v,label,max=96){if(typeof v!=='string'||!v.trim()||v.length>max)fail(label+' 必填且不超过 '+max+' 字符',422);return v.trim();}
  function nextGraph(owner,gid,dsl,code='') {
    checkedGraph(dsl);
    if(!/^[a-zA-Z0-9_.-]{1,96}$/.test(gid)||gid==='demo_welcome')fail('编排 ID 无效或被保留',422);
    if(code)agentFor(owner,code);
    let g=db.graphs.find(x=>x.owner===owner&&x.id===gid);
    if(g&&g.agentCode!==code)fail('不能更换编排图所属 Agent',409);
    if(!g){if(db.graphs.filter(x=>x.owner===owner).length>=30)fail('工作区最多 30 张编排图',429);g={id:gid,owner,agentCode:code,versions:[]};db.graphs.push(g);}
    if(g.versions.length>=100)fail('编排版本数量已达演示上限',429);
    const version='v'+(g.versions.length+1),stored={...C.copy(dsl),id:gid,version,status:'draft',owner_agent_code:code};
    g.versions.push(stored);return stored;
  }
  function bindVersion(a,b) {
    const g=graphFor(a.owner,b.graph_id);
    if(g.agentCode&&g.agentCode!==a.code)fail('不能绑定其他 Agent 的编排图',409);
    try{C.checkSchema(b.input_schema);C.checkSchema(b.output_schema);}catch(e){fail(e.message,422);}
    if(b.input_schema.type!=='object'||b.output_schema.type!=='object')fail('输入输出契约必须为 object',422);
    if(a.versions.length>=30)fail('Agent 最多 30 个演示版本',429);
    const version='v'+(a.versions.length+1),graph=g.versions.at(-1);
    const v={version,status:'testing',eval_pass:false,graph_id:g.id,graph_key:g.id+'@'+graph.version,graph_version:graph.version,contract_hash:id('contract'),input_schema:C.copy(b.input_schema),output_schema:C.copy(b.output_schema),error_codes:['CONTRACT_INPUT_INVALID','GRAPH_INVALID','NODE_EXECUTION_FAILED'],context_policy:{},quota:{}};
    g.agentCode=a.code;graph.owner_agent_code=a.code;a.versions.push(v);return v;
  }
  function migrate() {
    for(const a of db.agents) {
      if(a.versions)continue;
      const first=!db.agents.some(x=>x!==a&&x.owner===a.owner&&x.code==='demo.image_video');
      a.code=first?'demo.image_video':'video.'+a.id.slice(6);a.project_code='demo';a.versions=[];
      const gid=a.code+'_graph';const graph=C.templateGraph(gid,a.name+'编排','video',a.code);
      nextGraph(a.owner,gid,graph,a.code);bindVersion(a,{graph_id:gid,input_schema:C.inputSchema,output_schema:C.outputSchema});
    }
    for(const t of db.tasks)if(t.graph&&t.status==='failed'&&!t.traceEvents?.some(e=>e.type==='run_end'))finish(t,'failed',t.error||'服务重启中断运行');
    for(const session of db.sessions)for(const [code,name,kind,ins,outs] of [
      ['demo.voc_tag','VOC 评论打标','voc_tag',VocCore.inputSchema,VocCore.outputSchema],
      ['demo.voc_analysis','VOC 款式改善与工单','voc_analysis',VocCore.analysisInput,VocCore.analysisOutput]
    ]){
      if(db.agents.some(a=>a.owner===session.id&&a.code===code))continue;
      const a={id:id('agent'),owner:session.id,code,name,description:kind==='voc_tag'?'原声问题标签、场景搭配与明确自述信息；规则演示':'按款归纳排序，经设计师和企划双确认后生成演示 PLM 任务',type:'workflow',versions:[],createdAt:stamp()};db.agents.push(a);
      const gid=code+'_graph';nextGraph(session.id,gid,VocCore.graph(gid,name+'编排',kind,code),code);bindVersion(a,{graph_id:gid,input_schema:ins,output_schema:outs});
    }
    for(const session of db.sessions)for(const [code,kind] of [['demo.voc_tag','voc_tag'],['demo.voc_analysis','voc_analysis']]){
      const a=db.agents.find(a=>a.owner===session.id&&a.code===code);
      if(a.versions.some(v=>v.input_schema.properties?.batch_id||v.input_schema.properties?.tagged_batch))continue;
      const gid=code+'_v2_graph';nextGraph(session.id,gid,VocV2.graph(gid,a.name+' · 多场景编排',kind,code),code);
      bindVersion(a,{graph_id:gid,input_schema:kind==='voc_tag'?VocV2.inputSchema:VocV2.analysisInput,output_schema:kind==='voc_tag'?VocV2.outputSchema:VocV2.analysisOutput});
    }
    for(const session of db.sessions){
      const code='demo.customer_support';if(db.agents.some(a=>a.owner===session.id&&a.code===code))continue;
      const a={id:id('agent'),owner:session.id,code,name:'多语言智能客服',description:'多消息意图归并、快捷先答、等待提醒与人工接管；仅模拟回复',type:'workflow',versions:[],createdAt:stamp()};db.agents.push(a);
      const gid=code+'_graph';nextGraph(session.id,gid,SupportCore.graph(gid,a.name+' · 意图与等待编排',code),code);bindVersion(a,{graph_id:gid,input_schema:SupportCore.inputSchema,output_schema:SupportCore.outputSchema});
    }
    for(const session of db.sessions){
      const catalog=[{role:'orchestrator',code:'demo.support_orchestrator',name:'智能客服 · 多 Agent 总控',purpose:'按意图协作、适用证据、质量拦截、部分恢复与人工确认'},...Object.entries(SupportTeam.roleInfo).map(([role,x])=>({role,...x}))];
      for(const item of catalog){
        if(db.agents.some(a=>a.owner===session.id&&a.code===item.code))continue;
        const a={id:id('agent'),owner:session.id,code:item.code,name:item.name,description:item.purpose,type:'workflow',tags:['客服协作',item.role==='orchestrator'?'总控':'专职Agent'],versions:[],createdAt:stamp()};db.agents.push(a);
        const gid=item.code+'_graph';nextGraph(session.id,gid,SupportTeam.graph(gid,a.name+' · v7',item.role,item.code),item.code);
        bindVersion(a,{graph_id:gid,input_schema:item.role==='orchestrator'?SupportTeam.inputSchema:SupportTeam.envelopeSchema,output_schema:item.role==='orchestrator'?SupportTeam.outputSchema:SupportTeam.childOutputs[item.role]});
      }
    }
    // Add a new draft version rather than rewriting saved history or active runs.
    for(const record of db.graphs.filter(g=>g.agentCode==='demo.support_orchestrator')){
      const latest=record.versions.at(-1),upgraded=SupportTeam.upgradeStyleGraph(latest);
      if(!upgraded)continue;
      nextGraph(record.owner,record.id,upgraded,record.agentCode);
    }
    save();
  }
  function agentView(a) {
    return {code:a.code,name:a.name,description:a.description||'',project_code:'demo',project:{code:'demo',name:'演示项目'},owner_dept:a.owner_dept||'演示团队',owner_user:a.owner_user||'演示用户',visibility:'internal',tags:a.tags||['demo','canvas'],status:'active',access:['view','run','manage'],created_at:a.createdAt,aliases:{latest:{version:a.versions.at(-1)?.version||'',weight:100}},health:{state:'unpublished',message:'画布草稿可试运行；未发布为生产服务'},versions:a.versions.map(v=>C.copy(v))};
  }
  function graphView(g){const v=g.versions.at(-1);return {graph_id:g.id,name:v.name||g.id,latest:v.version,status:'draft',nodes:v.nodes.length,edges:v.edges.length,agents:g.agentCode?[g.agentCode]:[],owner_agent_code:g.agentCode};}
  function emit(t,type,extra={}) {
    t.traceEvents ||= [];
    const e={type,run_id:t.id,trace_id:'trace_'+t.id,ts:stamp(),...extra};t.traceEvents.push(e);t.updatedAt=stamp();save();
  }
  function finish(t,status,error) {
    if(status==='cancelled'){support.cancel(t);team.cancel(t);}
    if(t.traceEvents?.some(e=>e.type==='run_end'))return;
    if(t.currentNode&&error)emit(t,'node_end',{node:t.currentNode,status:'error',error_code:status==='cancelled'?'RUN_CANCELLED':'NODE_EXECUTION_FAILED',message:error,latency_ms:Date.now()-(t.nodeStartedAt||Date.now()),tokens:0});
    t.currentNode=null;t.completedAt=stamp();
    emit(t,'run_end',{status,output:t.result||{},latency_ms:Date.now()-(t.startedAt||Date.now()),...(error?{error_code:status==='cancelled'?'RUN_CANCELLED':'NODE_EXECUTION_FAILED',message:error}:{})});
  }
  function runView(t) {
    const a=db.agents.find(a=>a.id===t.agentId);
    return {run_id:t.id,trace_id:'trace_'+t.id,agent:t.agentCode||a?.code||t.agentName,version:t.agentVersion||'v1',project_code:'demo',graph_id:t.graph?.id||'',graph_version:t.graph?.version||'',status:t.status,created_at:Date.parse(t.createdAt)/1000,completed_at:t.completedAt?Date.parse(t.completedAt)/1000:null,latency_ms:t.completedAt?Date.parse(t.completedAt)-(t.startedAt||Date.parse(t.createdAt)):0,input:t.input||{prompt:t.prompt},output:t.result||{},usage:{tokens_in:0,tokens_out:0},error:t.error?{code:'NODE_EXECUTION_FAILED',message:t.error}:null,events:t.traceEvents||[],retry:t.parentId?1:0,progress:t.progress,support:support.view(t),team:team.view(t),mode:t.graph?.nodes.some(n=>n.type.startsWith('voc_')||n.type.startsWith('cs_')||n.type.startsWith('ma_'))?'rules-demo':'demo-motion',plan_id:t.planId||null,annotation_id:t.annotationId||null,modelConnected:false,hasVideo:!!t.output&&t.status==='succeeded',videoPath:t.output&&t.status==='succeeded'?`/api/video/tasks/${t.id}/output`:null,legacy:!t.graph};
  }
  function validateInput(a,v,input) {
    let errors=[];
    try{C.safeObject(input);errors=C.validateValue(input,v.input_schema);}catch(e){errors=[e.message];}
    if(errors.length){const e=new Error('输入不符合当前 Agent 契约');Object.assign(e,{status:422,code:'CONTRACT_INPUT_INVALID',details:errors});throw e;}
  }
  async function execute(t,renderVideo) {
    const resuming=!!t.resumeState;
    t.startedAt ||= Date.now();if(!resuming)emit(t,'run_start',{agent:t.agentCode,graph_id:t.graph.id,graph_version:t.graph.version});
    const state=resuming?C.copy(t.resumeState):{input:C.copy(t.input),variables:{}};let current=resuming?t.resumeNode:t.graph.entry;
    while(current) {
      if(t.status==='cancelled')return;
      const n=t.graph.nodes.find(n=>n.id===current),c=n.config||{};
      t.currentNode=n.id;
      if(resuming&&n.id===t.resumeNode)emit(t,'human_resume',{node:n.id,action:'approve'});
      else{t.nodeStartedAt=Date.now();emit(t,'node_start',{node:n.id,node_type:n.type});emit(t,'node_input',{node:n.id,node_type:n.type,input:C.copy(state)});}
      if(n.type==='start')state.variables=c.copy_input===false?{}:C.copy(state.input);
      if(n.type==='llm')C.setPath(state,c.output_path,C.renderTemplate(c.mock_output,state));
      if(n.type.startsWith('cs_')){const value=await support.execute(t,n.type,C.getPath(state,c.input_path),c);if(t.status==='cancelled')return;C.setPath(state,c.output_path,value);}
      if(n.type.startsWith('ma_')){const value=await team.execute(t,n.type,C.getPath(state,c.input_path),c);if(t.status==='cancelled')return;C.setPath(state,c.output_path,value);}
      if(n.type==='voc_tag')C.setPath(state,c.output_path,VocCore.tagReviews(C.getPath(state,c.input_path)));
      if(n.type==='voc_aggregate')C.setPath(state,c.output_path,VocCore.aggregate(C.getPath(state,c.input_path),c));
      if(Object.hasOwn(VocV2.definitions,n.type)&&!['branch','voc_tag_review','voc_plm_guard','voc_report'].includes(n.type))C.setPath(state,c.output_path,VocV2.execute(n.type,C.getPath(state,c.input_path),c));
      if(n.type==='voc_workorders'){const value=C.getPath(state,c.input_path);C.setPath(state,c.output_path,voc.createPlan(t,value.batch?VocV2.summary(value):value));}
      if(n.type==='voc_tag_review'){
        const review=annotations.ensure(t,C.getPath(state,c.input_path));
        if(review.status==='cancelled')throw Error('标签复核已取消');
        if(review.status!=='completed'){t.status='waiting_human';t.resumeState=C.copy(state);t.resumeNode=n.id;t.result={annotation_id:review.id,status:'awaiting_tag_review'};emit(t,'run_paused',{node:n.id,status:'waiting_human',annotation_id:review.id,message:'等待逐条标签复核'});return;}
        C.setPath(state,c.output_path,review.batch);
      }
      if(n.type==='voc_plm_guard'){const ref=C.getPath(state,c.input_path);voc.guard(t,ref);C.setPath(state,c.output_path,ref);}
      if(n.type==='voc_report')C.setPath(state,c.output_path,VocV2.report(C.getPath(state,c.input_path),C.getPath(state,c.delivery_path)||{}));
      if(n.type==='voc_review'){
        const plan=voc.getPlan(t.owner,C.getPath(state,c.input_path)?.plan_id);
        if(!['approved','completed'].includes(plan.status)){
          if(plan.status==='cancelled')throw Error('工单已取消，请创建新的分析运行');
          t.status='waiting_human';t.resumeState=C.copy(state);t.resumeNode=n.id;t.result={plan_id:plan.id,style_code:plan.style_code,status:plan.status};
          emit(t,'run_paused',{node:n.id,status:'waiting_human',plan_id:plan.id,message:'等待设计师与企划确认'});return;
        }
        C.setPath(state,c.output_path,{plan_id:plan.id,revision:plan.revision});
      }
      if(n.type==='plm_task')C.setPath(state,c.output_path,voc.deliver(t,C.getPath(state,c.input_path)));
      if(n.type==='image_to_video') {
        if(!t.source)throw Error('开始节点没有提供图片');
        const prompt=C.getPath(state,c.prompt_path);
        if(typeof prompt!=='string'||!prompt.trim()||prompt.length>1000)throw Error('图生视频节点的提示词来源必须是 1–1000 字的字符串');
        const params={prompt,seconds:c.seconds,ratio:c.ratio,motion:c.motion};
        const result=await renderVideo(params,n.timeout||90);
        if(t.status==='cancelled')return;
        C.setPath(state,c.output_path,result);
      }
      if(n.type==='branch'){const value=C.getPath(state,c.value_path);if(typeof value!=='boolean')throw Error('条件分支变量必须为boolean：'+c.value_path);emit(t,'branch_selected',{node:n.id,value_path:c.value_path,condition:String(value)});}
      if(n.type==='end') {
        const result=C.getPath(state,c.source_path);
        if(result===undefined)throw Error('结束节点找不到输出：'+c.source_path);
        const errors=C.validateValue(result,t.outputSchema,'output');if(errors.length)throw Error('输出契约校验失败：'+errors.join('；'));
        t.result=C.copy(result);
      }
      emit(t,'node_output',{node:n.id,node_type:n.type,output:n.type==='end'?t.result:C.copy(state),mock:n.type==='llm'});
      emit(t,'node_end',{node:n.id,node_type:n.type,status:'succeeded',latency_ms:Math.max(1,Date.now()-t.nodeStartedAt),tokens:0,cost_usd:0});t.currentNode=null;
      if(n.type==='voc_review')emit(t,'human_decision',{node:n.id,action:'approve',note:'设计师与企划已确认当前修订'});
      if(n.type==='end')break;
      current=t.graph.edges.find(e=>e.from===current&&(n.type!=='branch'||e.condition===String(C.getPath(state,c.value_path)))).to;
    }
    delete t.resumeState;delete t.resumeNode;
  }
  async function route(req,res,url,owner) {
    const route=url.pathname.replace('/api/video/console',''),parts=route.split('/').filter(Boolean),method=req.method;
    const send=(data,status=200)=>{json(res,data,status);return true;};
    if(route==='/v1/graphs/node-test'&&method==='POST'){
      const b=await body(req),a=agentFor(owner,b.agent),v=versionFor(a,b.version);
      const g=C.copy(b.graph||graphFor(owner,v.graph_id).versions.at(-1));
      if(graphFor(owner,g.id).agentCode!==a.code)fail('不能测试其他 Agent 的编排图',403);
      checkedGraph(g);
      if(!g.nodes.some(n=>n.type==='ma_step')||g.nodes.some(n=>!['start','ma_step','ma_child_output','end'].includes(n.type)))fail('此节点依赖完整协作上下文，请运行总控画布',422);
      const target=g.nodes.find(n=>n.id===b.node?.id);if(!target)fail('测试节点不存在',422);
      validateInput(a,v,b.state?.input);
      // Always rebuild prerequisite state, especially order authorization, from the Agent input.
      const state={input:C.copy(b.state.input),variables:{}},t={id:id('node_test'),owner,status:'running'},steps=[];
      const began=Date.now();let current=g.entry;
      while(current){
        const n=g.nodes.find(n=>n.id===current),c=n.config;
        if(n.type==='start')state.variables=c.copy_input?C.copy(state.input):{};
        else if(n.type==='end'){
          const errors=C.validateValue(C.getPath(state,c.source_path),v.output_schema);if(errors.length)fail(errors.join('；'),422);
        }else C.setPath(state,c.output_path,await team.execute(t,n.type,C.getPath(state,c.input_path),c));
        steps.push({node_id:n.id,status:'succeeded'});
        if(n.id===target.id)return send({ok:true,node_id:n.id,latency_ms:Date.now()-began,prerequisite_steps:steps.slice(0,-1),output:C.copy(n.type==='end'?C.getPath(state,c.source_path):n.type==='start'?state:C.getPath(state,c.output_path)),executor:'local_rules',model_connected:false});
        current=g.edges.find(e=>e.from===current)?.to;
      }
      fail('无法到达测试节点',422);
    }
    if(route.startsWith('/v1/support-team/'))return send(await team.route(route,method,owner,method==='GET'?null:await body(req)));
    if(route.startsWith('/v1/support/'))return send(await support.route(route,method,owner,method==='GET'?null:await body(req)));
    if(route.startsWith('/v1/voc/annotations'))return send(await annotations.route(route,method,owner,method==='GET'?null:await body(req)));
    if(route==='/v1/reviews'&&method==='GET'){const plans=await voc.route(route,method,owner,null),labels=annotations.pending(owner);return send({items:[...plans.items,...labels],total:plans.total+labels.length});}
    if(route.startsWith('/v1/voc/')||route==='/v1/reviews')return send(await voc.route(route,method,owner,method==='GET'?null:await body(req)));
    if(route==='/v1/agents') {
      if(method==='GET')return send({items:db.agents.filter(a=>a.owner===owner).map(agentView)});
      if(method==='POST') {
        const b=await body(req),code=field(b.code,'Agent code');
        if(!/^[a-z][a-z0-9_.-]{2,95}$/.test(code)||code==='demo.welcome')fail('Agent code 无效或被保留',422);
        if(db.agents.some(a=>a.owner===owner&&a.code===code))fail('Agent code 已存在',409);
        if(db.agents.filter(a=>a.owner===owner).length>=30)fail('工作区最多创建 30 个 Agent',429);
        const a={id:id('agent'),owner,code,name:field(b.name,'名称',60),description:String(b.description||'').slice(0,300),owner_dept:String(b.owner_dept||'').slice(0,80),owner_user:String(b.owner_user||'').slice(0,80),tags:Array.isArray(b.tags)?b.tags.filter(t=>typeof t==='string').slice(0,20).map(t=>t.slice(0,40)):[],type:'workflow',project_code:'demo',versions:[],createdAt:stamp()};db.agents.push(a);save();return send(agentView(a),201);
      }
    }
    if(parts[1]==='agents'&&parts[2]) {
      const a=agentFor(owner,parts[2]);
      if(parts.length===3&&method==='GET')return send(agentView(a));
      if(parts.length===3&&method==='PATCH'){const b=await body(req);a.name=field(b.name,'名称',60);a.description=String(b.description||'').slice(0,300);save();return send(agentView(a));}
      if(parts[3]==='versions'&&parts.length===4&&method==='POST'){const v=bindVersion(a,await body(req));save();return send(v,201);}
      if(parts[3]==='versions'&&parts[4]) {
        const v=versionFor(a,parts[4]);
        if(parts[5]==='contract'&&method==='GET')return send({...v,id:v.contract_hash});
        if(parts[5]==='validate-input'&&method==='POST'){const b=await body(req);validateInput(a,v,b.input);return send({ok:true,version:v.version});}
      }
      if(['dependents','audit','access'].includes(parts[3])&&method==='GET')return send({items:[],users:[]});
    }
    if(route==='/v1/graphs'&&method==='GET')return send({items:db.graphs.filter(g=>g.owner===owner).map(graphView)});
    if(parts[1]==='graphs'&&parts[2]) {
      const gid=parts[2];
      if(parts[3]==='validate'&&method==='POST'){const b=await body(req);return send(C.validateGraph(b.dsl));}
      if(parts.length===3&&method==='PUT'){const b=await body(req);if(b.publish)fail('演示仅支持保存草稿和画布试运行，未接生产发布',501);const v=nextGraph(owner,gid,b.dsl,b.owner_agent_code||'');save();return send({version:v.version,status:'draft',warnings:[]});}
      if(parts.length===3&&method==='GET'){const g=graphFor(owner,gid),v=g.versions.at(-1);return send({graph_id:gid,version:v.version,status:'draft',dsl:v});}
    }
    if(route==='/v1/runs') {
      if(method==='GET'){let rows=db.tasks.filter(t=>t.owner===owner);if(url.searchParams.get('agent'))rows=rows.filter(t=>runView(t).agent===url.searchParams.get('agent'));if(url.searchParams.get('status'))rows=rows.filter(t=>t.status===url.searchParams.get('status'));return send({items:rows.map(runView),total:rows.length});}
      if(method==='POST') {
        const b=await body(req),a=agentFor(owner,b.agent),v=versionFor(a,b.version);validateInput(a,v,b.input);
        const bound=graphFor(owner,v.graph_id),graph=b.graph?C.copy(b.graph):C.copy(bound.versions.find(g=>g.version===v.graph_version));
        const listed=graphFor(owner,graph.id);
        if(listed.agentCode!==a.code || graph.owner_agent_code&&graph.owner_agent_code!==a.code)fail('不能运行其他 Agent 的编排图',403);
        checkedGraph(graph);
        if(graph.nodes.some(n=>n.type==='cs_intake')){const existing=support.checkRequest(owner,b.input,a.code);if(existing)return send(runView(existing));}
        if(graph.nodes.some(n=>n.type==='ma_intake')){const existing=team.checkRequest(owner,b.input,a.code);if(existing)return send(runView(existing));}
        const video=graph.nodes.find(n=>n.type==='image_to_video');let image=null;
        if(video)image=decodeImage(b.input.image);
        const input=C.copy(b.input);if(image)input.image='[已上传的 '+image.extension.toUpperCase()+' 图片]';
        const extras={agentCode:a.code,agentVersion:v.version,graph,input,inputSchema:C.copy(v.input_schema),outputSchema:C.copy(v.output_schema),traceEvents:[],result:{}};
        if(graph.nodes.some(n=>n.type==='ma_intake')){const pending={...extras,owner};team.bindings(pending);extras.teamBindings=pending.teamBindings;}
        const task=await makeTask(owner,a,{prompt:typeof input.prompt==='string'?input.prompt:a.name,seconds:video?.config.seconds||0,ratio:video?.config.ratio||'',motion:video?.config.motion||''},image,a.name,extras);if(graph.nodes.some(n=>n.type==='cs_intake'))support.prepare(task);if(graph.nodes.some(n=>n.type==='ma_intake'))team.prepare(task);return send(runView(task),201);
      }
    }
    if(parts[1]==='runs'&&parts[2]) {
      const t=ownTask(owner,parts[2]);
      if(parts.length===3&&method==='GET')return send(runView(t));
      if(parts[3]==='events'&&method==='GET')return send({items:(t.traceEvents||[]).slice(Number(url.searchParams.get('start'))||0),status:t.status});
      if(parts[3]==='cancel'&&method==='POST'){cancelTask(t);voc.cancel(t);annotations.cancel(t);support.cancel(t);team.cancel(t);if(t.graph)finish(t,'cancelled','用户取消了运行');save();return send(runView(t));}
      if(parts[3]==='retry'&&method==='POST'){
        if(!['succeeded','failed','cancelled'].includes(t.status))fail('运行尚未结束',409);
        if(!t.graph)fail('旧任务请从已迁移的画布重新运行',409);
        if(t.teamId){const latest=ownTask(owner,team.view(t).run_id);if(latest.id!==t.id&&latest.status!=='failed')return send(runView(latest));if(t.status==='succeeded')return send(runView(t));if(t.status==='cancelled')fail('已取消协作请求请新建运行',409);}
        if(t.supportId){const latest=ownTask(owner,support.view(t).run_id);if(latest.id!==t.id&&latest.status!=='failed')return send(runView(latest));}
        if(t.supportId&&t.status==='succeeded')return send(runView(t));
        if(t.supportId&&t.status==='cancelled')fail('客服运行已取消，请使用新批次重新提交待答消息',409);
        if(t.planId&&voc.getPlan(owner,t.planId).status==='cancelled')fail('已取消工单不能按旧运行重试，请新建分析运行',409);
        const a=agentFor(owner,t.agentCode),extras={agentCode:t.agentCode,agentVersion:t.agentVersion,graph:C.copy(t.graph),input:C.copy(t.input),inputSchema:C.copy(t.inputSchema),outputSchema:C.copy(t.outputSchema),parentId:t.id,traceEvents:[],result:{}};
        const task=await makeTask(owner,a,{prompt:t.prompt,seconds:t.seconds,ratio:t.ratio,motion:t.motion},t.source,t.title,extras);if(t.supportId)support.prepare(task);if(t.teamId)team.prepare(task);return send(runView(task),201);
      }
    }
    fail('演示尚未接入此操作',501);
  }
  return {migrate,route,execute,finish,runView};
}

return createWorkflowService;
})();
// Included by build-pages.mjs after the shared service definitions.
const namespace='agent-console-pages:'+new URL('.',self.location.href).pathname;
const stamp=()=>new Date().toISOString();
const id=prefix=>prefix+'_'+crypto.randomUUID().replaceAll('-','');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
let db,storage,workflow,active=false,saveTimer,persistError;
let persistChain=Promise.resolve(),requests=Promise.resolve();
function openStore(){return new Promise((resolve,reject)=>{
  const req=indexedDB.open(namespace,1);
  req.onupgradeneeded=()=>req.result.createObjectStore('workspace');
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}
async function readStore(){return new Promise((resolve,reject)=>{
  const req=storage.transaction('workspace').objectStore('workspace').get('state');
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}
function save(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{flush().catch(()=>{});},60);
}
function flush(){
  clearTimeout(saveTimer);
  const snapshot=structuredClone(db);
  const next=persistChain.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
    const tx=storage.transaction('workspace','readwrite');
    tx.objectStore('workspace').put(snapshot,'state');
    tx.oncomplete=()=>{persistError=null;resolve();};
    tx.onerror=tx.onabort=()=>{persistError='浏览器保存空间不足或不可用，请导出结果后释放空间。';reject(new Error(persistError));};
  }));
  persistChain=next;return next;
}
const ownTask=(owner,key)=>{const t=db.tasks.find(t=>t.owner===owner&&t.id===key);if(!t)fail('运行不存在于当前浏览器工作区',404);return t;};
function cancelTask(t){if(['succeeded','failed','cancelled'].includes(t.status))return;t.status='cancelled';t.error='用户取消了运行';save();}
function resumeTask(t){t.status='queued';save();setImmediate(pump);}
function makeTask(owner,agent,params,source,title='',extras={}){
  if(db.tasks.length>=100)fail('当前浏览器已保留100条运行，请先导出所需结果并清理历史运行。',429);
  if(db.tasks.filter(t=>['queued','running'].includes(t.status)).length>=5)fail('已有5个请求处理中，请稍后再试。',429);
  const t={id:id('task'),owner,agentId:agent.id,agentName:agent.name,title,...params,status:'queued',progress:0,mode:'rules-demo',createdAt:stamp(),updatedAt:stamp(),events:[],source,output:null,error:null,...extras};
  db.tasks.unshift(t);save();setImmediate(pump);return t;
}
async function pump(){
  if(active||persistError)return;
  const task=db.tasks.findLast(t=>t.status==='queued');if(!task)return;
  active=true;task.status='running';task.progress=5;save();
  try{
    await workflow.execute(task,()=>fail('视频渲染需要视频服务；当前工作区支持VOC与客服规则流程。',501));
    if(!['waiting_human','cancelled'].includes(task.status)){
      task.status='succeeded';task.progress=100;workflow.finish(task,'succeeded');
    }
  }catch(e){if(task.status!=='cancelled'){task.status='failed';task.error=e.message;workflow.finish(task,'failed',e.message);}}
  finally{active=false;await flush().catch(()=>{});setImmediate(pump);}
}
async function initialize(){
  storage=await openStore();db=await readStore();
  if(!db)db={sessions:[{id:id('browser')}],agents:[],tasks:[]};
  for(const task of db.tasks)if(['running','queued'].includes(task.status)){
    task.status='failed';task.error='浏览器关闭中断了运行，请从运行记录重试。';
  }
  workflow=createWorkflowService({db,save,fail,stamp,id,makeTask,ownTask,cancelTask,resumeTask,
    decodeImage:()=>fail('图生视频需要视频服务；当前浏览器可运行VOC与智能客服。',501),
    json:(res,data,status=200)=>{res.result=structuredClone(data);res.status=status;},body:async req=>req.data||{}
  });
  workflow.migrate();await flush();return true;
}
const ready=initialize();
async function handle({route,method='GET',data}){
  await ready;
  if(persistError)fail(persistError,507);
  if(route==='/api/video/health')return {ok:true,rendererReady:false,provider:'browser-workflow-rules',modelConnected:false,version:'7.4.0',storage:'this-browser'};
  if(route==='/api/video/session')return {token:'browser-local',workspaceId:db.sessions[0].id};
  if(route==='/api/video/agents')return {items:[]};
  if(!route.startsWith('/api/video/console/v1/'))fail('此操作需要独立服务',501);
  const result={};
  await workflow.route({method,data},result,new URL(route,'https://browser.invalid'),db.sessions[0].id);
  await flush();return result.result;
}
self.onconnect=event=>{
  const port=event.ports[0];port.start();
  port.onmessage=({data})=>{
    // Serialize mutations across tabs while the task runner can yield for queries and reminders.
    requests=requests.catch(()=>{}).then(async()=>{
      try{port.postMessage({id:data.id,result:await handle(data)});}
      catch(e){port.postMessage({id:data.id,error:{message:e.message,status:e.status||500,code:e.code||'BROWSER_WORKSPACE_ERROR',details:e.details||[]}});}
    });
  };
};
