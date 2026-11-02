(() => {
  'use strict';
  const $=s=>document.querySelector(s),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={pending_review:'待双方确认',needs_changes:'退回 / 待重提',approved:'确认完成 · 创建任务中',completed:'已完成',cancelled:'已取消'};
  const roles={designer:'设计师',planner:'企划'};
  let plans=[],tasks=[],selected=new URLSearchParams(location.search).get('plan')||'',busy=false,dirty=false,timer;
  const request=(path,method='GET',data)=>VideoAPI.request('/api/video/console/v1'+path,method,data);
  function message(text,error=false){$('#message').textContent=text;$('#message').className=error?'voc-error':'voc-muted';}
  function current(){return plans.find(p=>p.id===selected);}
  function list(){const status=$('#statusFilter').value,rows=plans.filter(p=>status==='all'||p.status===status);$('#plans').innerHTML=rows.length?rows.map(p=>`<button class="voc-plan ${p.id===selected?'active':''}" data-plan="${escape(p.id)}"><b>${escape(p.style_code)}</b><br>${escape(labels[p.status])}<br><span class="voc-muted">${p.orders.length} 项问题 · 修订 ${p.revision} · ${new Date(p.created_at).toLocaleString()}</span></button>`).join(''):'<div class="voc-empty">此状态暂无方案</div>';}
  function render(){
    list();const p=current();if(!p){$('#detail').innerHTML='<div class="voc-card voc-empty">暂无方案。请在 Agent 画布运行 VOC 归纳流程。</div>';return;}
    const editable=['pending_review','needs_changes'].includes(p.status),e=escape;
    $('#detail').innerHTML=`<div class="voc-card"><h2>${e(p.style_code)} <span class="voc-state">${e(labels[p.status])}</span></h2><p>${p.sample_size} 条独立评论 · ${p.orders.length} 个问题 · 修订 ${p.revision}</p><p class="voc-muted">${e(p.note)}<br>方案 ${e(p.id)} · 来源运行 ${e(p.run_id)}</p><details><summary>排序依据与默认权重</summary><p>分数 = 频次权重 × 问题评论占比 + 低星权重 × 问题内低星占比 + 严重度权重 × 严重度/3 + 点赞权重 × min(点赞总数/20, 1)。默认 P1≥70，P2≥40，其余P3。</p><pre>${e(JSON.stringify(p.scoring,null,2))}</pre></details><div class="voc-approvals">${Object.entries(roles).map(([role,name])=>`<div class="voc-approval"><b>${name}</b><br>${p.approvals[role]?`已确认修订 ${p.approvals[role].revision}<br><span class="voc-muted">${e(p.approvals[role].note||'无补充意见')}</span>`:'尚未确认当前方案'}</div>`).join('')}</div></div>
    <div class="voc-card"><h2>问题工单 · 按优先级排序</h2>${p.orders.length?p.orders.map(o=>`<article class="voc-order" data-order="${e(o.id)}"><h3>${o.rank}. ${e(o.primary_label)} / ${e(o.secondary_label)} <span class="voc-state">${e(o.priority)}</span></h3><div class="voc-muted">${e(o.id)}<br>独立评论 ${o.count}/${o.sample_size} · 低星 ${o.low_count}/${o.count} · 点赞 ${o.helpful_count} · 严重度 ${o.severity}/3 · 分数 ${o.score}</div><details><summary>原声证据与分数组成</summary><p>频次 ${o.score_parts.frequency} + 低星 ${o.score_parts.low_rating} + 严重度 ${o.score_parts.severity} + 点赞 ${o.score_parts.helpful}</p>${o.evidence.map(v=>`<blockquote><b>${e(v.review_id)} · ${v.rating} 星</b><br>${e(v.quote)}</blockquote>`).join('')}</details><label>处理优先级 <select data-field="priority" ${editable?'':'disabled'}>${['P1','P2','P3'].map(v=>`<option${v===o.priority?' selected':''}>${v}</option>`).join('')}</select></label><label>建议处理动作<textarea data-field="suggestion" maxlength="500" ${editable?'':'disabled'}>${e(o.suggestion)}</textarea></label>${o.adjustment_reason?`<p class="voc-muted">调整原因：${e(o.adjustment_reason)} · 原建议 ${e(o.original_priority)}</p>`:''}${o.plm_task_id?`<a href="#${e(o.plm_task_id)}">查看对应 PLM 任务 ↓</a>`:''}</article>`).join(''):'<p>未发现匹配问题，无工单或 PLM 任务。</p>'}${editable?'<label for="changeReason">修改原因（保存修改时必填）</label><input id="changeReason" maxlength="300" placeholder="例如：首批试穿发现该问题影响更大"><div class="voc-actions"><button class="voc-btn" data-action="save">保存修改并重置双方确认</button></div>':''}</div>
    ${editable?`<div class="voc-card"><h2>人工确认</h2>${p.status==='needs_changes'?'<p>方案已退回或修改。检查处理动作后重新提交，双方需要重新确认。</p><button class="voc-btn primary" data-action="resubmit">重新提交双方确认</button>':`<label for="reviewRole">当前演示角色</label> <select id="reviewRole"><option value="designer">设计师</option><option value="planner">企划</option></select><label for="reviewNote"><p>确认意见（退回时必填）</p></label><textarea id="reviewNote" maxlength="300" placeholder="填写复核依据或需要补充的内容"></textarea><div class="voc-actions"><button class="voc-btn primary" data-action="approve">确认当前方案</button><button class="voc-btn danger" data-action="return">退回修改</button></div>`}</div>`:''}
    <div class="voc-card"><h2>演示 PLM 任务</h2>${tasks.filter(t=>t.plan_id===p.id).map(t=>`<article class="voc-order" id="${e(t.id)}"><h3>${e(t.priority)} · ${e(t.title)}</h3><p>${e(t.description)}</p><p class="voc-muted">任务 ${e(t.id)}<br>源工单 ${e(t.work_order_id)} · 确认修订 ${t.confirmed_revision}<br>责任角色：${e(t.assignees.join('、'))} · 状态：${e(t.status)}</p><p>${e(t.acceptance)}</p><span class="voc-state">演示记录 · 未写入真实 PLM</span></article>`).join('')||'<p class="voc-muted">尚未创建任务。只有设计师与企划确认当前修订后才会生成。</p>'}</div>
    <div class="voc-card"><h2>操作记录</h2>${[...p.history].reverse().map(h=>`<p><b>${e(({created:'方案创建',approved:'确认通过',returned:'退回修改',revised:'方案修订',resubmitted:'重新提交',plm_created:'创建演示任务',cancelled:'运行取消'})[h.action]||h.action)}</b> · ${e(roles[h.role]||h.role)} · 修订 ${h.revision}<br><span class="voc-muted">${new Date(h.at).toLocaleString()} ${e(h.note)}</span></p>`).join('')}</div>`;
  }
  async function refresh(){if(busy)return;if(dirty){message('请先保存当前修改；未保存的内容已保留。');return;}try{await VideoAPI.connect();const result=await Promise.all([request('/voc/plans'),request('/voc/plm-tasks')]);plans=result[0].items;tasks=result[1].items;if(!selected&&plans.length)selected=plans[0].id;render();message('已连接匿名工作区 · 任务与确认记录自动保存');clearTimeout(timer);if(plans.some(p=>p.status==='approved'))timer=setTimeout(refresh,1200);}catch(e){message(e.message,true);}}
  $('#refresh').onclick=refresh;$('#statusFilter').onchange=list;
  $('#plans').onclick=e=>{const button=e.target.closest('[data-plan]');if(!button)return;if(dirty){message('请先保存当前修改，再切换方案。',true);return;}selected=button.dataset.plan;history.replaceState(null,'','?plan='+encodeURIComponent(selected));render();};
  $('#detail').addEventListener('input',e=>{if(e.target.matches('[data-field],#changeReason'))dirty=true;});
  $('#detail').onclick=async e=>{
    const button=e.target.closest('[data-action]');if(!button||busy)return;const p=current(),action=button.dataset.action;if(!p)return;
    if(dirty&&action!=='save'){message('请先保存修改并重新提交，再确认。',true);return;}
    busy=true;button.disabled=true;
    try{
      if(action==='save'){
        const orders=[...document.querySelectorAll('[data-order]')].map(row=>({id:row.dataset.order,priority:row.querySelector('[data-field="priority"]').value,suggestion:row.querySelector('[data-field="suggestion"]').value}));
        await request('/voc/plans/'+p.id,'PATCH',{expected_revision:p.revision,orders,reason:$('#changeReason').value});
      }else if(action==='resubmit')await request('/voc/plans/'+p.id+'/resubmit','POST',{expected_revision:p.revision});
      else await request('/voc/plans/'+p.id+'/decisions','POST',{expected_revision:p.revision,role:$('#reviewRole').value,action,note:$('#reviewNote').value});
      dirty=false;busy=false;await refresh();message(action==='save'?'修改已保存，旧确认已清空；请重新提交。':action==='return'?'已退回，运行继续等待修改与重新确认。':'操作已保存；双方确认后自动继续画布。');
    }catch(error){busy=false;button.disabled=false;message(error.message,true);}
  };
  refresh();
})();
