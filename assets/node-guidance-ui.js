(() => {
  'use strict';
  const guide=n=>NodeGuidance.describe(n,GRAPH,LIVE_CONTRACTS[canvasAgentCode()]||{},typeMeta(n.type));
  const json=(title,value)=>value===undefined?'':`<details class="ng-json"><summary>${esc(title)}</summary><pre>${esc(JSON.stringify(value,null,2))}</pre></details>`;
  function fields(schema,prefix='',depth=0,rows=[]){
    if(!schema)return rows;
    if(schema.type==='array')return fields(schema.items,prefix+'[]',depth,rows);
    for(const [name,s]of Object.entries(schema.properties||{})){if(!s)continue;const key=prefix?prefix+'.'+name:name;rows.push({key,type:Array.isArray(s.type)?s.type.join(' / '):s.type||'JSON',required:(schema.required||[]).includes(name),desc:s.description||'见下方完整结构与节点说明'});if(depth<2)fields(s,key,depth+1,rows);}return rows;
  }
  function table(schema){const rows=fields(schema);return rows.length?`<div class="ng-table-wrap"><table class="ng-table"><thead><tr><th>字段 / 类型</th><th>含义</th></tr></thead><tbody>${rows.map(r=>`<tr><td><code>${esc(r.key)}</code><small>${esc(r.type)}${r.required?' · 必填':''}</small></td><td>${esc(r.desc)}</td></tr>`).join('')}</tbody></table>`:`<p class="hint">${schema===null?'不产生业务输出；根据条件走对应连线。':schema?.type==='boolean'?'读取布尔值 true / false。':schema?.properties?'当前对象没有字段。':'沿用当前 Agent 契约；请在 Agent 配置中定义字段。'}</p>`;}
  const names=nodes=>nodes.map(n=>n.display_name||n.id).join('、');
  function panel(n){const d=guide(n);return `<div class="node-guide" data-testid="node-data-guide" data-workflow-control="true">
    <div class="ng-purpose"><b>这个节点做什么</b><p>${esc(d.purpose)}</p><p>${esc(d.how)}</p></div>
    <div class="ng-chain"><span>上一步：${esc(names(d.previous)||'运行参数')}</span><b>→ ${esc(n.display_name||n.id)} →</b><span>下一步：${esc(names(d.next)||'返回 Agent 结果')}</span></div>
    ${d.warning?`<p class="ng-warning" role="alert">${esc(d.warning)}</p>`:''}
    <div class="ng-io"><section><h4>输入 · 从哪里读取</h4><code class="ng-path">${esc(d.read)}</code><p class="hint">${d.producers.length?'上游写入：'+esc(names(d.producers)):'由本次运行参数或节点配置提供'}</p>${table(d.inputSchema)}${json('展开输入 '+d.schemaKind,d.inputSchema)}${json('查看输入样例（非本次运行）',d.example.input)}</section>
    <section><h4>输出 · 写到哪里</h4><code class="ng-path">${esc(d.write)}</code><p class="hint">${d.changed.length?'本步新增 / 更新：'+esc(d.changed.join('、')):'下游按路径读取；未展示的内部任务数据不代表可直接引用。'}</p>${table(d.outputSchema)}${json('展开输出 '+d.schemaKind,d.outputSchema)}${json('查看输出样例（非本次运行）',d.example.output)}</section></div>
    <p class="ng-exception"><b>异常与边界：</b>${esc(d.exception)}</p>
    <p class="hint">这里展示字段约定和说明样例；本次执行的真实数据在「试运行」页签查看。箭头决定执行顺序，输入 / 输出路径决定传递哪份数据。</p>
  </div>`;}
  window.NodeGuideUI=Object.freeze({guide,panel,table});
  const oldConfig=configFields;configFields=function(n){
    // The actual cumulative step contract is shown above. The historical model template
    // is not consumed by the deterministic executor and must not masquerade as runtime I/O.
    const schema=typeMeta(n.type).config,prior=schema?.model_output_schema,styleFields={tone:schema?.tone,empathy:schema?.empathy};
    if(n.type==='ma_step'&&(n.config.role!=='style'||n.config.stage!=='tone')){delete schema.tone;delete schema.empathy;}
    if(n.type==='ma_step')delete schema.model_output_schema;
    let html;try{html=oldConfig(n);}finally{if(prior)schema.model_output_schema=prior;for(const [k,v]of Object.entries(styleFields))if(v)schema[k]=v;}
    return panel(n)+'<div class="editor-section-title ng-settings">可编辑配置</div>'+html;
  };
  const oldPaths=configuredNodePaths;configuredNodePaths=function(n){const out=oldPaths(n),d=guide(n);if(n.config?.output_path&&d.outputSchema)schemaPathOptions(d.outputSchema,n.config.output_path,n.id+' · 节点输出',out);return out;};
  nodeContractSummary=function(n){const d=guide(n);return `<div class="path-contract" data-testid="node-contract-hint">读取 ${esc(d.read)} → 写入 ${esc(d.write)}。保存编排后，用本次运行输入验证。</div>`;};
  const oldOpen=openRunInput,box=document.createElement('div');box.id='canvasTestGuide';box.className='node-guide';box.dataset.workflowControl='true';$('#runInputEditor').before(box);
  openRunInput=function(){oldOpen();const schema=(LIVE_CONTRACTS[canvasAgentCode()]||{}).input_schema||{};box.innerHTML=`<b>如何测试这张画布</b><ol><li>先保存画布；选择场景并填入样例。</li><li>只改本次业务输入：客户消息、订单号、语言或评论。字段名、类型应符合下表。</li><li>点击「校验输入」，通过后「运行编排」。人工复核节点会暂停，完成确认后继续。</li><li>查看节点状态与「试运行」中的真实输入输出；总控切到「协作运行」检查回复、子任务、证据和异常。</li></ol><p>每次独立测试使用新的 request_id / conversation_id；消息 message_id 在一次会话中保持稳定。模拟超时、知识冲突等用场景选择器，避免只改消息却以为触发了故障。</p><details><summary>本 Agent 的运行参数字段</summary>${table(schema)}${json('完整输入 Schema',schema)}</details><p class="hint">运行参数 = 本次提交的数据；节点配置 = 处理规则。JSON 需要双引号，不支持注释或末尾多余逗号。无须先选择模型即可测试现有规则流程。</p>`;};
  // Details are drawn after registration; custom descriptions always take precedence.
  const oldDetail=renderDetail;renderDetail=function(){oldDetail();if(sel.kind!=='node')return;const n=GRAPH.nodes.find(n=>n.id===sel.id);if(!n)return;const help=$('#detailBody [data-tab="help"]');if(help)help.insertAdjacentHTML('afterbegin',panel(n));};
})();
