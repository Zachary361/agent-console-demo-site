/* VOC is another canvas capability; the original Agent/Graph/Run flow stays the entry. */
(() => {
  'use strict';
  const V=VocCore;
  Object.assign(FIELD_LABELS,{weights:'排序权重',low_rating_max:'低星上限',mode:'目标模式'});
  const config=(input,output)=>({input_path:{type:'string',default:input,required:true,desc:'读取本次输入或上游变量'},output_path:{type:'string',default:output,required:true,desc:'将结果写到 variables 下，供下游读取'}});
  const definitions={
    voc_tag:{label:'VOC 评论打标',desc:'匹配短问题标签，保留原声证据；场景搭配及明确自述信息单列。规则演示，图片不分析。',config:config('input','variables.tags')},
    voc_aggregate:{label:'VOC 归纳与排序',desc:'按同款独立评论统计频次、低星、严重度与点赞，显示可解释优先级。',config:{...config('input','variables.summary'),weights:{type:'object',default:V.defaultWeights,desc:'frequency 频次、low_rating 低星、severity 严重度、helpful 点赞；非负且合计100'},low_rating_max:{type:'integer',enum:[1,2,3],default:2,desc:'星级≤此值计为低星'}}},
    voc_workorders:{label:'创建 VOC 工单',desc:'为每个问题创建待确认工单，保留证据与原始排序。',config:config('variables.summary','variables.plan')},
    voc_review:{label:'设计师与企划确认',desc:'真实挂起本次运行。两个演示角色确认同一修订后继续；退回可修改重提。',config:config('variables.plan','variables.approved')},
    plm_task:{label:'创建演示 PLM 任务',desc:'仅从双方确认的工单创建演示任务，重复执行复用已有任务，未接真实 PLM。',config:{...config('variables.approved','variables.delivery'),mode:{type:'string',enum:['demo'],default:'demo',desc:'仅演示模式'}}}
  };
  for(const [type,meta] of Object.entries(definitions))TYPE_META[type]={cat:type==='voc_review'?'HITL':'CAP',color:type==='voc_review'?'#b45309':'#4f46e5',lifecycle:'demo',enabled:true,creatable:true,...meta};
  $('#palette').innerHTML=creatableNodeTypes().map(t=>`<option value="${t}">${esc(TYPE_META[t].label)} · ${t}</option>`).join('');
  const kind=()=>GRAPH.nodes.some(n=>n.type==='voc_tag')?'voc_tag':GRAPH.nodes.some(n=>n.type==='voc_aggregate')?'voc_analysis':'';
  const baseSample=generatedRunInput;generatedRunInput=function(){return kind()==='voc_tag'?WorkflowCore.copy(V.sample):kind()==='voc_analysis'?V.tagReviews(V.sample):baseSample();};
  const baseAfterPump=afterPump;afterPump=function(){baseAfterPump();if(kind()==='voc_analysis'&&LIVE?.runStatus==='waiting_human')toast('流程已暂停并保存 · 请到审核工作台完成双方确认');};
  const help=document.createElement('div');help.className='workflow-guide';help.id='vocInputHelp';help.dataset.workflowControl='true';help.hidden=true;
  help.innerHTML='<b>VOC 按款批量输入</b><p>一批一个款号，最多50条评论。图片仅接收链接；未知信息留空，不根据姓名、地区或图片推断。</p><div class="workflow-actions"><button type="button" class="btn sm" id="vocSample">填入虚构样例</button><a href="./voc-guide.html" target="_blank" rel="noopener">Schema 写法与完整示例</a></div><div id="vocSourceControls" class="workflow-actions"><select class="inp" id="vocSourceRun" aria-label="选择已完成的打标运行"></select><button type="button" class="btn sm" id="vocUseSource">使用这次打标结果</button></div><p id="vocInputFeedback" class="hint" role="status"></p>';
  $('#runInputEditor').before(help);let sourceRuns=[],sequence=0;
  function setInput(input){RUN_INPUT.text=JSON.stringify(input,null,2);$('#runInputEditor').value=RUN_INPUT.text;runInputEdited(RUN_INPUT.text);}
  $('#vocSample').onclick=()=>{setInput(generatedRunInput());$('#vocInputFeedback').textContent='已填入虚构样例，可编辑后校验运行。';};
  $('#vocUseSource').onclick=()=>{const run=sourceRuns.find(r=>r.run_id===$('#vocSourceRun').value);if(!run)return;setInput(run.output);$('#vocInputFeedback').textContent='已带入 '+run.output.style_code+' 的 '+run.output.tagged_reviews.length+' 条打标结果。';};
  const baseOpen=openRunInput;openRunInput=function(){baseOpen();const type=kind();help.hidden=!type;$('#vocSourceControls').hidden=type!=='voc_analysis';$('#vocInputFeedback').textContent='';const seq=++sequence;if(type!=='voc_analysis')return;$('#vocSourceRun').innerHTML='<option>正在读取打标运行…</option>';$('#vocUseSource').disabled=true;WorkflowAPI.request('/v1/runs').then(result=>{if(sequence!==seq)return;sourceRuns=result.items.filter(r=>r.status==='succeeded'&&Array.isArray(r.output?.tagged_reviews));$('#vocSourceRun').innerHTML=sourceRuns.length?sourceRuns.map(r=>`<option value="${attr(r.run_id)}">${esc(r.output.style_code)} · ${r.output.tagged_reviews.length} 条 · ${new Date(r.created_at*1000).toLocaleString()}</option>`).join(''):'<option value="">暂无打标结果，请先运行打标 Agent</option>';$('#vocUseSource').disabled=!sourceRuns.length;}).catch(e=>{$('#vocInputFeedback').textContent=e.message;});};
  const e=esc;
  window.VocUI=Object.freeze({renderResult(run){
    const out=run.output||{};
    if(Array.isArray(out.tagged_reviews))return `<div class="voc-summary"><b>${e(out.style_code)} · ${out.tagged_reviews.length} 条评论</b><p class="hint">规则演示，所有标签保留待核实标记。图片未分析。</p>${out.tagged_reviews.map(r=>`<details class="voc-review"><summary>${e(r.review_id)} · ${r.rating} 星 · ${r.issue_tags.length} 个问题标签</summary><p>${e(r.review_text)}</p><div>${r.issue_tags.map(t=>`<span class="voc-tag">${e(t.primary_label)} / ${e(t.secondary_label)}</span>`).join('')||'未匹配问题'}</div><p>场景：${e(r.usage_scenarios.join('、')||'未知')} · 搭配：${e(r.outfit_tags.join('、')||'未知')}</p><p>身高：${r.profile.height_cm??'未知'} cm · 体重：${r.profile.weight_kg??'未知'} kg<br>族裔自述：${e(r.profile.ethnicity)} · 价格表达：${e(r.profile.price_tag)}</p>${r.issue_tags.map(t=>`<blockquote>${e(t.secondary_label)}：${e(t.evidence)}</blockquote>`).join('')}</details>`).join('')}<p class="hint">下一步：在治理中打开「VOC 款式改善与工单」，在运行参数选择本次打标结果。</p></div>`;
    if(run.plan_id)return `<div class="voc-summary"><p>款号：${e(out.style_code||'见方案')} · ${out.tasks?.length??'待确认'} 项演示 PLM 任务</p><a class="btn primary" href="./review.html?plan=${encodeURIComponent(run.plan_id)}">查看工单、人工确认与 PLM 任务</a><p class="hint">两方确认后才生成任务；角色切换是演示，不代表企业身份认证。</p>${Array.isArray(out.tasks)?out.tasks.map(t=>`<p>${e(t.priority)} · ${e(t.title)} · ${e(t.status)}</p>`).join(''):''}</div>`;
    return '';
  }});
})();
