/* Extend the original wizard, canvas, runtime inspector and trace view. */
(() => {
  'use strict';
  const C=window.WorkflowCore,api=window.WorkflowAPI;
  Object.assign(FIELD_LABELS,{image_path:'图片来源',prompt_path:'提示词来源',seconds:'视频时长（秒）',ratio:'视频画幅',motion:'镜头运动'});
  for(const [type,meta] of Object.entries(TYPE_META))if(!['start','llm','end'].includes(type)){meta.enabled=false;meta.creatable=false;}
  TYPE_META.start.config={copy_input:{type:'boolean',default:true,desc:'将本次 input 复制到 variables'}};
  TYPE_META.end.config={source_path:{type:'string',default:'variables',required:true,desc:'返回上游结果，例如 variables.video'}};
  TYPE_META.llm={...TYPE_META.llm,label:'模板输出（演示）',desc:'以 mock_output 生成结构化模板结果，未调用模型',config:{mock_output:{type:'object',default:{greeting:'你好，{{input.name}}！'},desc:'可用 {{input.name}} 等上游变量'},output_path:{type:'string',default:'variables.answer',required:true,desc:'结果写入变量路径'}}};
  TYPE_META.image_to_video={label:'图生视频',cat:'CAP',color:'#4f46e5',lifecycle:'demo',enabled:true,creatable:true,default_timeout:90,desc:'将开始节点提供的图片编码为镜头动效 MP4。未接 AI 模型；提示词仅记录，镜头由本节点配置决定。',config:{
    image_path:{type:'string',default:'input.image',required:true,desc:'来源为运行参数中上传的图片：input.image'},
    prompt_path:{type:'string',default:'input.prompt',required:true,desc:'提示词所在路径，演示只保存文字'},
    seconds:{type:'integer',enum:[3,5,8],default:5,required:true,desc:'生成视频的时长'},
    ratio:{type:'string',enum:['landscape','portrait','square'],default:'landscape',required:true,desc:'landscape 横屏 16:9；portrait 竖屏 9:16；square 方形'},
    motion:{type:'string',enum:['zoom','pan','static'],default:'zoom',required:true,desc:'zoom 推近；pan 平移；static 静态'},
    output_path:{type:'string',default:'variables.video',required:true,desc:'视频结果写入路径；结束节点从此处读取'}
  }};
  const originalOptionName=fieldOptionDisplayName;
  fieldOptionDisplayName=(key,value)=>({ratio:{landscape:'横屏 16:9',portrait:'竖屏 9:16',square:'方形 1:1'},motion:{zoom:'缓慢推近',pan:'横向平移',static:'静态展示'}}[key]?.[value]||originalOptionName(key,value));
  $('#palette').innerHTML=creatableNodeTypes().map(t=>`<option value="${t}">${esc(TYPE_META[t].label)} · ${t}</option>`).join('');
  const connection=document.createElement('div');connection.className='workflow-connection';connection.dataset.workflowControl='true';connection.innerHTML='<span id="workflowConnection">正在连接匿名工作区…</span><button class="btn sm" id="workflowReconnect">重新连接</button>';
  $('#view-govern .page-h').after(connection);
  window.addEventListener('workflow-connection',e=>{const el=$('#workflowConnection');el.textContent=e.detail.message;el.classList.toggle('error',!e.detail.ok);});
  $('#workflowReconnect').onclick=async()=>{try{await api.reconnect();await loadGraphList();await loadGov(GOV.code);}catch(e){toast(e.message);}};
  const note=document.createElement('div');note.className='workflow-guide';note.textContent='新建 Agent → 定义输入输出 → 编排画布 → 保存并试运行 → 查看追踪。可从空白画布或示例模板开始。';$('#view-govern .page-h').after(note);
  const canvasNote=document.createElement('div');canvasNote.className='workflow-guide';canvasNote.textContent='双击节点编辑配置，从输出圆点拖向下一节点连线。用 input.* 读取本次输入，用 variables.* 传递结果；结束节点读取最终输出。';$('#view-canvas .page-h').after(canvasNote);
  const template=document.createElement('div');template.className='fld wide';template.innerHTML='<label for="wTemplate">起始编排</label><select class="inp" id="wTemplate"><option value="welcome">欢迎语模板（最小示例）</option><option value="blank">空白画布（手动添加、连接节点）</option><option value="video">图生视频模板</option><option value="voc_tag">VOC 评论打标模板</option><option value="voc_analysis">VOC 款式改善与双确认工单模板</option><option value="support">多语言智能客服模板（基础）</option><option value="support_team">智能客服多 Agent 协作模板</option></select><div class="hint">模板只提供起点，运行时执行你在画布中配置的节点和连线。</div>';$('#wizStep1 .frm').prepend(template);
  const applyTemplate=()=>{
    const kind=$('#wTemplate').value,welcome=kind==='welcome';
    $('#wIn').value=JSON.stringify(kind==='support_team'?SupportTeam.inputSchema:kind==='support'?SupportCore.inputSchema:kind==='voc_tag'?VocV2.inputSchema:kind==='voc_analysis'?VocV2.analysisInput:welcome?C.welcomeInput:kind==='blank'?{type:'object'}:C.inputSchema,null,2);
    $('#wOut').value=JSON.stringify(kind==='support_team'?SupportTeam.outputSchema:kind==='support'?SupportCore.outputSchema:kind==='voc_tag'?VocV2.outputSchema:kind==='voc_analysis'?VocV2.analysisOutput:welcome?C.welcomeOutput:kind==='blank'?{type:'object'}:C.outputSchema,null,2);
    $('#wContextPolicy').value='{}';$('#wPublish').checked=false;$('#wPublish').disabled=true;
    wizPreview();
  };
  $('#wTemplate').onchange=applyTemplate;
  const originalWizard=openWizard;
  openWizard=async function(mode,opts){await originalWizard(mode,opts);template.hidden=mode==='version';if(mode!=='version'){applyTemplate();$('#wProject').value='demo';}$('#wPublish').checked=false;$('#wVis').value='internal';$('#wVis').disabled=true;};
  for(const sel of ['#wContextPolicy','#wQps','#wTokens','#wPublish'])$(sel).closest('.fld').hidden=true;
  $('#wCode').placeholder='demo.my_assistant';$('#wName').placeholder='业务助手';
  const originalStarter=starterGraphDsl;
  starterGraphDsl=(gid,name)=>WIZ.mode==='agent'?C.templateGraph(gid,name,$('#wTemplate').value,$('#wCode').value.trim()):originalStarter(gid,name);
  const originalGraphOptions=renderWizardGraphOptions;
  renderWizardGraphOptions=function(){originalGraphOptions();if(WIZ.mode==='agent'&&!GRAPH_LIST_ERROR){const select=$('#wGraph');if(![...select.options].some(o=>o.value==='__auto__'))select.insertAdjacentHTML('afterbegin','<option value="__auto__">按所选起点创建独立编排图</option>');const auto=[...select.options].find(o=>o.value==='__auto__');if(auto)auto.textContent='按所选起点创建独立编排图';select.value='__auto__';$('#wGraphHint').textContent='新 Agent 拥有独立编排图，可在创建后进入画布编辑。';}};
  // Keep binary image data out of the original JSON case/localStorage editor.
  const images=new Map();
  const upload=document.createElement('div');upload.id='canvasImageInput';upload.className='workflow-upload';upload.dataset.workflowControl='true';upload.hidden=true;
  upload.innerHTML='<div><label for="canvasImageFile">本次运行图片</label><input id="canvasImageFile" type="file" accept="image/png,image/jpeg"><button type="button" class="btn sm" id="canvasImageExample">使用示例图片</button></div><img id="canvasImagePreview" alt="本次运行图片预览" hidden><div class="hint" id="canvasImageStatus">选择 PNG/JPEG，最大 4 MB。时长、画幅、镜头在图生视频节点中设置。</div><div class="workflow-error" id="canvasImageError" role="alert"></div>';
  $('#runInputEditor').before(upload);
  function needsImage(){return GRAPH.nodes.some(n=>n.type==='image_to_video');}
  function showImage(){const image=images.get(canvasAgentCode());upload.hidden=!needsImage();$('#canvasImagePreview').hidden=!image;$('#canvasImagePreview').src=image?.data||'';$('#canvasImageStatus').textContent=image?image.name+' · 已选中，仅用于本次运行':'请选择 PNG/JPEG 或使用示例图片；视频参数在画布节点中设置。';$('#canvasImageError').textContent='';}
  async function setImage(file){
    if(!file||!['image/png','image/jpeg'].includes(file.type)||file.size>4*1024*1024)throw Error('请选择 4 MB 以内的 PNG/JPEG');
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('图片读取失败'));r.readAsDataURL(file);});
    const test=new Image();test.src=data;await test.decode();if(test.width>4096||test.height>4096||test.width*test.height>16000000)throw Error('图片尺寸超过 4096 像素或 1600 万像素');
    images.set(canvasAgentCode(),{data,name:file.name});showImage();
    const parsed=JSON.parse(RUN_INPUT.text||'{}');parsed.image='[使用上方选中的图片]';RUN_INPUT.text=JSON.stringify(parsed,null,2);$('#runInputEditor').value=RUN_INPUT.text;persistRunInput();
  }
  $('#canvasImageFile').onchange=async e=>{try{await setImage(e.target.files[0]);}catch(err){images.delete(canvasAgentCode());showImage();$('#canvasImageError').textContent=err.message;}};
  $('#canvasImageExample').onclick=async()=>{try{const r=await VideoAPI.nativeFetch('./assets/video-sample.png');if(!r.ok)throw Error('示例图片加载失败');await setImage(new File([await r.blob()],'示例山湖.png',{type:'image/png'}));}catch(e){$('#canvasImageError').textContent=e.message;}};
  const originalOpenInput=openRunInput;openRunInput=function(){originalOpenInput();showImage();};
  const originalGenerated=generatedRunInput;generatedRunInput=function(){const value=originalGenerated();if(needsImage()){value.image='[请先上传图片]';if(value.prompt==='demo')value.prompt='镜头平稳移动，保持画面清晰。';}return value;};
  const originalParse=parseRunInput;parseRunInput=function(){const p=originalParse();if(p.ok&&needsImage()){const image=images.get(canvasAgentCode());if(image)p.input.image=image.data;else if(!String(p.input.image||'').startsWith('data:image/'))return {ok:false,code:'IMAGE_REQUIRED',message:'请在运行参数中上传图片或使用示例图片',details:[]};}return p;};
  const livePanel=document.createElement('div');livePanel.id='canvasWorkflowResult';livePanel.className='panel-sec workflow-result';livePanel.dataset.workflowControl='true';livePanel.hidden=true;$('#runtimeInspector [data-runtime-pane="run"]').append(livePanel);
  const tracePanel=document.createElement('div');tracePanel.id='traceWorkflowResult';tracePanel.className='workflow-result';tracePanel.dataset.workflowControl='true';tracePanel.hidden=true;$('#traceTitle').closest('.card').querySelector('.card-h').after(tracePanel);
  const urls=new Map(),sequences=new WeakMap();
  async function videoURL(path){if(!urls.has(path))urls.set(path,URL.createObjectURL(await VideoAPI.request(path,'GET',undefined,true)));return urls.get(path);}
  async function showResult(panel,runId){
    const seq=(sequences.get(panel)||0)+1;sequences.set(panel,seq);
    if(!runId?.startsWith('task_')){panel.hidden=true;return;}
    panel.hidden=false;
    try {
      const r=await api.request('/v1/runs/'+runId);if(sequences.get(panel)!==seq)return;
      if(panel===livePanel){const voc=r.mode==='rules-demo';$('#runtimeInspector').classList.toggle('voc-runtime',voc);if(voc)panel.parentElement.prepend(panel);else panel.parentElement.append(panel);}
      const key=r.run_id+':'+r.status+':'+r.progress+':'+(r.support?.conversations.reduce((sum,c)=>sum+c.replies.length,0)||0)+':'+(r.team?.replies.length||0)+':'+(r.team?.calls.length||0);if(panel.dataset.key===key&&(!r.hasVideo||panel.querySelector('video')))return;panel.dataset.key=key;
      const done=['succeeded','failed','cancelled'].includes(r.status),state={queued:'排队中',running:'执行中',succeeded:'已完成',failed:'失败',cancelled:'已取消',waiting_human:r.annotation_id?'等待标签人工复核':'等待设计师与企划确认'}[r.status];
      panel.innerHTML=`<div class="workflow-result-head"><b>编排结果</b><span class="badge ${r.status==='succeeded'?'ok':r.status==='failed'?'fail':'wait'}">${state}</span></div><div class="hint mono">${esc(r.agent)} · ${esc(r.graph_id||'历史视频任务')} · ${esc(r.graph_version)}</div>${r.error?`<div class="workflow-error" role="alert">${esc(r.error.message)}</div>`:''}${r.hasVideo?'<div class="workflow-media">正在加载视频…</div><div class="hint">图片镜头动效 · 未调用 AI 视频模型</div>':r.status==='succeeded'?`<pre>${esc(JSON.stringify(r.output,null,2))}</pre>`:'<p class="hint">可在运行日志和节点输出中查看执行过程。</p>'}<div class="workflow-actions">${r.hasVideo?'<button class="btn sm primary" data-action="download">下载 MP4</button>':''}${!done?'<button class="btn sm" data-action="cancel">取消运行</button>':!r.legacy?'<button class="btn sm" data-action="retry">按本次编排重试</button>':''}${panel===livePanel?'<button class="btn sm" data-action="trace">查看运行追踪</button>':''}</div>`;
      panel.onclick=async e=>{const btn=e.target.closest('[data-action]');if(!btn)return;btn.disabled=true;try{const act=btn.dataset.action;if(act==='download'){const link=document.createElement('a');link.href=await videoURL(r.videoPath);link.download='canvas-'+r.run_id+'.mp4';link.click();}else if(act==='trace'){await loadServerRuns();go('trace',{noLoad:true});renderTrace(r.run_id);}else if(act==='cancel'){await api.request('/v1/runs/'+r.run_id+'/cancel','POST',{});panel.dataset.key='';await showResult(panel,r.run_id);}else if(act==='retry'){const next=await api.request('/v1/runs/'+r.run_id+'/retry','POST',{});await loadServerRuns();go('trace',{noLoad:true});renderTrace(next.run_id);}}catch(err){toast(err.message);}finally{btn.disabled=false;}};
      if(window.VocUI){const html=VocUI.renderResult(r);if(html){panel.querySelector('pre')?.remove();panel.querySelector('.workflow-actions').insertAdjacentHTML('beforebegin',html);}}
      if(window.SupportTeamUI){const html=SupportTeamUI.renderResult(r);if(html){panel.querySelector('pre')?.remove();panel.querySelector('.workflow-actions').insertAdjacentHTML('beforebegin',html);}}
      if(window.SupportUI){const html=SupportUI.renderResult(r);if(html){panel.querySelector('pre')?.remove();panel.querySelector('.workflow-actions').insertAdjacentHTML('beforebegin',html);}}
      if(r.plan_id||r.annotation_id||r.support||r.team)panel.querySelector('[data-action="retry"]')?.remove();
      if(r.hasVideo){const url=await videoURL(r.videoPath);if(sequences.get(panel)!==seq)return;const v=document.createElement('video');v.controls=true;v.playsInline=true;v.preload='metadata';v.src=url;panel.querySelector('.workflow-media').replaceChildren(v);}
    }catch(e){if(sequences.get(panel)===seq){panel.textContent='结果读取失败：'+e.message;panel.dataset.key='';}}
  }
  window.addEventListener('workflow-run',e=>{livePanel.dataset.key='';showResult(livePanel,e.detail.run_id);});
  const originalLiveEvent=liveEvent;liveEvent=function(ev){originalLiveEvent(ev);if(['run_end','run_paused','support_reply','team_reply','team_child_finished'].includes(ev.type))showResult(livePanel,ev.run_id);};
  const originalTrace=renderTrace;renderTrace=function(id){originalTrace(id);showResult(tracePanel,TRACE_SELECTED_RUN_ID);};
  const originalReset=resetRun;resetRun=function(){originalReset();livePanel.hidden=true;livePanel.dataset.key='';};
  const originalWizardBody=wizBody;wizBody=function(){return originalWizardBody().replace('<start → end 最小编排图>','<所选模板生成的可编辑画布>');};
  api.connect().then(()=>{$('#workflowConnection').textContent='匿名工作区已连接 · Agent、编排与运行自动保存';}).catch(e=>{$('#workflowConnection').textContent='后端连接失败：'+e.message;});
  go('govern',{noLoad:true});
})();
