
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function go(v, opts){
  if(v !== 'canvas' && CANVAS_FOCUS.active) setCanvasFocus(false);
  $$('.view').forEach(e=>e.classList.remove('active'));
  $('#view-'+v).classList.add('active');
  $$('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.view===v));
  $('.views').scrollTop = 0;
  if(v === 'canvas') requestAnimationFrame(() => { resetCanvasSize(); ensureGraphViewportVisible(); });
  if(v === 'canvas') refreshReviewTemplateCatalog();
  if(v === 'overview') refreshSummary();
  if(v === 'builder') loadBuilderPage();
  if(v === 'trace' && MODE === 'live' && !(opts && opts.noLoad)) loadServerRuns();
  scheduleTraceAutoRefresh(v === 'trace' && MODE === 'live');
  if(v === 'capabilities') renderCapabilityCatalog();
  // 向导创建完会自己 govSelect 新 agent；这里不能再触发一次 loadGov(GOV.code)，
  // 否则它会异步把详情覆盖回切换前的那个 agent（看着像"新建了但页面没动"）。
  if(v === 'govern' && !(opts && opts.noLoad)) loadGov(GOV.code);
  if(v === 'obs') loadObs();
  if(v === 'context') loadMemoryWorkbench();
  if(v === 'knowledge' && !(opts && opts.noLoad)) loadKnowledgePage(KNOWLEDGE_GOV.code);
  if(v === 'prompt') loadPromptPage();
  if(v === 'review-template') loadReviewTemplatePage(REVIEW_TEMPLATE_GOV.code);
  if(v === 'model') loadModelPage(MODEL_GOV.code);
  if(v === 'credential') loadCredentialPage(CREDENTIAL_GOV.code);
  if(v === 'skill') loadSkillPage(SKILL_GOV.code);
  if(v === 'evaluation') loadEvaluationPage(EVAL_GOV.code);
  if(v === 'trigger') loadTriggerPage(TRIGGER_GOV.code);
  if(v === 'node') loadNodePage(NODE_GOV.selected);
  if(v === 'project') loadProjectPage(PROJECT_GOV.code);
  if(v === 'account') loadAccountPage();
  scheduleObsRuntimeRefresh(v === 'obs');
  if(v !== 'evaluation') stopEvaluationPolling();
  if(v !== 'knowledge') knowledgeStopPolling();
}
$$('.nav-item').forEach(n=>n.onclick=()=>{
  if(n.dataset.href){ location.href = n.dataset.href; return; }
  go(n.dataset.view);
});

let toastTimer;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('on'), 1800);
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const attr = s => esc(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fmt = n => n.toLocaleString('en-US');
const FIELD_LABELS = {
  code:'编码',name:'名称',description:'说明',project_code:'所属项目',owner_dept:'责任部门',owner_user:'负责人',
  visibility:'可见性',tags:'标签',status:'状态',version:'版本引用',input_schema:'输入契约',output_schema:'输出契约',
  context_policy:'上下文策略',capabilities:'能力标签',tenant_id:'租户',owner_agent_code:'负责人 Agent',
  left_path:'左值路径',operator:'运算符',right:'右值',seconds:'等待秒数',output_path:'输出路径',source_path:'来源路径',
  target_type:'目标节点类型',target_config:'目标节点配置',max_retries:'最大重试次数',retry_on:'重试范围',
  retry_delay_seconds:'重试间隔秒数',attempt_timeout_seconds:'单次尝试超时秒数',idempotency_policy:'幂等策略',
  idempotency_key_field:'幂等键字段',failure_strategy:'失败策略',fallback_value:'兜底值',fallback_path:'兜底写入路径',
  error_path:'错误写入路径',event_name:'事件名称',correlation_path:'关联值路径',timeout_seconds:'超时秒数',
  items_path:'数组路径',skill_code:'Skill 编码',agent:'子 Agent',input_mode:'输入模式',item_key:'元素字段名',
  static_input:'固定输入',concurrency:'并发数',failure_policy:'失败处理',question:'审核问题',review_input_path:'审核内容路径',approver_type:'审核人类型',
  approver_ids:'审核人标识',form_schema:'审核表单 Schema',sla_seconds:'审核时限秒数',timeout_action:'超时动作',
  review_template:'审核模板',template_version:'审核模板版本',escalate_after_seconds:'升级等待秒数',escalation_role_codes:'升级角色编码',branch_output_path:'分支输出路径',
  merge_strategy:'合并策略',conflict_policy:'冲突策略',include_errors:'包含错误',query_path:'查询路径',
  knowledge_base:'知识库',retrieval_mode:'召回模式',top_k:'最终返回数',candidate_top_n:'候选数量',rerank:'启用重排',
  rerank_required:'重排必须成功',rerank_min_score:'重排最低分',include_session:'包含会话上下文',model_ref:'模型引用',
  model_version:'模型版本',prompt_key:'Prompt 节点键',prompt_name:'Prompt 模板名称',input_path:'输入路径',mock_output:'模拟输出',
  mode:'模式',max_iterations:'最大迭代次数',continue_path:'继续条件路径',counter_path:'循环状态路径',limit_policy:'达到上限策略',
  content_path:'正文路径',title_path:'标题路径',title:'固定标题',memory_type:'记忆类型',importance:'重要度',index:'建立索引',
  join_node:'汇总节点',max_concurrency:'最大并发数',schema:'JSON Schema',result_path:'校验结果路径',copy_input:'复制输入',
  load_context:'加载上下文',delegation_policy:'委托策略',selector_path:'路由值路径',cases:'分支规则',default_route:'默认分支',
  match_mode:'匹配模式',mapping:'字段映射',constants:'固定值',defaults:'默认值',templates:'文本模板',casts:'类型转换',
  projections:'字段投影',sensitivity:'敏感级别',retention_days:'保留天数',max_content_chars:'单条正文上限',
  daily_write_quota:'每日写入配额',allowed_agents:'允许使用的 Agent',allowed_roles:'授权角色',sort_order:'排序',
  provider:'模型服务商',model_name:'实际模型名',base_url:'基础地址',credential_ref:'平台凭证',timeout_s:'超时秒数',
  input_price_per_m:'输入单价',output_price_per_m:'输出单价',fallback_model_ref:'备用模型',fallback_version:'备用版本',
  credential_type:'凭证类型',environment:'环境',expires_at:'过期时间',dataset_code:'数据集编码',agent_code:'所属 Agent',
  min_pass_rate:'最低通过率',max_p95_latency_ms:'P95 最大耗时',max_avg_tokens:'平均 Token 上限',required_tags:'必过标签',
  require_no_regression:'不得低于基线',allow_side_effects:'允许真实副作用',assertions:'断言',trigger_type:'触发器类型',
  agent_version_ref:'Agent 版本引用',input_template:'Agent 输入模板',callback_url:'完成回调地址',cron:'Cron 表达式',
  timezone:'时区',match:'匹配条件',signature_ttl_s:'签名有效期秒数',impl_type:'实现类型',impl_config:'实现配置',retries:'重试次数',
  entrypoint:'入口函数',language:'语言',runtime:'运行时',timeout_ms:'执行超时毫秒数',memory_mb:'Heap 上限 MB',
  max_output_bytes:'输出上限 bytes',max_log_bytes:'日志上限 bytes',source:'源码',category:'分类',
  graph_id:'绑定编排图',error_codes:'错误码',qps:'QPS 配额',daily_tokens:'每日 Token 配额',
  range_seconds:'时间范围',file:'文件',parse_mode:'PDF 解析方式',chunk_size:'切片长度',chunk_overlap:'重叠字符',
  api_key_location:'API Key 位置',parameter_name:'参数名称',limits:'运行限制',notes:'改动说明',
  system:'系统提示词',user:'用户模板',vars:'模板变量',node:'节点',
  use_milvus:'使用 Milvus 召回',use_redis:'使用 Redis 槽位',publish_after_create:'创建后评测并发布',
};
function fieldDisplayName(key, title=''){
  const raw=String(key||'').trim(), preferred=String(title||'').trim();
  const chinese=(preferred&&preferred!==raw?preferred:FIELD_LABELS[raw])||preferred||raw;
  if(!raw)return chinese;
  if(chinese===raw)return `配置项（${raw}）`;
  if(chinese.includes(`（${raw}）`)||chinese.includes(`(${raw})`))return chinese;
  return `${chinese}（${raw}）`;
}

const FIELD_HELP = {
  code:'资源的唯一编码，用于 API、引用关系和审计记录；创建后通常不可修改。',
  name:'面向使用者显示的名称，可以修改，不影响已有 API 引用。',
  description:'说明该资源的用途、适用范围和使用边界。',
  project_code:'资源归属的业务项目，用于目录、权限范围和统计筛选。',
  owner_dept:'负责维护该资源的部门。',owner_user:'主要负责人，用于治理、审计和异常联系。',
  visibility:'控制资源的可见范围；internal 仅内部可见，public 表示平台公开可见。',
  tags:'用于检索、分类和治理筛选的标签集合。',status:'控制资源当前是否可以继续使用。',
  version:'要解析的版本号或别名；stable 通常指向已验证的稳定版本。',
  input_schema:'定义输入 JSON 的字段、类型、必填项和附加字段策略。',
  output_schema:'定义输出 JSON 的字段、类型和必填项，运行结束时会据此校验。',
  context_policy:'控制上下文召回、排序、压缩、去噪、漂移防护和预算。',
  graph_id:'绑定 Agent 实际执行的编排图。',error_codes:'声明该 Agent 可能返回的业务错误码。',
  qps:'单个 Agent 每秒允许接收的最大请求数量。',daily_tokens:'单个 Agent 每日允许消耗的 Token 上限。',
  target_type:'error_boundary 内部实际执行并保护的节点类型。',
  target_config:'被保护目标节点的完整配置；该目标会在 error_boundary 内部执行，不需要在画布上重复放置。',
  max_retries:'首次执行失败后的额外重试次数；总尝试次数等于 1 + max_retries。',
  retry_on:'决定哪些异常进入重试；retryable 只重试可恢复异常，all 会重试所有异常。',
  retry_delay_seconds:'相邻两次尝试之间的等待时间，不包含目标节点自身执行耗时。',
  attempt_timeout_seconds:'每一次被保护调用的独立超时，不是整个 error_boundary 的总超时。',
  idempotency_policy:'控制有副作用的目标在重试时如何避免重复执行；inject 只负责注入幂等键，下游仍需实现去重。',
  idempotency_key_field:'inject 策略写入目标输入对象的幂等字段名。',
  failure_strategy:'所有尝试失败后的处理方式：直接失败、返回兜底值或进入补偿分支。',
  fallback_value:'fallback 策略使用的固定降级结果。',fallback_path:'fallback 结果写入的 variables.* 路径。',
  error_path:'结构化错误详情写入的 variables.* 路径，包含错误码、消息、可重试标记和尝试次数。',
  input_path:'从 AgentState 读取当前节点输入的路径。',output_path:'节点成功结果写入 AgentState 的路径。',
  source_path:'从 AgentState 读取最终结果或来源数据的路径。',
  review_input_path:'human 节点暂停时快照并展示的数据路径；审核前、拟通过结果及修改后通过都以该值为基础。路径不存在时运行直接失败，不会创建空审核任务。',
  review_template:'审核模板治理中的模板编码；留空时继续使用通用 JSON 审核界面。',
  template_version:'审核模板的已发布版本或 stable/latest 别名；进入等待时会解析并固化具体版本快照。',
  model_ref:'模型治理中的模型编码；留空时使用平台全局默认模型。',model_version:'模型版本号或 stable/latest 别名。',
  prompt_key:'Prompt 治理中与当前节点对应的键。',prompt_name:'要使用的 Prompt 模板名称。',
  mock_output:'仅在模拟运行模式使用的固定模型输出。',skill_code:'Skill Registry 中已登记的能力编码。',
  agent:'子图要调用的子 Agent 编码。',knowledge_base:'要读取或写入的知识库编码。',
  retrieval_mode:'知识检索的召回方式。',candidate_top_n:'初始召回后送入重排模型的候选数量。',
  top_k:'重排和最低分过滤后最终返回的最大结果数量。',rerank:'是否使用重排模型重新计算候选相关度。',
  rerank_required:'重排服务不可用时是否让节点直接失败。',rerank_min_score:'过滤低相关结果的最低重排分数。',
  provider:'模型连接使用的服务协议或供应商类型。',model_name:'发送给模型服务的实际模型标识。',
  base_url:'模型兼容接口的基础地址，通常以 /v1 结尾。',credential_ref:'凭证治理中保存的凭证引用，不会把密钥正文写入配置。',
  timeout_s:'单次外部调用的超时秒数。',retries:'首次失败后的额外重试次数。',
  fallback_model_ref:'主模型不可用时切换的备用模型。',fallback_version:'备用模型使用的版本或别名。',
  input_price_per_m:'每一百万输入 Token 的参考单价，用于内部用量估算。',output_price_per_m:'每一百万输出 Token 的参考单价。',
  credential_type:'凭证的认证方式。',environment:'凭证或资源所属环境，运行时只允许使用当前环境的有效凭证。',
  expires_at:'凭证过期时间；过期后不再允许新调用使用。',
  'auth.credential_ref':'Skill 调用使用的托管凭证引用，密钥正文不会进入 Skill 配置。','auth.in':'API Key 写入 HTTP Header 或 Query 参数的位置。','auth.name':'发送 API Key 时使用的 Header 或 Query 参数名称。',
  trigger_type:'触发 Agent Run 的方式。',agent_code:'目标或所属 Agent 的唯一编码。',
  agent_version_ref:'触发时使用的 Agent 版本号或别名。',input_template:'触发事件转换成 Agent 输入的 JSON 模板。',
  callback_url:'Agent Run 完成后接收结果通知的回调地址。',cron:'五段式定时表达式：分、时、日、月、周。',
  timezone:'解释 Cron 表达式使用的 IANA 时区。',match:'事件触发器的字段匹配条件。',signature_ttl_s:'Webhook 时间戳允许的最大偏差，用于防止重放攻击。',
  impl_type:'Skill 的执行实现类型。',impl_config:'实现连接、请求映射或运行参数的 JSON 配置。',
  category:'Skill 或资源的业务分类。',capabilities:'描述模型或 Skill 能力的标签集合。',
  language:'脚本源码语言。',runtime:'执行脚本使用的隔离运行时版本。',entrypoint:'脚本被调用的入口函数名。',
  timeout_ms:'脚本单次执行时间上限。',memory_mb:'脚本运行时允许使用的最大 Heap。',
  max_output_bytes:'脚本返回结果的最大字节数。',max_log_bytes:'脚本单次执行保留的最大日志字节数。',source:'Skill 的 JavaScript 源码。',
  dataset_code:'发布门禁使用的评测数据集编码。',min_pass_rate:'允许发布所需的最低用例通过率。',
  max_p95_latency_ms:'允许发布的 P95 最大耗时；0 表示不限制。',max_avg_tokens:'单用例平均 Token 上限；0 表示不限制。',
  required_tags:'这些标签对应的评测用例必须全部通过。',require_no_regression:'要求当前结果不得低于最近一次通过门禁的基线。',
  allow_side_effects:'评测时是否允许真实执行有外部副作用的节点。',assertions:'评测用例用于判断结果是否正确的断言数组。',
  parse_mode:'PDF 文档的解析策略。',chunk_size:'文档切片的目标字符长度。',chunk_overlap:'相邻切片重复保留的字符数量。',
  retention_days:'数据在知识库中保留的天数；0 表示按平台策略处理。',sensitivity:'知识库内容的敏感等级。',
  allowed_agents:'允许访问该知识库的 Agent 编码列表。',allowed_roles:'允许访问该知识库的平台角色列表。',
  system:'Prompt 的系统指令，定义模型角色、行为约束和输出要求。',user:'发送给模型的用户模板，可引用已声明变量。',
  vars:'Prompt 模板允许使用的变量名列表。',notes:'本次 Prompt 修改的归档说明。',sort_order:'控制列表或用例的显示与执行顺序。',
  use_milvus:'是否从 Milvus 向量库执行语义、关键词等候选召回。',use_redis:'是否把 Redis 中的会话槽位纳入本次上下文召回。',
  publish_after_create:'创建 Agent 版本后是否立即运行评测并尝试发布；门禁不通过时版本保留在 testing。',
};

const FIELD_OPTION_LABELS = {
  retry_on:{retryable:'仅重试可恢复异常',all:'重试所有异常'},
  idempotency_policy:{forbid_retry:'禁止有副作用目标重试',inject:'注入幂等键',allow_duplicate:'允许重复执行'},
  failure_strategy:{raise:'直接失败',fallback:'兜底',compensate:'补偿'},
  target_type:{llm:'大模型',transform:'变量转换',skill:'Skill 调用',subgraph:'子 Agent',knowledge_retrieval:'知识检索',foreach:'批量处理',schema_validate:'Schema 校验',memory_write:'记忆写入'},
  retrieval_mode:{hybrid:'混合召回',semantic:'语义召回',keyword:'关键词召回'},
  failure_policy:{fail_fast:'遇错立即停止',continue:'保留错误并继续',raise:'校验失败直接报错',route:'进入失败分支'},
  input_mode:{wrap:'包装为指定字段',object:'合并对象字段'},
  merge_strategy:{object:'按分支名组成对象',list:'按顺序组成数组',merge:'合并对象字段'},
  conflict_policy:{error:'键冲突时报错',last_wins:'后写入分支覆盖'},
  match_mode:{strict:'严格类型匹配',string:'转为字符串匹配'},
  limit_policy:{raise:'达到上限时报错',route:'进入上限分支'},
  approver_type:{any:'任意合格审核人',user:'指定用户',role:'指定角色',department:'指定部门'},
  timeout_action:{reject:'超时自动驳回',timeout:'进入超时分支'},
  delegation_policy:{inherit_service_identity:'继承父 Agent 服务身份'},
  memory_type:{episodic:'事件记忆',semantic:'事实记忆',procedural:'流程记忆'},
  visibility:{internal:'内部可见',public:'平台公开'},status:{active:'启用',disabled:'停用',testing:'测试中',published:'已发布',deprecated:'已弃用',archived:'已归档'},
  provider:{openai_compatible:'OpenAI 兼容接口',mock:'模拟模型'},
  credential_type:{api_key:'API 密钥',bearer:'Bearer 令牌',basic:'用户名密码'},
  environment:{dev:'开发环境',test:'测试环境',prod:'生产环境'},
  trigger_type:{cron:'定时任务',webhook:'Webhook 调用',event:'事件订阅'},
  impl_type:{builtin:'内置 Handler',http:'HTTP 接口',mcp:'MCP 服务',script:'沙箱脚本'},
  'auth.in':{header:'HTTP Header',query:'URL Query 参数'},
  parse_mode:{auto:'自动识别',text:'纯文本提取',ocr:'扫描件 OCR',layout:'复杂版面识别'},
  sensitivity:{internal:'内部资料',confidential:'机密资料',public:'公开资料'},
};
const COMMON_OPTION_LABELS = {
  true:'是',false:'否',stable:'稳定版本',latest:'最新版本',canary:'灰度版本',
  merge:'合并',replace:'替换',count:'固定次数',while:'条件循环',
  eq:'等于',ne:'不等于',neq:'不等于',gt:'大于',gte:'大于等于',lt:'小于',lte:'小于等于',
  contains:'包含',in:'属于集合',exists:'存在',not_exists:'不存在',truthy:'值为真',falsy:'值为假',
  raise:'直接失败',route:'进入分支',fail_fast:'遇错立即停止',continue:'继续处理',
};
function fieldOptionChinese(key,value){
  const raw=String(value),short=String(key||'').split('.').pop();
  return (FIELD_OPTION_LABELS[key]||FIELD_OPTION_LABELS[short]||{})[raw] || COMMON_OPTION_LABELS[raw] || '';
}
function fieldOptionDisplayName(key,value,current=''){
  const raw=String(value), chinese=fieldOptionChinese(key,raw);
  return chinese ? `${raw} · ${chinese}` : (String(current||'').trim() || raw);
}
function fieldHelpText(key,schema={}){
  const short=String(key||'').split('.').pop();
  const desc=String(schema.desc||schema.description||FIELD_HELP[key]||FIELD_HELP[short]||`${FIELD_LABELS[key]||FIELD_LABELS[short]||'该配置项'}对应 API 字段 ${key}，保存时仍提交英文键名。`).trim();
  const lines=[desc];
  const rules=[];
  if(schema.type)rules.push(`类型：${schema.type}`);
  if(schema.required)rules.push('必填');
  if(schema.minimum!=null)rules.push(`最小值：${schema.minimum}`);
  if(schema.maximum!=null)rules.push(`最大值：${schema.maximum}`);
  if(Object.prototype.hasOwnProperty.call(schema,'default')){
    let value;try{value=JSON.stringify(schema.default)}catch(_){value=String(schema.default)}
    rules.push(`默认值：${value}`);
  }
  if(rules.length)lines.push(rules.join('；'));
  const values=Array.isArray(schema.enum)?schema.enum:[];
  if(values.length)lines.push('可选值：\n'+values.map(value=>`• ${fieldOptionDisplayName(key,value)}`).join('\n'));
  return lines.join('\n');
}
function fieldHelpMarkup(key,schema={}){
  const help=fieldHelpText(key,schema);
  return `<span class="config-help" tabindex="0" role="button" aria-label="查看${attr(FIELD_LABELS[key]||key)}说明" data-help="${attr(help)}">?</span>`;
}
function fieldKeyFromLabel(label){
  const text=String(label&&label.textContent||'');
  const match=text.match(/[（(]([a-z][a-z0-9_.]*)(?=[，,)）])/i);
  return match?match[1]:'';
}
function enhanceConfigSelect(select,key){
  if(!select||!key)return;
  [...select.options].forEach(option=>{
    const translated=fieldOptionChinese(key,option.value);
    if(translated)option.textContent=fieldOptionDisplayName(key,option.value,option.textContent);
  });
}
function enhanceConfigFields(root=document){
  const labels=[];
  if(root.nodeType===1&&(root.matches('.fld>label,.pm-lbl,.config-label')))labels.push(root);
  if(root.querySelectorAll)labels.push(...root.querySelectorAll('.fld>label,.pm-lbl,.config-label'));
  labels.forEach(label=>{
    const key=fieldKeyFromLabel(label);if(!key)return;
    if(!label.querySelector('.config-help'))label.insertAdjacentHTML('beforeend',fieldHelpMarkup(key));
    const container=label.closest('.fld');
    if(container)container.querySelectorAll('select').forEach(select=>enhanceConfigSelect(select,key));
  });
  const selects=[];
  if(root.nodeType===1&&root.matches('select'))selects.push(root);
  if(root.querySelectorAll)selects.push(...root.querySelectorAll('select'));
  selects.forEach(select=>{
    const label=select.closest('.fld')&&select.closest('.fld').querySelector('label');
    enhanceConfigSelect(select,fieldKeyFromLabel(label));
  });
}
function installConfigHelp(){
  if(document.getElementById('configHelpPopup'))return;
  const popup=document.createElement('div');popup.id='configHelpPopup';popup.className='config-help-popup';document.body.appendChild(popup);
  const hide=()=>popup.classList.remove('on');
  const show=target=>{
    popup.textContent=target.dataset.help||'';popup.classList.add('on');
    const rect=target.getBoundingClientRect(),box=popup.getBoundingClientRect();
    const left=Math.max(8,Math.min(window.innerWidth-box.width-8,rect.left));
    const below=rect.bottom+8,top=below+box.height<=window.innerHeight-8?below:Math.max(8,rect.top-box.height-8);
    popup.style.left=left+'px';popup.style.top=top+'px';
  };
  document.addEventListener('mouseover',event=>{const target=event.target.closest&&event.target.closest('.config-help');if(target)show(target)});
  document.addEventListener('mouseout',event=>{const target=event.target.closest&&event.target.closest('.config-help');if(target&&!target.contains(event.relatedTarget))hide()});
  document.addEventListener('focusin',event=>{const target=event.target.closest&&event.target.closest('.config-help');if(target)show(target)});
  document.addEventListener('focusout',event=>{if(event.target.classList&&event.target.classList.contains('config-help'))hide()});
  window.addEventListener('resize',hide);document.addEventListener('scroll',hide,true);
  enhanceConfigFields(document);
  new MutationObserver(mutations=>mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>enhanceConfigFields(node))))
    .observe(document.body,{childList:true,subtree:true});
}

/* ============ 后端接入（live / offline 双模式） ============ */
// 跟随当前页面来源，便于同一套控制台运行在任意端口；直接打开 HTML 时回落到 8000。
const API = location.protocol.startsWith('http') ? location.origin : 'https://demo.invalid';
const AUTH = {enabled:false, authenticated:false, user:null, csrf:'', config:{}};
const _nativeFetch = window.fetch.bind(window);
window.fetch = async function(input, options){
  const opts = Object.assign({}, options || {});
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  if(url.startsWith(API + '/v1/')){
    opts.credentials = 'same-origin';
    const method = String(opts.method || 'GET').toUpperCase();
    if(!['GET','HEAD','OPTIONS'].includes(method) && AUTH.csrf){
      const headers = new Headers(opts.headers || {});
      headers.set('X-CSRF-Token', AUTH.csrf);
      opts.headers = headers;
    }
  }
  const response = await _nativeFetch(input, opts);
  if(response.status === 401 && AUTH.enabled && !url.endsWith('/v1/auth/me')){
    setTimeout(()=>showAuthGate(AUTH.config), 0);
  }
  return response;
};
let MODE = 'offline';
let PLATFORM_ENV = 'dev';
const NODE_MAP = {};
const ERR_DESC = {
  CONTRACT_INPUT_INVALID: ['CONTRACT_INPUT_INVALID', '422', '入参不符 input_schema', '否'],
  CONTRACT_OUTPUT_INVALID: ['CONTRACT_OUTPUT_INVALID', '502', '输出两次修复后仍不合法', '是'],
  CONTEXT_BUDGET_EXCEEDED: ['CONTEXT_BUDGET_EXCEEDED', '413', '上下文超预算且无法裁剪', '否'],
  TOOL_TIMEOUT: ['TOOL_TIMEOUT', '504', '工具调用超时', '是'],
  MODEL_RATE_LIMITED: ['MODEL_RATE_LIMITED', '429', '上游限流，已降级备模型', '是'],
  TOOL_FAILED: ['TOOL_FAILED', '500', '工具执行失败', '是'],
  GUARD_BLOCKED: ['GUARD_BLOCKED', '451', '护栏拦截', '否']
};
const LIVE_CONTRACTS = {};

function kindOf(id, agentNodes){
  // 事件里没有节点类型，只能靠"当前画布 + 事件自证"推断：
  // 子图父节点的类型在任意画布上都可能查不到（trace 页可以回放别的图的 run），
  // 所以 replay 时把 subgraph_done 里出现过的节点显式标成 agent。
  if(agentNodes && agentNodes.has(id)) return 'agent';
  const t = (nodes[id] && nodes[id].type) || id;
  if(t === 'subgraph') return 'agent';
  if(['skill','transform','knowledge_retrieval','foreach','schema_validate','memory_write'].includes(t)) return 'tool';
  if(['start','end','human','delay','event_wait','parallel','join'].includes(t)) return 'io';
  return 'llm';
}

async function probe(force=false){
  const btn = document.getElementById('envRefreshBtn');
  if(force && btn){ btn.disabled = true; btn.textContent = '检测中…'; }
  try{
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), force ? 7000 : 1500);
    const r = await fetch(API + '/healthz' + (force ? '?probe=1' : ''), { signal: ctl.signal });
    clearTimeout(timer);
    if(r.ok){
      MODE = 'live';
      applyHealth(await r.json());
    }
  }catch(e){ MODE = 'offline'; }
  finally{
    if(force && btn){ btn.disabled = false; btn.textContent = '刷新状态'; }
  }
  applyMode();
}

function applyMode(){
  const b = document.getElementById('modeBadge');
  if(b){
    b.textContent = MODE === 'live' ? 'DEMO · 画布演示' : 'OFFLINE · 后端不可用';
    b.style.background = MODE === 'live' ? 'var(--green-soft)' : 'var(--amber-soft)';
    b.style.color = MODE === 'live' ? 'var(--green)' : 'var(--amber)';
    b.style.borderColor = MODE === 'live' ? '#c9e8d4' : '#f2ddba';
  }
}

function applyHealth(h){
  const st = h.stores || {};
  PLATFORM_ENV = ((h.credentials || {}).environment || 'dev');
  const mark = (id, ok) => {
    const el = document.getElementById(id);
    if(el){ el.textContent = ok ? '已连接' : '内存降级'; el.style.color = ok ? 'var(--green)' : 'var(--amber)'; }
  };
  mark('envRedis', st.redis); mark('envMilvus', st.milvus);
  // ES 已随 M1 改造退役；编码器状态来自 healthz.encoder（mode=hash 即降级）
  const enc = document.getElementById('envEncoder');
  if(enc){
    const e = h.encoder || {};
    const up = !!e.ok;
    enc.textContent = up ? (e.mode || 'bge-m3') : '内存降级';
    enc.style.color = up ? 'var(--green)' : 'var(--amber)';
  }
  const rerank = document.getElementById('envReranker');
  if(rerank){
    const rr = h.reranker || {}, enabled = rr.enabled !== false;
    // 老版本 healthz 没有 probed/status：ok 或 error 均说明已经探测过；两者都没有
    // 只能判为“未探测”，不能把 API/Worker 进程状态未同步误报成真实降级。
    const probed = rr.probed === true || rr.ok === true || !!rr.error;
    const state = !enabled ? 'disabled' : (rr.status || (!probed ? 'unknown' : (rr.ok ? 'ready' : 'degraded')));
    rerank.textContent = state === 'disabled' ? '未启用'
      : state === 'unknown' ? '未探测'
      : (state === 'ready' || state === 'available') ? (rr.model || '已连接')
      : '降级';
    rerank.style.color = state === 'disabled' ? 'var(--faint)'
      : state === 'unknown' ? 'var(--faint)'
      : (state === 'ready' || state === 'available') ? 'var(--green)' : 'var(--amber)';
    rerank.title = state === 'available' ? '模型可用，首次请求时加载'
      : state === 'unknown' ? '服务尚未完成探测'
      : state === 'degraded' ? (rr.error || 'Reranker 不可用，检索将回退 RRF 排名')
      : (rr.model || '');
  }
  const storage = document.getElementById('envStorage');
  if(storage){
    const db = h.storage || {};
    storage.textContent = db.ok ? (db.backend || '已连接') : '异常';
    storage.style.color = db.ok ? 'var(--green)' : 'var(--red)';
    storage.title = db.target || '';
  }
  const nacos = document.getElementById('envNacos');
  if(nacos){
    const cfg = h.config_center || {}, enabled = cfg.enabled !== false;
    nacos.textContent = !enabled ? '未启用' : (cfg.loaded ? '已加载' : '异常');
    nacos.style.color = !enabled ? 'var(--faint)' : (cfg.loaded ? 'var(--green)' : 'var(--red)');
    nacos.title = cfg.error || cfg.data_id || '';
  }
  const lm = document.getElementById('envLlm');
  if(lm) lm.textContent = h.llm_mode || 'mock';
  const o = h.orchestrator || {};
  const en = document.getElementById('envEngine');
  if(en){
    const lg = o.engine === 'langgraph';
    en.textContent = lg ? 'LangGraph ' + (o.version || '') : '内置解释器';
    en.style.color = lg ? 'var(--green)' : 'var(--amber)';
    en.title = o.mode || '';
  }
}

async function apiJSON(path, opts){
  const r = await fetch(API + path, Object.assign({ headers: {'Content-Type': 'application/json'} }, opts || {}));
  if(!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

/* ============ 认证与账号权限 ============ */
function authCan(permission){
  if(!AUTH.enabled) return true;
  const permissions = new Set((AUTH.user && AUTH.user.permissions) || []);
  return permissions.has('system.admin') || permissions.has(permission);
}

function agentCan(action, code){
  if(!AUTH.enabled) return true;
  if(authCan('system.admin')) return true;
  const target = code || CUR.code;
  const agent = AGENTS.find(item => item.code === target);
  return !!agent && (agent.access || []).includes(action) && authCan('agent.' + action);
}

function graphCan(action){
  const code = canvasAgentCode();
  if(code) return agentCan(action, code);
  // 平台首次使用时还没有 Agent。未绑定 Graph 由后端按全局 RBAC 管理，
  // 这里必须允许 Agent 开发者先建图，否则会形成“建 Agent 要图、建图要 Agent”的死锁。
  return authCan(action === 'publish' ? 'agent.publish' : 'agent.manage');
}

function canvasCanRun(){
  const code = canvasAgentCode();
  return !!code && code === CUR.code && !!CUR.version && agentCan('run', code);
}

function syncAgentPermissionUi(){
  const setDisabled = (id, disabled, title) => {
    const el = $(id); if(!el) return;
    el.disabled = !!disabled;
    el.title = disabled ? title : '';
  };
  const runDisabled = !canvasCanRun();
  const runTitle = !canvasAgentCode() ? '未绑定编排图没有 Agent 契约，绑定 Agent 后才能运行'
    : '没有当前 Agent 的运行权限或可用版本';
  setDisabled('#runBtn', runDisabled, runTitle);
  setDisabled('#runInputBtn', runDisabled, runTitle);
  setDisabled('#addNodeBtn', !graphCan('manage'), '没有编排图开发权限');
  setDisabled('#validateGraphBtn', !graphCan('manage'), '没有编排图开发权限');
  setDisabled('#saveGraphBtn', !graphCan('manage'), '没有编排图开发权限');
  setDisabled('#saveGraphAsBtn', !graphCan('manage'), '没有编排图开发权限');
  setDisabled('#publishGraphBtn', !graphCan('publish'), '没有编排图发布权限');
  syncGraphDeleteAvailability();
  setDisabled('#newAgentBtn', !authCan('agent.manage'), '当前角色不能新建 Agent');
}

let GRAPH_DELETE_BUSY=false;
function syncGraphDeleteAvailability(){
  const button=$('#deleteGraphBtn');if(!button)return;
  const persisted=GRAPHS.some(item=>item.graph_id===GRAPH.id);
  const allowed=graphCan('manage');
  button.disabled=GRAPH_DELETE_BUSY||!persisted||!allowed;
  button.title=!allowed?'没有编排图开发权限':(!persisted?'当前编排图尚未持久化':'物理删除当前编排图及全部版本');
}

function renderAuthIdentity(){
  const user = AUTH.user;
  const name = $('#authName'), avatar = $('#authAvatar');
  if(!AUTH.enabled){
    if(name) name.textContent = '演示用户';
    if(avatar) avatar.textContent = 'DEV';
    return;
  }
  if(name) name.textContent = user ? user.name : '';
  if(avatar) avatar.textContent = user ? String(user.name || user.open_id).slice(0,2).toUpperCase() : '—';
}

function showAuthGate(config){
  const cfg = config || {};
  AUTH.config = cfg;
  $('#authGate').classList.add('on');
  const feishu = $('#feishuLoginBtn'), local = $('#localLoginBtn');
  feishu.disabled = !cfg.feishu_configured;
  feishu.title = cfg.feishu_configured ? '' : '尚未配置飞书 App ID、Secret 和 tenant_key';
  local.style.display = cfg.local_login_available ? 'flex' : 'none';
  $('#authGateCopy').textContent = cfg.feishu_configured
    ? '使用企业飞书账号完成身份验证，权限由 Agent 中台角色控制。'
    : (cfg.local_login_available
      ? '飞书参数尚未配置，可先用仅限本机 dev 环境的开发登录验收权限流程。'
      : '飞书登录参数尚未配置完整，请由管理员完成服务端配置。');
}

async function loadAuthStatus(){
  try{
    const response = await fetch(API + '/v1/auth/me');
    let body = {}; try{ body = await response.json(); }catch(e){}
    AUTH.config = body.config || {};
    AUTH.enabled = !!AUTH.config.enabled;
    AUTH.authenticated = !!body.authenticated;
    AUTH.user = body.user || null;
    AUTH.csrf = body.csrf_token || '';
    renderAuthIdentity();
    syncAgentPermissionUi();
    syncReviewTemplatePermissionUi();
    if(AUTH.enabled && !AUTH.authenticated){ showAuthGate(AUTH.config); return false; }
    $('#authGate').classList.remove('on');
    return true;
  }catch(e){
    return true;
  }
}

async function loadReviewPendingCount(){
  const badge = $('#reviewPendingCount');
  if(!badge) return;
  if(AUTH.enabled && !authCan('run.review')){
    badge.textContent = '—';
    badge.hidden = true;
    badge.parentElement.style.display = 'none';
    return;
  }
  badge.parentElement.style.display = '';
  try{
    const response = await fetch(API + '/v1/reviews?limit=1');
    if(!response.ok) throw new Error('http ' + response.status);
    const body = await response.json();
    const total = Number(body.total || 0);
    badge.textContent = String(total);
    badge.hidden = total <= 0;
  }catch(e){ badge.textContent = '—'; badge.hidden = true; }
}

function authFeishuLogin(){
  const redirect = '/prototype/index.html' + (location.hash || '');
  location.href = API + '/v1/auth/feishu/login?redirect=' + encodeURIComponent(redirect);
}

async function authLocalLogin(){
  const btn = $('#localLoginBtn'); btn.disabled = true; btn.textContent = '登录中…';
  try{
    const response = await fetch(API + '/v1/auth/local-login', {method:'POST'});
    const body = await response.json();
    if(!response.ok) throw new Error(body.message || '本地登录失败');
    AUTH.csrf = body.csrf_token || '';
    location.reload();
  }catch(e){
    btn.disabled = false; btn.textContent = '本地开发登录';
    $('#authGateCopy').textContent = e.message;
  }
}

async function authLogout(){
  const result = await apiRaw('/v1/auth/logout', {method:'POST'});
  if(!result.ok){ toast(result.body.message || '退出失败'); return; }
  AUTH.authenticated = false; AUTH.user = null; AUTH.csrf = '';
  location.reload();
}

/* ============ 画布（Graph DSL 驱动） ============ */
const NW = 160, NH = 62, NW_SUB = 186;   // subgraph 节点要放下 agent code，单独放宽
/* 内置兜底；LIVE 模式下会被 /v1/graphs/node-types（节点插件注册表）覆盖 */
let TYPE_META = {
  start:    {label:'开始', cat:'IO', desc:'初始化输入与会话上下文', color:'#15803d', lifecycle:'active', creatable:true},
  llm:      {label:'大模型', cat:'AGENT', desc:'Prompt 驱动的结构化模型调用', color:'#4f46e5', lifecycle:'active', creatable:true,
             config:{model_ref:{type:'string',default:'',desc:'模型治理中的模型 code；空值使用平台全局模型'},
                     model_version:{type:'string',default:'stable',desc:'Agent 发布时固定为具体模型版本'},
                     prompt_key:{type:'string',default:'llm',desc:'Prompt 治理中的节点 key'},
                     prompt_name:{type:'string',default:'default',desc:'Prompt 模板名称'},
                     input_path:{type:'string',default:'variables',desc:'本次模型重点读取的数据路径'},
                     output_path:{type:'string',default:'variables.result',desc:'variables.* 或 output'},
                     output_schema:{type:'object',default:{type:'object'},desc:'模型结构化输出 JSON Schema'},
                     mock_output:{type:'object',default:{},desc:'mock 模式返回值'}}},
  transform:{label:'变量转换', cat:'CAP', desc:'安全完成字段映射、模板、默认值、类型转换与数组投影', color:'#0f766e', lifecycle:'active', creatable:true,
             config:{mapping:{type:'object',default:{},desc:'目标变量路径到来源状态路径的映射'},
                     constants:{type:'object',default:{},desc:'写入 variables 的常量'},
                     defaults:{type:'object',default:{},desc:'目标缺失或为 null 时的默认值'},
                     templates:{type:'object',default:{},desc:'安全模板，例如 {{ input.name }}'},
                     casts:{type:'object',default:{},desc:'string/integer/number/boolean/json/object/array'},
                     projections:{type:'object',default:{},desc:'数组投影：目标路径 -> {source_path, fields}'},
                     mode:{type:'string',enum:['merge','replace'],default:'merge',desc:'合并或重新生成 variables'}}},
  condition:{label:'条件分支', cat:'GATE', desc:'按变量和值进行安全条件判断', color:'#b45309', lifecycle:'active', creatable:true},
  switch:   {label:'多路路由', cat:'GATE', desc:'按一个状态值路由到多个命名分支', color:'#0369a1', lifecycle:'active', creatable:true,
             dynamic_conditions:true,
             config:{selector_path:{type:'string',required:true,desc:'用于选择分支的状态路径'},
                     cases:{type:'array',required:true,default:[{when:'value_a',route:'case_a',label:'匹配 value_a'}],desc:'匹配项'},
                     default_route:{type:'string',default:'default',desc:'未命中时的分支名'},
                     match_mode:{type:'string',enum:['strict','string'],default:'strict',desc:'匹配方式'}}},
  end:      {label:'结束', cat:'IO', desc:'校验并返回最终结果', color:'#15803d', lifecycle:'active', creatable:true},
  human:    {label:'人工', cat:'HITL', desc:'interrupt 审批', color:'#b45309',
             config:{question:{type:'string',default:'是否人工确认后继续？',desc:'审批标题'},
                     review_input_path:{type:'string',default:'variables',desc:'进入审核时展示并作为修改基线的 AgentState 路径'},
                     approver_type:{type:'string',enum:['any','user','role','department'],default:'any',desc:'审批主体类型'},
                     approver_ids:{type:'array',default:[],desc:'用户 id、角色 code 或飞书部门 id'},
                     form_schema:{type:'object',default:{type:'object'},desc:'审批补充字段 JSON Schema'},
                     sla_seconds:{type:'integer',default:0,minimum:0,maximum:2592000,desc:'0 表示不超时'},
                     timeout_action:{type:'string',enum:['reject','timeout'],default:'timeout',desc:'审批到期处理'},
                     escalate_after_seconds:{type:'integer',default:0,minimum:0,maximum:2592000,desc:'0 表示不升级'},
                     escalation_role_codes:{type:'array',default:[],desc:'升级后的审批角色'}}},
  subgraph: {label:'子图', cat:'AGENT', desc:'引用 Registry 中已发布的 Agent', color:'#0ea5e9',
             config:{agent:{type:'string',required:true,desc:'Agent code'},
                     version:{type:'string',default:'stable',desc:'stable / latest / canary / vN'},
                     input_path:{type:'string',default:'input',desc:'子 Agent 输入状态路径'},
                     output_path:{type:'string',default:'variables.subgraph_output',desc:'结果写入 variables.*'}}},
  skill:    {label:'Skill', cat:'CAP', desc:'调用已发布的业务能力', color:'#0f766e',
             config:{skill_code:{type:'string',required:true,desc:'Skill code'},
                     version:{type:'string',default:'stable',desc:'stable / latest / vN'},
                     input_path:{type:'string',default:'input',desc:'输入状态路径'},
                     output_path:{type:'string',default:'variables.skill_output',desc:'结果写入 variables.*'}}},
  knowledge_retrieval:{label:'知识检索', cat:'CAP', desc:'按知识范围执行语义、关键词或混合召回', color:'#0f766e',
             config:{query_path:{type:'string',required:true,desc:'查询文本所在状态路径'},
                     knowledge_base:{type:'string',default:'',desc:'知识库标识'},
                     retrieval_mode:{type:'string',enum:['hybrid','semantic','keyword'],default:'hybrid',desc:'召回方式'},
                     top_k:{type:'integer',default:5,minimum:1,maximum:50,desc:'返回条数（1-50）'},
                     candidate_top_n:{type:'integer',default:20,minimum:1,maximum:100,desc:'送入 Rerank 的候选条数'},
                     rerank:{type:'boolean',default:true,desc:'使用 cross-encoder 对候选重排'},
                     rerank_required:{type:'boolean',default:false,desc:'重排失败时让节点失败'},
                     rerank_min_score:{type:'number',default:0,minimum:0,maximum:1,desc:'重排最低相关度'},
                     include_session:{type:'boolean',default:false,desc:'同时读取会话上下文'},
                     output_path:{type:'string',default:'knowledge',desc:'结果写入 variables 的路径'}}},
  parallel: {label:'并行分支', cat:'GATE', desc:'并发启动多条画布分支', color:'#2563eb',
             config:{join_node:{type:'string',required:true,desc:'负责汇总的 join 节点 id'}}},
  join:     {label:'分支汇总', cat:'GATE', desc:'等待并汇总 parallel 的全部分支', color:'#2563eb',
             config:{branch_output_path:{type:'string',default:'variables',desc:'分支结果状态路径'},
                     output_path:{type:'string',default:'parallel',desc:'汇总写入 variables 的路径'},
                     merge_strategy:{type:'string',enum:['object','list','merge'],default:'object',desc:'汇总方式'},
                     conflict_policy:{type:'string',enum:['error','last_wins'],default:'error',desc:'键冲突策略'}}},
  foreach:  {label:'批量处理', cat:'CAP', desc:'按并发上限逐项调用 Skill 或子 Agent', color:'#0f766e',
             config:{items_path:{type:'string',required:true,desc:'数组所在状态路径'},
                     target_type:{type:'string',enum:['skill','subgraph'],default:'skill',desc:'逐项调用目标'},
                     skill_code:{type:'string',default:'',desc:'Skill code'},
                     agent:{type:'string',default:'',desc:'子 Agent code'},
                     version:{type:'string',default:'stable',desc:'版本或别名'},
                     input_mode:{type:'string',enum:['wrap','object'],default:'wrap',desc:'单项入参方式'},
                     item_key:{type:'string',default:'item',desc:'wrap 模式字段名'},
                     static_input:{type:'object',default:{},desc:'每次调用附加参数'},
                     concurrency:{type:'integer',default:4,minimum:1,maximum:20,desc:'并发数（1-20）'},
                     failure_policy:{type:'string',enum:['fail_fast','continue'],default:'fail_fast',desc:'失败处理'},
                     output_path:{type:'string',default:'foreach_results',desc:'结果数组路径'}}},
  delay:    {label:'定时等待', cat:'IO', desc:'在流程内异步等待指定时长', color:'#64748b',
             config:{seconds:{type:'number',default:1,minimum:0,maximum:300,desc:'等待秒数（0-300）'},
                     output_path:{type:'string',default:'delay',desc:'等待结果路径'}}},
  event_wait:{label:'等待事件', cat:'IO', desc:'持久挂起并等待外部事件恢复', color:'#64748b',
             config:{event_name:{type:'string',required:true,desc:'等待的外部事件名'},
                     correlation_path:{type:'string',default:'',desc:'关联值状态路径'},
                     output_path:{type:'string',default:'event',desc:'事件结果路径'}}},
  loop:     {label:'循环控制',cat:'GATE',desc:'按固定次数或状态条件执行有上限的循环',color:'#7c3aed',
             config:{mode:{type:'string',enum:['count','while'],default:'count',desc:'循环模式'},
                     max_iterations:{type:'integer',default:3,minimum:1,maximum:100,desc:'最大迭代次数'},
                     continue_path:{type:'string',default:'',desc:'while 模式布尔状态路径'},
                     counter_path:{type:'string',default:'variables.loop',desc:'循环状态写入路径'},
                     limit_policy:{type:'string',enum:['raise','route'],default:'raise',desc:'达到上限时的处理'}}},
  schema_validate:{label:'Schema 校验',cat:'GATE',desc:'校验中间变量是否符合 JSON Schema',color:'#b45309',
             config:{input_path:{type:'string',required:true,desc:'待校验状态路径'},
                     schema:{type:'object',required:true,default:{type:'object'},desc:'JSON Schema'},
                     failure_policy:{type:'string',enum:['raise','route'],default:'raise',desc:'失败处理'},
                     result_path:{type:'string',default:'variables.validation',desc:'校验详情路径'}}},
  error_boundary:{label:'错误边界',cat:'GATE',desc:'包装业务节点并提供重试、兜底和补偿分支',color:'#b91c1c',
             config:{target_type:{type:'string',required:true,enum:['foreach','knowledge_retrieval','llm','memory_write','schema_validate','skill','subgraph','transform'],desc:'被保护节点类型'},
                     target_config:{type:'object',required:true,default:{},desc:'被保护节点 config'},
                     max_retries:{type:'integer',default:0,minimum:0,maximum:3,desc:'额外重试次数'},
                     retry_on:{type:'string',enum:['retryable','all'],default:'retryable',desc:'重试范围'},
                     retry_delay_seconds:{type:'number',default:0,minimum:0,maximum:30,desc:'重试间隔'},
                     failure_strategy:{type:'string',enum:['raise','fallback','compensate'],default:'raise',desc:'失败处理'},
                     fallback_value:{type:'json',default:null,desc:'兜底值'},
                     fallback_path:{type:'string',default:'variables.fallback',desc:'兜底写入路径'},
                     error_path:{type:'string',default:'variables.last_error',desc:'错误详情路径'}}},
  memory_write:{label:'记忆写入',cat:'CAP',desc:'写入长期记忆真源并建立检索索引',color:'#0f766e',
             config:{content_path:{type:'string',required:true,desc:'记忆正文状态路径'},
                     title_path:{type:'string',default:'',desc:'标题状态路径'},title:{type:'string',default:'',desc:'固定标题'},
                     memory_type:{type:'string',enum:['episodic','semantic','procedural'],default:'semantic',desc:'记忆类型'},
                     knowledge_base:{type:'string',default:'',desc:'知识库标识'},
                     importance:{type:'number',default:.5,minimum:0,maximum:1,desc:'重要度'},
                     index:{type:'boolean',default:true,desc:'同步建立索引'},
                     output_path:{type:'string',default:'variables.memory_write',desc:'写入结果路径'}}}
};
const COND_LABEL = {pass:'通过', retry:'重试', fail:'失败', human:'人工', approve:'通过', reject:'驳回', timeout:'超时', cancelled:'取消', completed:'完成', received:'已收到', true:'是', false:'否', valid:'有效', invalid:'无效', success:'成功', fallback:'兜底', compensate:'补偿', repeat:'继续循环', limit:'达到上限'};
const COND_COLOR = {pass:'#15803d', retry:'#b45309', fail:'#b91c1c', human:'#7c3aed', approve:'#15803d', reject:'#b91c1c', timeout:'#b45309', cancelled:'#64748b', completed:'#15803d', received:'#15803d', true:'#15803d', false:'#b91c1c', valid:'#15803d', invalid:'#b91c1c', success:'#15803d', fallback:'#b45309', compensate:'#b91c1c', repeat:'#7c3aed', limit:'#b91c1c'};
let COND_SET = {condition:['true','false'], human:['approve','reject','timeout','cancelled'], delay:['completed','cancelled'], event_wait:['received','timeout','cancelled'], schema_validate:['valid','invalid'], error_boundary:['success','fallback','compensate'], loop:['repeat','completed','limit']};
let KNOWLEDGE_BASES = [];
function switchRouteDefs(node){
  if(!node || node.type !== 'switch') return [];
  const cfg = node.config || {}, defs = [], seen = new Set();
  (Array.isArray(cfg.cases) ? cfg.cases : []).forEach((item, index) => {
    if(!item || typeof item !== 'object') return;
    const route = String(item.route || '').trim();
    if(!route || seen.has(route)) return;
    seen.add(route);
    defs.push({route, label:String(item.label || route), kind:'case', index});
  });
  const fallback = String(cfg.default_route || 'default').trim();
  if(fallback && !seen.has(fallback)) defs.push({route:fallback, label:'默认 · ' + fallback, kind:'default'});
  return defs;
}
function routeDefsFor(nodeOrType){
  const node = typeof nodeOrType === 'string' ? {type:nodeOrType,config:{}} : nodeOrType;
  if(!node) return [];
  if(node.type === 'switch') return switchRouteDefs(node);
  let routes = COND_SET[node.type] || [];
  if(node.type === 'error_boundary'){
    const strategy = String((node.config || {}).failure_strategy || 'raise');
    routes = ['success'];
    if(strategy === 'fallback' || strategy === 'compensate') routes.push(strategy);
  }
  if(node.type === 'loop'){
    const cfg = node.config || {};
    routes = ['repeat','completed'];
    if(String(cfg.mode || 'count') === 'while' && String(cfg.limit_policy || 'raise') === 'route'){
      routes.push('limit');
    }
  }
  return routes.map(route => ({route,label:COND_LABEL[route] || route,kind:'fixed'}));
}
function requiredRouteDefsFor(nodeOrType){
  const node = typeof nodeOrType === 'string' ? {type:nodeOrType,config:{}} : nodeOrType;
  const defs = routeDefsFor(node);
  return defs;
}
function condsFor(nodeOrType){ return routeDefsFor(nodeOrType).map(x => x.route); }
function routeLabel(node, route){
  const found = routeDefsFor(node).find(x => x.route === route);
  return found ? found.label : (COND_LABEL[route] || route || '');
}
function routeColor(route){
  if(COND_COLOR[route]) return COND_COLOR[route];
  const palette = ['#0369a1','#7c3aed','#0f766e','#b45309','#be185d','#4f46e5'];
  let hash = 0; for(const ch of String(route || '')) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

/* 从后端节点插件注册表拉取可选节点：新装的插件节点自动出现在组件面板 */
async function loadNodeTypes(){
  if(MODE !== 'live') return;
  try{
    const r = await apiJSON('/v1/graphs/node-types');
    const items = r.items || [];
    if(!items.length) return;
    const tm = {}, cs = {};
    for(const it of items){
      // config_schema 必须留着：subgraph 节点的 agent/version 就靠它渲染属性面板，
      // 之前只取了 label/color，等于把节点配置能力丢了。
      tm[it.type] = {label: it.label, cat: it.cat, desc: it.desc, color: it.color,
                     config: it.config_schema || {}, writes: it.writes || [],
                     dynamic_conditions:it.dynamic_conditions === true,
                     scope_type:it.scope_type || 'platform', enabled:it.enabled !== false,
                     default_timeout:Number(it.default_timeout),
                     lifecycle:it.lifecycle || 'active', creatable:it.creatable !== false,
                     replacement:it.replacement || ''};
      if(it.conditions && it.conditions.length) cs[it.type] = it.conditions;
    }
    TYPE_META = tm; COND_SET = cs;
    const pal = $('#palette');
    if(pal) pal.innerHTML = Object.keys(TYPE_META).filter(t => TYPE_META[t].enabled !== false && TYPE_META[t].creatable !== false)
      .map(t => `<option value="${t}">${t} · ${TYPE_META[t].label}</option>`).join('');
    renderGraph();
  }catch(e){ /* 后端不可达时保留内置兜底 */ }
}

async function loadKnowledgeBases(){
  if(MODE !== 'live') return;
  try{ KNOWLEDGE_BASES = (await apiJSON('/v1/knowledge-bases')).items || []; }
  catch(e){ KNOWLEDGE_BASES = []; }
  syncMemoryKnowledgeOptions();
}

function typeMeta(t){ return TYPE_META[t] || {label:t, cat:'?', desc:'', color:'#6b7280'}; }
function defaultNodeTimeout(type){
  const configured = Number(typeMeta(type).default_timeout);
  if(Number.isInteger(configured) && configured >= 1 && configured <= 3600) return configured;
  return type === 'knowledge_retrieval' ? 300 : 10;
}
function creatableNodeTypes(){ return Object.keys(TYPE_META).filter(t => TYPE_META[t].enabled !== false && TYPE_META[t].creatable !== false); }
function lifecycleLabel(value){ return ({active:'正常',legacy:'待废弃',demo:'演示'})[value] || value || '正常'; }
function lifecycleClass(value){ return value === 'active' || !value ? 'ok' : (value === 'demo' ? 'wait' : 'fail'); }

function defaultGraph(){
  return {
    node_defaults_version:1,
    id:'default', version:'v1', status:'published', entry:'start',
    nodes:[
      {id:'start',type:'start',x:120,y:120,config:{copy_input:true,load_context:false}},
      {id:'end',type:'end',x:420,y:120,config:{source_path:'variables'}}
    ],
    edges:[{from:'start',to:'end'}]
  };
}

let GRAPH = defaultGraph();
const nodes = {};
let sel = {kind:null, id:null, idx:-1};
const SELECTED_NODE_IDS = new Set();
let linking = null;
let CANVAS_CLIPBOARD = null;
const NODE_TESTS = {};
const NODE_IO_SELECTED = {};
const TRACE_NODE_SELECTION = {};
const NODE_EDITOR = {open:false,nodeId:'',tab:'config',dirty:false,snapshot:null};
const SUBGRAPH_AGENT_OPTIONS = {loading:false,error:'',seq:0};

/* ---- 多 Agent / 多图上下文 ----
   后端早就支持多 agent 与多图（/v1/agents、/v1/graphs），此前 UI 把 code、版本、
   graph_id 由当前 Agent/版本动态决定，未选择时保持空态。
   这里把三样收进 CUR：切 agent 连带换图与契约，选择记在 localStorage。 */
let AGENTS = [];
let PROJECTS = [];
let GRAPHS = [];
let GRAPH_LIST_ERROR = '';
let GRAPH_LOAD_SEQ = 0;
let CANVAS_GRAPH_SCOPE = '';
let CANVAS_GRAPH_QUERY = '';
let CUR = { code:'', name:'', version:'', graphId:'default', boundGraph:null };
const CUR_KEY = 'sanitized_agent_console.cur';
const SMOKE_RE = /^qa_demo/;

function canvasAgentCode(){
  return CANVAS_GRAPH_SCOPE.startsWith('agent:') ? CANVAS_GRAPH_SCOPE.slice(6) : '';
}

function graphBindingCodes(graph){
  const codes = new Set((Array.isArray(graph && graph.agents) ? graph.agents : [])
    .map(item => typeof item === 'string' ? item : (item && item.code))
    .map(item => String(item || '').trim()).filter(Boolean));
  const owner = String((graph && graph.owner_agent_code) || '').trim();
  if(owner) codes.add(owner);
  return [...codes];
}

function graphScopeFor(graph){
  const codes = graphBindingCodes(graph);
  if(!codes.length) return 'unbound';
  if(CUR.code && codes.includes(CUR.code)) return 'agent:' + CUR.code;
  return 'agent:' + codes[0];
}

function canvasGraphOwner(){ return canvasAgentCode() || null; }

function currentGraphAgentCode(){
  const listed = GRAPHS.find(graph => graph.graph_id === GRAPH.id || graph.graph_id === CUR.graphId);
  const bindings = graphBindingCodes(listed || {});
  const scoped = canvasAgentCode();
  if(scoped && bindings.includes(scoped)) return scoped;
  if(bindings.length === 1) return bindings[0];
  const dslOwner = String(GRAPH.owner_agent_code || '').trim();
  return dslOwner || scoped || CUR.code || '';
}

function graphsForCanvasScope(includeSearch=true){
  const scope = CANVAS_GRAPH_SCOPE || (CUR.code ? 'agent:' + CUR.code : 'unbound');
  const code = scope.startsWith('agent:') ? scope.slice(6) : '';
  let items = GRAPHS.filter(graph => {
    const codes = graphBindingCodes(graph);
    return scope === 'unbound' ? codes.length === 0 : codes.includes(code);
  });
  const query = includeSearch ? CANVAS_GRAPH_QUERY.trim().toLowerCase() : '';
  if(query) items = items.filter(graph =>
    String(graph.graph_id || '').toLowerCase().includes(query)
    || String(graph.name || '').toLowerCase().includes(query));
  return items;
}

function saveCur(){
  try{
    // 未绑定图只是画布工作区，不属于顶部当前 Agent；不要把它写成该 Agent
    // 的恢复图，否则刷新后会把未绑定图误装入 Agent 上下文。
    const graphId = canvasAgentCode() === CUR.code
      ? CUR.graphId : (CUR.boundGraph || CUR.graphId);
    localStorage.setItem(CUR_KEY, JSON.stringify({ code:CUR.code, version:CUR.version, graphId }));
  }catch(e){ /* 隐私模式下 localStorage 会抛，忽略 */ }
}
function loadCur(){
  try{ return JSON.parse(localStorage.getItem(CUR_KEY) || 'null'); }catch(e){ return null; }
}

function pickVersion(a){
  if(!a) return null;
  const vs = (a.versions || []).map(v => typeof v === 'string' ? v : v.version);
  const al = a.aliases || {};
  const pub = (a.versions || []).filter(v => typeof v === 'object' && v.status === 'published').map(v => v.version);
  const canManage = !AUTH.enabled || authCan('system.admin') || (a.access || []).includes('manage');
  const pref = canManage
    ? ((al.latest && al.latest.version) || (al.stable && al.stable.version))
    : ((al.stable && al.stable.version) || pub[0]);
  return [pref, pub[0], vs[0]].filter(Boolean)[0] || null;
}

function renderAgentSel(){
  const sel = $('#agentSel'); if(!sel) return;
  if(!AGENTS.length){
    const empty = MODE === 'live' ? '尚未创建 Agent' : CUR.code;
    sel.innerHTML = `<option value="">${esc(empty)}</option>`;
    return;
  }
  const opt = a => `<option value="${esc(a.code)}"${a.code === CUR.code ? ' selected' : ''}>${esc(a.name || a.code)} · ${esc(a.code)}</option>`;
  const real = AGENTS.filter(a => !SMOKE_RE.test(a.code));
  const smoke = AGENTS.filter(a => SMOKE_RE.test(a.code));
  // 冒烟 agent 是压测/回归留下的，数量可能几十个，收进 optgroup 免得把真 agent 淹掉
  sel.innerHTML = real.map(opt).join('')
    + (smoke.length ? `<optgroup label="冒烟测试（${smoke.length}）">${smoke.map(opt).join('')}</optgroup>` : '');
}

async function loadAgents(){
  if(MODE !== 'live'){ renderAgentSel(); return false; }
  try{
    const b = await apiJSON('/v1/agents');
    AGENTS = b.items || [];
  }catch(e){ AGENTS = []; }
  renderAgentSel();
  if(!AGENTS.length){
    CUR = {code:'', name:'', version:'', graphId:'default', boundGraph:null};
    CANVAS_GRAPH_SCOPE = 'unbound';
    try{ localStorage.removeItem(CUR_KEY) }catch(e){}
    renderAgentSel();
    const verEl = $('#agentVer'); if(verEl) verEl.textContent = '—';
    const stEl = $('#agentSt'); if(stEl) stEl.textContent = '';
    renderAgentPick(); renderContract(); renderGraphScopeSel(); renderGraphSel(); syncAgentPermissionUi();
    return false;
  }
  const saved = loadCur();
  const target = (saved && AGENTS.some(a => a.code === saved.code)) ? saved.code
               : (AGENTS.some(a => a.code === CUR.code) ? CUR.code
                                                        : (AGENTS.find(a => !SMOKE_RE.test(a.code)) || AGENTS[0]).code);
  // 只有恢复到"同一个 agent"时才复用上次的版本与图；否则会把 A 的图套到 B 身上，
  // 看起来像是 B 绑错了图。
  const same = !!saved && saved.code === target;
  await switchAgent(target, { version: same ? saved.version : null,
                              graphId: same ? saved.graphId : null, silent: true });
  return true;
}

async function switchAgent(code, opt = {}){
  if(!code) return;
  CANVAS_GRAPH_SCOPE = 'agent:' + code;
  CANVAS_GRAPH_QUERY = '';
  const search = $('#graphSearch'); if(search) search.value = '';
  let ver = opt.version || null, graphId = opt.graphId || null, boundGraph = null, name = code, status = '';
  if(MODE === 'live'){
    try{
      const d = await apiJSON('/v1/agents/' + encodeURIComponent(code));
      name = d.name || code;
      const list = d.versions || [];
      const v = (ver && list.find(x => x.version === ver))
             || list.find(x => x.version === pickVersion(d)) || list[0];
      if(v){
        ver = v.version; boundGraph = v.graph_id || null; status = v.status;
        if(graphId){
          const listed = GRAPHS.find(graph => graph.graph_id === graphId);
          if(listed && !graphBindingCodes(listed).includes(code)) graphId = null;
        }
        graphId = graphId || boundGraph;
      }
    }catch(e){ /* 没注册、已删除或暂不可达：保持目标 code，版本与图进入空态 */ }
  }
  CUR.code = code; CUR.name = name;
  // 切 Agent 时不能沿用上一个 Agent 的版本号；没有可用版本就保持空态并禁用运行。
  CUR.version = ver || '';
  CUR.boundGraph = boundGraph || graphId || null; // 版本绑定图 ≠ 画布临时切换到的同 Agent 图
  CUR.graphId = graphId || 'default';
  saveCur();
  renderAgentSel();
  const verEl = $('#agentVer'); if(verEl) verEl.textContent = CUR.version || '—';
  const stEl = $('#agentSt'); if(stEl) stEl.textContent = status ? '· ' + status : '';
  await Promise.all([loadGraph(CUR.graphId), loadContract(CUR.code, CUR.version)]);
  renderAgentPick(); renderContract(); renderGraphSel();
  syncAgentPermissionUi();
  refreshSummary();     // KPI 按 Agent 走，切完必须重算
  if(!opt.silent) toast('已切到 ' + CUR.code + '@' + (CUR.version || '—') + ' · 图 ' + CUR.graphId);
}

async function loadGraphList(){
  if(MODE !== 'live'){ renderGraphScopeSel(); renderGraphSel(); return; }
  const r = await apiRaw('/v1/graphs');
  if(r.ok){
    GRAPHS = r.body.items || [];
    GRAPH_LIST_ERROR = '';
  }else{
    GRAPHS = [];
    GRAPH_LIST_ERROR = `${r.body.code || r.status} · ${r.body.message || '编排图列表加载失败'}`;
  }
  renderGraphScopeSel();
  renderGraphSel();
  return r.ok;
}

function renderGraphScopeSel(){
  const sel = $('#graphScopeSel'); if(!sel) return;
  const current = GRAPHS.find(graph => graph.graph_id === CUR.graphId);
  const agentValues = new Set(AGENTS.map(agent => 'agent:' + agent.code));
  const inferred = current ? graphScopeFor(current) : '';
  if(!CANVAS_GRAPH_SCOPE || (CANVAS_GRAPH_SCOPE !== 'unbound' && !agentValues.has(CANVAS_GRAPH_SCOPE))){
    CANVAS_GRAPH_SCOPE = agentValues.has(inferred)
      ? inferred : (CUR.code && agentValues.has('agent:' + CUR.code) ? 'agent:' + CUR.code : 'unbound');
  }
  const unboundCount = GRAPHS.filter(graph => graphBindingCodes(graph).length === 0).length;
  const option = agent => {
    const value = 'agent:' + agent.code;
    const count = GRAPHS.filter(graph => graphBindingCodes(graph).includes(agent.code)).length;
    return `<option value="${attr(value)}"${CANVAS_GRAPH_SCOPE===value?' selected':''}>${esc(agent.name || agent.code)} · ${esc(agent.code)}（${count}）</option>`;
  };
  const real = AGENTS.filter(agent => !SMOKE_RE.test(agent.code));
  const smoke = AGENTS.filter(agent => SMOKE_RE.test(agent.code));
  sel.innerHTML = real.map(option).join('')
    + (smoke.length ? `<optgroup label="冒烟测试 Agent">${smoke.map(option).join('')}</optgroup>` : '')
    + `<option value="unbound"${CANVAS_GRAPH_SCOPE==='unbound'?' selected':''}>未绑定编排图（${unboundCount}）</option>`;
}

function graphOptionLabel(graph){
  const version = graph.latest ? '@' + graph.latest : '';
  const status = graph.status === 'published' || (graph.published && graph.published === graph.latest)
    ? '已发布' : '草稿';
  const relation = CANVAS_GRAPH_SCOPE === 'unbound' ? '未绑定'
    : (canvasAgentCode() === CUR.code && graph.graph_id === CUR.boundGraph ? '当前版本' : '历史/其他版本');
  return `${graph.name || graph.graph_id} · ${graph.graph_id}${version} · ${status} · ${relation} · ${Number(graph.nodes)||0}节点/${Number(graph.edges)||0}边`;
}

function renderGraphSel(){
  const sel = $('#graphSel'); if(!sel) return;
  renderGraphScopeSel();
  const scoped = graphsForCanvasScope();
  if(!scoped.length){
    const total = graphsForCanvasScope(false).length;
    sel.innerHTML = `<option value="">${total ? '没有匹配的编排图' : (CANVAS_GRAPH_SCOPE==='unbound'?'暂无未绑定编排图':'该 Agent 暂无编排图')}</option>`;
    sel.disabled = true;
    syncGraphDeleteAvailability();
    return;
  }
  sel.disabled = false;
  const currentVisible = scoped.some(graph => graph.graph_id === CUR.graphId);
  sel.innerHTML = (currentVisible ? '' : '<option value="" selected>选择一个编排图</option>') + scoped.map(g =>
    `<option value="${esc(g.graph_id)}"${g.graph_id === CUR.graphId ? ' selected' : ''}>`
    + `${esc(graphOptionLabel(g))}</option>`).join('');
  syncGraphDeleteAvailability();
}

async function pickGraphScope(value){
  if(!value) return;
  CANVAS_GRAPH_SCOPE = value;
  CANVAS_GRAPH_QUERY = '';
  const search = $('#graphSearch'); if(search) search.value = '';
  if(value.startsWith('agent:')){
    const code = value.slice(6);
    await switchAgent(code, {silent:true});
    const available = graphsForCanvasScope(false);
    if(available.length && !available.some(graph => graph.graph_id === CUR.graphId))
      await pickGraph(available[0].graph_id);
    else renderGraphSel();
    toast(`已切到 Agent ${code} 的编排工作区`);
    return;
  }
  renderGraphSel();
  syncAgentPermissionUi();
  const available = graphsForCanvasScope(false);
  if(available.length) await pickGraph(available[0].graph_id);
  else {
    CUR.graphId = 'default'; GRAPH = defaultGraph();
    renderGraph(); renderGraphSel();
    toast('当前没有未绑定编排图');
  }
}

function setGraphSearch(value){
  CANVAS_GRAPH_QUERY = String(value || '');
  renderGraphSel();
}

async function pickGraph(gid){
  if(!gid) return;
  CUR.graphId = gid; saveCur();
  await loadGraph(gid);
  syncAgentPermissionUi();
  if(canvasAgentCode() && CUR.boundGraph && CUR.boundGraph !== gid)
    toast('注意：' + CUR.code + '@' + CUR.version + ' 仍绑定 ' + CUR.boundGraph
          + '；画布运行走内联图，生产调用仍用绑定图');
}

async function loadGraph(gid){
  const target = gid || CUR.graphId || 'default';
  const loadSeq = ++GRAPH_LOAD_SEQ;
  if(ACTIVE_VIEW_GRAPH && ACTIVE_VIEW_GRAPH !== target) rememberGraphViewport(ACTIVE_VIEW_GRAPH);
  if(MODE !== 'live'){
    renderGraph();
    activateGraphViewport(target);
    return true;
  }
  try{
    const g = await apiJSON('/v1/graphs/' + encodeURIComponent(target));
    if(loadSeq !== GRAPH_LOAD_SEQ) return false;
    GRAPH = Object.assign({}, g.dsl, { id: g.graph_id || target, version: g.version, status: g.status });
    repairErrorBoundaryConfigs(GRAPH);
    CUR.graphId = target;
    saveCur();
    const gk = $('#graphKey'); if(gk) gk.textContent = 'graphs.' + target;
    renderGraph();
    activateGraphViewport(target);
    renderGraphSel();
    return true;
  }catch(e){
    if(loadSeq !== GRAPH_LOAD_SEQ) return false;
    // 先刷新真实列表。目标已不在列表里时说明它已被删除；优先回到当前
    // Agent 版本绑定图，避免 selector 显示 A、画布实际却是本地 default。
    const listed = await loadGraphList();
    const targetStillExists = listed && GRAPHS.some(item => item.graph_id === target);
    if(target !== 'default' && listed && !targetStillExists){
      const scopedIds = new Set(graphsForCanvasScope(false).map(item => item.graph_id));
      const fallback = [CUR.boundGraph, ...scopedIds]
        .find(graphId => graphId && graphId !== target
          && scopedIds.has(graphId));
      if(fallback){
        CUR.graphId = fallback; saveCur();
        const recovered = await loadGraph(fallback);
        if(recovered) toast(`已自动切换到可用编排图 ${fallback}`);
        return recovered;
      }
      CUR.graphId = 'default';
      if(CUR.boundGraph === target) CUR.boundGraph = null;
      saveCur(); GRAPH = defaultGraph();
      const gk = $('#graphKey'); if(gk) gk.textContent = 'local.unsaved';
      renderGraph(); activateGraphViewport('default'); renderGraphSel();
      showVbar('warn', [`原编排图 ${target} 已不存在；当前没有可用编排图，画布显示本地未保存起始图`]);
      return false;
    }
    if(target === 'default' && listed && !GRAPHS.length){
      CUR.graphId = 'default'; saveCur(); GRAPH = defaultGraph();
      const gk = $('#graphKey'); if(gk) gk.textContent = 'local.unsaved';
      renderGraph(); activateGraphViewport('default'); renderGraphSel();
      return false;
    }
    showVbar('err', ['图加载失败：' + target + '（' + e.message + '）']);
    renderGraphSel();
    return false;
  }
}

function renderGraph(){
  buildCanvas();
  if($("#gNodeCount")) $("#gNodeCount").textContent=GRAPH.nodes.length;
  if($("#gEdgeCount")) $("#gEdgeCount").textContent=GRAPH.edges.length;
  const listed = GRAPHS.find(item => item.graph_id === GRAPH.id);
  const status = GRAPH.status === 'published' ? '已发布' : (GRAPH.status === 'draft' ? '草稿' : (GRAPH.status || '本地'));
  const owner = canvasAgentCode() ? 'Agent ' + canvasAgentCode() : '未绑定';
  const m = (listed && listed.name && listed.name !== GRAPH.id ? listed.name + ' · ' : '')
    + GRAPH.id + '@' + (GRAPH.version || 'local') + ' · ' + status + ' · '
    + GRAPH.nodes.length + '节点/' + GRAPH.edges.length + '边 · ' + owner;
  const el = $('#graphMeta'); if(el) el.textContent = m;
  drawEdges();
}

const NODE_DESCRIPTION_TOOLTIP={timer:null,pinned:false,nodeId:''};

function hideNodeDescription(force=false){
  if(NODE_DESCRIPTION_TOOLTIP.timer){clearTimeout(NODE_DESCRIPTION_TOOLTIP.timer);NODE_DESCRIPTION_TOOLTIP.timer=null;}
  if(NODE_DESCRIPTION_TOOLTIP.pinned&&!force)return;
  const tooltip=$('#nodeDescriptionTooltip');if(tooltip)tooltip.classList.remove('on');
  NODE_DESCRIPTION_TOOLTIP.pinned=false;NODE_DESCRIPTION_TOOLTIP.nodeId='';
}

function showNodeDescription(id,element,pinned=false){
  const node=GRAPH.nodes.find(item=>item.id===id);
  const description=String((node&&node.description)||'').trim();
  if(!node||!description){hideNodeDescription(true);return false}
  let tooltip=$('#nodeDescriptionTooltip');
  if(!tooltip){
    tooltip=document.createElement('div');tooltip.id='nodeDescriptionTooltip';
    tooltip.className='node-description-tooltip';document.body.appendChild(tooltip);
  }
  const meta=typeMeta(node.type),name=String(node.display_name||node.id).trim();
  tooltip.innerHTML=`<div class="node-description-tooltip-title">${esc(name)}</div><div class="node-description-tooltip-meta">${esc(node.id)} · ${esc(node.type)} · ${esc(meta.label)}</div><div class="node-description-tooltip-body">${esc(description)}</div>`;
  tooltip.classList.add('on');
  const anchor=element.getBoundingClientRect(),box=tooltip.getBoundingClientRect();
  const left=Math.max(8,Math.min(window.innerWidth-box.width-8,anchor.left));
  const below=anchor.bottom+8;
  const top=below+box.height<=window.innerHeight-8?below:Math.max(8,anchor.top-box.height-8);
  tooltip.style.left=left+'px';tooltip.style.top=top+'px';
  NODE_DESCRIPTION_TOOLTIP.pinned=!!pinned;NODE_DESCRIPTION_TOOLTIP.nodeId=id;
  return true;
}

function scheduleNodeDescription(id,element){
  if(NODE_DESCRIPTION_TOOLTIP.pinned)return;
  if(NODE_DESCRIPTION_TOOLTIP.timer)clearTimeout(NODE_DESCRIPTION_TOOLTIP.timer);
  NODE_DESCRIPTION_TOOLTIP.timer=setTimeout(()=>{
    NODE_DESCRIPTION_TOOLTIP.timer=null;showNodeDescription(id,element,false);
  },300);
}

document.addEventListener('pointerdown',event=>{
  if(!(event.target.closest&&event.target.closest('.node')))hideNodeDescription(true);
});

function buildCanvas(){
  hideNodeDescription(true);
  const canvas = $('#canvas');
  canvas.querySelectorAll('.node').forEach(e=>e.remove());
  Object.keys(nodes).forEach(k=>delete nodes[k]);

  GRAPH.nodes.forEach(n=>{
    const meta = typeMeta(n.type);
    const cfg = n.config || {};
    // subgraph 节点的关键信息是"引用了谁"，标题下面直接显示 agent@版本，
    // 否则画布上跟普通节点长得一样，看不出这是 Agent 级复用。
    const isSub = n.type === 'subgraph';
    const subDesc = isSub
      ? `↳ <span class="mono">${esc(cfg.agent || '未配置 agent')}</span>`
      : n.type === 'switch'
        ? `↳ <span class="mono">${esc(cfg.selector_path || '未配置 selector_path')}</span>`
        : `${meta.label} · ${meta.desc}`;
    const branchDefs = requiredRouteDefsFor(n);
    const connected = new Set(GRAPH.edges.filter(e => e.from === n.id && e.condition).map(e => e.condition));
    const missing = branchDefs.filter(x => !connected.has(x.route));
    const branchTitle = missing.length
      ? '当前策略待连接：' + missing.map(x => x.label).join('、')
      : (branchDefs.length ? '当前策略所需分支已连接' : '');
    const branchMeta = branchDefs.length
      ? `<span class="branch-status ${missing.length ? 'pending' : 'complete'}" title="${attr(branchTitle)}">分支 ${branchDefs.length-missing.length}/${branchDefs.length}${missing.length ? ' · 待连 ' + missing.length : ' · 完整'}</span>`
      : '';
    const portClass = branchDefs.length ? (missing.length ? ' branch-pending' : ' branch-complete') : '';
    const portTitle = branchDefs.length ? branchTitle : '拖到目标节点连线';
    const displayName=String(n.display_name||'').trim();
    const el = document.createElement('div');
    el.className = 'node' + (isSub ? ' sub' : '');
    el.dataset.id = n.id;
    el.dataset.state = 'idle';
    el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
    el.innerHTML =
      `<div class="port in left" data-side="left" title="左侧输入"></div>
       <div class="port in top" data-side="top" title="上方输入"></div>
       <div class="port out right${portClass}" data-side="right" title="${attr(portTitle)} · 右侧输出"></div>
       <div class="port out bottom${portClass}" data-side="bottom" title="${attr(portTitle)} · 下方输出"></div>
       <div class="nd-head"><span class="nd-dot" style="background:${meta.color}"></span>
         <span class="nd-title">${esc(displayName||n.id)}</span><span class="nd-tag">${meta.cat} · 专属</span></div>
       <div class="nd-sub">${subDesc}</div>
       <div class="nd-meta">${displayName?`<span class="nd-id mono">${esc(n.id)}</span>`:''}${branchMeta}<span class="nm-ms">${isSub ? '' : '—'}</span><span class="nm-tok"></span>${isSub ? `<span class="mono" style="margin-left:auto">@${esc(cfg.version || 'stable')} → ${esc(cfg.output_path || 'variables.subgraph_output')}</span>` : ''}</div>`;
    canvas.appendChild(el);

    const rt = {id:n.id, type:n.type, x:n.x, y:n.y, el, _state:'idle'};
    nodes[n.id] = rt;

    attachDrag(el, rt);
    el.addEventListener('click', e=>{
      if(rt._moved) return;
      if(e.target.classList.contains('port')) return;
      selectNode(n.id, {toggle:e.ctrlKey || e.metaKey});
      showNodeDescription(n.id,el,true);
    });
    el.addEventListener('mouseenter',()=>scheduleNodeDescription(n.id,el));
    el.addEventListener('mouseleave',()=>hideNodeDescription());
    el.addEventListener('dblclick', e=>{
      if(rt._moved || e.target.classList.contains('port')) return;
      e.preventDefault(); e.stopPropagation();
      hideNodeDescription(true);
      openNodeEditor(n.id);
    });
    el.querySelectorAll('.port.out').forEach(out=>{
      out.addEventListener('pointerdown', e=>startConnect(n.id, e, out.dataset.side));
    });
  });
  if(GRAPH.entry && nodes[GRAPH.entry]) nodes[GRAPH.entry].el.classList.add('entry');
  [...SELECTED_NODE_IDS].forEach(id=>{ if(!nodes[id]) SELECTED_NODE_IDS.delete(id); });
  if(sel.kind === 'node' && !nodes[sel.id]) sel = {kind:null,id:null,idx:-1};
  syncNodeSelectionUI();
  resetCanvasSize();
}

function attachDrag(el, n){
  let sx=0, sy=0, origins=new Map(), movingIds=[], dragging=false;
  el.addEventListener('pointerdown', e=>{
    if(e.button!==0 || e.target.classList.contains('port')) return;
    if(e.ctrlKey || e.metaKey) return;
    hideNodeDescription(true);
    if(!SELECTED_NODE_IDS.has(n.id)) selectNode(n.id);
    dragging = true; n._moved = false;
    sx = e.clientX; sy = e.clientY;
    movingIds = SELECTED_NODE_IDS.has(n.id) ? [...SELECTED_NODE_IDS] : [n.id];
    origins = new Map(movingIds.map(id=>[id,{x:nodes[id].x,y:nodes[id].y}]));
    movingIds.forEach(id=>nodes[id]?.el.classList.add('dragging'));
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const z = ZOOM || 1;
    const dx = (e.clientX-sx)/z, dy = (e.clientY-sy)/z;
    if(Math.abs(dx)+Math.abs(dy) > 3) n._moved = true;
    const minX = Math.min(...movingIds.map(id=>origins.get(id).x + dx));
    const minY = Math.min(...movingIds.map(id=>origins.get(id).y + dy));
    const shiftX = Math.max(0, Math.ceil(CANVAS_ORIGIN_GUARD-minX));
    const shiftY = Math.max(0, Math.ceil(CANVAS_ORIGIN_GUARD-minY));
    if(shiftX || shiftY){
      shiftCanvasOrigin(shiftX, shiftY);
      origins.forEach(origin=>{origin.x += shiftX;origin.y += shiftY;});
    }
    movingIds.forEach(id=>{
      const rt=nodes[id], origin=origins.get(id); if(!rt||!origin)return;
      rt.x = Math.max(CANVAS_ORIGIN_GUARD, origin.x+dx);
      rt.y = Math.max(CANVAS_ORIGIN_GUARD, origin.y+dy);
      rt.el.style.left = rt.x + 'px'; rt.el.style.top = rt.y + 'px';
      ensureCanvasSpace(rt.x, rt.y, rt.type);
      syncCoords(rt);
    });
    drawEdges();
  });
  el.addEventListener('pointerup', e=>{
    dragging = false;
    movingIds.forEach(id=>nodes[id]?.el.classList.remove('dragging'));
    if(n._moved) updateNodeSelectionInspector();
    try{ el.releasePointerCapture(e.pointerId); }catch(_){}
  });
}

function syncCoords(rt){
  const n = GRAPH.nodes.find(x=>x.id===rt.id);
  if(n){ n.x = Math.round(rt.x); n.y = Math.round(rt.y); }
}

function toCanvas(clientX, clientY){
  const r = $('#canvas').getBoundingClientRect();
  const z = ZOOM || 1;
  return { x:(clientX-r.left)/z, y:(clientY-r.top)/z };
}

function nodeRouteBox(node){
  const fallbackWidth = node.type === 'subgraph' ? NW_SUB : NW;
  return {
    width:Math.max(fallbackWidth, Number(node.el && node.el.offsetWidth) || 0),
    height:Math.max(NH, Number(node.el && node.el.offsetHeight) || 0)
  };
}

function inferredEdgePorts(a,b){
  const ab=nodeRouteBox(a),bb=nodeRouteBox(b);
  const acx=a.x+ab.width/2,acy=a.y+ab.height/2;
  const bcx=b.x+bb.width/2,bcy=b.y+bb.height/2;
  const dx=bcx-acx,dy=bcy-acy;
  return dy>0 && Math.abs(dy)>Math.abs(dx)*0.72
    ? {sourceSide:'bottom',targetSide:'top'}
    : {sourceSide:'right',targetSide:'left'};
}

function edgeAnchor(node,side){
  const box=nodeRouteBox(node);
  if(side==='bottom')return {x:node.x+box.width/2,y:node.y+box.height,dx:0,dy:1};
  if(side==='top')return {x:node.x+box.width/2,y:node.y,dx:0,dy:-1};
  if(side==='left')return {x:node.x,y:node.y+box.height/2,dx:-1,dy:0};
  return {x:node.x+box.width,y:node.y+box.height/2,dx:1,dy:0};
}

function routePath(a,b,edge={}){
  const inferred=inferredEdgePorts(a,b);
  const sourceSide=['right','bottom'].includes(edge.source_port)
    ? edge.source_port : inferred.sourceSide;
  const targetSide=['left','top'].includes(edge.target_port)
    ? edge.target_port : inferred.targetSide;
  const start=edgeAnchor(a,sourceSide),end=edgeAnchor(b,targetSide);
  const distance=Math.hypot(end.x-start.x,end.y-start.y);
  const k=Math.max(28,Math.min(180,distance*.42));
  const c1x=start.x+start.dx*k,c1y=start.y+start.dy*k;
  const c2x=end.x+end.dx*k,c2y=end.y+end.dy*k;
  const bend=edge.bend&&typeof edge.bend.x==='number'&&Number.isFinite(edge.bend.x)
    &&typeof edge.bend.y==='number'&&Number.isFinite(edge.bend.y)
    ? {x:edge.bend.x,y:edge.bend.y} : null;
  if(bend){
    const tangentDistance=Math.hypot(end.x-start.x,end.y-start.y)||1;
    const tx=(end.x-start.x)/tangentDistance,ty=(end.y-start.y)/tangentDistance;
    const firstDistance=Math.hypot(bend.x-start.x,bend.y-start.y);
    const secondDistance=Math.hypot(end.x-bend.x,end.y-bend.y);
    const firstK=Math.max(18,Math.min(100,firstDistance*.36));
    const secondK=Math.max(18,Math.min(100,secondDistance*.36));
    const d=`M${start.x} ${start.y} C${start.x+start.dx*firstK} ${start.y+start.dy*firstK}, ${bend.x-tx*firstK} ${bend.y-ty*firstK}, ${bend.x} ${bend.y} C${bend.x+tx*secondK} ${bend.y+ty*secondK}, ${end.x+end.dx*secondK} ${end.y+end.dy*secondK}, ${end.x} ${end.y}`;
    return {d,ax:start.x,ay:start.y,bx:end.x,by:end.y,mx:bend.x,my:bend.y,sourceSide,targetSide};
  }
  const mx=(start.x+3*c1x+3*c2x+end.x)/8,my=(start.y+3*c1y+3*c2y+end.y)/8;
  return {d:`M${start.x} ${start.y} C${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`,
    ax:start.x,ay:start.y,bx:end.x,by:end.y,mx,my,sourceSide,targetSide};
}

function drawEdges(){
  const svg = $('#edges');
  const screenScale=Math.max(.01,ZOOM||1);
  let out = '<defs><marker id="ar" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.6" stroke-linecap="round"/></marker></defs>';
  GRAPH.edges.forEach((e, i)=>{
    const a = nodes[e.from], b = nodes[e.to];
    if(!a || !b) return;
    const sourceNode = GRAPH.nodes.find(n => n.id === e.from);
    const allowed = condsFor(sourceNode);
    const validCondition = !e.condition || allowed.includes(e.condition);
    const { d, mx, my } = routePath(a, b, e);
    const active = a._state === 'done' || a._state === 'running';
    const color = e.condition ? (validCondition ? routeColor(e.condition) : '#b91c1c') : (active ? '#4f46e5' : '#c8ccd4');
    const isSel = sel.kind === 'edge' && sel.idx === i;
    out += `<path class="edge ${e.condition ? 'dashed' : ''} ${isSel ? 'sel' : ''}" d="${d}" marker-end="url(#ar)" vector-effect="non-scaling-stroke" style="stroke:${isSel ? '#4f46e5' : color};opacity:${e.condition ? 0.85 : 1}"/>`;
    out += `<path class="edge-hit" d="${d}" data-idx="${i}" vector-effect="non-scaling-stroke"/>`;
    const fullLabel = e.condition ? (validCondition ? routeLabel(sourceNode, e.condition) : '无效 · ' + e.condition) : '';
    const label = fullLabel.length > 20 ? fullLabel.slice(0, 19) + '…' : fullLabel;
    if(label){
      const labelY = my - 7;
      const w = label.length*11 + 8;
      out += `<rect class="edge-label-bg" x="${mx-w/2}" y="${labelY-9}" width="${w}" height="14" rx="3"/>`;
      out += `<text class="edge-label" x="${mx}" y="${labelY+1}" text-anchor="middle" style="fill:${color}">${esc(label)}</text>`;
    }
    if(isSel){
      out += `<circle class="edge-bend-hit" data-idx="${i}" cx="${mx}" cy="${my}" r="${12/screenScale}"><title>拖动调整连线；双击恢复自动布线</title></circle>`;
      out += `<circle class="edge-bend-handle" cx="${mx}" cy="${my}" r="${5/screenScale}" vector-effect="non-scaling-stroke"/>`;
    }
  });
  if(linking && linking.ghost){
    out += `<path d="${linking.ghost}" fill="none" stroke="#4f46e5" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#ar)"/>`;
  }
  svg.innerHTML = out;
  svg.querySelectorAll('.edge-hit').forEach(p=>{
    p.addEventListener('pointerdown',ev=>startEdgeBendDrag(+p.dataset.idx,ev));
    p.addEventListener('click', ev=>{ ev.stopPropagation(); selectEdge(+p.dataset.idx); });
  });
  svg.querySelectorAll('.edge-bend-hit').forEach(handle=>{
    handle.addEventListener('pointerdown',ev=>startEdgeBendDrag(+handle.dataset.idx,ev));
    handle.addEventListener('dblclick',ev=>{ev.preventDefault();ev.stopPropagation();resetEdgeBend(+handle.dataset.idx);});
  });
}

function startEdgeBendDrag(index,ev){
  if(ev.button!==0)return;
  ev.preventDefault();ev.stopPropagation();
  const svg=$('#edges');
  try{if(svg&&svg.setPointerCapture)svg.setPointerCapture(ev.pointerId);}catch(_){}
  selectEdge(index);
  const startX=ev.clientX,startY=ev.clientY;
  let moved=false;
  const move=e=>{
    const edge=GRAPH.edges[index];if(!edge)return;
    if(!moved&&Math.hypot(e.clientX-startX,e.clientY-startY)<3)return;
    let p=toCanvas(e.clientX,e.clientY);
    const shiftX=Math.max(0,Math.ceil(CANVAS_ORIGIN_GUARD-p.x));
    const shiftY=Math.max(0,Math.ceil(CANVAS_ORIGIN_GUARD-p.y));
    if(shiftX||shiftY){shiftCanvasOrigin(shiftX,shiftY);p={x:p.x+shiftX,y:p.y+shiftY};}
    edge.bend={x:Math.round(Math.max(CANVAS_ORIGIN_GUARD,p.x)),y:Math.round(Math.max(CANVAS_ORIGIN_GUARD,p.y))};
    ensureCanvasPoint(edge.bend.x,edge.bend.y);
    moved=true;drawEdges();
  };
  const up=e=>{
    document.removeEventListener('pointermove',move);
    document.removeEventListener('pointerup',up);
    document.removeEventListener('pointercancel',up);
    try{if(svg&&svg.releasePointerCapture)svg.releasePointerCapture((e&&e.pointerId)||ev.pointerId);}catch(_){}
    if(moved)renderDetail();
  };
  document.addEventListener('pointermove',move);
  document.addEventListener('pointerup',up);
  document.addEventListener('pointercancel',up);
}

function resetEdgeBend(index){
  const edge=GRAPH.edges[index];if(!edge)return;
  delete edge.bend;drawEdges();renderDetail();toast('已恢复自动布线');
}

function startConnect(fromId, ev, sourceSide='right'){
  ev.preventDefault(); ev.stopPropagation();
  linking = { from: fromId, sourceSide, ghost: '' };
  const move = e => {
    const p = toCanvas(e.clientX, e.clientY);
    const a = nodes[fromId];
    if(!a) return;
    const box=nodeRouteBox(a);
    const vertical=sourceSide==='bottom';
    const ax=vertical?a.x+box.width/2:a.x+box.width;
    const ay=vertical?a.y+box.height:a.y+box.height/2;
    const k=Math.max(30,Math.abs(vertical?p.y-ay:p.x-ax)*0.4);
    linking.ghost=vertical
      ? `M${ax} ${ay} C${ax} ${ay+k}, ${p.x} ${p.y-k}, ${p.x} ${p.y}`
      : `M${ax} ${ay} C${ax+k} ${ay}, ${p.x-k} ${p.y}, ${p.x} ${p.y}`;
    drawEdges();
  };
  const up = e => {
    document.removeEventListener('pointermove', move);
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const inputPort = el && el.closest ? el.closest('.port.in') : null;
    const target = el && el.closest ? el.closest('.node') : null;
    linking = null;
    if(target && target.dataset.id !== fromId){
      const targetSide=inputPort&&['left','top'].includes(inputPort.dataset.side)
        ? inputPort.dataset.side : (sourceSide==='bottom'?'top':'left');
      addEdge(fromId,target.dataset.id,{source_port:sourceSide,target_port:targetSide});
    } else {
      drawEdges();
    }
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up, { once:true });
}

function addEdge(from,to,ports={}){
  if(GRAPH.edges.some(e => e.from === from && e.to === to && !e.condition)){
    toast('这条边已存在'); return;
  }
  const src = GRAPH.nodes.find(n => n.id === from);
  let condition;
  const allowed = condsFor(src);
  if(allowed.length){
    const used = new Set(GRAPH.edges.filter(e => e.from === from).map(e => e.condition));
    condition = allowed.find(c => !used.has(c));
    if(!condition){ toast('该节点的全部分支都已连接'); drawEdges(); return; }
  }
  const edge = condition ? { from, to, condition } : { from, to };
  if(['right','bottom'].includes(ports.source_port))edge.source_port=ports.source_port;
  if(['left','top'].includes(ports.target_port))edge.target_port=ports.target_port;
  GRAPH.edges.push(edge);
  renderGraph();
  selectEdge(GRAPH.edges.length - 1);
  toast(condition ? `已连线 · 分支 ${routeLabel(src, condition)}（点击连线可改）` : '已连线');
}

function pruneInvalidOutgoingRoutes(node){
  if(!node) return [];
  const allowed = new Set(condsFor(node));
  const removed = [];
  GRAPH.edges = GRAPH.edges.filter(edge => {
    if(edge.from !== node.id || !edge.condition || allowed.has(edge.condition)) return true;
    removed.push(edge.condition);
    return false;
  });
  return [...new Set(removed)];
}

function selectEdge(i){
  sel = {kind:'edge', id:null, idx:i};
  SELECTED_NODE_IDS.clear();
  syncNodeSelectionUI();
  openInspector('连线');
  drawEdges();
  renderDetail();
}

/* ============ 缩放 / 平移（transform 视图模型） ============ */
const CW = 1000, CH = 420;
const CANVAS_MARGIN = 280;
const CANVAS_ORIGIN_GUARD = 24;
const CANVAS_SIZE = { width:CW, height:CH };
const ZMIN = 0.35, ZMAX = 2.4;
const ZSTEPS = [0.35, 0.5, 0.65, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.4];
const VIEW = { x: 0, y: 0, z: 1 };   // x/y 为画布左上角在视口中的偏移
let ZOOM = 1, AUTO_FIT = true;
const GRAPH_VIEW_STATES = new Map();
let ACTIVE_VIEW_GRAPH = '';
const CANVAS_FOCUS = {active:false, inspectorCollapsedBefore:false};

function nodeLogicalWidth(node){ return node && node.type === 'subgraph' ? NW_SUB : NW; }

function graphBounds(padding=36){
  if(!GRAPH.nodes.length) return {left:0,top:0,right:CW,bottom:CH,width:CW,height:CH};
  let left=Infinity, top=Infinity, right=-Infinity, bottom=-Infinity;
  GRAPH.nodes.forEach(node => {
    left = Math.min(left, Number(node.x) || 0);
    top = Math.min(top, Number(node.y) || 0);
    right = Math.max(right, (Number(node.x) || 0) + nodeLogicalWidth(node));
    bottom = Math.max(bottom, (Number(node.y) || 0) + NH);
  });
  GRAPH.edges.forEach(edge=>{
    if(!edge.bend)return;
    const x=Number(edge.bend.x),y=Number(edge.bend.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
  });
  left = Math.max(0, left-padding); top = Math.max(0, top-padding);
  right += padding; bottom += padding;
  return {left,top,right,bottom,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
}

function setCanvasSize(width, height){
  const nextWidth = Math.max(CW, Math.ceil(width));
  const nextHeight = Math.max(CH, Math.ceil(height));
  if(nextWidth === CANVAS_SIZE.width && nextHeight === CANVAS_SIZE.height) return;
  CANVAS_SIZE.width = nextWidth;
  CANVAS_SIZE.height = nextHeight;
  const canvas = $('#canvas'), svg = $('#edges');
  if(canvas){
    canvas.style.width = CANVAS_SIZE.width + 'px';
    canvas.style.height = CANVAS_SIZE.height + 'px';
  }
  if(svg){
    svg.style.width = CANVAS_SIZE.width + 'px';
    svg.style.height = CANVAS_SIZE.height + 'px';
    svg.setAttribute('width', CANVAS_SIZE.width);
    svg.setAttribute('height', CANVAS_SIZE.height);
    svg.setAttribute('viewBox', `0 0 ${CANVAS_SIZE.width} ${CANVAS_SIZE.height}`);
  }
}

function viewportLogicalSize(){
  const wrap = $('#canvasWrap'), z = VIEW.z || 1;
  return {width:wrap ? wrap.clientWidth/z : CW, height:wrap ? wrap.clientHeight/z : CH};
}

function resetCanvasSize(){
  const b = graphBounds(0), viewport = viewportLogicalSize();
  setCanvasSize(Math.max(CW, viewport.width, b.right + CANVAS_MARGIN),
    Math.max(CH, viewport.height, b.bottom + CANVAS_MARGIN));
}

function ensureCanvasSpace(x, y, type){
  const viewport = viewportLogicalSize();
  setCanvasSize(Math.max(CANVAS_SIZE.width, viewport.width, x + nodeLogicalWidth({type}) + CANVAS_MARGIN),
    Math.max(CANVAS_SIZE.height, viewport.height, y + NH + CANVAS_MARGIN));
}

function ensureCanvasPoint(x,y){
  const viewport=viewportLogicalSize();
  setCanvasSize(Math.max(CANVAS_SIZE.width,viewport.width,x+CANVAS_MARGIN),
    Math.max(CANVAS_SIZE.height,viewport.height,y+CANVAS_MARGIN));
}

function shiftCanvasOrigin(shiftX, shiftY){
  const sx = Math.max(0, Math.ceil(shiftX || 0));
  const sy = Math.max(0, Math.ceil(shiftY || 0));
  if(!sx && !sy) return;
  GRAPH.nodes.forEach(node => {
    node.x = (Number(node.x) || 0) + sx;
    node.y = (Number(node.y) || 0) + sy;
  });
  GRAPH.edges.forEach(edge=>{
    if(!edge.bend)return;
    edge.bend.x=(Number(edge.bend.x)||0)+sx;
    edge.bend.y=(Number(edge.bend.y)||0)+sy;
  });
  Object.values(nodes).forEach(node => {
    node.x += sx; node.y += sy;
    node.el.style.left = node.x + 'px';
    node.el.style.top = node.y + 'px';
  });
  setCanvasSize(CANVAS_SIZE.width + sx, CANVAS_SIZE.height + sy);
  VIEW.x -= sx * VIEW.z;
  VIEW.y -= sy * VIEW.z;
  applyView();
}

function applyView(){
  const wrap = $('#canvasWrap'), layer = $('#canvasLayer');
  if(!layer) return;
  layer.style.transform = `translate(${VIEW.x.toFixed(2)}px,${VIEW.y.toFixed(2)}px) scale(${VIEW.z})`;
  // 网格背景跟随缩放与平移
  wrap.style.backgroundSize = `${16 * VIEW.z}px ${16 * VIEW.z}px`;
  wrap.style.backgroundPosition = `${VIEW.x}px ${VIEW.y}px`;
  ZOOM = VIEW.z;
  updateZoomUI();
}

function updateZoomUI(){
  const lbl = $('#zLabel');
  if(lbl) lbl.textContent = Math.round(VIEW.z*100) + '%';
  const fitBtn = $('#zFit'), oneBtn = $('#zOne');
  if(fitBtn) fitBtn.classList.toggle('on', AUTO_FIT);
  if(oneBtn) oneBtn.classList.toggle('on', !AUTO_FIT && Math.abs(VIEW.z-1) < 0.01);
  const out = $('#zOut'), inn = $('#zIn');
  if(out){ out.disabled = VIEW.z <= ZMIN + 0.001; out.style.opacity = out.disabled ? .35 : 1; }
  if(inn){ inn.disabled = VIEW.z >= ZMAX - 0.001; inn.style.opacity = inn.disabled ? .35 : 1; }
}

/** 缩放到 z，并让屏幕点 anchor（不传则视口中心）下的内容保持不动 */
function zoomTo(z, anchor){
  const wrap = $('#canvasWrap');
  const nz = Math.max(ZMIN, Math.min(ZMAX, z));
  if(Math.abs(nz - VIEW.z) < 0.0005){ updateZoomUI(); return; }
  const r = wrap.getBoundingClientRect();
  const px = anchor ? anchor.x - r.left : wrap.clientWidth / 2;
  const py = anchor ? anchor.y - r.top  : wrap.clientHeight / 2;
  const f = nz / VIEW.z;
  VIEW.x = px - (px - VIEW.x) * f;
  VIEW.y = py - (py - VIEW.y) * f;
  VIEW.z = nz;
  applyView();
}

function zoomStep(dir){
  AUTO_FIT = false;
  const cands = ZSTEPS.filter(z => dir > 0 ? z > VIEW.z + 0.001 : z < VIEW.z - 0.001);
  if(!cands.length) return;
  zoomTo(dir > 0 ? Math.min(...cands) : Math.max(...cands));
}

function centerCanvas(){
  const wrap = $('#canvasWrap');
  const b = graphBounds();
  VIEW.x = (wrap.clientWidth - b.width * VIEW.z) / 2 - b.left * VIEW.z;
  VIEW.y = (wrap.clientHeight - b.height * VIEW.z) / 2 - b.top * VIEW.z;
  applyView();
}

function zoomReset(){
  AUTO_FIT = false;
  VIEW.z = 1;
  centerCanvas();
}

function fitZoom(){
  const wrap = $('#canvasWrap');
  if(!wrap || wrap.clientWidth < 60) return;
  const b = graphBounds(48);
  AUTO_FIT = true;
  VIEW.z = Math.min(1.3, Math.max(ZMIN,
    Math.min((wrap.clientWidth - 32) / b.width, (wrap.clientHeight - 32) / b.height)));
  VIEW.x = (wrap.clientWidth - b.width * VIEW.z) / 2 - b.left * VIEW.z;
  VIEW.y = (wrap.clientHeight - b.height * VIEW.z) / 2 - b.top * VIEW.z;
  applyView();
}

function rememberGraphViewport(graphId){
  const id = String(graphId || '').trim();
  if(!id) return;
  GRAPH_VIEW_STATES.set(id, {x:VIEW.x, y:VIEW.y, z:VIEW.z, autoFit:AUTO_FIT});
}

function graphVisibleInViewport(){
  const wrap = $('#canvasWrap');
  if(!wrap || wrap.clientWidth < 60 || wrap.clientHeight < 60 || !GRAPH.nodes.length) return true;
  const bounds = graphBounds(0);
  const left = VIEW.x + bounds.left * VIEW.z;
  const top = VIEW.y + bounds.top * VIEW.z;
  const right = VIEW.x + bounds.right * VIEW.z;
  const bottom = VIEW.y + bounds.bottom * VIEW.z;
  const margin = 24;
  return right >= margin && bottom >= margin
    && left <= wrap.clientWidth - margin && top <= wrap.clientHeight - margin;
}

function ensureGraphViewportVisible(){
  if(AUTO_FIT || !graphVisibleInViewport()) fitZoom();
  else applyView();
}

function activateGraphViewport(graphId){
  const id = String(graphId || GRAPH.id || 'default');
  ACTIVE_VIEW_GRAPH = id;
  resetCanvasSize();
  const saved = GRAPH_VIEW_STATES.get(id);
  if(!saved){
    AUTO_FIT = true;
    fitZoom();
    return;
  }
  VIEW.x = Number.isFinite(saved.x) ? saved.x : 0;
  VIEW.y = Number.isFinite(saved.y) ? saved.y : 0;
  VIEW.z = Math.max(ZMIN, Math.min(ZMAX, Number(saved.z) || 1));
  AUTO_FIT = !!saved.autoFit;
  ensureGraphViewportVisible();
}

/* 滚轮：Ctrl/⌘ 缩放，其余平移 */
$('#canvasWrap').addEventListener('wheel', e => {
  e.preventDefault();
  if(e.ctrlKey || e.metaKey){
    AUTO_FIT = false;
    zoomTo(VIEW.z * Math.exp(-e.deltaY * 0.0016), { x: e.clientX, y: e.clientY });
    return;
  }
  const d = e.deltaMode === 1 ? 16 : 1;
  if(e.shiftKey) VIEW.x -= e.deltaY * d;
  else { VIEW.x -= e.deltaX * d; VIEW.y -= e.deltaY * d; }
  applyView();
}, { passive: false });

/* 空白处 / 空格 / 中键拖拽平移；Shift + 空白拖拽框选节点 */
let panState = null, marqueeState = null, spaceDown = false;

function updateMarquee(clientX,clientY){
  if(!marqueeState)return;
  marqueeState.x2=clientX;marqueeState.y2=clientY;
  const wrap=$('#canvasWrap'),rect=wrap.getBoundingClientRect(),box=$('#canvasSelectionBox');
  const left=Math.max(0,Math.min(marqueeState.x1,clientX)-rect.left);
  const top=Math.max(0,Math.min(marqueeState.y1,clientY)-rect.top);
  const right=Math.min(rect.width,Math.max(marqueeState.x1,clientX)-rect.left);
  const bottom=Math.min(rect.height,Math.max(marqueeState.y1,clientY)-rect.top);
  box.style.left=left+'px';box.style.top=top+'px';
  box.style.width=Math.max(0,right-left)+'px';box.style.height=Math.max(0,bottom-top)+'px';
}

function finishMarquee(cancelled=false){
  if(!marqueeState)return;
  const state=marqueeState;marqueeState=null;
  const wrap=$('#canvasWrap'),box=$('#canvasSelectionBox');
  wrap.classList.remove('selecting');box.classList.remove('on');
  if(cancelled)return;
  const left=Math.min(state.x1,state.x2),right=Math.max(state.x1,state.x2);
  const top=Math.min(state.y1,state.y2),bottom=Math.max(state.y1,state.y2);
  const ids=[...state.base];
  $$('.node').forEach(element=>{
    const rect=element.getBoundingClientRect();
    if(rect.right>=left&&rect.left<=right&&rect.bottom>=top&&rect.top<=bottom)ids.push(element.dataset.id);
  });
  selectNodes(ids,ids.at(-1));
}

$('#canvasWrap').addEventListener('pointerdown', e => {
  const onBg = ['canvasWrap','canvasLayer','canvas','edges'].includes(e.target.id);
  const middle = e.button === 1;
  if(onBg&&e.button===0&&e.shiftKey&&!spaceDown){
    e.preventDefault();
    const wrap=$('#canvasWrap');
    marqueeState={x1:e.clientX,y1:e.clientY,x2:e.clientX,y2:e.clientY,
      base:(e.ctrlKey||e.metaKey)?new Set(SELECTED_NODE_IDS):new Set()};
    wrap.classList.add('selecting');$('#canvasSelectionBox').classList.add('on');
    updateMarquee(e.clientX,e.clientY);
    try{wrap.setPointerCapture(e.pointerId);}catch(_){}
    return;
  }
  const wantPan = middle || (spaceDown && e.button === 0) || (onBg && e.button === 0);
  if(!wantPan) return;
  e.preventDefault();
  if(onBg&&e.button===0&&!spaceDown)clearCanvasSelection();
  const wrap = $('#canvasWrap');
  panState = { x: e.clientX, y: e.clientY, vx: VIEW.x, vy: VIEW.y };
  wrap.classList.add('panning');
  try{ wrap.setPointerCapture(e.pointerId); }catch(_){}
});
$('#canvasWrap').addEventListener('pointermove', e => {
  if(marqueeState){updateMarquee(e.clientX,e.clientY);return;}
  if(!panState) return;
  VIEW.x = panState.vx + (e.clientX - panState.x);
  VIEW.y = panState.vy + (e.clientY - panState.y);
  applyView();
});
['pointerup','pointercancel'].forEach(t => $('#canvasWrap').addEventListener(t, e => {
  if(marqueeState){
    finishMarquee(t==='pointercancel');
    try{$('#canvasWrap').releasePointerCapture(e.pointerId);}catch(_){}
    return;
  }
  if(!panState) return;
  panState = null;
  const wrap = $('#canvasWrap');
  wrap.classList.remove('panning');
  try{ wrap.releasePointerCapture(e.pointerId); }catch(_){}
}));

function isCanvasShortcutBlocked(target){
  const tag = (target && target.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if(target && (target.isContentEditable || (target.closest && target.closest('[contenteditable="true"]')))) return true;
  return !!document.querySelector('.mask.on');
}

function cloneCanvasData(value){
  if(typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function nextNodeId(type){
  let i = 1;
  while(GRAPH.nodes.some(node => node.id === type + '_' + i)) i++;
  return type + '_' + i;
}

function copySelectedNode(){
  const ids=SELECTED_NODE_IDS.size?[...SELECTED_NODE_IDS]:(sel.kind==='node'?[sel.id]:[]);
  const selected=new Set(ids);
  const sources=GRAPH.nodes.filter(node=>selected.has(node.id));
  if(!sources.length)return false;
  if(sources.some(source=>{
    const meta=typeMeta(source.type);return meta.enabled===false||meta.creatable===false;
  })){
    toast('选区包含已停止新建的节点类型，不能复制');
    return false;
  }
  const edges=GRAPH.edges.filter(edge=>selected.has(edge.from)&&selected.has(edge.to));
  CANVAS_CLIPBOARD={nodes:cloneCanvasData(sources),edges:cloneCanvasData(edges),pasteCount:0};
  toast(sources.length===1?'已复制节点 '+sources[0].id:`已复制 ${sources.length} 个节点及 ${edges.length} 条内部连线`);
  return true;
}

function pasteCanvasNode(){
  if(!CANVAS_CLIPBOARD || !CANVAS_CLIPBOARD.nodes?.length) return false;
  const sources=CANVAS_CLIPBOARD.nodes;
  if(sources.some(source=>{
    const meta=typeMeta(source.type);return meta.enabled===false||meta.creatable===false;
  })){
    toast('该节点类型已停止新建，不能粘贴');
    return false;
  }
  CANVAS_CLIPBOARD.pasteCount += 1;
  const offset = 32 * CANVAS_CLIPBOARD.pasteCount;
  const reserved=new Set(GRAPH.nodes.map(node=>node.id));
  const nextId=type=>{let i=1;while(reserved.has(type+'_'+i))i++;const id=type+'_'+i;reserved.add(id);return id;};
  const idMap={};
  const pasted=sources.map(source=>{
    const node=cloneCanvasData(source);node.id=nextId(node.type);idMap[source.id]=node.id;
    node.x=Math.max(CANVAS_ORIGIN_GUARD,(Number(source.x)||CANVAS_ORIGIN_GUARD)+offset);
    node.y=Math.max(CANVAS_ORIGIN_GUARD,(Number(source.y)||CANVAS_ORIGIN_GUARD)+offset);
    return node;
  });
  const edges=(CANVAS_CLIPBOARD.edges||[]).map(edge=>({...cloneCanvasData(edge),from:idMap[edge.from],to:idMap[edge.to]}));
  GRAPH.nodes.push(...pasted);GRAPH.edges.push(...edges);
  pasted.forEach(node=>ensureCanvasSpace(node.x,node.y,node.type));
  renderGraph();
  selectNodes(pasted.map(node=>node.id),pasted.at(-1).id);
  toast(pasted.length===1?`已粘贴为 ${pasted[0].id}，未复制外部连线`:`已粘贴 ${pasted.length} 个节点及 ${edges.length} 条内部连线`);
  return true;
}

document.addEventListener('keydown', e => {
  if(isCanvasShortcutBlocked(e.target)) return;
  const onCanvas = $('#view-canvas').classList.contains('active');
  if(e.code === 'Space' && !spaceDown){
    spaceDown = true;
    $('#canvasWrap').classList.add('space');
    if(onCanvas) e.preventDefault();
    return;
  }
  if(!onCanvas) return;
  const k = e.key;
  const command = (e.ctrlKey || e.metaKey) && !e.altKey;
  if(command && String(k).toLowerCase() === 'c'){
    if(copySelectedNode()) e.preventDefault();
  }
  else if(command && String(k).toLowerCase() === 'v'){
    if(pasteCanvasNode()) e.preventDefault();
  }
  else if((k === 'Delete' || k === 'Backspace') && !command){
    if(sel.kind === 'node'){ e.preventDefault(); deleteSelectedNodes(); }
    else if(sel.kind === 'edge'){ e.preventDefault(); delEdge(sel.idx); }
  }
  else if(k === '+' || k === '='){ e.preventDefault(); zoomStep(1); }
  else if(k === '-' || k === '_'){ e.preventDefault(); zoomStep(-1); }
  else if(k === '0'){ e.preventDefault(); fitZoom(); }
  else if(k === '1'){ e.preventDefault(); zoomReset(); }
});
document.addEventListener('keyup', e => {
  if(e.code === 'Space'){
    spaceDown = false;
    $('#canvasWrap').classList.remove('space');
  }
});

window.addEventListener('resize', () => {
  const runtime=$('#runtimeInspector');
  if(runtime&&!runtime.classList.contains('collapsed'))setRuntimeInspectorWidth(runtime.getBoundingClientRect().width||400,false);
  resetCanvasSize();if(AUTO_FIT)fitZoom();
});

const INSPECTOR_STORAGE = {collapsed:'agent-platform.canvas.inspector.collapsed'};
const RUNTIME_INSPECTOR_STORAGE = {
  width:'agent-platform.canvas.runtime.width',
  collapsed:'agent-platform.canvas.runtime.collapsed',
  tab:'agent-platform.canvas.runtime.tab'
};
function inspectorStoreGet(key){ try{return localStorage.getItem(key);}catch(_){return null;} }
function inspectorStoreSet(key, value){ try{localStorage.setItem(key, value);}catch(_){} }

function setRuntimeInspectorWidth(width, persist=true){
  const workspace=$('#canvasWorkspace'), panel=$('#runtimeInspector');
  if(!workspace||!panel)return 0;
  const min=340,max=Math.max(min,Math.min(620,Math.floor(window.innerWidth*.48)));
  const next=Math.max(min,Math.min(max,Math.round(Number(width)||400)));
  panel.style.width=next+'px';
  if(!panel.classList.contains('collapsed'))workspace.style.setProperty('--runtime-width',next+'px');
  if(persist)inspectorStoreSet(RUNTIME_INSPECTOR_STORAGE.width,String(next));
  return next;
}

function setRuntimeInspectorCollapsed(collapsed,persist=true){
  const workspace=$('#canvasWorkspace'),panel=$('#runtimeInspector'),button=$('#runtimeToggle');
  if(!workspace||!panel)return;
  panel.classList.toggle('collapsed',collapsed);
  const saved=Number(inspectorStoreGet(RUNTIME_INSPECTOR_STORAGE.width))||400;
  if(collapsed){
    panel.style.width='44px';
    workspace.style.setProperty('--runtime-width','44px');
  }else{
    setRuntimeInspectorWidth(saved,false);
  }
  if(button){
    button.setAttribute('aria-expanded',String(!collapsed));
    button.setAttribute('aria-label',collapsed?'展开运行检查器':'收起运行检查器');
    button.title=collapsed?'展开运行检查器':'收起运行检查器';
  }
  if(persist)inspectorStoreSet(RUNTIME_INSPECTOR_STORAGE.collapsed,collapsed?'1':'0');
  requestAnimationFrame(()=>{resetCanvasSize();applyView();});
}

function toggleRuntimeInspector(forceOpen=false){
  const panel=$('#runtimeInspector');if(!panel)return;
  setRuntimeInspectorCollapsed(forceOpen?false:!panel.classList.contains('collapsed'));
}

function setRuntimeTab(tab,persist=true){
  const value=['run','log','node'].includes(tab)?tab:'run';
  $$('.runtime-tab').forEach(button=>button.classList.toggle('on',button.dataset.runtimeTab===value));
  $$('.runtime-pane').forEach(pane=>pane.classList.toggle('on',pane.dataset.runtimePane===value));
  if(persist)inspectorStoreSet(RUNTIME_INSPECTOR_STORAGE.tab,value);
}

function openRuntimeInspector(tab='run'){
  if($('#runtimeInspector')?.classList.contains('collapsed'))setRuntimeInspectorCollapsed(false);
  setRuntimeTab(tab);
}

function renderRuntimeNode(){
  const body=$('#runtimeNodeBody');if(!body)return;
  if(sel.kind!=='node'){
    body.innerHTML='<div class="empty">选择节点后查看本次运行的输入、输出和模型调用诊断</div>';
    return;
  }
  const node=GRAPH.nodes.find(item=>item.id===sel.id);
  if(!node){body.innerHTML='<div class="empty">当前节点不存在</div>';return;}
  body.innerHTML=`<div class="runtime-node-title"><div><b>${esc(node.display_name||node.id)}</b><div class="card-s mono">${esc(node.id)} · ${esc(node.type)}</div></div><button class="btn sm" onclick="openNodeEditor('${attr(node.id)}')">配置节点</button></div>${nodeRuntimePanel(node.id)}${modelRuntimePanel(LIVE,node.id,node.type==='llm')}`;
}

function initRuntimeInspector(){
  const panel=$('#runtimeInspector'),handle=$('#runtimeResize');if(!panel||!handle)return;
  setRuntimeInspectorWidth(Number(inspectorStoreGet(RUNTIME_INSPECTOR_STORAGE.width))||400,false);
  setRuntimeTab(inspectorStoreGet(RUNTIME_INSPECTOR_STORAGE.tab)||'run',false);
  if(inspectorStoreGet(RUNTIME_INSPECTOR_STORAGE.collapsed)==='1')setRuntimeInspectorCollapsed(true,false);
  let resize=null;
  handle.addEventListener('pointerdown',event=>{
    if(event.button!==0||window.innerWidth<=720)return;
    event.preventDefault();resize={x:event.clientX,width:panel.getBoundingClientRect().width};
    panel.classList.add('resizing');try{handle.setPointerCapture(event.pointerId);}catch(_){}
  });
  handle.addEventListener('pointermove',event=>{
    if(!resize)return;setRuntimeInspectorWidth(resize.width+(resize.x-event.clientX),false);
  });
  ['pointerup','pointercancel'].forEach(type=>handle.addEventListener(type,event=>{
    if(!resize)return;resize=null;panel.classList.remove('resizing');
    inspectorStoreSet(RUNTIME_INSPECTOR_STORAGE.width,String(Math.round(panel.getBoundingClientRect().width)));
    try{handle.releasePointerCapture(event.pointerId);}catch(_){}
  }));
}

function setInspectorCollapsed(collapsed, persist=true){
  const panel = $('#canvasInspector'), button = $('#inspectorToggle'); if(!panel) return;
  panel.classList.toggle('collapsed', collapsed);
  if(button){
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? '展开节点摘要' : '收起节点摘要');
    button.title = collapsed ? '展开节点摘要' : '收起节点摘要';
  }
  if(persist) inspectorStoreSet(INSPECTOR_STORAGE.collapsed, collapsed ? '1' : '0');
}

function updateCanvasFocusUI(){
  const button=$('#canvasFocusBtn'), icon=$('#canvasFocusIcon');
  if(!button)return;
  const active=CANVAS_FOCUS.active;
  button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label',active?'退出画布专注模式':'进入画布专注模式');
  button.title=active?'退出画布专注模式（Esc）':'进入画布专注模式';
  if(icon)icon.textContent=active?'×':'⛶';
}

function setCanvasFocus(active){
  const view=$('#view-canvas'); if(!view)return;
  const next=!!active;
  if(next===CANVAS_FOCUS.active){updateCanvasFocusUI();return;}
  const inspector=$('#canvasInspector');
  if(next){
    CANVAS_FOCUS.inspectorCollapsedBefore=!!inspector?.classList.contains('collapsed');
    CANVAS_FOCUS.active=true;
    view.classList.add('focus-mode');
    document.body.classList.add('canvas-focus-open');
    setInspectorCollapsed(true,false);
  }else{
    CANVAS_FOCUS.active=false;
    view.classList.remove('focus-mode');
    document.body.classList.remove('canvas-focus-open');
    setInspectorCollapsed(CANVAS_FOCUS.inspectorCollapsedBefore,false);
  }
  updateCanvasFocusUI();
  requestAnimationFrame(()=>{resetCanvasSize();applyView();});
}

function toggleCanvasFocus(){setCanvasFocus(!CANVAS_FOCUS.active);}

function toggleInspector(forceOpen=false){
  const panel = $('#canvasInspector'); if(!panel) return;
  const collapsed = forceOpen ? false : !panel.classList.contains('collapsed');
  setInspectorCollapsed(collapsed,!CANVAS_FOCUS.active);
}

function openInspector(selection){
  const label = $('#inspectorSelection'); if(label && selection) label.textContent = selection;
  if($('#canvasInspector')?.classList.contains('collapsed')) toggleInspector(true);
}

function initInspector(){
  const panel = $('#canvasInspector'); if(!panel) return;
  if(inspectorStoreGet(INSPECTOR_STORAGE.collapsed) === '1') setInspectorCollapsed(true, false);
}

function syncNodeSelectionUI(){
  $$('.node').forEach(element=>element.classList.toggle(
    'selected',SELECTED_NODE_IDS.has(element.dataset.id)));
}

function updateNodeSelectionInspector(){
  const count=SELECTED_NODE_IDS.size;
  if(!count)return;
  openInspector(count>1?`已选择 ${count} 个节点`:(sel.id||[...SELECTED_NODE_IDS][0]));
  renderDetail();
}

function clearCanvasSelection(render=true){
  SELECTED_NODE_IDS.clear();
  sel={kind:null,id:null,idx:-1};
  syncNodeSelectionUI();
  drawEdges();
  if(render)renderDetail();
}

function selectNodes(ids,primary){
  const valid=[...new Set(ids)].filter(id=>nodes[id]);
  SELECTED_NODE_IDS.clear();valid.forEach(id=>SELECTED_NODE_IDS.add(id));
  if(!valid.length){clearCanvasSelection();return;}
  const focus=valid.includes(primary)?primary:valid[valid.length-1];
  sel={kind:'node',id:focus,idx:-1};
  syncNodeSelectionUI();drawEdges();updateNodeSelectionInspector();
}

function selectNode(id,options={}){
  if(!nodes[id])return;
  if(options.toggle){
    if(SELECTED_NODE_IDS.has(id))SELECTED_NODE_IDS.delete(id);
    else SELECTED_NODE_IDS.add(id);
    if(!SELECTED_NODE_IDS.size){clearCanvasSelection();return;}
    const focus=SELECTED_NODE_IDS.has(id)?id:[...SELECTED_NODE_IDS].at(-1);
    sel={kind:'node',id:focus,idx:-1};
  }else{
    SELECTED_NODE_IDS.clear();SELECTED_NODE_IDS.add(id);
    sel={kind:'node',id,idx:-1};
  }
  syncNodeSelectionUI();
  updateNodeSelectionInspector();
  drawEdges();
}

function markNodeEditorDirty(id){
  if(!NODE_EDITOR.open || NODE_EDITOR.nodeId !== id) return;
  NODE_EDITOR.dirty = true;
  $('#nodeConfigDirty')?.classList.add('on');
}

function applyNodeEditorTab(){
  const modal=$('#nodeConfigMask'); if(!modal)return;
  modal.querySelectorAll('.node-config-tab').forEach(button=>
    button.classList.toggle('on',button.dataset.tab===NODE_EDITOR.tab));
  modal.querySelectorAll('.node-editor-section').forEach(section=>
    section.classList.toggle('on',section.dataset.tab===NODE_EDITOR.tab));
  const active=modal.querySelector('.node-editor-section.on');
  if(active) active.scrollIntoView({block:'start'});
}

function setNodeEditorTab(tab){
  if(!['basic','config','test','help'].includes(tab))return;
  NODE_EDITOR.tab=tab; applyNodeEditorTab();
  const body=$('#detailBody'); if(body)body.scrollTop=0;
}

function nodeUsesSubgraphAgent(node){
  if(!node) return false;
  if(node.type === 'subgraph') return true;
  return node.type === 'foreach' && ((node.config || {}).target_type || 'skill') === 'subgraph';
}

async function refreshSubgraphAgentOptions(nodeId){
  const seq = ++SUBGRAPH_AGENT_OPTIONS.seq;
  SUBGRAPH_AGENT_OPTIONS.loading = true;
  SUBGRAPH_AGENT_OPTIONS.error = '';
  if(NODE_EDITOR.open && NODE_EDITOR.nodeId === nodeId) renderDetail();
  const response = await apiRaw('/v1/agents');
  if(seq !== SUBGRAPH_AGENT_OPTIONS.seq) return false;
  SUBGRAPH_AGENT_OPTIONS.loading = false;
  if(response.ok){
    AGENTS = response.body.items || [];
    renderAgentSel();
  }else{
    SUBGRAPH_AGENT_OPTIONS.error = `${response.body.code || response.status} · ${response.body.message || 'Agent 列表刷新失败'}`;
  }
  if(NODE_EDITOR.open && NODE_EDITOR.nodeId === nodeId) renderDetail();
  return response.ok;
}

function openNodeEditor(id, tab='config'){
  const node=GRAPH.nodes.find(item=>item.id===id); if(!node)return;
  hideNodeDescription(true);
  selectNode(id);
  NODE_EDITOR.open=true; NODE_EDITOR.nodeId=id; NODE_EDITOR.tab=tab;
  NODE_EDITOR.dirty=false; NODE_EDITOR.snapshot=cloneCanvasData(GRAPH);
  $('#nodeConfigDirty')?.classList.remove('on');
  $('#nodeConfigMask')?.classList.add('on');
  document.body.classList.add('node-editor-open');
  renderDetail(); applyNodeEditorTab();
  if(MODE === 'live' && nodeUsesSubgraphAgent(node)) refreshSubgraphAgentOptions(id);
  requestAnimationFrame(()=>$('#nodeConfigMask .node-config-tab.on')?.focus());
}

function restoreNodeEditorSnapshot(){
  if(!NODE_EDITOR.snapshot)return;
  GRAPH=cloneCanvasData(NODE_EDITOR.snapshot);
  renderGraph();
  if(GRAPH.nodes.some(item=>item.id===NODE_EDITOR.nodeId))selectNode(NODE_EDITOR.nodeId);
  else{sel={kind:null,id:null,idx:-1};renderDetail();}
}

function finishNodeEditor(){
  $('#nodeConfigMask')?.classList.remove('on');
  document.body.classList.remove('node-editor-open');
  NODE_EDITOR.open=false; NODE_EDITOR.nodeId=''; NODE_EDITOR.dirty=false; NODE_EDITOR.snapshot=null;
  $('#nodeConfigDirty')?.classList.remove('on');
}

function closeNodeEditor(force=false){
  if(!NODE_EDITOR.open)return true;
  if(NODE_EDITOR.dirty&&!force&&!confirm('当前节点配置尚未保存，关闭后将撤销本次修改。'))return false;
  if(NODE_EDITOR.dirty)restoreNodeEditorSnapshot();
  finishNodeEditor(); return true;
}

async function saveNodeEditor(runAfter=false){
  const id=NODE_EDITOR.nodeId; if(!id)return;
  NODE_EDITOR.snapshot=cloneCanvasData(GRAPH); NODE_EDITOR.dirty=false;
  $('#nodeConfigDirty')?.classList.remove('on');
  if(runAfter){
    NODE_EDITOR.tab='test'; renderDetail(); applyNodeEditorTab();
    const ok=await runNodeTest(id);
    if(ok)toast(`节点 ${id} 配置已保存并完成试运行`);
    return;
  }
  finishNodeEditor();
  toast(`节点 ${id} 配置已写入当前画布草稿`);
}

function nodeEditorBackdrop(event){
  if(event.target===event.currentTarget)closeNodeEditor();
}

document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(NODE_EDITOR.open){event.preventDefault();closeNodeEditor();return;}
  if(document.querySelector('.mask.on'))return;
  if(CANVAS_FOCUS.active){event.preventDefault();setCanvasFocus(false);}
});

function schemaPathOptions(schema, prefix, source, out, depth=0){
  if(!schema || typeof schema !== 'object' || depth > 8) return out;
  const type = schema.type || (schema.properties ? 'object' : 'json');
  if(prefix) out.push({path:prefix, type, source});
  if(type === 'object' || schema.properties){
    Object.entries(schema.properties || {}).forEach(([key, child]) =>
      schemaPathOptions(child, prefix ? prefix + '.' + key : key, source, out, depth + 1));
  }
  if(type === 'array' && schema.items) schemaPathOptions(
    schema.items, prefix ? prefix + '.0' : '0', source + ' · 数组项', out, depth + 1);
  return out;
}

function ancestorNodes(nodeId){
  const seen = new Set(), queue = GRAPH.edges.filter(e => e.to === nodeId).map(e => e.from);
  while(queue.length){
    const id = queue.shift(); if(seen.has(id)) continue; seen.add(id);
    GRAPH.edges.filter(e => e.to === id).forEach(e => queue.push(e.from));
  }
  return GRAPH.nodes.filter(n => seen.has(n.id));
}

function configuredNodePaths(node){
  const out = [], cfg = node.config || {}, add = (path, type='json', detail='') => {
    if(path) out.push({path, type, source:`${node.id} · ${detail || typeMeta(node.type).label}`});
  };
  if(node.type === 'start' && cfg.copy_input !== false){
    const contract = LIVE_CONTRACTS[canvasAgentCode()] || {};
    schemaPathOptions(contract.input_schema, 'variables', `${node.id} · 输入复制`, out);
  }
  if(node.type === 'transform'){
    ['mapping','constants','defaults','templates','casts','projections'].forEach(group =>
      Object.keys(cfg[group] || {}).forEach(path => add('variables.' + path, 'json', group)));
  }
  const output = cfg.output_path;
  if(output){
    const full = String(output).startsWith('variables.') || output === 'output'
      ? String(output) : 'variables.' + output;
    let outputSchema = null;
    if(node.type === 'llm') outputSchema = cfg.output_schema;
    if(node.type === 'subgraph') outputSchema = (LIVE_CONTRACTS[cfg.agent] || {}).output_schema;
    if(outputSchema) schemaPathOptions(outputSchema, full, `${node.id} · 输出契约`, out);
    else add(full, node.type === 'foreach' ? 'array' : 'json', '输出');
  }
  if(node.type === 'error_boundary'){
    const target = cfg.target_config || {}, targetOutput = target.output_path;
    if(targetOutput){
      const full = String(targetOutput).startsWith('variables.') || targetOutput === 'output'
        ? String(targetOutput) : 'variables.' + targetOutput;
      const outputSchema = cfg.target_type === 'llm' ? target.output_schema : null;
      if(outputSchema) schemaPathOptions(outputSchema, full, `${node.id} · 受保护节点输出契约`, out);
      else add(full, cfg.target_type === 'foreach' ? 'array' : 'json', '受保护节点输出');
    }
  }
  if(cfg.result_path) add(cfg.result_path, 'object', '校验结果');
  if(cfg.counter_path) add(cfg.counter_path, 'object', '循环状态');
  if(cfg.fallback_path) add(cfg.fallback_path, 'json', '兜底结果');
  if(cfg.error_path) add(cfg.error_path, 'object', '错误详情');
  const writes = typeMeta(node.type).writes || [];
  writes.filter(x => !['variables','route'].includes(x)).forEach(path => add(path, 'json', '状态写入'));
  return out;
}

function variablePathOptions(gn){
  const out = [
    {path:'input',type:'object',source:'Agent 输入'},
    {path:'variables',type:'object',source:'流程变量'},
    {path:'slots',type:'object',source:'会话槽位'},
    {path:'history',type:'array',source:'会话历史'},
  ];
  const contract = LIVE_CONTRACTS[canvasAgentCode()] || {};
  schemaPathOptions(contract.input_schema, 'input', 'Agent input_schema', out);
  const starts = ancestorNodes(gn.id).filter(n => n.type === 'start' && (n.config || {}).copy_input !== false);
  if(starts.length) schemaPathOptions(contract.input_schema, 'variables', 'start · 输入复制', out);
  ancestorNodes(gn.id).forEach(n => out.push(...configuredNodePaths(n)));
  const seen = new Set();
  return out.filter(item => item.path && !seen.has(item.path) && seen.add(item.path));
}

function isVariablePathField(key, schema){
  return schema.type === 'string' && (key.endsWith('_path') || [
    'source_path','left_path','selector_path','query_path','items_path','continue_path',
    'correlation_path','content_path','title_path','branch_output_path'
  ].includes(key));
}

function pathControl(gn, key, value, schema){
  const options = variablePathOptions(gn);
  const exact = options.find(item => item.path === value);
  const isOutput = ['output_path','result_path','counter_path','fallback_path','error_path'].includes(key);
  const hint = exact
    ? `${exact.source} · ${exact.type}`
    : (isOutput ? '写入路径 · 可新建 variables.* 变量' : '未匹配到上游契约，仍可手工输入');
  return `<div class="fld"><label>${esc(fieldDisplayName(key))}${fieldHelpMarkup(key,schema)} ${schema.required ? '<b>*</b>' : ''}</label>
    <div class="path-pick">
      <input class="inp mono" data-testid="path-input-${attr(key)}" style="height:28px;font-size:11px" value="${attr(value)}"
        placeholder="${attr(schema.desc || '')}" onchange="setNodeCfg('${gn.id}','${key}',this.value)">
      <select class="inp" data-testid="path-picker-${attr(key)}" style="height:28px;font-size:10.5px" onchange="if(this.value)setNodeCfg('${gn.id}','${key}',this.value)">
        <option value="">选择路径</option>
        ${options.map(item => `<option value="${attr(item.path)}"${item.path===value?' selected':''}>${esc(item.path)} · ${esc(item.type)}</option>`).join('')}
      </select>
    </div><div class="path-contract" data-testid="path-hint-${attr(key)}">${esc(hint)}</div></div>`;
}

function nodeContractSummary(gn){
  const meta = typeMeta(gn.type), contract = LIVE_CONTRACTS[canvasAgentCode()] || {};
  const required = ((contract.input_schema || {}).required || []).join('、') || '无';
  const writes = (meta.writes || []).join('、') || '无状态写入';
  return `<div class="path-contract" data-testid="node-contract-hint" style="margin-top:8px;padding:7px;background:#f7f8fa;border-radius:6px">
    输入契约必填：${esc(required)}<br>节点声明写入：${esc(writes)}</div>`;
}

function nodeTestPanel(gn){
  const saved = NODE_TESTS[gn.id] || {};
  if(!saved.input){
    const input = generatedRunInput();
    saved.input = JSON.stringify({input, variables:structuredClone(input || {}), tenant_id:'t_001', session_id:'node-test'}, null, 2);
    NODE_TESTS[gn.id] = saved;
  }
  const result = saved.result;
  const graphOnly = ['parallel','join','human','delay','event_wait'].includes(gn.type);
  const sideEffect = ['skill','subgraph','foreach','memory_write','error_boundary'].includes(gn.type);
  const disabled = graphOnly || !canvasAgentCode() || !graphCan('manage');
  return `<div class="node-test" data-testid="node-test-panel"><div class="sub-t">节点级试运行</div>
    <textarea class="inp" data-json-editor="true" data-testid="node-test-state" oninput="setNodeTestInput('${gn.id}',this.value)">${esc(saved.input)}</textarea>
    ${graphOnly ? '<div class="path-contract">该节点依赖连线、挂起或恢复上下文，请使用整图试运行。</div>' : ''}
    ${sideEffect ? '<div class="path-contract" style="color:var(--amber)">将调用真实运行时，可能产生外部请求或持久化副作用。</div>' : ''}
    <button class="btn sm primary" data-testid="node-test-run" style="width:100%;margin-top:7px" onclick="runNodeTest('${gn.id}')" ${disabled?'disabled':''}>运行当前节点</button>
    ${jsonViewerMarkup(result,{empty:'尚未试运行',testid:'node-test-result'})}</div>`;
}

function setNodeTestInput(id, value){
  if(!NODE_TESTS[id]) NODE_TESTS[id] = {};
  NODE_TESTS[id].input = value;
}

async function runNodeTest(id){
  const gn = GRAPH.nodes.find(n => n.id === id); if(!gn) return false;
  if(MODE !== 'live'){ toast('节点试运行需要连接后端'); return false; }
  if(!canvasAgentCode()){ toast('未绑定编排图缺少 Agent 契约，绑定 Agent 后才能试运行节点'); return false; }
  let state;
  try{ state = JSON.parse((NODE_TESTS[id] || {}).input || '{}'); }
  catch(e){ toast('测试状态不是合法 JSON'); return false; }
  const box = document.querySelector('[data-testid="node-test-result"]');
  if(box) box.textContent = '运行中…';
  const response = await apiRaw('/v1/graphs/node-test', {method:'POST', body:JSON.stringify({
    agent:canvasAgentCode(), version:CUR.version || '', node:gn, state
  })});
  const result = response.ok ? response.body : {
    ok:false, code:response.body.code || 'NODE_TEST_FAILED',
    message:response.body.message || '节点试运行失败', details:response.body.details || []
  };
  NODE_TESTS[id].result = result;
  if(nodes[id]) setState(id, response.ok ? 'done' : 'error');
  renderDetail();
  toast(response.ok ? '节点试运行完成' : '节点试运行失败');
  return response.ok;
}

function nodeRuntimeKey(node){
  const raw = String(node || '');
  return raw.includes('.') ? raw : (NODE_MAP[raw] || raw);
}

function captureNodeRuntime(target, ev){
  if(!target || !ev || !['node_input','node_output'].includes(ev.type) || !ev.node) return;
  if(!target.nodeIO) target.nodeIO = {};
  const id = nodeRuntimeKey(ev.node);
  const records = target.nodeIO[id] || (target.nodeIO[id] = []);
  if(ev.type === 'node_input'){
    records.push({
      input:ev.input, inputMeta:ev.input_meta || {}, inputSeq:ev.seq || 0,
      nodeType:ev.node_type || '', ts:ev.ts || ''
    });
    return;
  }
  let record = null;
  for(let i=records.length-1;i>=0;i--){
    if(!Object.prototype.hasOwnProperty.call(records[i], 'output')){ record=records[i]; break; }
  }
  if(!record){ record={nodeType:ev.node_type || '',ts:ev.ts || ''}; records.push(record); }
  record.output = ev.output;
  record.outputMeta = ev.output_meta || {};
  record.outputSeq = ev.seq || 0;
  record.writes = ev.writes || [];
  record.parallel = ev.parallel || null;
}

function captureModelRuntime(target, ev){
  if(!target || !ev || !['model_request','model_response','model_validation'].includes(ev.type) || !ev.node) return;
  if(!target.modelCalls) target.modelCalls = {};
  const id = nodeRuntimeKey(ev.node);
  const records = target.modelCalls[id] || (target.modelCalls[id] = []);
  let record = records.find(item => item.callId === ev.call_id);
  if(!record){
    record={callId:ev.call_id || `attempt-${ev.attempt || records.length+1}`,attempt:ev.attempt || records.length+1};
    records.push(record);
  }
  if(ev.type === 'model_request'){
    Object.assign(record,{
      provider:ev.provider || '',model:ev.model || '',modelRef:ev.model_ref || '',modelVersion:ev.model_version || '',method:ev.method || 'POST',url:ev.url || '',
      timeout:ev.timeout_s,repair:Boolean(ev.repair),request:ev.request,requestMeta:ev.request_meta || {},
      requestSeq:ev.seq || 0,ts:ev.ts || ''
    });
  }else if(ev.type === 'model_response'){
    Object.assign(record,{
      status:ev.status || '',httpStatus:ev.http_status,latency:ev.latency_ms,
      response:ev.response,responseMeta:ev.response_meta || {},headers:ev.response_headers || {},
      errorCode:ev.error_code || '',errorType:ev.error_type || '',errorMessage:ev.error_message || '',
      responseSeq:ev.seq || 0
    });
  }else{
    record.validation={status:ev.status || '',code:ev.error_code || '',message:ev.message || '',detail:ev.detail};
  }
}

function runtimeJSON(value, empty){
  if(value === undefined) return empty || '尚无数据';
  try{return JSON.stringify(value, null, 2);}catch(_){return String(value);}
}

function jsonTreePrimitive(value){
  if(value === null) return '<span class="json-null">null</span>';
  const type=typeof value;
  let text='';try{text=JSON.stringify(value)}catch(_){text=String(value)}
  return `<span class="json-${type==='string'?'string':type==='number'?'number':type==='boolean'?'boolean':'null'}">${esc(text)}</span>`;
}

function jsonTreeNode(value, key, depth=0, comma=false, index=false){
  const prefix=key == null?'':(index
    ? `<span class="json-index">${esc(key)}</span>`
    : `<span class="json-key">${esc(JSON.stringify(String(key)))}</span>: `);
  if(value === null || typeof value !== 'object'){
    return `<div class="json-leaf">${prefix}${jsonTreePrimitive(value)}${comma?',':''}</div>`;
  }
  const array=Array.isArray(value), entries=array?value.map((item,i)=>[String(i),item]):Object.entries(value);
  const open=array?'[':'{', close=array?']':'}', count=`${entries.length} ${array?'项':'个字段'}`;
  const children=entries.map(([childKey,childValue],i)=>jsonTreeNode(childValue,childKey,depth+1,i<entries.length-1,array)).join('');
  return `<details class="json-entry"${depth<2?' open':''}><summary>${prefix}<span class="json-brace">${open}</span><span class="json-folded"> … ${esc(close)} <span class="json-count">${esc(count)}</span>${comma?',':''}</span></summary>
    <div class="json-children">${children}</div><div class="json-close"><span class="json-brace">${esc(close)}</span>${comma?',':''}</div></details>`;
}

function jsonViewerMarkup(value, options={}){
  const testid=options.testid?` data-testid="${attr(options.testid)}"`:'';
  let text='',valid=true,parsed=value;
  if(value === undefined){text=String(options.empty||'尚无数据');valid=false;}
  else{try{text=JSON.stringify(value,null,2);}catch(_){text=String(value);valid=false;}}
  if(text === undefined){text=String(value);valid=false;}
  return `<div class="json-viewer${options.className?' '+attr(options.className):''}" data-mode="tree"${testid}>
    <div class="json-viewer-toolbar">
      <button class="json-tool" type="button" title="复制完整 JSON" onclick="copyJsonViewer(this)">复制</button>
      ${valid?'<button class="json-tool" type="button" title="切换树形和源码视图" onclick="toggleJsonViewerMode(this)">源码</button><button class="json-tool" type="button" title="展开所有对象和数组" onclick="setJsonExpanded(this,true)">展开</button><button class="json-tool" type="button" title="收起所有对象和数组" onclick="setJsonExpanded(this,false)">收起</button>':''}
    </div>
    ${valid?`<div class="json-tree" role="tree">${jsonTreeNode(parsed,null,0,false,false)}</div>`:''}
    <pre class="json-source">${esc(text)}</pre>
  </div>`;
}

async function copyTextValue(text, button){
  let copied=false;
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(String(text));copied=true;}
  }catch(_){copied=false;}
  if(!copied){
    const area=document.createElement('textarea');area.value=String(text);area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();
    try{copied=Boolean(document.execCommand&&document.execCommand('copy'));}catch(_){copied=false;}area.remove();
  }
  if(button){
    const previous=button.textContent;button.textContent=copied?'已复制':'复制失败';button.classList.toggle('done',copied);button.disabled=true;
    setTimeout(()=>{button.textContent=previous;button.classList.remove('done');button.disabled=false;},1500);
  }
  return copied;
}

function copyJsonViewer(button){
  const viewer=button.closest('.json-viewer'),source=viewer&&viewer.querySelector('.json-source');
  return copyTextValue(source?source.textContent:'',button);
}

function toggleJsonViewerMode(button){
  const viewer=button.closest('.json-viewer');if(!viewer)return;
  const raw=viewer.dataset.mode!=='raw';viewer.dataset.mode=raw?'raw':'tree';button.textContent=raw?'树形':'源码';
}

function setJsonExpanded(button, open){
  const root=button.closest('.json-viewer,.json-editor-shell');if(!root)return;
  root.querySelectorAll('.json-tree details').forEach(item=>item.open=Boolean(open));
}

function jsonErrorMessage(text,error){
  const message=String(error&&error.message||'不是合法 JSON');
  const match=message.match(/position\s+(\d+)/i);
  if(!match)return `JSON 格式错误：${message}`;
  const position=Math.max(0,Number(match[1])||0),before=String(text).slice(0,position).split('\n');
  return `JSON 格式错误：第 ${before.length} 行，第 ${before[before.length-1].length+1} 列 · ${message}`;
}

function setJsonEditorError(area,message){
  const shell=area&&area.closest('.json-editor-shell');if(!shell)return;
  shell.classList.toggle('invalid',Boolean(message));const box=shell.querySelector('.json-editor-error');if(box)box.textContent=message||'';
}

function formatJsonEditor(area, quiet=false, dispatch=true){
  if(!area)return false;const raw=area.value.trim();
  if(!raw){setJsonEditorError(area,'');return true;}
  try{
    area.value=JSON.stringify(JSON.parse(raw),null,2);setJsonEditorError(area,'');
    if(dispatch)area.dispatchEvent(new Event('input',{bubbles:true}));return true;
  }catch(error){setJsonEditorError(area,jsonErrorMessage(area.value,error));if(!quiet)area.focus();return false;}
}

function jsonEditorAction(button, action){
  const shell=button.closest('.json-editor-shell'),area=shell&&shell.querySelector('textarea');if(!area)return;
  if(action==='copy')return copyTextValue(area.value,button);
  if(action==='format')return formatJsonEditor(area,false,true);
  if(action==='tree'){
    if(!area.value.trim()){setJsonEditorError(area,'请先输入 JSON 后再预览');area.focus();return false;}
    if(!formatJsonEditor(area,false,true))return false;
    const tree=shell.querySelector('.json-editor-tree');tree.innerHTML=jsonTreeNode(JSON.parse(area.value),null,0,false,false);
    shell.classList.add('tree-mode');button.textContent='源码编辑';return true;
  }
  if(action==='source'){shell.classList.remove('tree-mode');const treeButton=shell.querySelector('[data-json-action="tree"]');if(treeButton)treeButton.textContent='树形预览';area.focus();}
}

function toggleJsonEditorMode(button){
  const shell=button.closest('.json-editor-shell');
  return jsonEditorAction(button,shell&&shell.classList.contains('tree-mode')?'source':'tree');
}

function enhanceJsonEditors(root=document){
  const areas=[];
  if(root.nodeType===1&&root.matches('textarea[data-json-editor]'))areas.push(root);
  if(root.querySelectorAll)areas.push(...root.querySelectorAll('textarea[data-json-editor]'));
  areas.forEach(area=>{
    if(area.dataset.jsonReady==='true')return;area.dataset.jsonReady='true';
    const doc=area.ownerDocument;if(!doc)return;
    const shell=doc.createElement('div');shell.className='json-editor-shell';
    const toolbar=doc.createElement('div');toolbar.className='json-editor-toolbar';toolbar.innerHTML=`<button class="json-tool" type="button" data-json-action="copy" title="复制完整 JSON" onclick="jsonEditorAction(this,'copy')">复制</button><button class="json-tool" type="button" data-json-action="format" title="使用两个空格格式化" onclick="jsonEditorAction(this,'format')">格式化</button><button class="json-tool" type="button" data-json-action="tree" title="切换可折叠树形预览" onclick="toggleJsonEditorMode(this)">树形预览</button><button class="json-tool json-tree-only" type="button" title="展开所有对象和数组" onclick="setJsonExpanded(this,true)">展开</button><button class="json-tool json-tree-only" type="button" title="收起所有对象和数组" onclick="setJsonExpanded(this,false)">收起</button>`;
    const tree=doc.createElement('div');tree.className='json-editor-tree json-tree';tree.setAttribute('role','tree');
    const error=doc.createElement('div');error.className='json-editor-error';error.setAttribute('role','alert');
    area.parentNode.insertBefore(shell,area);shell.append(toolbar,area,tree,error);
    formatJsonEditor(area,true,false);area.addEventListener('blur',()=>formatJsonEditor(area,true,true));
    area.addEventListener('input',()=>setJsonEditorError(area,''));
  });
}

function installJsonTools(){
  enhanceJsonEditors(document);
  new MutationObserver(mutations=>mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>enhanceJsonEditors(node))))
    .observe(document.body,{childList:true,subtree:true});
}

function runtimeMeta(meta){
  if(!meta) return '';
  const size = Number(meta.bytes || 0);
  return `${size ? fmt(size) + ' bytes' : ''}${meta.truncated ? ' · 已截断' : ''}`;
}

function modelRuntimePanel(target, id, expected=false){
  const records = target && target.modelCalls ? (target.modelCalls[id] || []) : [];
  if(!records.length){
    return expected ? `<div class="node-runtime" data-testid="model-runtime-panel">
      <div class="node-runtime-head"><div class="sub-t">模型调用诊断</div></div>
      <div class="runtime-io-empty">运行到该 LLM 节点后，这里会显示脱敏后的请求、响应、耗时与异常</div></div>` : '';
  }
  return `<div class="node-runtime" data-testid="model-runtime-panel">
    <div class="node-runtime-head"><div class="sub-t">模型调用诊断</div><span class="card-s">${records.length} 次请求（含重试）</span></div>
    ${records.map(rec=>{
      const status=rec.status || 'waiting';
      const validation=rec.validation || {};
      const requestEmpty=(rec.requestMeta||{}).captured===false?'正文记录已关闭':'未采集到请求体';
      const responseEmpty=(rec.responseMeta||{}).captured===false?'正文记录已关闭':(rec.errorMessage || '尚未收到响应');
      return `<div class="model-call" data-testid="model-call">
        <div class="model-call-meta">
          <b>第 ${Number(rec.attempt)||1} 次</b>${rec.repair?'<span class="pm-tag warn">格式修复重试</span>':''}
          <span>${esc(rec.provider || '—')} · ${rec.modelRef?esc(rec.modelRef)+'@'+esc(rec.modelVersion||'—')+' → ':''}${esc(rec.model || '—')}</span>
          <span class="model-call-status ${attr(status)}">${esc(status)}</span>
          <span>${rec.httpStatus == null?'无 HTTP 状态':('HTTP '+rec.httpStatus)}</span>
          <span>${rec.latency == null?'等待中':(fmt(rec.latency)+' ms')}</span>
          ${rec.errorCode?`<span class="pm-tag bad">${esc(rec.errorCode)}</span>`:''}
        </div>
        <div class="runtime-io-label"><span>${esc((rec.method||'POST')+' '+(rec.url||''))}</span><span>timeout ${esc(String(rec.timeout == null?'—':rec.timeout))}s</span></div>
        <div class="model-call-body">
          <div class="runtime-io-block"><div class="runtime-io-label"><span>请求体</span><span>${esc(runtimeMeta(rec.requestMeta))}</span></div>
            ${jsonViewerMarkup(rec.request,{empty:requestEmpty,testid:'model-request-body'})}</div>
          <div class="runtime-io-block"><div class="runtime-io-label"><span>返回结果</span><span>${esc(runtimeMeta(rec.responseMeta))}</span></div>
            ${jsonViewerMarkup(rec.response,{empty:responseEmpty,testid:'model-response-body'})}</div>
        </div>
        ${(rec.errorMessage||validation.message)?`<div class="path-contract" style="margin-top:7px">${rec.errorMessage?`<b>${esc(rec.errorType||rec.errorCode||'调用异常')}</b> · ${esc(rec.errorMessage)}`:''}${validation.message?`${rec.errorMessage?'<br>':''}<b>输出校验</b> · ${esc(validation.message)}${validation.detail?'<br>'+esc(runtimeJSON(validation.detail,'')):''}`:''}</div>`:''}
      </div>`;
    }).join('')}</div>`;
}

function pickNodeRuntime(id, index){
  NODE_IO_SELECTED[id] = Number(index) || 0;
  if(sel.kind === 'node' && sel.id === id) renderDetail();
}

function nodeRuntimePanel(id){
  const records = LIVE && LIVE.nodeIO ? (LIVE.nodeIO[id] || []) : [];
  if(!records.length){
    return `<div class="node-runtime" data-testid="node-runtime-panel">
      <div class="node-runtime-head"><div class="sub-t">本次运行输入输出</div></div>
      <div class="runtime-io-empty">运行到该节点后，这里会显示脱敏后的输入和输出补丁</div></div>`;
  }
  const requested = NODE_IO_SELECTED[id];
  const index = Math.max(0, Math.min(records.length-1, requested == null ? records.length-1 : requested));
  NODE_IO_SELECTED[id] = index;
  const record = records[index];
  const nodeError = (LIVE.nodeErrors || []).slice().reverse().find(item => nodeRuntimeKey(item.node) === id);
  const outputEmpty = nodeError
    ? `${nodeError.code} · ${nodeError.message}${nodeError.detail.length ? '\n' + nodeError.detail.join('\n') : ''}`
    : '尚无输出（节点执行中、等待恢复或运行记录来自旧版本）';
  return `<div class="node-runtime" data-testid="node-runtime-panel">
    <div class="node-runtime-head"><div class="sub-t">本次运行输入输出</div>
      <select class="select" data-node="${attr(id)}" onchange="pickNodeRuntime(this.dataset.node,this.value)">
        ${records.map((_,i)=>`<option value="${i}"${i===index?' selected':''}>第 ${i+1} 次执行</option>`).join('')}
      </select></div>
    <div class="runtime-io-grid">
      <div class="runtime-io-block"><div class="runtime-io-label"><span>节点输入</span><span>${esc(runtimeMeta(record.inputMeta))}</span></div>
        ${jsonViewerMarkup(record.input,{empty:'未采集到输入',testid:'node-runtime-input'})}</div>
      <div class="runtime-io-block"><div class="runtime-io-label"><span>输出补丁</span><span>${esc(runtimeMeta(record.outputMeta))}</span></div>
        ${jsonViewerMarkup(record.output,{empty:outputEmpty,testid:'node-runtime-output'})}</div>
    </div></div>`;
}

function renderDetail(){
  const body = $('#detailBody'), summaryBody=$('#inspectorSummaryBody');
  if(!body||!summaryBody)return;
  renderRuntimeNode();
  if(sel.kind === 'edge'){
    const e = GRAPH.edges[sel.idx];
    if(!e){ summaryBody.innerHTML = '<div class="empty">未选择</div>'; return; }
    const src = GRAPH.nodes.find(n => n.id === e.from);
    const allowed = condsFor(src);
    const isCond = allowed.length > 0;
    const used = new Set(GRAPH.edges.filter((edge, index) => index !== sel.idx && edge.from === e.from).map(edge => edge.condition));
    const invalidOption = e.condition && !allowed.includes(e.condition)
      ? `<option value="${attr(e.condition)}" selected>无效 · ${esc(e.condition)}</option>` : '';
    const sourcePort=e.source_port||'';
    const targetPort=e.target_port||'';
    $('#inspectorSelection').textContent = '连线';
    summaryBody.innerHTML = `
      <div class="detail-row"><span>方向</span><b class="mono" style="font-size:10.5px">${esc(e.from)} → ${esc(e.to)}</b></div>
      <div class="detail-row"><span>类型</span><b>${isCond ? '条件分支' : '静态边'}</b></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
        <div><div style="font-size:11px;color:var(--muted);margin-bottom:3px">出线位置（source_port）</div>
          <select class="select" style="width:100%" onchange="setEdgePort(${sel.idx},'source_port',this.value)">
            <option value="" ${!sourcePort?'selected':''}>自动</option><option value="right" ${sourcePort==='right'?'selected':''}>右侧输出</option><option value="bottom" ${sourcePort==='bottom'?'selected':''}>下方输出</option>
          </select></div>
        <div><div style="font-size:11px;color:var(--muted);margin-bottom:3px">入线位置（target_port）</div>
          <select class="select" style="width:100%" onchange="setEdgePort(${sel.idx},'target_port',this.value)">
            <option value="" ${!targetPort?'selected':''}>自动</option><option value="left" ${targetPort==='left'?'selected':''}>左侧输入</option><option value="top" ${targetPort==='top'?'selected':''}>上方输入</option>
          </select></div>
      </div>
      ${isCond ? `<div style="margin-top:8px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:3px">分支条件</div>
        <select class="select" style="width:100%" onchange="setCond(${sel.idx}, this.value)">
          ${invalidOption}${allowed.map(c => `<option value="${attr(c)}" ${e.condition===c?'selected':''} ${used.has(c)?'disabled':''}>${esc(routeLabel(src,c))}${used.has(c)?' · 已使用':''}</option>`).join('')}
        </select></div>` : ''}
      <div class="detail-row" style="margin-top:8px"><span>布线方式</span><b>${e.bend?'手动调整':'自动布线'}</b></div>
      ${e.bend?`<button class="btn sm" style="width:100%;margin-top:8px" onclick="resetEdgeBend(${sel.idx})">恢复自动布线</button>`:''}
      <button class="btn sm" style="width:100%;margin-top:10px;color:var(--red);border-color:#f0c2c2" onclick="delEdge(${sel.idx})">删除这条连线</button>`;
    if(!NODE_EDITOR.open) body.innerHTML='<div class="empty">节点配置仅在选中节点时可用</div>';
    return;
  }
  if(sel.kind !== 'node'){
    summaryBody.innerHTML = '<div class="empty">点击节点查看摘要，双击进入配置</div>';
    if(!NODE_EDITOR.open)body.innerHTML = '<div class="empty">请选择节点</div>';
    $('#inspectorSelection').textContent = '未选择节点';
    return;
  }

  const n = nodes[sel.id];
  const gn = GRAPH.nodes.find(x => x.id === sel.id);
  if(!n || !gn) return;
  const meta = typeMeta(gn.type);
  const st = n._state || 'idle';
  const stMap = {idle:['未执行','#6b7280'],running:['执行中','#4f46e5'],done:['成功','#15803d'],wait:['等待人工','#b45309'],error:['失败','#b91c1c']};
  const [txt, color] = stMap[st] || stMap.idle;
  const displayName=String(gn.display_name||'').trim();
  const instanceDescription=String(gn.description||'').trim();
  $('#inspectorSelection').textContent = SELECTED_NODE_IDS.size>1
    ? `已选择 ${SELECTED_NODE_IDS.size} 个节点`
    : (displayName||gn.id);
  const incoming=GRAPH.edges.filter(e=>e.to===gn.id).length;
  const outgoing=GRAPH.edges.filter(e=>e.from===gn.id).length;
  summaryBody.innerHTML=`
    ${displayName?`<div class="detail-row"><span>节点</span><b>${esc(displayName)} · <span class="mono">${esc(gn.id)}</span></b></div>`:''}
    <div class="detail-row"><span>类型</span><b>${esc(meta.label)} · <span class="mono">${esc(gn.type)}</span></b></div>
    <div class="detail-row"><span>状态</span><b style="color:${color}">${txt}</b></div>
    <div class="detail-row"><span>连接</span><b>入边 ${incoming} · 出边 ${outgoing}</b></div>
    <div class="detail-row"><span>入口节点</span><b>${GRAPH.entry===gn.id?'是':'否'}</b></div>
    <div class="path-contract" style="margin-top:8px"><b>当前节点作用</b><br>${esc(instanceDescription||'尚未填写当前节点的业务作用')}</div>
    <div class="hint" style="margin-top:6px">类型说明：${esc(meta.desc||'暂无节点类型说明')}</div>
    <div class="inspector-summary-actions"><button class="btn primary" data-testid="open-node-config" onclick="openNodeEditor('${gn.id}')">配置节点</button>
      <button class="btn" onclick="openNodeEditor('${gn.id}','test')">试运行</button></div>`;
  $('#nodeConfigTitle').textContent=`配置节点 · ${displayName||gn.id}`;
  $('#nodeConfigMeta').textContent=`${gn.type} · ${meta.label} · ${GRAPH.id}`;
  const graphOnlyTest=['parallel','join','human','delay','event_wait'].includes(gn.type);
  const saveRun=$('#nodeConfigSaveRun');
  if(saveRun){
    saveRun.disabled=graphOnlyTest||!canvasAgentCode()||!graphCan('manage');
    saveRun.title=graphOnlyTest?'该节点依赖连线、挂起或恢复上下文，请使用整图试运行':(!canvasAgentCode()?'未绑定编排图缺少 Agent 契约':(!graphCan('manage')?'缺少 Agent 管理权限':'保存配置并运行当前节点'));
  }
  body.innerHTML = `
    <section class="node-editor-section" data-tab="basic">
      <div class="editor-section-head"><div><div class="editor-section-title">基础配置</div><div class="editor-section-sub">节点身份、运行限制和画布行为</div></div><span class="badge ${st==='done'?'ok':st==='error'?'fail':st==='wait'?'wait':'run'}">${txt}</span></div>
      <div class="frm">
        <div class="fld"><label>节点 ID（id）</label><input class="inp mono" value="${attr(gn.id)}" disabled></div>
        <div class="fld"><label>节点类型（type）</label><select class="inp" onchange="setNodeType('${gn.id}',this.value)">
          ${Object.keys(TYPE_META).filter(t=>t===gn.type||(TYPE_META[t].enabled!==false&&TYPE_META[t].creatable!==false)).map(t=>`<option value="${t}" ${gn.type===t?'selected':''}>${t} · ${TYPE_META[t].label}${TYPE_META[t].creatable===false?'（历史）':''}</option>`).join('')}
        </select></div>
        <div class="fld wide"><label>节点名称（display_name）</label><input class="inp" maxlength="64" value="${attr(displayName)}" placeholder="例如：生成中文欢迎语" onchange="setNodeMeta('${gn.id}','display_name',this.value)"></div>
        <div class="fld wide"><label>节点说明（description）</label><textarea class="inp" maxlength="500" style="min-height:96px" placeholder="说明当前节点的业务作用、输入来源和输出用途" onchange="setNodeMeta('${gn.id}','description',this.value)">${esc(instanceDescription)}</textarea><div class="hint">最多 500 字；填写后单击或悬停节点可查看。</div></div>
        <div class="fld"><label>节点超时秒数（timeout）</label><input class="inp" type="number" min="1" max="3600" step="1" value="${attr(gn.timeout == null ? defaultNodeTimeout(gn.type) : gn.timeout)}" onchange="setNodeTimeout('${gn.id}',this.value)"><div class="hint">知识检索节点默认 300 秒，其他节点默认 10 秒；可显式覆盖。</div></div>
        <div class="fld"><label>使用范围（owner_agent_code）</label><input class="inp" value="${attr((gn.owner_agent_code||GRAPH.owner_agent_code||canvasAgentCode())?'Agent 专属 · '+(gn.owner_agent_code||GRAPH.owner_agent_code||canvasAgentCode()):'未绑定 · 平台待分配')}" disabled></div>
      </div>
      <div class="detail-row" style="margin-top:12px"><span>最近状态</span><b style="color:${color}">${txt} · ${n._ms?n._ms+' ms':'未执行'} · ${n._tok?fmt(n._tok)+' tokens':'无 token'}</b></div>
      <div class="detail-row"><span>连接关系</span><b>入边 ${incoming} · 出边 ${outgoing}</b></div>
      <div style="display:flex;gap:8px;margin-top:14px"><button class="btn" onclick="setEntry('${gn.id}')">设为入口节点</button>
        <button class="btn danger" onclick="delNode('${gn.id}')">删除节点</button></div>
    </section>
    <section class="node-editor-section node-editor-config" data-tab="config">
      <div class="editor-section-head"><div><div class="editor-section-title">输入输出与业务配置</div><div class="editor-section-sub">字段来自节点配置 Schema，路径选择器会提示可用上游变量</div></div></div>
      ${configFields(gn)}${nodeContractSummary(gn)}
    </section>
    <section class="node-editor-section" data-tab="test">
      <div class="editor-section-head"><div><div class="editor-section-title">节点级试运行</div><div class="editor-section-sub">使用模拟 AgentState 验证当前节点，并查看真实输入输出快照</div></div></div>
      ${nodeRuntimePanel(gn.id)}${modelRuntimePanel(LIVE,gn.id,gn.type==='llm')}${nodeTestPanel(gn)}
    </section>
    <section class="node-editor-section node-editor-help" data-tab="help">
      <div class="editor-section-head"><div><div class="editor-section-title">${esc(meta.label)}</div><div class="editor-section-sub mono">${esc(gn.type)} · ${esc(meta.cat)}</div></div></div>
      <div>${esc(meta.desc||'暂无节点说明')}</div>
      <div class="node-editor-help-grid">
        <div class="node-editor-help-box"><div class="sub-t">配置字段</div>${Object.entries(meta.config||{}).map(([key,spec])=>`<div><span>${esc(fieldDisplayName(key))}</span>${spec.required?' · 必填':''}：${esc(spec.desc||spec.type||'')}</div>`).join('')||'无额外配置'}</div>
        <div class="node-editor-help-box"><div class="sub-t">状态与分支</div><div>声明写入：${esc((meta.writes||[]).join('、')||'无')}</div><div>可用分支：${esc(routeDefsFor(gn).map(item=>item.label).join('、')||'无固定分支')}</div><div>当前必连：${esc(requiredRouteDefsFor(gn).map(item=>item.label).join('、')||'无')}</div></div>
      </div>
      <div class="path-contract" style="margin-top:12px">更完整的适用场景、前置条件、配置示例和错误处理建议可在“节点管理”中查看。</div>
    </section>`;
  if(NODE_EDITOR.open)applyNodeEditorTab();
}

/** 按节点的 config_schema 渲染属性面板。 */
function configFields(gn){
  const meta = typeMeta(gn.type);
  const schema = meta.config || {};
  const keys = Object.keys(schema);
  if(!keys.length) return '';
  if(!gn.config) gn.config = {};
  const cfg = gn.config;

  const field = (k) => {
    const s = schema[k] || {};
    const val = cfg[k] != null ? cfg[k] : (s.default != null ? s.default : '');
    const label = `<label>${esc(fieldDisplayName(k))}${fieldHelpMarkup(k,s)} ${s.required ? '<b>*</b>' : ''}</label>`;

    if(gn.type === 'switch' && k === 'cases'){
      const cases = Array.isArray(val) ? val : [];
      const rows = cases.map((item, index) => {
        let when = ''; try{ when = JSON.stringify(item && item.when) }catch(e){ when = String(item && item.when || '') }
        return `<div class="switch-case">
          <button class="switch-case-remove" title="删除分支" onclick="delSwitchCase('${gn.id}',${index})">×</button>
          <div class="switch-case-grid">
            <div><label>匹配值（when，JSON）</label><input class="inp mono" value="${attr(when)}" onchange="setSwitchCase('${gn.id}',${index},'when',this.value)"></div>
            <div><label>分支名（route）</label><input class="inp mono" value="${attr(item && item.route || '')}" placeholder="case_a" onchange="setSwitchCase('${gn.id}',${index},'route',this.value)"></div>
          </div>
          <div class="switch-case-label"><label>画布标签（label）</label><input class="inp" maxlength="32" value="${attr(item && item.label || '')}" placeholder="可选，最多 32 字" onchange="setSwitchCase('${gn.id}',${index},'label',this.value)"></div>
        </div>`;
      }).join('');
      return `<div class="fld">${label}<div class="switch-cases">${rows || '<div class="hint" style="padding:7px 0">尚未配置匹配分支</div>'}</div>
        <button class="btn sm" style="margin-top:7px" title="添加分支" onclick="addSwitchCase('${gn.id}')">＋ 添加分支</button></div>`;
    }

    if(k === 'agent'){
      if(gn.type === 'foreach' && (cfg.target_type || 'skill') !== 'subgraph') return '';
      // 父 Agent 必须按当前 Graph 的真实绑定关系识别。只看页面 scope 会在切图瞬间
      // 排除错对象，表现为“只能选自己、看不到真正的子 Agent”。
      const parent = currentGraphAgentCode();
      const opts = AGENTS.filter(a => a.status !== 'archived' && a.code !== parent);
      const selectedVisible = opts.some(a => a.code === val);
      const selfReference = !!parent && val === parent;
      const unavailable = val && !selfReference && !selectedVisible;
      const feedback = SUBGRAPH_AGENT_OPTIONS.loading
        ? '正在刷新可访问 Agent…'
        : SUBGRAPH_AGENT_OPTIONS.error
          ? SUBGRAPH_AGENT_OPTIONS.error
          : opts.length
            ? `已排除父 Agent ${parent || '（当前图未绑定）'}，防止直接自循环；间接循环会在 Graph 校验时拦截。`
            : `没有可选子 Agent；已排除父 Agent ${parent || '（当前图未绑定）'}，请确认目标 Agent 已创建且当前账号至少有读取权限。`;
      return `<div class="fld">${label}
        <div style="display:flex;gap:6px;align-items:center">
          <select class="inp" style="height:28px;font-size:11.5px" ${SUBGRAPH_AGENT_OPTIONS.loading?'disabled':''} onchange="setNodeCfg('${gn.id}','agent',this.value)">
            <option value="">${SUBGRAPH_AGENT_OPTIONS.loading?'— 正在刷新 Agent —':'— 选择子 Agent —'}</option>
            ${unavailable ? `<option value="${attr(val)}" selected disabled>${esc(val)} · 当前账号不可访问或 Agent 已归档</option>` : ''}
            ${opts.map(a => `<option value="${attr(a.code)}"${a.code === val ? ' selected' : ''}>${esc(a.name || a.code)} · ${esc(a.code)}</option>`).join('')}
          </select>
          <button class="btn sm" type="button" title="刷新可访问 Agent" onclick="refreshSubgraphAgentOptions('${gn.id}')">刷新</button>
        </div>
        ${selfReference ? `<div class="path-contract" style="color:var(--red)">当前配置引用了父 Agent ${esc(parent)}，属于直接循环；请选择其他 Agent。</div>` : ''}
        <div class="hint">${esc(feedback)}</div></div>`;
    }
    if(k === 'version'){
      const usesSkill = gn.type === 'skill' || (gn.type === 'foreach' && (cfg.target_type || 'skill') === 'skill');
      const sub = usesSkill
        ? SKILL_GOV.items.find(a => a.code === (cfg.skill_code || ''))
        : AGENTS.find(a => a.code === (cfg.agent || ''));
      const vers = ((sub && sub.versions) || []).map(v => v.version);
      const opts = ['stable', 'latest', 'canary'].concat(vers.filter(v => !['stable','latest','canary'].includes(v)));
      return `<div class="fld">${label}
        <select class="inp" style="height:28px;font-size:11.5px" onchange="setNodeCfg('${gn.id}','version',this.value)">
          ${opts.map(o => `<option value="${esc(o)}"${o === (val || 'stable') ? ' selected' : ''}>${esc(fieldOptionDisplayName(k,o))}</option>`).join('')}
        </select></div>`;
    }
    if(k === 'skill_code'){
      if(gn.type === 'foreach' && (cfg.target_type || 'skill') !== 'skill') return '';
      return `<div class="fld">${label}
        <select class="inp" style="height:28px;font-size:11.5px" onchange="setNodeCfg('${gn.id}','skill_code',this.value)">
          <option value="">— 选择 Skill —</option>
          ${SKILL_GOV.items.map(a => `<option value="${esc(a.code)}"${a.code === val ? ' selected' : ''}>${esc(a.name || a.code)} · ${esc(a.code)}</option>`).join('')}
        </select></div>`;
    }
    if(k === 'join_node'){
      const opts = GRAPH.nodes.filter(n => n.type === 'join');
      return `<div class="fld">${label}
        <select class="inp" style="height:28px;font-size:11.5px" onchange="setNodeCfg('${gn.id}','join_node',this.value)">
          <option value="">— 选择汇总节点 —</option>
          ${opts.map(n => `<option value="${esc(n.id)}"${n.id === val ? ' selected' : ''}>${esc(n.id)}</option>`).join('')}
        </select></div>`;
    }
    if(k === 'knowledge_base'){
      return `<div class="fld">${label}<select class="inp" style="height:28px;font-size:11.5px" onchange="setNodeCfg('${gn.id}','knowledge_base',this.value)">
        <option value="">— 当前 Agent 隐式知识空间 —</option>
        ${KNOWLEDGE_BASES.filter(x => x.status === 'active').map(x => `<option value="${attr(x.code)}"${x.code === val ? ' selected' : ''}>${esc(x.name)} · ${esc(x.code)}</option>`).join('')}
      </select></div>`;
    }
    if(k === 'review_template'){
      return `<div class="fld">${label}<div class="node-config-inline"><select class="inp" style="height:28px;font-size:11.5px" onchange="setNodeCfg('${gn.id}','review_template',this.value)">
        <option value="">— 使用通用 JSON 审核界面 —</option>
        ${REVIEW_TEMPLATE_GOV.items.filter(item=>item.status==='active'&&item.aliases&&item.aliases.stable).map(item=>`<option value="${attr(item.code)}"${item.code===val?' selected':''}>${esc(item.name)} · ${esc(item.code)}@stable</option>`).join('')}
        ${val&&!REVIEW_TEMPLATE_GOV.items.some(item=>item.code===val)?`<option value="${attr(val)}" selected disabled>${esc(val)} · 当前不可用</option>`:''}
      </select><button class="btn sm node-config-refresh" type="button" title="刷新审核模板" aria-label="刷新审核模板" onclick="loadReviewTemplateOptions('${gn.id}',this)"><span aria-hidden="true">↻</span></button></div><div class="hint">审核模板会在进入人工审核时解析并固化快照；留空保持通用审核界面。</div></div>`;
    }
    if(k === 'template_version'){
      const template=REVIEW_TEMPLATE_GOV.items.find(item=>item.code===(cfg.review_template||'')),versions=(template&&template.versions||[]).filter(item=>item.status==='published').map(item=>item.version),opts=['stable','latest'].concat(versions.filter(version=>!['stable','latest'].includes(version)));
      return `<div class="fld">${label}<select class="inp" style="height:28px;font-size:11.5px" ${cfg.review_template?'':'disabled'} onchange="setNodeCfg('${gn.id}','template_version',this.value)">${opts.map(version=>`<option value="${attr(version)}"${version===(val||'stable')?' selected':''}>${esc(fieldOptionDisplayName(k,version))}</option>`).join('')}</select></div>`;
    }
    if(k === 'model_ref'){
      return `<div class="fld">${label}<select class="inp" style="height:28px;font-size:11.5px" onchange="setNodeCfg('${gn.id}','model_ref',this.value)">
        <option value="">— 使用平台全局模型 —</option>
        ${MODEL_GOV.items.filter(item=>item.status==='active').map(item=>`<option value="${attr(item.code)}"${item.code===val?' selected':''}>${esc(item.name)} · ${esc(item.code)} · stable ${esc((item.aliases||{}).stable||'未发布')}</option>`).join('')}
      </select></div>`;
    }
    if(k === 'model_version'){
      const model=MODEL_GOV.items.find(item=>item.code===(cfg.model_ref||''));
      const versions=(model&&model.versions||[]).map(item=>item.version);
      const opts=['stable','latest'].concat(versions.filter(version=>!['stable','latest'].includes(version)));
      return `<div class="fld">${label}<select class="inp" style="height:28px;font-size:11.5px" ${cfg.model_ref?'':'disabled'} onchange="setNodeCfg('${gn.id}','model_version',this.value)">
        ${opts.map(version=>`<option value="${attr(version)}"${version===(val||'stable')?' selected':''}>${esc(fieldOptionDisplayName(k,version))}</option>`).join('')}
      </select></div>`;
    }
    if(gn.type === 'error_boundary' && k === 'target_config'){
      const targetType = cfg.target_type || '';
      const targetSchema = (typeMeta(targetType).config || {});
      const targetCfg = (cfg.target_config && typeof cfg.target_config === 'object') ? cfg.target_config : {};
      const controls = Object.entries(targetSchema).map(([nk, ns]) => {
        const nv = targetCfg[nk] != null ? targetCfg[nk] : (ns.default != null ? ns.default : '');
        const change = `setBoundaryTargetCfg('${gn.id}','${nk}',this.value)`;
        if(nk === 'model_ref') return `<div class="fld"><label>${esc(fieldDisplayName(nk))}${fieldHelpMarkup(nk,ns)}</label><select class="inp" onchange="${change}">
          <option value="">— 使用平台全局模型 —</option>
          ${MODEL_GOV.items.filter(item=>item.status==='active').map(item=>`<option value="${attr(item.code)}"${item.code===nv?' selected':''}>${esc(item.name)} · ${esc(item.code)} · stable ${esc((item.aliases||{}).stable||'未发布')}</option>`).join('')}
        </select></div>`;
        if(nk === 'model_version'){
          const model=MODEL_GOV.items.find(item=>item.code===(targetCfg.model_ref||''));
          const versions=(model&&model.versions||[]).map(item=>item.version);
          const opts=['stable','latest'].concat(versions.filter(version=>!['stable','latest'].includes(version)));
          return `<div class="fld"><label>${esc(fieldDisplayName(nk))}${fieldHelpMarkup(nk,ns)}</label><select class="inp" ${targetCfg.model_ref?'':'disabled'} onchange="${change}">
            ${opts.map(version=>`<option value="${attr(version)}"${version===(nv||'stable')?' selected':''}>${esc(fieldOptionDisplayName(nk,version))}</option>`).join('')}
          </select></div>`;
        }
        if(Array.isArray(ns.enum)) return `<div class="fld"><label>${esc(fieldDisplayName(nk))}${fieldHelpMarkup(nk,ns)} ${ns.required?'<b>*</b>':''}</label><select class="inp" onchange="${change}">${ns.enum.map(o=>`<option value="${attr(o)}"${o===nv?' selected':''}>${esc(fieldOptionDisplayName(nk,o))}</option>`).join('')}</select></div>`;
        if(ns.type === 'boolean') return `<div class="fld"><label>${esc(fieldDisplayName(nk))}${fieldHelpMarkup(nk,ns)}</label><select class="inp" onchange="${change}"><option value="true"${nv===true?' selected':''}>true · 是</option><option value="false"${nv===false?' selected':''}>false · 否</option></select></div>`;
        if(['object','json','array'].includes(ns.type)){ let j=''; try{j=JSON.stringify(nv,null,2)}catch(e){j=''} return `<div class="fld"><label>${esc(fieldDisplayName(nk))}${fieldHelpMarkup(nk,ns)} ${ns.required?'<b>*</b>':''}</label><textarea class="inp" data-json-editor="true" style="min-height:90px;font-family:var(--mono);resize:vertical" onchange="${change}">${esc(j)}</textarea></div>`; }
        return `<div class="fld"><label>${esc(fieldDisplayName(nk))}${fieldHelpMarkup(nk,ns)} ${ns.required?'<b>*</b>':''}</label><input class="inp" type="${['integer','number'].includes(ns.type)?'number':'text'}" value="${attr(nv)}" onchange="${change}"></div>`;
      }).join('');
      return `<div class="fld"><label>${esc(fieldDisplayName('target_config'))}${fieldHelpMarkup('target_config',s)} · ${esc(targetType || '请先选择 target_type')}</label><div style="border-left:2px solid var(--line);padding-left:9px;display:flex;flex-direction:column;gap:7px">${controls || '<span class="hint">选择目标节点后显示其配置</span>'}</div></div>`;
    }
    if(isVariablePathField(k, s)) return pathControl(gn, k, val, s);
    if(Array.isArray(s.enum) && s.enum.length){
      return `<div class="fld">${label}<select class="inp" style="height:28px;font-size:11.5px" onchange="setNodeCfg('${gn.id}','${k}',this.value)">
        ${s.enum.map(o => `<option value="${attr(o)}"${o === val ? ' selected' : ''}>${esc(fieldOptionDisplayName(k,o))}</option>`).join('')}</select></div>`;
    }
    if(s.type === 'boolean'){
      return `<div class="fld">${label}<select class="inp" style="height:28px;font-size:11.5px" onchange="setNodeCfg('${gn.id}','${k}',this.value)">
        <option value="true"${val === true ? ' selected' : ''}>true · 是</option><option value="false"${val === false ? ' selected' : ''}>false · 否</option></select></div>`;
    }
    if(s.type === 'object' || s.type === 'json' || s.type === 'array'){
      let json = ''; try{ json = JSON.stringify(val, null, 2) }catch(e){ json = String(val || '') }
      return `<div class="fld">${label}<textarea class="inp" data-json-editor="true" style="min-height:112px;height:112px;font-size:11.5px;font-family:var(--mono);resize:vertical" placeholder="${attr(s.desc || '')}" onchange="setNodeCfg('${gn.id}','${k}',this.value)">${esc(json)}</textarea></div>`;
    }
    if(s.type === 'number' || s.type === 'integer'){
      const bounds = `${s.minimum != null ? `min="${attr(s.minimum)}"` : ''} ${s.maximum != null ? `max="${attr(s.maximum)}"` : ''}`;
      return `<div class="fld">${label}<input class="inp" type="number" ${s.type === 'integer' ? 'step="1"' : 'step="any"'} ${bounds} style="height:28px;font-size:11.5px" value="${attr(val)}" placeholder="${attr(s.desc || '')}" onchange="setNodeCfg('${gn.id}','${k}',this.value)"></div>`;
    }
    return `<div class="fld">${label}
      <input class="inp" style="height:28px;font-size:11.5px" value="${esc(val)}"
             placeholder="${esc(s.desc || '')}" onchange="setNodeCfg('${gn.id}','${k}',this.value)"></div>`;
  };

  const descs = keys.map(k => (schema[k] && schema[k].desc) ? `· ${k}：${schema[k].desc}` : '').filter(Boolean).join('<br>');
  return `<div style="margin-top:10px;border-top:1px dashed var(--line);padding-top:9px">
    <div class="sub-t">节点配置（${esc(meta.label)}）</div>
    <div style="display:flex;flex-direction:column;gap:7px">${keys.map(field).join('')}</div>
    ${gn.type === 'subgraph' && cfg.agent ? `<button class="btn sm" style="width:100%;margin-top:8px"
        onclick="go('govern');govSelect('${esc(cfg.agent)}')">查看子 Agent 的版本与契约</button>` : ''}
    ${(gn.type === 'skill' || (gn.type === 'foreach' && (cfg.target_type || 'skill') === 'skill')) && cfg.skill_code ? `<button class="btn sm" style="width:100%;margin-top:8px"
        onclick="go('skill');skillSelect('${esc(cfg.skill_code)}')">查看 Skill 的版本与契约</button>` : ''}
    ${gn.type === 'llm' && cfg.model_ref ? `<button class="btn sm" style="width:100%;margin-top:8px"
        onclick="go('model');modelSelect('${esc(cfg.model_ref)}')">查看模型版本、测试与调用配置</button>` : ''}
    ${gn.type === 'error_boundary' && cfg.target_type === 'llm' && cfg.target_config && cfg.target_config.model_ref ? `<button class="btn sm" style="width:100%;margin-top:8px"
        onclick="go('model');modelSelect('${esc(cfg.target_config.model_ref)}')">查看目标节点的模型配置</button>` : ''}
    ${gn.type === 'foreach' && cfg.target_type === 'subgraph' && cfg.agent ? `<button class="btn sm" style="width:100%;margin-top:8px"
        onclick="go('govern');govSelect('${esc(cfg.agent)}')">查看子 Agent 的版本与契约</button>` : ''}
    <div class="hint" style="font-size:10px">${descs}</div>
  </div>`;
}

function setNodeMeta(id,key,value){
  const node=GRAPH.nodes.find(item=>item.id===id);
  if(!node||!['display_name','description'].includes(key))return;
  const limit=key==='display_name'?64:500;
  const normalized=String(value||'').trim();
  if(normalized.length>limit){toast(`${key} 最长 ${limit} 个字符`);renderDetail();return}
  markNodeEditorDirty(id);
  if(normalized)node[key]=normalized;else delete node[key];
  renderGraph();selectNode(id);
  toast(key==='display_name'?'节点名称已更新':'节点说明已更新');
}

function setNodeCfg(id, key, val){
  const gn = GRAPH.nodes.find(n => n.id === id);
  if(!gn) return;
  if(!gn.config) gn.config = {};
  const field = ((typeMeta(gn.type).config || {})[key]) || {};
  try{
    if(field.type === 'boolean') val = val === true || val === 'true';
    else if(field.type === 'integer') val = val === '' ? null : parseInt(val, 10);
    else if(field.type === 'number') val = val === '' ? null : Number(val);
    else if(field.type === 'object' || field.type === 'json' || field.type === 'array') val = val.trim() ? JSON.parse(val) : (field.type === 'array' ? [] : (field.type === 'object' ? {} : null));
  }catch(e){ toast(`${key} 不是合法 JSON，未保存`); return; }
  markNodeEditorDirty(id);
  gn.config[key] = val;
  if(key === 'agent') gn.config.version = 'stable';   // 换 agent 后旧版本号无意义
  if(key === 'skill_code') gn.config.version = 'stable';
  if(key === 'model_ref') gn.config.model_version = 'stable';
  if(key === 'target_type'){
    if(gn.type === 'error_boundary'){
      delete gn.config.version;
      const schema = typeMeta(val).config || {};
      gn.config.target_config = Object.fromEntries(Object.entries(schema).filter(([,s])=>s.default !== undefined).map(([k,s])=>[k,structuredClone(s.default)]));
    }else{
      gn.config.version = 'stable';
    }
  }
  const routePolicyChanged = (key === 'failure_strategy' && gn.type === 'error_boundary')
    || (gn.type === 'loop' && (key === 'mode' || key === 'limit_policy'))
    || (gn.type === 'switch' && (key === 'default_route' || key === 'cases'));
  const removedRoutes = routePolicyChanged ? pruneInvalidOutgoingRoutes(gn) : [];
  renderGraph();
  selectNode(id);
  const removedNote = removedRoutes.length
    ? `；已移除不适用于当前策略的 ${removedRoutes.map(route => COND_LABEL[route] || route).join('、')} 分支连线`
    : '';
  toast(`节点 ${id} 配置已更新 · ${key}=${val || '空'}${removedNote}`);
}

function setSwitchCase(id, index, key, raw){
  const node = GRAPH.nodes.find(n => n.id === id); if(!node) return;
  if(!node.config) node.config = {};
  if(!Array.isArray(node.config.cases)) node.config.cases = [];
  if(!node.config.cases[index]) return;
  let value = raw;
  if(key === 'when'){
    try{ value = JSON.parse(raw); }catch(e){ value = raw; }
  }
  markNodeEditorDirty(id);
  node.config.cases[index][key] = value;
  const removedRoutes = key === 'route' ? pruneInvalidOutgoingRoutes(node) : [];
  renderGraph(); selectNode(id);
  if(removedRoutes.length){
    toast(`分支名已更新；已删除旧分支 ${removedRoutes.join('、')} 的连线，请按新分支重新连线`);
  }
}

function addSwitchCase(id){
  const node = GRAPH.nodes.find(n => n.id === id); if(!node) return;
  if(!node.config) node.config = {};
  if(!Array.isArray(node.config.cases)) node.config.cases = [];
  const used = new Set(node.config.cases.map(x => x && x.route));
  let i = node.config.cases.length + 1; while(used.has('case_' + i)) i++;
  markNodeEditorDirty(id);
  node.config.cases.push({when:'value_' + i, route:'case_' + i, label:'匹配 value_' + i});
  renderGraph(); selectNode(id);
}

function delSwitchCase(id, index){
  const node = GRAPH.nodes.find(n => n.id === id);
  if(!node || !node.config || !Array.isArray(node.config.cases)) return;
  markNodeEditorDirty(id);
  node.config.cases.splice(index, 1);
  const removedRoutes = pruneInvalidOutgoingRoutes(node);
  renderGraph(); selectNode(id);
  if(removedRoutes.length){
    toast(`分支已删除；同时移除 ${removedRoutes.join('、')} 的旧连线`);
  }
}

function setBoundaryTargetCfg(id, key, val){
  const gn = GRAPH.nodes.find(n => n.id === id); if(!gn) return;
  if(!gn.config) gn.config = {}; if(!gn.config.target_config) gn.config.target_config = {};
  delete gn.config.version;
  const field = ((typeMeta(gn.config.target_type).config || {})[key]) || {};
  try{
    if(field.type === 'boolean') val = val === true || val === 'true';
    else if(field.type === 'integer') val = val === '' ? null : parseInt(val,10);
    else if(field.type === 'number') val = val === '' ? null : Number(val);
    else if(['object','json','array'].includes(field.type)) val = val.trim() ? JSON.parse(val) : (field.type === 'array' ? [] : {});
  }catch(e){ toast(`${key} 不是合法 JSON，未保存`); return; }
  markNodeEditorDirty(id);
  gn.config.target_config[key] = val;
  if(key === 'model_ref') gn.config.target_config.model_version = 'stable';
  renderGraph(); selectNode(id);
}

function repairErrorBoundaryConfigs(dsl){
  let repaired = 0;
  for(const node of ((dsl && dsl.nodes) || [])){
    if(node.type !== 'error_boundary' || !node.config || typeof node.config !== 'object') continue;
    const cfg = node.config;
    if(!Object.prototype.hasOwnProperty.call(cfg, 'version')) continue;
    const targetSchema = (typeMeta(cfg.target_type).config || {});
    if(targetSchema.version && cfg.version != null){
      if(!cfg.target_config || typeof cfg.target_config !== 'object') cfg.target_config = {};
      if(cfg.target_config.version == null || cfg.target_config.version === ''){
        cfg.target_config.version = cfg.version;
      }
    }
    delete cfg.version;
    repaired += 1;
  }
  return repaired;
}

function setNodeTimeout(id, raw){
  const gn = GRAPH.nodes.find(n => n.id === id);
  const value = Number(raw);
  if(!gn || !Number.isInteger(value) || value < 1 || value > 3600){ toast('节点超时必须是 1-3600 秒整数'); return; }
  markNodeEditorDirty(id);
  gn.timeout = value;
  renderGraph(); selectNode(id); toast(`节点 ${id} 超时已设为 ${value}s`);
}

function setCond(i, cond){
  const e = GRAPH.edges[i];
  if(!e) return;
  const source = GRAPH.nodes.find(node => node.id === e.from);
  const allowed = condsFor(source);
  if(!allowed.includes(cond)){
    toast(`当前策略不允许「${COND_LABEL[cond] || cond}」分支`);
    renderDetail();
    return;
  }
  const duplicate = GRAPH.edges.some((edge, index) => index !== i && edge.from === e.from && edge.condition === cond);
  if(duplicate){ toast('该分支已经连接到其他节点'); renderDetail(); return; }
  e.condition = cond;
  renderGraph(); selectEdge(i); toast('分支条件已改为「' + routeLabel(source, cond) + '」');
}

function setEdgePort(i,key,value){
  const edge=GRAPH.edges[i];
  const allowed=key==='source_port'?['right','bottom']:['left','top'];
  if(!edge||!['source_port','target_port'].includes(key))return;
  if(value&&!allowed.includes(value)){toast('不支持的连接点');renderDetail();return}
  if(value)edge[key]=value;else delete edge[key];
  drawEdges();renderDetail();
}

function delEdge(i){
  GRAPH.edges.splice(i, 1);
  SELECTED_NODE_IDS.clear();
  sel = {kind:null, id:null, idx:-1};
  renderGraph(); renderDetail(); toast('连线已删除');
}

function setNodeType(id, type){
  const gn = GRAPH.nodes.find(n => n.id === id);
  if(!gn) return;
  const previousType = gn.type;
  const next = typeMeta(type);
  if(next.enabled === false || next.creatable === false){ toast('该节点类型已停止新建'); renderDetail(); return; }
  markNodeEditorDirty(id);
  gn.type = type;
  if(gn.timeout == null || gn.timeout === defaultNodeTimeout(previousType)){
    gn.timeout = defaultNodeTimeout(type);
  }
  const config = {};
  Object.entries(next.config || {}).forEach(([key, field]) => {
    if(field.default !== undefined) config[key] = JSON.parse(JSON.stringify(field.default));
    else if(field.required) config[key] = '';
  });
  gn.config = config;
  const routes = condsFor(gn);
  GRAPH.edges.filter(edge => edge.from === id).forEach((edge, index) => {
    if(routes[index]) edge.condition = routes[index];
    else if(!routes.length) delete edge.condition;
  });
  renderGraph();
  selectNode(id);
  toast('节点类型已改为 ' + type);
}

function setEntry(id){
  markNodeEditorDirty(id);
  GRAPH.entry = id;
  $$('.node').forEach(e => e.classList.toggle('entry', e.dataset.id === id));
  renderDetail(); toast('入口节点设为 ' + id);
}

function delNode(id){
  if(GRAPH.nodes.length <= 1){ toast('至少保留一个节点'); return; }
  if(NODE_EDITOR.open&&NODE_EDITOR.nodeId===id){
    if(!confirm(`删除节点 ${id}？相关连线也会一并删除。`))return;
    finishNodeEditor();
  }
  GRAPH.nodes = GRAPH.nodes.filter(n => n.id !== id);
  GRAPH.edges = GRAPH.edges.filter(e => e.from !== id && e.to !== id);
  if(GRAPH.entry === id) GRAPH.entry = GRAPH.nodes[0].id;
  SELECTED_NODE_IDS.delete(id);
  if(SELECTED_NODE_IDS.size){
    const focus=[...SELECTED_NODE_IDS].at(-1);sel={kind:'node',id:focus,idx:-1};
    renderGraph();updateNodeSelectionInspector();
  }else{
    sel = {kind:null, id:null, idx:-1};renderGraph();renderDetail();
  }
  toast('节点已删除');
}

function deleteSelectedNodes(){
  const ids=SELECTED_NODE_IDS.size?[...SELECTED_NODE_IDS]:(sel.kind==='node'?[sel.id]:[]);
  if(!ids.length)return false;
  if(ids.length===1){delNode(ids[0]);return true;}
  if(ids.length>=GRAPH.nodes.length){toast('至少保留一个节点');return false;}
  const selected=new Set(ids);
  if(NODE_EDITOR.open&&selected.has(NODE_EDITOR.nodeId)){
    if(!confirm(`删除选中的 ${ids.length} 个节点？相关连线也会一并删除。`))return false;
    finishNodeEditor();
  }
  GRAPH.nodes=GRAPH.nodes.filter(node=>!selected.has(node.id));
  GRAPH.edges=GRAPH.edges.filter(edge=>!selected.has(edge.from)&&!selected.has(edge.to));
  if(selected.has(GRAPH.entry))GRAPH.entry=GRAPH.nodes[0].id;
  SELECTED_NODE_IDS.clear();sel={kind:null,id:null,idx:-1};
  renderGraph();renderDetail();toast(`已删除 ${ids.length} 个节点及其关联连线`);
  return true;
}

function addNode(){
  const type = $('#palette').value;
  const meta = typeMeta(type);
  if(!type || meta.enabled === false || meta.creatable === false){ toast('请选择可新建的节点类型'); return; }
  const id = nextNodeId(type);
  const k = GRAPH.nodes.length;
  const columns = Math.max(4, Math.floor((CANVAS_SIZE.width - 80) / 180));
  const node = { id, type, x: 40 + (k % columns) * 180, y: 40 + Math.floor(k / columns) * 100, timeout: defaultNodeTimeout(type) };
  const owner = canvasAgentCode();
  if(owner){ node.scope_type = 'agent'; node.owner_agent_code = owner; }
  const config = {};
  Object.entries(meta.config || {}).forEach(([key, field]) => {
    if(field.default !== undefined) config[key] = JSON.parse(JSON.stringify(field.default));
    else if(field.required) config[key] = '';
  });
  if(Object.keys(config).length) node.config = config;
  GRAPH.nodes.push(node);
  renderGraph();
  selectNode(id);
  toast('已添加 ' + id + '，' + (type === 'subgraph'
    ? '在右侧属性面板选一个已发布 Agent 当作节点'
    : '从它右侧圆点拖线接进主链路'));
}

async function validateGraph(){
  if(MODE !== 'live'){ showVbar('warn', ['离线模式不做后端校验（连接后端后可校验）']); return; }
  repairErrorBoundaryConfigs(GRAPH);
  try{
    const b = await apiJSON(`/v1/graphs/${GRAPH.id}/validate`, {
      method:'POST', body: JSON.stringify({ dsl: GRAPH, owner_agent_code:canvasGraphOwner() })
    });
    if(b.ok) showVbar(b.warnings.length ? 'warn' : 'ok', b.warnings.length ? b.warnings : ['校验通过，可以保存并运行']);
    else showVbar('err', b.errors);
  }catch(e){ showVbar('err', ['校验请求失败：' + e.message]); }
}

let GRAPH_SAVE_BUSY=false;

function setGraphSaveBusy(publish,busy){
  GRAPH_SAVE_BUSY=busy;
  const save=$('#saveGraphBtn'),publishButton=$('#publishGraphBtn');
  [save,publishButton].filter(Boolean).forEach(button=>{button.disabled=busy;});
  const active=publish?publishButton:save;
  if(active){
    active.classList.toggle('loading',busy);
    if(busy){active.setAttribute('aria-busy','true');active.textContent=publish?'发布中…':'保存中…';}
    else{active.removeAttribute('aria-busy');active.textContent=publish?'发布版本':'保存草稿';}
  }
  if(!busy)syncAgentPermissionUi();
}

async function saveGraph(publish){
  if(GRAPH_SAVE_BUSY)return;
  if(MODE !== 'live'){ toast('离线模式：图仅保存在浏览器内存'); return; }
  repairErrorBoundaryConfigs(GRAPH);
  setGraphSaveBusy(!!publish,true);
  try{
    const r = await fetch(API + `/v1/graphs/${GRAPH.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ dsl: GRAPH, publish: !!publish, owner_agent_code:canvasGraphOwner() })
    });
    const b = await r.json();
    if(!r.ok){ showVbar('err', b.details || [b.message]); return; }
    GRAPH.version = b.version; GRAPH.status = b.status;
    renderGraph();
    await loadGraphList();
    const action = publish ? '已发布' : (b.draft_reused ? '已更新草稿' : '已创建草稿');
    showVbar('ok', [`${action} ${b.version} · ${b.status}`].concat(b.warnings || []));
  }catch(e){ showVbar('err', ['保存失败：' + e.message]); }
  finally{setGraphSaveBusy(!!publish,false);}
}

/** 另存为新图：PUT 一个不存在的 gid 时后端会直接建图（save_version 里的 ensure_row），
 *  所以"新建图"不需要单独的创建接口。建完只切画布，不动 agent 版本的绑定关系。 */
async function saveGraphAs(){
  if(MODE !== 'live'){ toast('离线模式：图仅保存在浏览器内存，另存为新图需连后端'); return; }
  const def = (GRAPH.id || 'graph') + '_copy';
  const gid = (prompt('另存为新图，输入 graph_id（字母/数字/下划线/连字符）', def) || '').trim();
  if(!gid) return;
  if(!/^[A-Za-z0-9_-]+$/.test(gid)) return toast('graph_id 只能含字母、数字、下划线、连字符');
  if(GRAPHS.some(g => g.graph_id === gid) && !confirm(gid + ' 已存在，继续会在它上面追加一个新版本，确定？')) return;
  try{
    const dsl = Object.assign({}, GRAPH, { id: gid });
    const r = await fetch(API + '/v1/graphs/' + encodeURIComponent(gid), {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ dsl, publish:false, owner_agent_code:canvasGraphOwner() })
    });
    const b = await r.json().catch(() => ({}));
    if(!r.ok){ showVbar('err', b.details || [b.message || ('保存失败 http ' + r.status)]); return; }
    GRAPH = Object.assign({}, dsl, { version:b.version, status:b.status });
    CUR.graphId = gid; saveCur();
    await loadGraphList();
    renderGraph();
    showVbar('ok', [`已另存为 ${gid}@${b.version}（草稿）`].concat(b.warnings || []));
    if(canvasAgentCode() && CUR.boundGraph && CUR.boundGraph !== gid)
      toast('新图已建；' + CUR.code + '@' + CUR.version + ' 仍绑定 ' + CUR.boundGraph
            + '，换绑定要发新版本（下一步再做）');
  }catch(e){ showVbar('err', ['另存失败：' + e.message]); }
}

async function deleteGraph(button){
  if(GRAPH_DELETE_BUSY)return;
  if(MODE!=='live'){toast('离线模式不能删除编排图');return}
  const gid=String(GRAPH.id||'').trim();
  const item=GRAPHS.find(graph=>graph.graph_id===gid);
  if(!gid||!item){toast('当前编排图尚未持久化，不能删除');return}
  if(!graphCan('manage')){toast('没有编排图开发权限');return}
  const agents=item.agents||[];
  const referenceNote=agents.length?`\n当前列表显示关联 Agent：${agents.join('、')}，后端将再次检查所有版本引用。`:'';
  if(!confirm(`将物理删除编排图“${gid}”及其全部版本，且无法恢复。确认继续？${referenceNote}`))return;
  let confirmPublished=false;
  if(item.published){
    const typed=prompt(`该编排图包含已发布版本 ${item.published}。请输入完整 graph_id 以确认删除：`, '');
    if(typed===null)return;
    if(typed.trim()!==gid){toast('graph_id 不匹配，已取消删除');return}
    confirmPublished=true;
  }
  const original=button&&button.textContent;
  GRAPH_DELETE_BUSY=true;syncGraphDeleteAvailability();
  if(button){button.classList.add('loading');button.setAttribute('aria-busy','true');button.textContent='删除中…'}
  try{
    const suffix=confirmPublished?'?confirm_published=true':'';
    let r=await apiRaw('/v1/graphs/'+encodeURIComponent(gid)+suffix,{method:'DELETE'});
    if(!r.ok&&r.body.code==='GRAPH_DELETE_CONFIRM_REQUIRED'&&!confirmPublished){
      const typed=prompt(`后端检测到已发布版本。请输入完整 graph_id“${gid}”以确认删除：`, '');
      if(typed===null||typed.trim()!==gid){toast('graph_id 不匹配，已取消删除');return}
      confirmPublished=true;
      r=await apiRaw('/v1/graphs/'+encodeURIComponent(gid)+'?confirm_published=true',{method:'DELETE'});
    }
    if(!r.ok){
      showVbar('err',[r.body.message||'编排图删除失败'].concat(r.body.details||[]));return;
    }
    await loadGraphList();
    const next=graphsForCanvasScope(false)[0];
    if(next){
      await pickGraph(next.graph_id);
    }else{
      CUR.graphId='default';saveCur();GRAPH=defaultGraph();renderGraph();renderGraphSel();
    }
    showVbar('ok',[`已物理删除 ${gid} 及 ${r.body.versions_deleted||0} 个版本`]);
  }catch(e){showVbar('err',['删除失败：'+e.message])}
  finally{
    GRAPH_DELETE_BUSY=false;
    if(button&&button.isConnected){button.classList.remove('loading');button.removeAttribute('aria-busy');button.textContent=original}
    syncGraphDeleteAvailability();
  }
}

let VBAR_HIDE_TIMER=null,VBAR_NOTICE_ID=0;

function showVbar(kind, lines){
  const el = $('#vbar');
  if(!el) return;
  if(VBAR_HIDE_TIMER){clearTimeout(VBAR_HIDE_TIMER);VBAR_HIDE_TIMER=null;}
  const noticeId=++VBAR_NOTICE_ID;
  if(!lines || !lines.length){ el.innerHTML = ''; return; }
  el.dataset.noticeId=String(noticeId);
  el.innerHTML = `<div class="vbar ${kind}"><b>${kind === 'ok' ? '通过' : (kind === 'warn' ? '告警' : '校验失败')}</b>
    <div style="flex:1">${lines.map(l => `<div>${esc(l)}</div>`).join('')}</div></div>`;
  if(kind==='ok')VBAR_HIDE_TIMER=setTimeout(()=>{
    if(el.dataset.noticeId===String(noticeId))el.innerHTML='';
    VBAR_HIDE_TIMER=null;
  },3000);
}

/* ============ 运行 ============ */
const TYPE_TIMING = {
  start:{ms:50,tok:0}, llm:{ms:1200,tok:1000}, transform:{ms:20,tok:0},
  condition:{ms:20,tok:0}, switch:{ms:20,tok:0}, end:{ms:50,tok:0}, skill:{ms:500,tok:0},
  subgraph:{ms:800,tok:0}, human:{ms:0,tok:0}, knowledge_retrieval:{ms:250,tok:0},
  parallel:{ms:10,tok:0}, join:{ms:10,tok:0}, foreach:{ms:500,tok:0},
  delay:{ms:1000,tok:0}, event_wait:{ms:0,tok:0}
};
let running = false;

function logLine(node, msg, cls=''){
  const el = $('#log');
  const d = document.createElement('div');
  const t = new Date();
  const ts = t.toTimeString().slice(0,8);
  const sub = String(node).startsWith('↳');
  d.innerHTML = `<span class="t">${ts}</span><span class="n${sub ? ' sub' : ''}">${esc(node)}</span><span class="${cls}">${esc(msg)}</span>`;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
  $('#logCount').textContent = el.children.length;
}

function runtimeErrorDetails(error){
  const raw = error && (error.detail !== undefined ? error.detail : error.details);
  if(raw === undefined || raw === null || raw === '') return [];
  if(Array.isArray(raw)) return raw.flatMap(item => runtimeErrorDetails({detail:item}));
  if(typeof raw === 'object'){
    try{ return [JSON.stringify(raw)]; }catch(_){ return [String(raw)]; }
  }
  return [String(raw)];
}

function normalizeRuntimeError(error, fallbackCode='RUN_FAILED'){
  error = error || {};
  return {
    code: error.error_code || error.code || fallbackCode,
    message: error.message || '',
    detail: runtimeErrorDetails(error),
    retryable: !!error.retryable,
    node: error.node ? String(error.node) : '',
  };
}

function runtimeErrorText(error){
  const e = normalizeRuntimeError(error);
  const parts = [e.code];
  if(e.message) parts.push(e.message);
  if(e.detail.length) parts.push(e.detail.join('；'));
  if(e.retryable) parts.push('可重试');
  return parts.join(' · ');
}

function runtimeErrorHtml(error, title='运行失败'){
  const e = normalizeRuntimeError(error);
  const heading = e.node ? `${title} · 节点 ${e.node}` : title;
  const message = e.message ? ` · ${esc(e.message)}` : '';
  const details = e.detail.map(item => `<div class="trace-error-detail">${esc(item)}</div>`).join('');
  return `<div class="trace-error"><div class="trace-error-title">${esc(heading)}</div><div>${esc(e.code)}${message}${e.retryable ? ' · 可重试' : ''}</div>${details}</div>`;
}

function setState(id, st, ms, tok){
  const n = nodes[id]; if(!n) return;
  n._state = st;
  n.el.dataset.state = st;
  const msEl = n.el.querySelector('.nm-ms'), tokEl = n.el.querySelector('.nm-tok');
  if(ms!=null){ n._ms = ms; if(msEl) msEl.textContent = ms+'ms'; }
  if(tok!=null){ n._tok = tok; if(tokEl) tokEl.textContent = fmt(tok)+' tok'; }
  drawEdges();
}

function resetRun(){
  Object.keys(nodes).forEach(id=>{
    const n = nodes[id];
    setState(id,'idle'); n._ms=null; n._tok=null;
    const msEl = n.el.querySelector('.nm-ms'), tokEl = n.el.querySelector('.nm-tok');
    if(msEl) msEl.textContent='—';
    if(tokEl) tokEl.textContent='';
  });
  $('#log').innerHTML=''; $('#logCount').textContent='0';
  $('#kProg').textContent='0 节点'; $('#kTok').textContent='0'; $('#kMs').textContent='0 ms'; $('#kCost').textContent='¥0.000';
  if($('#kProgHead'))$('#kProgHead').textContent='0 节点';
  if($('#kTokHead'))$('#kTokHead').textContent='0';
  if($('#kMsHead'))$('#kMsHead').textContent='0 ms';
  $('#runState').textContent='idle'; $('#runState').className='badge run';
  $('#sse').textContent='// 等待运行…';
  if($('#approveSec')) $('#approveSec').style.display = 'none';
  if($('#apNote')) $('#apNote').value = '';
  if($('#gNodeCount')) $('#gNodeCount').textContent = GRAPH.nodes.length;
  if($('#gEdgeCount')) $('#gEdgeCount').textContent = GRAPH.edges.length;
}

async function runGraph(){
  if(running){ toast('已有编排正在运行，请等待当前运行结束'); return; }
  if(!canvasAgentCode()){ toast('未绑定编排图缺少 Agent 契约，绑定 Agent 后才能运行'); return; }
  if(!canvasCanRun()){ toast('没有当前 Agent 的运行权限或可用版本'); return; }
  if(MODE !== 'live'){
    toast('后端不可用，无法执行真实 Agent');
    return;
  }
  setRunButtonsBusy(true, '校验中…');
  const checked = await checkedRunInput(false);
  if(!checked.ok){
    setRunButtonsBusy(false);
    openRunInput();
    renderRunInputValidation(checked);
    return;
  }
  return runGraphLive(checked.input);
}

/* ============ 真实运行（可中断 · 可续跑） ============ */
let LIVE = null;

function liveReset(){
  return { runId:null, traceId:null, evCount:0, pending:null, eventPending:null, timerPending:null, runStatus:'running',
           totalTok:0, costSum:0, cursor:0, doneCnt:0, spans:[], sseLines:[],
           retry:0, error:null, nodeErrors:[], nodeIO:{}, modelCalls:{}, waitWatchTimer:null,
           waitWatchBusy:false, t0: performance.now() };
}

function liveEvent(ev){
  const L = LIVE; if(!L) return;
  if(!L.runId && ev.run_id){ L.runId = ev.run_id; L.traceId = ev.trace_id; }
  const nid = (name) => NODE_MAP[name] || name;
  // 子图事件的服务端命名是 "<父节点>.<子节点>"（见 nodes/subgraph.py 的 _emit），
  // 父节点上要显示"执行中"，子节点事件只记日志与 span，不能当父节点完成。
  const rawNode = String(ev.node || '');
  const isSub = rawNode.includes('.');
  const parentId = isSub ? rawNode.split('.')[0] : nid(rawNode);
  const tag = isSub ? '↳ ' + rawNode : rawNode;

  if(ev.type === 'node_input' || ev.type === 'node_output'){
    captureNodeRuntime(L, ev);
    if(sel.kind === 'node' && sel.id === nodeRuntimeKey(rawNode)) renderDetail();
  }
  if(['model_request','model_response','model_validation'].includes(ev.type)){
    captureModelRuntime(L,ev);
    if(sel.kind === 'node' && sel.id === nodeRuntimeKey(rawNode)) renderDetail();
  }

  if(ev.type === 'node_start'){
    L.sseLines.push(`id: ${L.sseLines.length+1}  event: node_start  data: {"node":"${rawNode}"}`);
    if(ev.retry) L.retry = Math.max(L.retry || 0, ev.retry);
    if(nodes[parentId]) setState(parentId, 'running');
    logLine(tag, 'start', isSub ? 'sub' : '');
  } else if(ev.type === 'node_end'){
    const ms = ev.latency_ms || 0, tok = ev.tokens || 0;
    L.sseLines.push(`id: ${L.sseLines.length+1}  event: node_end    data: ${JSON.stringify(ev)}`);
    if(isSub){
      // 子节点耗时/token 不计入父游标：父节点自己的 node_end 是聚合口径，相加会双计
      L.spans.push({ id: rawNode, start: L.cursor, dur: ms, tok, kind: 'agent', sub: true,
                     error: ev.status === 'error' });
      if(ev.status === 'error'){
        const error = normalizeRuntimeError(ev, 'NODE_ERROR');
        L.nodeErrors.push(error);
        logLine(tag, runtimeErrorText(error), 'err');
      }
      else logLine(tag, `done · ${fmt(tok)} tokens · ${ms}ms`, 'ok');
    } else if(ev.status === 'error'){
      if(nodes[parentId]) setState(parentId, 'error', ms, tok);
      const error = normalizeRuntimeError(ev, 'NODE_ERROR');
      L.nodeErrors.push(error);
      L.spans.push({ id: parentId || rawNode, start: L.cursor, dur: ms, tok, kind: kindOf(parentId), error:true });
      logLine(tag, runtimeErrorText(error), 'err');
    } else {
      if(nodes[parentId]){ setState(parentId, 'done', ms, tok); L.doneCnt++; }
      L.totalTok += tok; L.cursor += ms; L.costSum += (ev.cost_usd || 0);
      logLine(tag, `done · ${fmt(tok)} tokens · ${ms}ms`, 'ok');
      if(nodes[parentId]) L.spans.push({ id: parentId, start: L.cursor - ms, dur: ms, tok, kind: kindOf(parentId) });
    }
  } else if(ev.type === 'subgraph_done'){
    logLine(tag, `子 Agent ${ev.agent}@${ev.version} → ${ev.output_path || ev.output_key || 'variables.subgraph_output'} · 契约 ${String(ev.contract_hash || '').slice(0, 8)}`, 'ok');
  } else if(ev.type === 'interrupt_request'){
    L.pending = ev.payload || {};
    const humanNode = parentId || nid(L.pending.node || '');
    if(nodes[humanNode]) setState(humanNode, 'wait');
    logLine(humanNode || 'human', 'interrupt · 图已挂起，等待人工确认', 'warn');
  } else if(ev.type === 'event_waiting'){
    L.eventPending = ev;
    if(nodes[parentId]) setState(parentId, 'wait');
    logLine(tag, `等待事件 · ${ev.event_name || ''}`, 'warn');
  } else if(ev.type === 'timer_waiting'){
    L.timerPending = ev;
    if(nodes[parentId]) setState(parentId, 'wait');
    logLine(tag, `定时等待 · ${ev.seconds || 0}s`, 'warn');
  } else if(ev.type === 'run_paused'){
    L.runStatus = ev.status || 'waiting_human';
    if(L.runStatus === 'waiting_human'){
      L.pending = ev.payload || L.pending || {};
      L.eventPending = null; L.timerPending = null;
      const humanNode = nid(ev.node || L.pending.node || '');
      if(nodes[humanNode]) setState(humanNode, 'wait');
    } else if(L.runStatus === 'waiting_event'){
      L.pending = null; L.timerPending = null;
      L.eventPending = ev.payload || L.eventPending || {};
    } else if(L.runStatus === 'waiting_timer'){
      L.pending = null; L.eventPending = null;
      L.timerPending = ev.payload || L.timerPending || {};
    }
    if(['waiting_human','waiting_event','waiting_timer'].includes(L.runStatus)){
      $('#cancelWaitBtn').style.display = '';
      openRuntimeInspector('run');
    }
    L.sseLines.push(`id: ${L.sseLines.length+1}  event: run_paused    data: {"status":"${L.runStatus}","node":"${ev.node}"}`);
  } else if(ev.type === 'human_resume'){
    logLine(parentId || 'human', '审批提交 · ' + ev.action, 'ok');
  } else if(ev.type === 'human_decision'){
    const humanNode = parentId || nid((L.pending || {}).node || '');
    if(nodes[humanNode] && nodes[humanNode]._state !== 'done'){
      setState(humanNode, 'done'); L.doneCnt++;
    }
    L.pending = null;
    if($('#approveSec')) $('#approveSec').style.display = 'none';
    logLine(humanNode || 'human', `decision · ${ev.action}${ev.note ? ' · ' + ev.note : ''}`, 'ok');
  } else if(ev.type === 'run_end'){
    L.runStatus = ev.status || 'succeeded';
    L.pending = null; L.eventPending = null; L.timerPending = null;
    if($('#cancelWaitBtn')) $('#cancelWaitBtn').style.display = 'none';
    L.sseLines.push(`id: ${L.sseLines.length+1}  event: run_end      data: ${JSON.stringify(ev)}`);
    if(ev.error_code){
      L.error = normalizeRuntimeError(ev);
      logLine('system', 'run_end · ' + runtimeErrorText(L.error), 'err');
    }
  }

  const L2 = LIVE;
  $('#kProg').textContent = L2.doneCnt + ' 节点';
  $('#kTok').textContent = fmt(L2.totalTok);
  $('#kMs').textContent = Math.round(performance.now() - L2.t0) + ' ms';
  $('#kCost').textContent = '¥' + (L2.costSum * 7.2).toFixed(3);
  if($('#kProgHead'))$('#kProgHead').textContent = $('#kProg').textContent;
  if($('#kTokHead'))$('#kTokHead').textContent = $('#kTok').textContent;
  if($('#kMsHead'))$('#kMsHead').textContent = $('#kMs').textContent;
}

async function pumpSSE(resp){
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while(true){
    const { done, value } = await reader.read();
    if(done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while((i = buf.indexOf('\n\n')) >= 0){
      const frame = buf.slice(0, i); buf = buf.slice(i + 2);
      let data = null;
      frame.split('\n').forEach(line => {
        if(line.startsWith('data:')) data = line.slice(5).trim();
      });
      if(!data) continue;
      let ev; try{ ev = JSON.parse(data); }catch(_){ continue; }
      if(LIVE) LIVE.evCount++;
      liveEvent(ev);
    }
  }
}

function afterPump(){
  const L = LIVE;
  if(L.pending){                       // 停在 interrupt：弹审批卡，等人工
    showApprove(L.pending);
    $('#runState').textContent = 'waiting_human';
    $('#runState').className = 'badge wait';
    const humanNode = NODE_MAP[L.pending.node] || L.pending.node;
    if(nodes[humanNode]) setState(humanNode, 'wait');
    finalizeLive();
    scheduleLiveWaitWatch();
    toast('已停在人工审批 · 状态已写入 checkpointer');
    return;
  }
  if(L.eventPending){
    openRuntimeInspector('run');
    $('#runState').textContent = 'waiting_event';
    $('#runState').className = 'badge wait';
    toast(`正在等待外部事件：${L.eventPending.event_name || '未命名事件'}`);
    finalizeLive();
    scheduleLiveWaitWatch();
    return;
  }
  if(L.timerPending){
    openRuntimeInspector('run');
    $('#runState').textContent = 'waiting_timer';
    $('#runState').className = 'badge wait';
    $('#cancelWaitBtn').style.display = '';
    toast('定时等待已持久化，Worker 到期后自动恢复');
    finalizeLive();
    scheduleLiveWaitWatch();
    return;
  }
  if(['running','queued'].includes(L.runStatus)){
    finalizeLive();
    scheduleLiveWaitWatch(1000);
    return;
  }
  finalizeLive();
}

function stopLiveWaitWatch(){
  const L=LIVE;if(!L)return;
  if(L.waitWatchTimer)clearTimeout(L.waitWatchTimer);
  L.waitWatchTimer=null;L.waitWatchBusy=false;
}

function scheduleLiveWaitWatch(delay=1000){
  const L=LIVE;if(!L||!L.runId||L.waitWatchTimer)return;
  L.waitWatchTimer=setTimeout(()=>pollLiveWait(L),Math.max(250,delay));
}

async function pollLiveWait(expected){
  const L=LIVE;
  if(!L||L!==expected||!L.runId||L.waitWatchBusy)return;
  L.waitWatchTimer=null;L.waitWatchBusy=true;
  try{
    const state=await apiRaw(`/v1/runs/${L.runId}`);
    if(!state.ok){scheduleLiveWaitWatch(3000);return;}
    const status=String((state.body||{}).status||'');
    if(['waiting_human','waiting_event','waiting_timer','queued'].includes(status)){
      if(status!==L.runStatus){
        L.runStatus=status;
        const badge=statusBadge(status);
        $('#runState').textContent=badge.label;$('#runState').className='badge '+badge.cls;
      }
      scheduleLiveWaitWatch(status==='waiting_timer'?1000:3000);
      return;
    }
    L.pending=null;L.eventPending=null;L.timerPending=null;
    if($('#approveSec'))$('#approveSec').style.display='none';
    if($('#cancelWaitBtn'))$('#cancelWaitBtn').style.display='none';
    const resp=await fetch(API+`/v1/runs/${L.runId}/events?start=${L.evCount}`);
    if(resp.ok&&resp.body)await pumpSSE(resp);
    if(!L.error&&state.body&&state.body.error)L.error=normalizeRuntimeError(state.body.error);
    L.runStatus=status||L.runStatus;
    afterPump();
  }catch(_){
    scheduleLiveWaitWatch(3000);
  }finally{
    if(LIVE===L)L.waitWatchBusy=false;
  }
}

function finalizeLive(){
  const L = LIVE;
  const run = {
    id: L.runId || ('r_' + Math.random().toString(36).slice(2, 8).toUpperCase()),
    agent: canvasAgentCode() || GRAPH.id, version: CUR.version || 'local', graph_id: GRAPH.id, graph_version: GRAPH.version,
    time: new Date().toTimeString().slice(0, 8),
    total: L.cursor, tokens: L.totalTok, status: L.runStatus, spans: L.spans,
    trace: L.traceId || '', retry: L.retry || 0, error: L.error || null,
    nodeErrors: L.nodeErrors || [],
    nodeIO: structuredClone(L.nodeIO || {}),
    modelCalls: structuredClone(L.modelCalls || {}),
    sse: L.sseLines.slice()
  };
  const existing=RUNS.findIndex(item=>item.id===run.id);
  if(existing>=0)RUNS.splice(existing,1,run);else RUNS.unshift(run);
  renderRunList();
  renderTrace(run.id);
  setTopTrace(run);
  const sb = statusBadge(L.runStatus);
  $('#runState').textContent = sb.label;
  $('#runState').className = 'badge ' + sb.cls;
  $('#sse').textContent = L.sseLines.join('\n');
  toast(`编排执行结束 · ${L.cursor}ms · ${fmt(L.totalTok)} tokens`);
  refreshSummary();
  if($('#view-obs').classList.contains('active')) loadObs();
  // Worker 滚动升级期间，旧事件可能只有 error_code；run 快照仍有完整字段级详情。
  // 主动补一次，避免追踪页只能显示通用错误。
  hydrateRunDiagnostics(run.id);
}

function showApprove(p){
  openRuntimeInspector('run');
  $('#apQ').textContent = p.question || '等待人工确认';
  $('#apConf').textContent = (p.confidence != null) ? Number(p.confidence).toFixed(2) : '—';
  $('#apReasons').textContent = (p.qa_reasons && p.qa_reasons.length) ? p.qa_reasons.join('；') : '—';
  $('#approveSec').style.display = '';
  $('#cancelWaitBtn').style.display = '';
  $('#apNote').value = '';
  const form = $('#apForm'), schema = p.form_schema || {}, props = schema.properties || {};
  form.innerHTML = Object.entries(props).map(([key,s]) => `<div class="fld"><label>${esc(fieldDisplayName(key,s.title))} ${(schema.required||[]).includes(key)?'<b>*</b>':''}</label><input class="inp ap-data" data-key="${attr(key)}" data-type="${attr(s.type || 'string')}" type="${['number','integer'].includes(s.type)?'number':(s.type==='boolean'?'checkbox':'text')}"></div>`).join('');
}

function approvalFormData(){
  const out = {};
  document.querySelectorAll('#apForm .ap-data').forEach(el => {
    if(el.type !== 'checkbox' && el.value === '') return;
    let value = el.type === 'checkbox' ? el.checked : el.value;
    if(el.dataset.type === 'integer') value = Number.parseInt(value,10);
    if(el.dataset.type === 'number') value = Number(value);
    out[el.dataset.key] = value;
  });
  return out;
}

async function approveRun(action){
  const L = LIVE;
  if(!L || !L.runId) return;
  const note = (($('#apNote') || {}).value || '').trim();
  $('#approveSec').style.display = 'none';
  L.pending = null;
  $('#runState').textContent = 'running'; $('#runState').className = 'badge run';
  logLine('human', action === 'approve' ? '人工通过 · 继续执行' : '人工驳回 · 退回重做', 'ok');
  try{
    const r = await fetch(API + `/v1/runs/${L.runId}/resume`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note, by: 'console', data: approvalFormData() })
    });
    if(!r.ok){ const e = await r.json(); throw new Error(e.code || ('http ' + r.status)); }
    const resp = await fetch(API + `/v1/runs/${L.runId}/events?start=${L.evCount}`);
    if(resp.ok && resp.body) await pumpSSE(resp);
    afterPump();
  }catch(err){
    logLine('system', '审批提交失败 · ' + err.message, 'err');
    toast('审批提交失败：' + err.message);
    if(nodes.human) setState('human', 'error');
  }
}

async function cancelLiveWait(){
  const L = LIVE; if(!L || !L.runId) return;
  const r = await apiRaw(`/v1/runs/${L.runId}/cancel-wait`, {method:'POST', body:JSON.stringify({reason:'控制台取消'})});
  if(!r.ok){ toast(r.body.message || '取消失败'); return; }
  $('#approveSec').style.display = 'none'; $('#cancelWaitBtn').style.display = 'none';
  L.pending = null; L.eventPending = null; L.timerPending = null;
  toast('等待已取消，流程正在恢复');
  const resp = await fetch(API + `/v1/runs/${L.runId}/events?start=${L.evCount}`);
  if(resp.ok && resp.body) await pumpSSE(resp);
  afterPump();
}

/** 按 agent 版本的 input_schema 造一份能过契约校验的最小入参。
 *  以前写死 {asin,market,window_days}，换 agent 必然 422 —— 多 agent 切换等于不可用。 */
function sampleValue(sch, key){
  key = (key || '').toLowerCase();
  if(!sch || typeof sch !== 'object') return 'demo';
  if(Array.isArray(sch.enum) && sch.enum.length) return sch.enum[0];
  switch(sch.type){
    case 'object':  return sampleInput(sch);
    case 'array':   return [sampleValue(sch.items, key)];
    case 'boolean': return true;
    case 'number':
    case 'integer': {
      const lo = sch.minimum != null ? sch.minimum : 1;
      const hi = sch.maximum != null ? sch.maximum : lo + 6;
      return Math.min(Math.max(lo, Math.round((lo + hi) / 2)), hi);
    }
    default: {
      // 字段名比 schema 更能说明该填什么：ASIN / SKU / 日期这些 schema 里常常只写 type:string
      if(/asin|sku|msku/.test(key)) return 'B0CXXXXXX';
      if(key === 'ip' || key.endsWith('_ip')) return '192.0.2.1';
      if(/date/.test(key) || sch.format === 'date'){
        const d = new Date(); const off = key.includes('from') ? -7 : 0;
        d.setDate(d.getDate() + off);
        return d.toISOString().slice(0, 10);
      }
      if(sch.pattern && /B0/.test(sch.pattern)) return 'B0CXXXXXX';
      return 'demo';
    }
  }
}
function sampleInput(schema){
  if(!schema || schema.type !== 'object' || !schema.properties) return null;
  const keys = schema.required && schema.required.length ? schema.required : Object.keys(schema.properties);
  const out = {};
  for(const k of keys) out[k] = sampleValue(schema.properties[k], k);
  return out;
}

const RUN_CASES_KEY = 'sanitized_agent_console.run_cases.v1';
const RUN_INPUT_STATE_KEY = 'sanitized_agent_console.run_input_state.v1';
const RUN_CASE_MEMORY = {};
const RUN_INPUT_STATE_MEMORY = {};
let RUN_INPUT = {scope:'', text:'', caseId:''};

// 测试用例属于 Agent，而不是某个不可变版本。切换版本后继续复用，运行前再按
// 当前版本的 input_schema 校验；这样升级契约时既不丢样例，也不会绕过新契约。
function runInputScope(){ const code=canvasAgentCode(); return code ? `agent:${code}` : ''; }

function generatedRunInput(){
  const live = LIVE_CONTRACTS[canvasAgentCode()];
  const s = live && live.input_schema;
  return sampleInput(s) || { asin:'B0CXXXXXX', market:'US', window_days:7 };
}

function readRunCaseStore(){
  try{
    const value = JSON.parse(localStorage.getItem(RUN_CASES_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  }catch(e){ return RUN_CASE_MEMORY; }
}

function writeRunCaseStore(value){
  const snapshot = JSON.parse(JSON.stringify(value || {}));
  Object.keys(RUN_CASE_MEMORY).forEach(key => delete RUN_CASE_MEMORY[key]);
  Object.assign(RUN_CASE_MEMORY, snapshot);
  try{ localStorage.setItem(RUN_CASES_KEY, JSON.stringify(snapshot)); }catch(e){ /* file:// / 隐私模式回落内存 */ }
}

function readRunInputStateStore(){
  try{
    const value = JSON.parse(localStorage.getItem(RUN_INPUT_STATE_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  }catch(e){ return RUN_INPUT_STATE_MEMORY; }
}

function writeRunInputStateStore(value){
  const snapshot = JSON.parse(JSON.stringify(value || {}));
  Object.keys(RUN_INPUT_STATE_MEMORY).forEach(key => delete RUN_INPUT_STATE_MEMORY[key]);
  Object.assign(RUN_INPUT_STATE_MEMORY, snapshot);
  try{ localStorage.setItem(RUN_INPUT_STATE_KEY, JSON.stringify(snapshot)); }catch(e){ /* 回落内存 */ }
}

function persistRunInput(){
  const scope = RUN_INPUT.scope || runInputScope();
  if(!scope || !RUN_INPUT.text) return;
  const store = readRunInputStateStore();
  store[scope] = {caseId:RUN_INPUT.caseId || '', text:RUN_INPUT.text, updated_at:Date.now()};
  writeRunInputStateStore(store);
}

function scopedRunCases(){
  const store = readRunCaseStore(), scope = runInputScope();
  if(!scope) return [];
  const code = canvasAgentCode() || '', legacyPrefix = code + '@';
  const rows = Array.isArray(store[scope]) ? [...store[scope]] : [];
  const byId = new Map(rows.map(item => [item.id, item]));
  let migrated = false;
  Object.keys(store).filter(key => key.startsWith(legacyPrefix)).forEach(key => {
    const version = key.slice(legacyPrefix.length);
    (Array.isArray(store[key]) ? store[key] : []).forEach(item => {
      if(!byId.has(item.id)) byId.set(item.id, {...item, saved_from_version:item.saved_from_version || version});
    });
    delete store[key]; migrated = true;
  });
  const merged = [...byId.values()];
  if(migrated || !Array.isArray(store[scope])){
    store[scope] = merged; writeRunCaseStore(store);
  }
  return merged;
}

function ensureRunInput(force=false){
  const scope = runInputScope();
  if(force || RUN_INPUT.scope !== scope || !RUN_INPUT.text){
    const saved = !force && scope ? readRunInputStateStore()[scope] : null;
    const recent = !force && !saved
      ? scopedRunCases().sort((a,b) => (b.updated_at || 0) - (a.updated_at || 0))[0]
      : null;
    RUN_INPUT = saved && typeof saved.text === 'string' && saved.text
      ? {scope, caseId:saved.caseId || '', text:saved.text}
      : recent && recent.input && typeof recent.input === 'object'
        ? {scope, caseId:recent.id, text:JSON.stringify(recent.input, null, 2)}
      : {scope, caseId:'', text:JSON.stringify(generatedRunInput(), null, 2)};
    persistRunInput();
  }
  return RUN_INPUT;
}

function renderRunCaseOptions(){
  const sel = $('#runCaseSel'); if(!sel) return;
  const rows = scopedRunCases();
  sel.innerHTML = '<option value="">未保存的运行参数</option>'
    + rows.map(item => `<option value="${attr(item.id)}">${esc(item.name)}</option>`).join('');
  sel.value = rows.some(item => item.id === RUN_INPUT.caseId) ? RUN_INPUT.caseId : '';
  $('#deleteRunCaseBtn').disabled = !sel.value;
}

function openRunInput(){
  if(!canvasAgentCode() || !CUR.version){ toast('请先选择已绑定 Agent 的编排图和可用版本'); return; }
  ensureRunInput();
  $('#runInputMeta').textContent = `${canvasAgentCode()}@${CUR.version} · input_schema`;
  renderRunCaseOptions();
  const selected = scopedRunCases().find(item => item.id === RUN_INPUT.caseId);
  $('#runCaseName').value = selected ? selected.name : '';
  $('#runInputEditor').value = RUN_INPUT.text;
  $('#runInputStatus').innerHTML = '';
  $('#runInputMask').classList.add('on');
}

function closeRunInput(){ $('#runInputMask').classList.remove('on'); }

function runInputEdited(value){
  ensureRunInput(); RUN_INPUT.text = value; persistRunInput();
  $('#runInputStatus').innerHTML = '';
}

function newRunCase(){
  ensureRunInput(true);
  persistRunInput();
  $('#runCaseName').value = '';
  $('#runInputEditor').value = RUN_INPUT.text;
  renderRunCaseOptions();
  $('#runInputStatus').innerHTML = '';
}

function selectRunCase(id){
  ensureRunInput();
  const selected = scopedRunCases().find(item => item.id === id);
  if(!selected){ newRunCase(); return; }
  RUN_INPUT.caseId = selected.id;
  RUN_INPUT.text = JSON.stringify(selected.input, null, 2);
  persistRunInput();
  $('#runCaseName').value = selected.name;
  $('#runInputEditor').value = RUN_INPUT.text;
  $('#deleteRunCaseBtn').disabled = false;
  $('#runInputStatus').innerHTML = '';
}

function parseRunInput(){
  ensureRunInput();
  try{
    const input = JSON.parse(RUN_INPUT.text);
    if(!input || typeof input !== 'object' || Array.isArray(input)){
      return {ok:false, code:'INPUT_JSON_INVALID', message:'运行输入必须是 JSON object', details:[]};
    }
    return {ok:true, input, details:[]};
  }catch(e){
    return {ok:false, code:'INPUT_JSON_INVALID', message:'运行输入不是合法 JSON', details:[e.message]};
  }
}

function renderRunInputValidation(result){
  const el = $('#runInputStatus'); if(!el) return;
  const ok = !!result.ok;
  const details = Array.isArray(result.details) ? result.details : [];
  const title = ok ? '输入符合当前 Agent 契约' : `${result.code || 'INPUT_INVALID'} · ${result.message || '输入校验失败'}`;
  el.innerHTML = `<div class="vbar ${ok ? 'ok' : 'err'}"><b>${ok ? '校验通过' : '校验失败'}</b><div style="flex:1"><div>${esc(title)}</div>${details.map(item => `<div>${esc(item)}</div>`).join('')}</div></div>`;
}

async function validateRunInput(show=true){
  const parsed = parseRunInput();
  if(!parsed.ok){ if(show) renderRunInputValidation(parsed); return parsed; }
  const result = await apiRaw(`/v1/agents/${encodeURIComponent(canvasAgentCode())}/versions/${encodeURIComponent(CUR.version)}/validate-input`, {
    method:'POST', body:JSON.stringify({input:parsed.input})
  });
  const checked = result.ok
    ? {ok:true, input:parsed.input, details:[], version:result.body.version}
    : {ok:false, input:parsed.input, code:result.body.code || 'INPUT_VALIDATE_FAILED',
       message:result.body.message || '输入校验失败', details:result.body.details || []};
  if(show) renderRunInputValidation(checked);
  return checked;
}

function saveRunCase(){
  const parsed = parseRunInput();
  if(!parsed.ok){ renderRunInputValidation(parsed); return; }
  const name = $('#runCaseName').value.trim();
  if(!name){ renderRunInputValidation({ok:false, code:'CASE_NAME_REQUIRED', message:'请填写测试用例名称', details:[]}); return; }
  const store = readRunCaseStore(), scope = runInputScope();
  const rows = Array.isArray(store[scope]) ? store[scope] : [];
  const id = RUN_INPUT.caseId || `case_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const saved = {id, name, input:parsed.input, saved_from_version:CUR.version, updated_at:Date.now()};
  const index = rows.findIndex(item => item.id === id);
  if(index >= 0) rows[index] = saved; else rows.push(saved);
  store[scope] = rows; writeRunCaseStore(store);
  RUN_INPUT.caseId = id; RUN_INPUT.text = JSON.stringify(parsed.input, null, 2);
  persistRunInput();
  renderRunCaseOptions(); $('#runCaseName').value = name;
  renderRunInputValidation({ok:true, details:[]});
  toast(`测试用例“${name}”已保存`);
}

function deleteRunCase(){
  if(!RUN_INPUT.caseId) return;
  const current = scopedRunCases().find(item => item.id === RUN_INPUT.caseId);
  if(!current || !confirm(`删除测试用例“${current.name}”？`)) return;
  const store = readRunCaseStore(), scope = runInputScope();
  store[scope] = scopedRunCases().filter(item => item.id !== RUN_INPUT.caseId);
  writeRunCaseStore(store); newRunCase(); toast('测试用例已删除');
}

function resetRunInputSample(){
  ensureRunInput(true);
  persistRunInput();
  $('#runInputEditor').value = RUN_INPUT.text;
  $('#runCaseName').value = '';
  renderRunCaseOptions(); $('#runInputStatus').innerHTML = '';
}

function setRunButtonsBusy(busy, label='运行中…'){
  const run = $('#runBtn'), panel = $('#runFromInputBtn');
  if(run){ run.disabled = !!busy || !canvasCanRun(); run.textContent = busy ? label : '运行'; }
  if(panel){ panel.disabled = !!busy || !canvasCanRun(); panel.textContent = busy ? label : '运行编排'; }
}

async function checkedRunInput(show=true){
  try{ return await validateRunInput(show); }
  catch(e){
    const result = {ok:false, code:'INPUT_VALIDATE_UNAVAILABLE',
      message:'运行参数校验请求失败', details:[e.message || String(e)]};
    if(show) renderRunInputValidation(result);
    return result;
  }
}

async function runFromInputPanel(){
  if(running){ toast('已有编排正在运行，请等待当前运行结束'); return; }
  if(!canvasAgentCode()){ toast('未绑定编排图缺少 Agent 契约，绑定 Agent 后才能运行'); return; }
  if(!canvasCanRun()){ toast('没有当前 Agent 的运行权限或可用版本'); return; }
  if(MODE !== 'live'){ toast('后端不可用，无法执行真实 Agent'); return; }
  setRunButtonsBusy(true, '校验中…');
  const checked = await checkedRunInput(true);
  if(!checked.ok){ setRunButtonsBusy(false); return; }
  closeRunInput();
  return runGraphLive(checked.input);
}

function runInput(){
  const parsed = parseRunInput();
  if(!parsed.ok) throw new Error(parsed.message);
  return parsed.input;
}

async function runGraphLive(input){
  if(running){ toast('已有编排正在运行，请等待当前运行结束'); return; }
  running = true;
  setRunButtonsBusy(true);
  let stage = 'prepare';
  try{
    resetRun();
    openRuntimeInspector('run');
    LIVE = liveReset();
    $('#runState').textContent = 'running'; $('#runState').className = 'badge run';
    const payload = {
      agent: canvasAgentCode(),
      version: CUR.version,
      session_id: 's_' + Math.floor(Math.random() * 90000 + 10000),
      input: input === undefined ? runInput() : input,
      stream: true
    };
    // 运行者只执行 Agent 版本绑定的不可变 Graph；开发者才允许试跑当前未发布画布。
    if(graphCan('manage')){
      payload.graph = GRAPH;
      payload.graph_id = CUR.graphId;
    }
    stage = 'request';
    const resp = await fetch(API + '/v1/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if(!resp.ok){
      // 后端明确拒绝（契约不符 / agent 不存在 / 图不合法）不能当成"后端不可用"
      // 伪造成功会把一次真实的 422 隐藏掉，因此直接展示后端拒绝原因。
      let detail = 'http ' + resp.status;
      try{
        const j = await resp.json();
        detail = (j.code ? j.code + ' · ' : '') + (j.message || detail);
        if(Array.isArray(j.details) && j.details.length) detail += '（' + j.details.slice(0,3).join('；') + '）';
      }catch(e){ /* 非 JSON 响应 */ }
      const err = new Error(detail); err.rejected = true; throw err;
    }
    if(!resp.body) throw new Error('空响应体');
    stage = 'stream';
    await pumpSSE(resp);
    if(!LIVE.runId) throw new Error('空事件流');
    stage = 'finalize';
    afterPump();
  }catch(err){
    if(err.rejected){
      $('#runState').textContent = 'failed'; $('#runState').className = 'badge fail';
      logLine('system', '运行被拒绝 · ' + err.message, 'err');
      toast('运行被拒绝：' + err.message);
      return;
    }
    $('#runState').textContent = 'failed'; $('#runState').className = 'badge fail';
    const frontend = stage === 'prepare' || stage === 'finalize';
    const label = frontend ? '前端运行异常' : '运行连接异常';
    logLine('system', label + ' · ' + err.message, 'err');
    toast(label + '：' + err.message);
    return;
  }finally{
    running = false;
    setRunButtonsBusy(false);
  }
}

/* ============ 追踪 ============ */
/* 空数组起步：以前这里塞了 3 条编造的 run（17:42:08 / token / span 全是假的），
   live 模式下万一 /v1/runs 拉失败，页面就把假数据当真数据展示。现在只有服务端
   真实 run 才进这个列表，没有就显示空态。 */
let RUNS = [];
let TRACE_SELECTED_RUN_ID = '';
let TRACE_AUTO_TIMER = null;
let TRACE_LIST_LOADING = false;
const TRACE_EVENT_LOADS = new Set();

function traceViewActive(){
  const view = $('#view-trace');
  return !!(view && view.classList.contains('active'));
}

function scheduleTraceAutoRefresh(active){
  if(TRACE_AUTO_TIMER){ clearInterval(TRACE_AUTO_TIMER); TRACE_AUTO_TIMER = null; }
  if(!active) return;
  TRACE_AUTO_TIMER = setInterval(() => {
    if(traceViewActive() && !TRACE_LIST_LOADING){
      loadServerRuns(undefined,{keepSelection:true,quiet:true});
    }
  }, 5000);
}

/* run 状态 → 徽章。succeeded_with_warnings 不能染成绿色：
   它的含义是「结论有，但这一轮没有证据支撑/检索降级」，必须一眼能和干净成功区分。 */
function statusBadge(status){
  if(status === 'succeeded_with_warnings') return {cls:'warn', label:'含警告'};
  if(status === 'succeeded') return {cls:'ok', label:'succeeded'};
  if(status === 'failed') return {cls:'fail', label:'failed'};
  if(status === 'waiting_human') return {cls:'wait', label:'等待人工'};
  if(status === 'waiting_event') return {cls:'wait', label:'等待事件'};
  if(status === 'waiting_timer') return {cls:'wait', label:'定时等待'};
  return {cls:'run', label:status || '—'};
}

function renderRunList(){
  if(!RUNS.length){
    $('#runList').innerHTML = '<div class="empty" style="padding:18px 12px">还没有运行记录<br><span style="font-size:10.5px">在画布点「运行」，或调 POST /v1/runs</span></div>';
    return;
  }
  $('#runList').innerHTML = RUNS.map(r=>{ const sb = statusBadge(r.status); return `
    <div class="run-item" data-run="${r.id}" onclick="renderTrace('${r.id}')">
      <div class="ri-top">
        <span class="mono" style="font-size:11px">${r.id}</span>
        ${r.mock ? '<span class="badge wait">mock</span>' : ''}
        <span class="badge ${sb.cls}" style="margin-left:auto" title="${esc(r.status)}${(r.warnings&&r.warnings.length)?'：'+esc(r.warnings.join('；' )):''}">${sb.label}</span>
      </div>
      <div class="ri-sub">${esc(r.agent)} · ${esc(r.version)} · ${esc(r.source || 'console')} · ${r.time} · ${r.total ? r.total + 'ms' : '—'} · ${fmt(r.tokens)} tok</div>
    </div>`;}).join('');
}

function renderTraceNodeIO(runId, node, requestedIndex){
  const run = RUNS.find(item => item.id === runId);
  const title = $('#traceNodeName'), body = $('#traceNodeIO');
  if(!title || !body) return;
  if(!run){
    title.textContent = '未选择';
    body.innerHTML = '<div class="empty">选择一个节点查看输入与输出</div>';
    return;
  }
  const available = Object.keys(run.nodeIO || {});
  const selected = node || (TRACE_NODE_SELECTION[runId] || {}).node || available[0] || '';
  const records = selected ? ((run.nodeIO || {})[selected] || []) : [];
  if(!selected){
    title.textContent = '未选择';
    body.innerHTML = '<div class="empty">该运行没有节点输入输出快照，可能由升级前的 Worker 执行</div>';
    return;
  }
  if(!records.length){
    TRACE_NODE_SELECTION[runId] = {node:selected,index:0};
    title.textContent = selected;
    body.innerHTML = '<div class="empty">该节点没有可回放的输入输出快照</div>';
    $$('#spans .span-row[data-trace-node]').forEach(el =>
      el.classList.toggle('trace-selected', el.dataset.traceNode === selected));
    return;
  }
  const previous = TRACE_NODE_SELECTION[runId] || {};
  const preferred = requestedIndex == null ? (previous.node === selected ? previous.index : records.length-1) : Number(requestedIndex);
  const index = Math.max(0, Math.min(records.length-1, Number.isFinite(preferred) ? preferred : records.length-1));
  const record = records[index];
  TRACE_NODE_SELECTION[runId] = {node:selected,index};
  title.textContent = selected;
  const nodeError = (run.nodeErrors || []).slice().reverse().find(item => nodeRuntimeKey(item.node) === selected);
  const outputEmpty = nodeError
    ? `${nodeError.code} · ${nodeError.message}${nodeError.detail.length ? '\n' + nodeError.detail.join('\n') : ''}`
    : '尚无输出（节点失败、等待恢复或事件不完整）';
  body.innerHTML = `<div class="node-runtime-head"><div class="card-s">脱敏快照 · ${esc(record.nodeType || '节点')}</div>
    <select class="select" data-run="${attr(runId)}" data-node="${attr(selected)}"
      onchange="renderTraceNodeIO(this.dataset.run,this.dataset.node,this.value)">
      ${records.map((_,i)=>`<option value="${i}"${i===index?' selected':''}>第 ${i+1} 次执行</option>`).join('')}
    </select></div>
    <div class="runtime-io-grid">
      <div class="runtime-io-block"><div class="runtime-io-label"><span>节点输入</span><span>${esc(runtimeMeta(record.inputMeta))}</span></div>
        ${jsonViewerMarkup(record.input,{empty:'未采集到输入'})}</div>
      <div class="runtime-io-block"><div class="runtime-io-label"><span>输出补丁</span><span>${esc(runtimeMeta(record.outputMeta))}</span></div>
        ${jsonViewerMarkup(record.output,{empty:outputEmpty})}</div>
    </div>${modelRuntimePanel(run,selected)}`;
  $$('#spans .span-row[data-trace-node]').forEach(el =>
    el.classList.toggle('trace-selected', el.dataset.traceNode === selected));
}

function renderTrace(id){
  if(!RUNS.length){
    $('#traceTitle').textContent = '还没有运行记录';
    $('#traceSub').textContent = '跑一次画布（或调 POST /v1/runs）后这里会出现真实 trace';
    const b0 = $('#traceBadge'); b0.textContent = '—'; b0.className = 'badge wait';
    ['#tTotal','#tTok','#tTool','#tRetry'].forEach(s => { const e = $(s); if(e) e.textContent = '—'; });
    $('#spans').innerHTML = '<div class="empty">空态：没有可回放的 run</div>';
    $('#sse').textContent = '';
    renderTraceNodeIO('', '');
    return;
  }
  const r = RUNS.find(x=>x.id===id) || RUNS[0];
  if(!r) return;
  TRACE_SELECTED_RUN_ID = r.id;
  const runInput = $('#traceRunId');
  if(runInput && document.activeElement !== runInput) runInput.value = r.id;
  if(!r.spans){
    if(MODE === 'live'){
      $('#traceTitle').textContent = r.agent + ' · ' + r.version;
      $('#traceSub').textContent = r.id + ' · trace ' + (r.trace || '');
      $('#spans').innerHTML = '<div class="empty">正在从后端回放事件…</div>';
      $('#traceNodeName').textContent = '加载中';
      $('#traceNodeIO').innerHTML = '<div class="empty">正在回放节点输入输出…</div>';
      loadSpans(r.id);
      return;
    }
    r.spans = [];
  }
  $$('.run-item').forEach(e=>e.classList.toggle('on', e.dataset.run===r.id));
  $('#traceTitle').textContent = r.agent + ' · ' + r.version;
  $('#traceSub').textContent = r.id + ' · trace ' + (r.trace || '—');
  const b = $('#traceBadge');
  const sb2 = statusBadge(r.status);
  b.textContent = sb2.label; b.className = 'badge ' + sb2.cls;
  // 告警单独一行贴在时间线顶部：报告照样能读，但必须先看到"这一轮缺证据"。
  const warnHtml = (r.warnings && r.warnings.length)
    ? `<div class="empty" style="padding:8px 12px;margin-bottom:8px;color:var(--amber);background:var(--amber-soft);border-radius:8px;text-align:left">⚠ ${r.warnings.map(w=>esc(w)).join('<br>⚠ ')}</div>`
    : '';
  $('#tTotal').textContent = r.total ? (r.total/1000).toFixed(2) + 's' : '—';
  $('#tTok').textContent = r.tokens ? fmt(r.tokens) : '—';
  $('#tTool').textContent = r.spans.filter(s=>s.kind==='tool').length + ' 次';
  // retry 用后端 run 记录里的真实计数，不再写死 '2'
  $('#tRetry').textContent = (r.retry == null) ? '—' : (r.retry + ' 次');
  const max = Math.max(r.total, 1);
  const COLOR = {llm:'#4f46e5', tool:'#b45309', agent:'#0ea5e9', io:'#15803d'};
  let html = warnHtml + `<div class="timeline-scale"><div>节点</div><div>0 — ${(r.total/1000).toFixed(1)}s</div><div style="text-align:right">耗时 / Token</div></div>`;
  html += r.spans.map(s=>`
    <div class="span-row${s.error ? ' error' : ''}" data-trace-node="${attr(s.id)}" tabindex="0">
      <div class="span-n" style="${s.sub ? 'padding-left:16px;color:#0369a1' : ''}">
        <span class="nd-dot" style="background:${COLOR[s.kind] || '#9aa1ac'}"></span>${s.sub ? '↳ ' : ''}${esc(s.id)}</div>
      <div class="span-track">
        <div class="span-bar ${s.kind}" style="left:${(s.start/max*100).toFixed(2)}%;width:${Math.max(1.2,(s.dur/max*100)).toFixed(2)}%"></div>
      </div>
      <div class="span-m">${s.dur}ms · ${fmt(s.tok)}</div>
    </div>`).join('');
  const lastNodeError = (r.nodeErrors && r.nodeErrors.length) ? r.nodeErrors[r.nodeErrors.length - 1] : null;
  if(r.status === 'failed'){
    const finalError = normalizeRuntimeError(r.error || lastNodeError || {
      code:'RUN_FAILED', message:'运行失败，事件流里没有 run_end 成功'
    });
    if(lastNodeError){
      if(!finalError.node) finalError.node = lastNodeError.node;
      if(!finalError.message) finalError.message = lastNodeError.message;
      if(!finalError.detail.length) finalError.detail = lastNodeError.detail;
    }
    html += runtimeErrorHtml(finalError);
  } else if(lastNodeError){
    html += runtimeErrorHtml(lastNodeError, '节点异常已被流程捕获');
  }
  if(!html.includes('span-row')) html += '<div class="empty">这次 run 没有回放到 node_end 事件</div>';
  $('#spans').innerHTML = html;
  $$('#spans .span-row[data-trace-node]').forEach(row => {
    const open = () => renderTraceNodeIO(r.id, row.dataset.traceNode);
    row.addEventListener('click', open);
    row.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); } });
  });
  renderTraceNodeIO(r.id, (TRACE_NODE_SELECTION[r.id] || {}).node || '');
  // SSE 面板只显示真实帧；没有回放数据时不要用 span 反推伪造一段
  $('#sse').textContent = (r.sse && r.sse.length)
    ? r.sse.slice(-60).join('\n')
    : '（尚未回放事件流）';
}

async function hydrateRunDiagnostics(id, rerender=true){
  try{
    const detail = await apiJSON('/v1/runs/' + id);
    const run = RUNS.find(item => item.id === id);
    if(!run) return null;
    if(detail.status) run.status = detail.status;
    if(detail.latency_ms != null) run.total = detail.latency_ms;
    if(detail.error){
      const error = normalizeRuntimeError(detail.error);
      const lastNodeError = (run.nodeErrors && run.nodeErrors.length)
        ? run.nodeErrors[run.nodeErrors.length - 1] : null;
      if(lastNodeError && !error.node) error.node = lastNodeError.node;
      run.error = error;
    }
    if(rerender){
      renderRunList();
      const selected = $('.run-item.on');
      if((selected && selected.dataset.run === id) || (!selected && RUNS[0] === run)) renderTrace(id);
    }
    return run;
  }catch(_){ return null; }
}

/* 从后端回放一次 run 的全部事件，重建节点级 span */
async function loadSpans(id){
  if(TRACE_EVENT_LOADS.has(id)) return;
  TRACE_EVENT_LOADS.add(id);
  let received = false;
  try{
    const resp = await fetch(API + '/v1/runs/' + id + '/events');
    if(!resp.ok || !resp.body) throw new Error('http ' + resp.status);
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    const initial = RUNS.find(item => item.id === id);
    let buf = '', spans = [], cursor = 0, tokens = 0, status = (initial && initial.status) || 'running';
    let err = null, nodeErrors = [], retry = 0, sse = [], endMs = 0, t0 = null, fallbackT = 0;
    const ioState = {nodeIO:{},modelCalls:{}};
    const agentNodes = new Set();
    const starts = {};   // node → [ts...]：重试会让同一节点出现多次 node_start
    let renderPending = false;
    const sync = () => {
      const run = RUNS.find(item => item.id === id);
      if(!run) return;
      const origin = t0 == null ? (spans.length ? spans[0].t : 0) : t0;
      spans.sort((a,b) => a.t - b.t);
      spans.forEach(span => { span.start = Math.max(0,(span.t || origin) - origin); });
      run.spans = spans; run.sse = sse; run.retry = retry; run.nodeErrors = nodeErrors;
      run.nodeIO = ioState.nodeIO; run.modelCalls = ioState.modelCalls;
      if(endMs) run.total = endMs; else if(cursor) run.total = cursor;
      run.tokens = tokens; run.status = status;
      if(err) run.error = err;
      if(TRACE_SELECTED_RUN_ID === id && !renderPending){
        renderPending = true;
        requestAnimationFrame(() => {
          renderPending = false;
          if(TRACE_SELECTED_RUN_ID === id){ renderRunList(); renderTrace(id); }
        });
      }
    };
    if(initial){ initial.spans = spans; initial.sse = sse; }
    while(true){
      const { done, value } = await reader.read();
      if(done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while((i = buf.indexOf('\n\n')) >= 0){
        const frame = buf.slice(0, i); buf = buf.slice(i + 2);
        let type = null, data = null;
        frame.split('\n').forEach(l => {
          if(l.startsWith('event:')) type = l.slice(6).trim();
          else if(l.startsWith('data:')) data = l.slice(5).trim();
        });
        if(!data) continue;
        let ev; try{ ev = JSON.parse(data); }catch(_){ continue; }
        received = true;
        if(sse.length < 400){
          if(ev.type === 'node_input' || ev.type === 'node_output'){
            const meta = ev.input_meta || ev.output_meta || {};
            sse.push(`event: ${ev.type}  data: {"node":"${String(ev.node || '')}","snapshot_bytes":${Number(meta.bytes || 0)},"truncated":${Boolean(meta.truncated)}}`);
          } else if(['model_request','model_response','model_validation'].includes(ev.type)){
            sse.push(`event: ${ev.type}  data: {"node":"${String(ev.node || '')}","attempt":${Number(ev.attempt || 0)},"status":"${String(ev.status || '')}","http_status":${ev.http_status == null?'null':Number(ev.http_status)},"latency_ms":${Number(ev.latency_ms || 0)},"error_code":"${String(ev.error_code || '')}"}`);
          } else {
            sse.push(`event: ${ev.type || type || '?'}  data: ${data}`);
          }
        }
        if(ev.type === 'node_input' || ev.type === 'node_output') captureNodeRuntime(ioState, ev);
        if(['model_request','model_response','model_validation'].includes(ev.type)) captureModelRuntime(ioState,ev);
        const tsv = Date.parse(ev.ts || '') || 0;
        if(ev.type === 'node_start'){
          if(ev.retry) retry = Math.max(retry, ev.retry);
          // 起点按真实时间戳记，父节点(sub)才会排在自己的子节点之前
          if(tsv){ (starts[ev.node] = starts[ev.node] || []).push(tsv); if(t0 == null) t0 = tsv; }
        }
        if(ev.type === 'subgraph_done' && ev.node) agentNodes.add(String(ev.node));
        if(ev.type === 'node_end'){
          const raw = String(ev.node || '');
          const isSub = raw.includes('.');
          const nid = isSub ? raw : (NODE_MAP[raw] || raw);
          const q = starts[raw];
          const st = (q && q.length) ? q.shift() : (tsv || t0 || 0) + fallbackT;
          if(ev.status === 'error'){
            const nodeError = normalizeRuntimeError(ev, 'NODE_ERROR');
            nodeErrors.push(nodeError);
            spans.push({id:nid, t:st, dur:ev.latency_ms || 0, tok:ev.tokens || 0,
                        kind:isSub ? 'agent' : kindOf(nid, agentNodes), sub:isSub, error:true});
          } else {
            // 不要求节点存在于当前画布：API run 可能来自另一张已发布图。
            spans.push({ id: nid, t: st, dur: ev.latency_ms || 0,
                         tok: ev.tokens || 0, kind: isSub ? 'agent' : kindOf(nid, agentNodes), sub: isSub });
            if(!isSub){                     // 子节点耗时已包含在父节点里，不再叠加
              cursor += ev.latency_ms || 0;
              tokens += ev.tokens || 0;
              fallbackT = cursor;
            }
          }
          sync();
        } else if(ev.type === 'run_end'){
          status = ev.status || status;
          if(ev.latency_ms) endMs = ev.latency_ms;
          if(ev.error_code) err = normalizeRuntimeError(ev);
          sync();
        } else if(ev.type === 'run_paused'){
          status = ev.status || status;
          sync();
        }
      }
    }
    sync();
    await hydrateRunDiagnostics(id, false);
    if(TRACE_SELECTED_RUN_ID === id){ renderRunList(); renderTrace(id); }
  }catch(e){
    const run = RUNS.find(item => item.id === id);
    if(run && !received) run.spans = null;
  }finally{
    TRACE_EVENT_LOADS.delete(id);
  }
}

function serverRunView(it, previous){
  const usage = it.usage || {};
  return {
    id: it.run_id, agent: it.agent || it.agent_code || '',
    version: it.version || it.agent_version || '',
    project: it.project_code || '', graphId: it.graph_id || '', graphVersion: it.graph_version || '',
    time: new Date((it.created_at || 0) * 1000).toTimeString().slice(0, 8),
    total: it.latency_ms || 0,
    tokens: Number(usage.tokens_in || 0) + Number(usage.tokens_out || 0),
    status: it.status, trace: it.trace_id || '', source: it.trigger_source || 'console',
    dedupeKey: it.dedupe_key || '', retry: it.retry, error: it.error || null,
    warnings: it.warnings || [], degraded: it.degraded || {},
    // 已经回放过的 span/事件要留住：刷新状态不能把节点进度清空。
    spans: previous ? previous.spans : null,
    sse: previous ? previous.sse : undefined,
    nodeErrors: previous ? (previous.nodeErrors || []) : [],
    nodeIO: previous ? (previous.nodeIO || {}) : {},
    modelCalls: previous ? (previous.modelCalls || {}) : {}
  };
}

async function locateTraceRun(){
  const input = $('#traceRunId'), button = $('#traceLocateBtn');
  const id = String(input && input.value || '').trim();
  if(!id){ toast('请输入接口返回的 run_id'); return; }
  button.disabled = true; button.textContent = '查询中…';
  try{
    const detail = await apiJSON('/v1/runs/' + encodeURIComponent(id));
    const previous = RUNS.find(item => item.id === id);
    const item = serverRunView(detail, previous);
    const rest = RUNS.filter(row => row.id !== id);
    RUNS.length = 0; RUNS.push(item, ...rest);
    TRACE_SELECTED_RUN_ID = id;
    renderRunList(); setTopTrace(item); renderTrace(id);
    const meta = $('#traceListMeta');
    if(meta) meta.textContent = `已定位 ${id} · ${item.source} · ${item.status}`;
  }catch(error){
    toast('运行记录查询失败：' + (error.message || String(error)));
  }finally{
    button.disabled = false; button.textContent = '定位';
  }
}

async function refreshTraceRuns(button){
  if(button){ button.disabled = true; button.textContent = '刷新中…'; }
  await loadServerRuns(undefined,{keepSelection:true});
  if(button){ button.disabled = false; button.textContent = '刷新'; }
}

function copySelectedTraceId(){
  const run = RUNS.find(item => item.id === TRACE_SELECTED_RUN_ID) || RUNS[0];
  if(!run || !run.trace){ toast('当前运行没有 traceId'); return; }
  copyTextValue(run.trace).then(ok => toast(ok ? '已复制 traceId' : '复制失败'));
}

/* 拉取服务端 run 列表：画布、API、触发器创建的 Run 都来自同一个持久化账本。 */
async function loadServerRuns(scope, options={}){
  if(TRACE_LIST_LOADING) return;
  TRACE_LIST_LOADING = true;
  const meta = $('#traceListMeta');
  if(meta && !options.quiet) meta.textContent = '正在读取运行记录…';
  try{
    const query = scope instanceof URLSearchParams ? new URLSearchParams(scope) : new URLSearchParams();
    query.set('limit', '30');
    const b = await apiJSON('/v1/runs?' + query.toString());
    const prev = new Map(RUNS.map(r => [r.id, r]));
    const selected = options.keepSelection ? TRACE_SELECTED_RUN_ID : '';
    const next = (b.items || []).map(it => serverRunView(it, prev.get(it.run_id)));
    // 精确定位的旧 Run 可能不在最近 30 条内；刷新时仍保留它，避免详情突然消失。
    if(selected && !next.some(item => item.id === selected) && prev.has(selected)){
      next.unshift(prev.get(selected));
    }
    RUNS.length = 0; RUNS.push(...next);
    if(options.renderTrace!==false){
      const target = (selected && RUNS.some(item => item.id === selected)) ? selected : (RUNS[0] || {}).id;
      renderRunList();
      const current = RUNS.find(item => item.id === target) || RUNS[0];
      setTopTrace(current);
      renderTrace(target || null);
    }
    if(meta) meta.textContent = `已加载 ${RUNS.length} 条 · ${new Date().toLocaleTimeString('zh-CN',{hour12:false})} 更新`;
  }catch(e){
    if(meta) meta.textContent = '运行记录刷新失败：' + (e.message || String(e));
  }finally{
    TRACE_LIST_LOADING = false;
  }
}

/** 顶栏 trace chip：以前写死 demo-trace-example，现在跟着最近一次 run 走 */
function setTopTrace(run){
  const el = $('#topTrace'); if(!el) return;
  el.textContent = (run && run.trace) ? 'trace ' + String(run.trace).slice(0, 16) : 'trace —';
  el.title = run ? (run.id + ' · ' + run.agent) : '还没有运行记录';
}

/* 成本说明：成本永远是「估算」，这里把估算依据摊开，别让一个 ¥ 数字冒充账单 */
function costNote(s){
  const p = s.pricing || {};
  const money = v => '$' + Number(v).toFixed(2);
  const price = (p.in_per_m != null) ? `输入 ${money(p.in_per_m)} / 输出 ${money(p.out_per_m)} per 1M` : '';
  const src = s.cost_source;
  if(!src || src === 'none') return '没有计费调用（mock 或未调模型）';
  const how = src === 'api'
    ? 'token 取自网关 usage'
    : (src === 'estimate' ? 'token 为字符估算（非账单）' : '部分 token 为字符估算（非账单）');
  const mock = s.mock_runs ? ` · ${s.mock_runs} 次 mock 不计费` : '';
  return [how, price].filter(Boolean).join(' · ') + mock;
}

/* 能力判定只看真实探针和运行数据，不再表达固定周次或人工维护的项目进度。 */
const PLATFORM_CAPABILITY_CATALOG = {
  "ready": [
    {
      "cat": "演示",
      "title": "编排编辑与保存",
      "desc": "拖拽节点、检查顺序连线并保存本地草稿。",
      "evidence": "编排画布"
    },
    {
      "cat": "演示",
      "title": "参数校验与本地执行",
      "desc": "校验 name 字段，用本地模板生成虚构欢迎语。",
      "evidence": "运行参数"
    },
    {
      "cat": "演示",
      "title": "运行记录与节点追踪",
      "desc": "查看当前浏览器中的模拟事件与输入输出。",
      "evidence": "运行追踪"
    }
  ],
  "conditional": [
    {
      "cat": "界面",
      "title": "资源与治理模块",
      "desc": "保留原型页面，以空数据展示信息结构；后端操作已禁用。",
      "evidence": "侧栏各模块"
    }
  ],
  "planned": [
    {
      "cat": "后端",
      "title": "真实 AI 及企业服务",
      "desc": "模型、技能、知识、登录、审核、触发、评测与发布均未接入；需独立开发和验证。"
    }
  ]
};

function renderCapabilityCatalog(){
  const ready=PLATFORM_CAPABILITY_CATALOG.ready, conditional=PLATFORM_CAPABILITY_CATALOG.conditional, planned=PLATFORM_CAPABILITY_CATALOG.planned;
  const item=(value,status)=>`<div class="cap-item ${status}"><div class="cap-item-head"><span class="cap-item-cat">${esc(value.cat)}</span><div class="cap-item-title">${esc(value.title)}</div></div><div class="cap-item-desc">${esc(value.desc)}</div>${value.evidence?`<div class="cap-item-evidence">入口：${esc(value.evidence)}</div>`:''}</div>`;
  const readyList=$('#capReadyList'), conditionalList=$('#capConditionalList'), plannedList=$('#capPlannedList');
  if(readyList)readyList.innerHTML=ready.map(value=>item(value,'ready')).join('');
  if(conditionalList)conditionalList.innerHTML=conditional.map(value=>item(value,'conditional')).join('');
  if(plannedList)plannedList.innerHTML=planned.map(value=>item(value,'planned')).join('');
  const breakdown=$('#capReadinessBreakdown');
  if(breakdown)breakdown.innerHTML='<div class="demo-note">原系统内部路线图、验收评分和部署计划已移除。本版仅描述实际提供的本地演示范围。</div>';
  [['capReadyCount',ready.length],['capConditionalCount',conditional.length],['capPlannedCount',planned.length],['capCoverage','DEMO'],['capReadinessState','不包含生产服务'],['capReadyBadge',ready.length+' 项'],['capConditionalBadge',conditional.length+' 项'],['capPlannedBadge',planned.length+' 项']].forEach(([id,value])=>{const el=$('#'+id);if(el)el.textContent=value;});
}

const CAPABILITY_PLAN = [
  { t:'接入层 + 契约 + Registry', d:'/v1/runs 跑通 mock 图，traceId 贯通' },
  { t:'Harness 五件套 + 三库适配', d:'统一 recall()，RRF 融合，降级可用' },
  { t:'ContextAssembler + 记忆写回 + SSE', d:'前端实时看到节点流转与 token 累积' },
  { t:'原型对接 + 看板 + 压测', d:'50 并发，p95 < 6s（不含 LLM），成本报表准确' },
];
const CAPABILITY_PROBE = { recall: undefined, mem: undefined };

/* 只探一次：召回探针能同时看出「通路在不在」和「Milvus 在不在」——
   三路里 sparse / sparse_m3 恒为 0 就说明服务端 BM25 没接上（降级只能回 dense）。 */
async function probeCapabilities(){
  if(CAPABILITY_PROBE.recall === undefined){
    const r = await apiRaw('/v1/context/recall', {
      method: 'POST', body: JSON.stringify({ query:'如何使用演示流程', top_k: 3 })
    });
    CAPABILITY_PROBE.recall = r.ok
      ? { ok:true, hits:(r.body.hits || []).length, sources:r.body.sources || {},
          fused:r.body.fused_by || 'none', trimmed:r.body.trimmed || [] }
      : { ok:false, code:(r.body && r.body.code) || ('http ' + r.status) };
  }
  if(CAPABILITY_PROBE.mem === undefined){
    const r = await apiRaw('/v1/memory/stats');
    CAPABILITY_PROBE.mem = r.ok
      ? { ok:true, n:r.body.total || 0, pending:r.body.pending_index || 0,
          backend:r.body.backend || '—' }
      : { ok:false };
  }
  if(CAPABILITY_PROBE.loadtest === undefined){
    const r = await apiRaw('/v1/observability/loadtest');
    CAPABILITY_PROBE.loadtest = (r.ok && r.body && r.body.available !== false) ? r.body : { available:false };
  }
}

function renderCapabilityChecks(s){
  const box = document.getElementById('msBody'), head = document.getElementById('msHead');
  if(!box) return;
  const sm = s || {}, rc = CAPABILITY_PROBE.recall || {}, mm = CAPABILITY_PROBE.mem || {};
  const src = rc.sources || {};
  const serverSide = (src.sparse || 0) + (src.sparse_m3 || 0) > 0;   // 服务端 BM25 是否真的在跑
  const sseSeen = RUNS.some(r => (r.sse || []).length > 0);
  const costOk = sm.cost_source === 'api';
  const lt = CAPABILITY_PROBE.loadtest || {};
  const pressTxt = lt.available
    ? `50 并发 p95 ${(lt.p95_ms / 1000).toFixed(2)}s / p99 ${(lt.p99_ms / 1000).toFixed(2)}s`
      + `（目标 <${(lt.target_p95_ms / 1000).toFixed(0)}s，${lt.pass ? '达标' : '未达标'} · `
      + `${lt.requests} 请求 ${lt.rps} req/s）`
    : '50 并发压测未跑（bench/recall_load.py）';

  const rows = [
    { ...CAPABILITY_PLAN[0],
      st: (sm.runs || 0) > 0 ? 'done' : 'todo',
      ev: (sm.runs || 0) > 0
        ? `${fmt(sm.runs)} 次 run 已落库 · 事件带 trace_id（子图复用父 trace）`
        : '还没有 run 落库' },
    { ...CAPABILITY_PLAN[1],
      st: !rc.ok ? 'todo' : (rc.hits > 0 && serverSide ? 'done' : 'part'),
      ev: !rc.ok ? `召回接口不可用：${rc.code || '—'}`
        : (rc.hits > 0 && serverSide
            ? `recall 通 · ${rc.hits} 条命中 · 融合 ${rc.fused}`
            : `recall 通但三路 ${rc.hits} 命中：dense ${src.dense || 0} / sparse ${src.sparse || 0} / m3 ${src.sparse_m3 || 0} —— Milvus 未连上时只剩内存降级，BM25 与 M3 无从计算`) },
    { ...CAPABILITY_PLAN[2],
      st: (mm.ok && mm.n > 0 && sseSeen) ? 'done' : ((mm.n > 0 || sseSeen) ? 'part' : 'todo'),
      ev: `${mm.ok ? mm.n + ' 条记忆（' + mm.backend + '）' : '记忆统计不可用'} · `
        + (sseSeen ? 'SSE 已收到真实节点帧' : '本次会话还没收到 SSE 帧') },
    { ...CAPABILITY_PLAN[3],
      st: (costOk && lt.available && lt.pass) ? 'done' : 'part',
      ev: `原型 5 页 + 看板已接 · ${pressTxt}`
        + ` · 成本 ${sm.cost_source || '—'}${costOk ? '' : '（含字符估算，非账单）'}`
        + ` · 内存泄漏未测（无进程内存归档）` },
  ];

  const nDone = rows.filter(r => r.st === 'done').length;
  const nPart = rows.filter(r => r.st === 'part').length;
  if(head) head.textContent = nDone === rows.length
    ? '4/4 完成'
    : `完成 ${nDone}/4` + (nPart ? ` · ${nPart} 项部分达成` : '');

  box.innerHTML = rows.map((r, i) => {
    const mark = r.st === 'done' ? '✓' : (r.st === 'part' ? '◐' : String(i + 1));
    return `<div class="step ${r.st === 'done' ? 'done' : (r.st === 'part' ? 'part' : 'todo')}">`
      + `<div class="step-n">${mark}</div><div>`
      + `<div class="step-t">${esc(r.t)}</div>`
      + `<div class="step-s">${esc(r.d)}</div>`
      + `<div class="step-ev">${esc(r.ev)}</div>`
      + `</div></div>`;
  }).join('');
}

let OVERVIEW_LOAD_SEQ = 0;

function overviewAgentHealth(runs){
  const groups = new Map();
  (runs || []).forEach(run => {
    const code = String(run.agent || run.agent_code || 'unknown');
    const row = groups.get(code) || {code,runs:0,done:0,ok:0,failed:0,waiting:0,latencies:[]};
    row.runs += 1;
    if(run.status === 'succeeded'){row.done += 1;row.ok += 1;}
    else if(run.status === 'failed'){row.done += 1;row.failed += 1;}
    else row.waiting += 1;
    const latency = Number(run.latency_ms || 0);if(latency > 0)row.latencies.push(latency);
    groups.set(code,row);
  });
  return [...groups.values()].map(row => {
    row.successRate = row.done ? row.ok / row.done : null;
    row.latencies.sort((a,b)=>a-b);
    row.p95 = row.latencies.length ? row.latencies[Math.max(0,Math.ceil(row.latencies.length*.95)-1)] : null;
    row.level = row.failed > 0 || (row.successRate != null && row.successRate < .9) ? 'fail' : (row.waiting > 0 || (row.successRate != null && row.successRate < .98) ? 'warn' : 'ok');
    return row;
  }).sort((a,b)=>(b.failed-a.failed)||((a.successRate??1)-(b.successRate??1))||(b.runs-a.runs));
}

function overviewOpenRun(runId){
  go('trace',{noLoad:true});
  loadServerRuns(new URLSearchParams({status:'failed'})).then(()=>renderTrace(runId));
}

async function overviewOpenAgent(code){
  await switchAgent(code,{silent:true});
  go('obs');
}

function renderOverviewDashboard(data){
  const put=(id,value)=>{const el=$('#'+id);if(el)el.textContent=value};
  const summary=data.summary||{}, runtime=data.runtime||{}, reviews=data.reviews||{};
  const runs=data.runs||[], evaluations=data.evaluations||[], triggers=data.triggers||[];
  const available={summary:data.summary!=null,runtime:data.runtime!=null,reviews:data.reviews!=null,
    runs:data.runs!=null,evaluations:data.evaluations!=null,triggers:data.triggers!=null};
  const counts=summary.status_counts||{}, done=Number(summary.done||0), pending=Number(summary.pending||0);
  const failed=Number(counts.failed||0), queue=runtime.queue||{}, workers=runtime.summary||{};
  put('ovRunsL','24h 运行 · '+(CUR.code||'全平台'));
  put('ovRuns',available.summary?fmt(Number(summary.runs||0)):'—');
  put('ovTok',available.summary?`${fmt(Number(summary.tokens||0))} tok`+(pending?` · ${pending} 个非终态`:''):'运行汇总读取失败');
  put('ovSucc',!available.summary||summary.success_rate==null?'—':(summary.success_rate*100).toFixed(1)+'%');
  put('ovSuccD',!available.summary?'数据不可用':done?`${failed} 次失败 / ${done} 次终态`:'没有终态 Run');
  put('ovP95',summary.p95_latency_ms==null?'—':(summary.p95_latency_ms/1000).toFixed(2)+'s');
  put('ovP95D',!available.summary?'数据不可用':done?`近 24h · ${done} 个终态样本`:'没有耗时样本');
  put('ovQueue',available.runtime&&queue.depth!=null?fmt(Number(queue.depth)):'—');
  put('ovQueueD',available.runtime?`最老等待 ${obsSeconds(queue.oldest_wait_seconds)}`:'运行资源读取失败');
  put('ovReviews',available.reviews&&reviews.total!=null?fmt(Number(reviews.total)):'—');
  put('ovReviewsD',!available.reviews?'审核待办读取失败':reviews.total?`${reviews.total} 项需要人工决策`:'当前没有审核待办');
  put('ovFailures',available.summary?fmt(failed):'—');
  put('ovFailuresD',!available.summary?'数据不可用':failed?'点击下方查看最近异常':'近 24h 没有失败');

  put('overviewQueueDepth',available.runtime&&queue.depth!=null?fmt(Number(queue.depth)):'—');
  put('overviewQueueOldest',available.runtime?obsSeconds(queue.oldest_wait_seconds):'—');
  put('overviewWorkerOnline',available.runtime?String(workers.online??0):'—');
  put('overviewWorkerLoad',available.runtime?`${Number(workers.busy||0)} / ${Number(workers.online_capacity||0)}`:'—');
  put('overviewRuntimeSub',available.runtime?`${runtime.mode||'—'} · ${((workers.utilization||0)*100).toFixed(0)}% 利用率 · ${workers.available_slots||0} 可用槽位`:'运行资源读取失败');
  const envWorker=$('#envWorker');
  if(envWorker&&available.runtime){
    const online=Number(workers.online||0), lost=Number(workers.heartbeat_lost||0);
    envWorker.textContent=lost?`${lost} 心跳异常`:(online?`${online} 在线`:'无在线实例');
    envWorker.style.color=lost?'var(--red)':(online?'var(--green)':'var(--amber)');
  }

  const gateFailed=evaluations.filter(item=>item.status==='completed'&&!item.gate_pass);
  const evaluating=evaluations.filter(item=>item.status!=='completed');
  const retryable=runs.filter(item=>item.status==='failed'&&item.error&&item.error.retryable).length;
  const actions=[];
  if(!available.runtime)actions.push({level:'fail',title:'运行资源状态读取失败',sub:'无法确认队列和 Worker 是否正常',onclick:"go('obs')"});
  (runtime.alerts||[]).forEach(item=>actions.push({level:item.severity==='critical'?'fail':'warn',title:item.message,sub:`${item.code} · 当前 ${item.value??'—'} / 阈值 ${item.threshold??'—'}`,onclick:"go('obs')"}));
  if(Number(reviews.total||0)>0)actions.push({level:'warn',title:`${reviews.total} 项人工审核等待处理`,sub:'进入审核工作台领取并作出决策',onclick:"go('review')"});
  if(gateFailed.length)actions.push({level:'fail',title:`${gateFailed.length} 个版本未通过评测门禁`,sub:'检查失败用例、契约和性能阈值',onclick:"go('evaluation')"});
  if(evaluating.length)actions.push({level:'warn',title:`${evaluating.length} 个评测任务仍在运行`,sub:'评测完成后才能确定版本是否可发布',onclick:"go('evaluation')"});
  if(retryable)actions.push({level:'warn',title:`${retryable} 个失败 Run 可重试`,sub:'查看错误详情并确认外部依赖恢复情况',onclick:"go('trace')"});
  const actionBox=$('#overviewActions');
  if(actionBox)actionBox.innerHTML=actions.length?actions.slice(0,6).map(item=>`<div class="overview-row" onclick="${item.onclick}"><span class="overview-mark ${item.level}"></span><div class="overview-row-main"><div class="overview-row-title">${esc(item.title)}</div><div class="overview-row-sub">${esc(item.sub)}</div></div><span class="card-s">查看</span></div>`).join(''):'<div class="overview-empty">当前没有需要处理的异常或待办</div>';
  put('overviewActionSub',actions.length?`${actions.length} 项需要关注`:'当前状态正常');

  const health=overviewAgentHealth(runs), healthBox=$('#overviewAgentHealth');
  if(healthBox)healthBox.innerHTML=!available.runs?'<tr><td colspan="6"><div class="overview-empty">运行数据读取失败</div></td></tr>':health.length?health.slice(0,8).map(item=>{
    const name=(AGENTS.find(agent=>agent.code===item.code)||{}).name||item.code;
    const label=item.level==='fail'?'异常':item.level==='warn'?'关注':'正常';
    return `<tr data-agent="${attr(item.code)}" onclick="overviewOpenAgent('${attr(item.code)}')"><td><b>${esc(name)}</b><div class="card-s mono">${esc(item.code)}</div></td><td>${item.runs}</td><td>${item.successRate==null?'—':(item.successRate*100).toFixed(1)+'%'}</td><td>${item.p95==null?'—':item.p95+'ms'}</td><td>${item.failed}</td><td><span class="overview-health ${item.level}">${label}</span></td></tr>`;
  }).join(''):'<tr><td colspan="6"><div class="overview-empty">近 24 小时没有运行数据</div></td></tr>';

  const failures=runs.filter(item=>item.status==='failed').slice(0,8), failureBox=$('#overviewRecentFailures');
  put('overviewFailureSub',!available.runs?'运行数据不可用':failures.length?`${failures.length} 条最近失败`:'近 24 小时全部成功');
  if(failureBox)failureBox.innerHTML=!available.runs?'<tr><td colspan="3"><div class="overview-empty">运行数据读取失败</div></td></tr>':failures.length?failures.map(item=>{
    const error=item.error||{}, code=error.code||'INTERNAL', message=error.message||'未记录详细原因';
    return `<tr data-run="${attr(item.run_id)}" onclick="overviewOpenRun('${attr(item.run_id)}')"><td class="mono">${esc(fmtTs(item.created_at))}</td><td><b>${esc(item.agent||item.agent_code||'—')}</b><div class="card-s mono">${esc(item.run_id)}</div></td><td><span class="mono" style="color:var(--red)">${esc(code)}</span><div class="card-s">${esc(message)}</div></td></tr>`;
  }).join(''):'<tr><td colspan="3"><div class="overview-empty">近 24 小时没有失败运行</div></td></tr>';

  const activeTriggers=triggers.filter(item=>item.status==='active').length;
  const releases=evaluations.slice(0,5).map(item=>{
    const running=item.status!=='completed', passed=!running&&!!item.gate_pass;
    return {level:running?'warn':passed?'ok':'fail',title:`${item.agent_code}@${item.agent_version} · ${running?'评测中':passed?'门禁通过':'门禁未通过'}`,sub:`${item.dataset_code||'—'} · ${item.passed_cases||0}/${item.total_cases||0} 用例通过 · ${fmtTs(item.completed_at||item.created_at)}`};
  });
  const releaseBox=$('#overviewReleases');
  if(releaseBox)releaseBox.innerHTML=!available.evaluations?'<div class="overview-empty">评测状态读取失败</div>':releases.length?releases.map(item=>`<div class="overview-row" onclick="go('evaluation')"><span class="overview-mark ${item.level}"></span><div class="overview-row-main"><div class="overview-row-title">${esc(item.title)}</div><div class="overview-row-sub">${esc(item.sub)}</div></div><span class="card-s">查看报告</span></div>`).join(''):'<div class="overview-empty">当前 Agent 还没有评测记录</div>';
  put('overviewReleaseSub',`${available.evaluations?evaluations.length:'—'} 条最近评测 · ${available.triggers?activeTriggers:'—'}/${available.triggers?triggers.length:'—'} 个触发器启用`);
  put('overviewUpdated','更新于 '+new Date().toLocaleTimeString('zh-CN',{hour12:false}));
}

async function refreshSummary(manual=false){
  const seq=++OVERVIEW_LOAD_SEQ, button=$('#overviewRefreshBtn');
  if(button&&manual){button.disabled=true;button.textContent='刷新中…';}
  if(MODE!=='live'){
    const actions=$('#overviewActions');if(actions)actions.innerHTML='<div class="overview-empty">后端未连接，无法读取实时概览</div>';
    if(button){button.disabled=false;button.textContent='刷新';}
    return;
  }
  const since=Math.floor(Date.now()/1000)-86400, scoped=!!CUR.code;
  const scope=new URLSearchParams({since:String(since)});if(scoped)scope.set('agent',CUR.code);
  const reviewQuery=new URLSearchParams({limit:'1'});if(scoped)reviewQuery.set('agent',CUR.code);
  const evalQuery=new URLSearchParams({limit:'20'});if(scoped)evalQuery.set('agent_code',CUR.code);
  try{
    const [summary,runtime,reviews,runs,evaluations,triggers]=await Promise.all([
      apiRaw('/v1/observability/runs/summary?'+scope.toString()),
      apiRaw('/v1/observability/runtime'),
      apiRaw('/v1/reviews?'+reviewQuery.toString()),
      apiRaw('/v1/runs?limit=200&since='+since),
      apiRaw('/v1/evaluations/runs?'+evalQuery.toString()),
      apiRaw('/v1/triggers'),
    ]);
    if(seq!==OVERVIEW_LOAD_SEQ)return;
    renderOverviewDashboard({
      summary:summary.ok?summary.body:null,runtime:runtime.ok?runtime.body:null,
      reviews:reviews.ok?reviews.body:null,runs:runs.ok?(runs.body.items||[]):null,
      evaluations:evaluations.ok?(evaluations.body.items||[]):null,triggers:triggers.ok?(triggers.body.items||[]):null,
    });
  }finally{
    if(button){button.disabled=false;button.textContent='刷新';}
  }
}

/** 可观测性页：全部字段来自后端，没有样例数据。取不到就显示 — / 空态。 */
let OBS_RUNTIME_TIMER = null;
let OBS_RUNTIME_LOADING = false;
let OBS_LOAD_SEQ = 0;
const OBS_FILTER = {project:'',agent:'',version:'',range:'86400'};

function obsProjectOptions(){
  const map=new Map();
  PROJECTS.forEach(project=>map.set(project.code,project.name||project.code));
  AGENTS.forEach(agent=>{
    const code=agent.project_code||'';
    if(code)map.set(code,(agent.project&&agent.project.name)||map.get(code)||code);
  });
  return [...map.entries()].sort((a,b)=>a[1].localeCompare(b[1],'zh-CN'));
}

function renderObsFilters(){
  const project=$('#obsProject'), agent=$('#obsAgent'), version=$('#obsVersion'), range=$('#obsRange');
  if(!project||!agent||!version||!range)return;
  const projects=obsProjectOptions();
  if(OBS_FILTER.project&&!projects.some(([code])=>code===OBS_FILTER.project))OBS_FILTER.project='';
  const agents=AGENTS.filter(item=>!OBS_FILTER.project||item.project_code===OBS_FILTER.project);
  if(OBS_FILTER.agent&&!agents.some(item=>item.code===OBS_FILTER.agent)){
    OBS_FILTER.agent='';OBS_FILTER.version='';
  }
  const selected=agents.find(item=>item.code===OBS_FILTER.agent);
  const versions=selected?(selected.versions||[]).map(item=>typeof item==='string'?item:item.version).filter(Boolean):[];
  if(OBS_FILTER.version&&!versions.includes(OBS_FILTER.version))OBS_FILTER.version='';
  project.innerHTML='<option value="">全部项目</option>'+projects.map(([code,name])=>`<option value="${attr(code)}"${code===OBS_FILTER.project?' selected':''}>${esc(name)} · ${esc(code)}</option>`).join('');
  agent.innerHTML='<option value="">全部 Agent</option>'+agents.map(item=>`<option value="${attr(item.code)}"${item.code===OBS_FILTER.agent?' selected':''}>${esc(item.name||item.code)} · ${esc(item.code)}</option>`).join('');
  version.innerHTML='<option value="">全部版本</option>'+versions.map(value=>`<option value="${attr(value)}"${value===OBS_FILTER.version?' selected':''}>${esc(value)}</option>`).join('');
  version.disabled=!OBS_FILTER.agent;
  range.value=OBS_FILTER.range;
  const labels=[];
  if(OBS_FILTER.project)labels.push('项目 '+OBS_FILTER.project);
  if(OBS_FILTER.agent)labels.push('Agent '+OBS_FILTER.agent);
  if(OBS_FILTER.version)labels.push('版本 '+OBS_FILTER.version);
  labels.push(range.options[range.selectedIndex]?.textContent||'近 24 小时');
  $('#obsScopeLabel').textContent=labels.join(' · ')||'当前账号可见范围';
}

function applyObsFilters(changed){
  if(changed==='project'){
    OBS_FILTER.project=$('#obsProject').value;
    const selected=AGENTS.find(item=>item.code===OBS_FILTER.agent);
    if(selected&&OBS_FILTER.project&&selected.project_code!==OBS_FILTER.project){OBS_FILTER.agent='';OBS_FILTER.version='';}
  }else if(changed==='agent'){
    OBS_FILTER.agent=$('#obsAgent').value;OBS_FILTER.version='';
  }else if(changed==='version')OBS_FILTER.version=$('#obsVersion').value;
  else if(changed==='range')OBS_FILTER.range=$('#obsRange').value;
  renderObsFilters();loadObs();
}

function obsScopeQuery(){
  const query=new URLSearchParams();
  if(OBS_FILTER.project)query.set('project',OBS_FILTER.project);
  if(OBS_FILTER.agent)query.set('agent',OBS_FILTER.agent);
  if(OBS_FILTER.version)query.set('version',OBS_FILTER.version);
  const seconds=Number(OBS_FILTER.range||86400);
  query.set('since',String(Math.floor(Date.now()/1000-seconds)));
  return query;
}

function renderObsNodePerformance(data){
  const recent=data&&data.recent_run, box=$('#obsNodes'), sub=$('#obsNodeSub');
  if(!recent){
    if(box)box.innerHTML='<div class="empty">当前范围没有持久化 node_end 事件</div>';
    if(sub)sub.textContent='—';
  }else{
    if(sub)sub.textContent=`${recent.agent}@${recent.version} · ${recent.run_id}`;
    const rows=(recent.nodes||[]).slice(0,8);
    if(box)box.innerHTML=rows.map(item=>`<div style="margin-bottom:9px"><div class="split" style="font-size:11px;color:var(--muted)"><span><span class="mono">${esc(item.node_id)}</span>${item.node_type?' · '+esc(item.node_type):''}</span><span>${Number(item.latency_ms||0)}ms · ${(Number(item.share||0)*100).toFixed(0)}%</span></div><div style="height:6px;background:#f1f2f5;border-radius:3px;margin-top:3px"><div style="height:100%;width:${Math.max(2,Number(item.share||0)*100)}%;background:${item.status==='error'?'#b91c1c':'#4f46e5'};border-radius:3px"></div></div></div>`).join('')||'<div class="empty">该 Run 没有顶层节点耗时</div>';
  }
  const items=(data&&data.items)||[], history=$('#obsNodeHistory'), historySub=$('#obsNodeHistorySub');
  if(historySub)historySub.textContent=`命中 ${Number(data&&data.matched_runs||0)} Run · 扫描最近 ${Number(data&&data.sampled_runs||0)} Run · ${items.length} 个节点维度`;
  if(history)history.innerHTML=items.length?items.slice(0,50).map(item=>`<tr><td><div>${esc(item.agent||'—')} · ${esc(item.version||'—')}</div></td><td><div class="mono">${esc(item.graph_id||'—')}</div><div class="card-s mono">${esc(item.graph_version||'—')}</div></td><td><div class="obs-node-name"><span class="mono">${esc(item.node_id)}</span><span class="tag">${esc(item.node_type||'未知')}</span></div></td><td class="mono">${Number(item.count||0)}</td><td class="mono">${Number(item.avg_latency_ms||0).toFixed(1)}ms</td><td class="mono">${Number(item.p50_latency_ms||0)}ms</td><td class="mono">${Number(item.p95_latency_ms||0)}ms</td><td class="mono">${Number(item.max_latency_ms||0)}ms</td><td style="color:${Number(item.error_rate||0)>0?'var(--red)':'var(--green)'}">${(Number(item.error_rate||0)*100).toFixed(1)}%</td></tr>`).join(''):'<tr><td colspan="9"><div class="empty">当前范围没有节点历史样本</div></td></tr>';
}

function scheduleObsRuntimeRefresh(active){
  if(OBS_RUNTIME_TIMER){ clearInterval(OBS_RUNTIME_TIMER); OBS_RUNTIME_TIMER = null; }
  if(active && MODE === 'live'){
    OBS_RUNTIME_TIMER = setInterval(()=>{
      if($('#view-obs').classList.contains('active')) loadRuntimeObs();
    }, 10000);
  }
}

function obsSeconds(value){
  if(value == null || Number.isNaN(Number(value))) return '—';
  const seconds=Number(value);
  if(seconds < 60) return seconds.toFixed(seconds < 10 ? 1 : 0) + 's';
  return (seconds / 60).toFixed(1) + 'm';
}

function renderRuntimeObs(data){
  const put=(id,value)=>{const el=$('#'+id);if(el)el.textContent=value};
  const queue=data.queue||{}, summary=data.summary||{}, thresholds=data.thresholds||{};
  put('obsQueueDepth',queue.depth==null?'—':fmt(Number(queue.depth)));
  put('obsQueueDepthD',`${queue.backend||'—'} · 阈值 ${thresholds.queue_depth??'—'}`);
  put('obsQueueOldest',obsSeconds(queue.oldest_wait_seconds));
  put('obsQueueOldestD',`告警阈值 ${obsSeconds(thresholds.queue_oldest_seconds)}`);
  put('obsWorkerOnline',String(summary.online??0));
  put('obsWorkerOnlineD',`draining ${summary.draining||0} · 心跳异常 ${summary.heartbeat_lost||0}`);
  const capacity=Number(summary.online_capacity||0), busy=Number(summary.busy||0);
  put('obsWorkerLoad',`${busy} / ${capacity}`);
  put('obsWorkerLoadD',`${((summary.utilization||0)*100).toFixed(0)}% 利用率 · ${summary.available_slots||0} 可用槽位`);
  put('obsQueueName',`${queue.name||'—'} · ${data.mode||'—'}`);
  put('obsRuntimeSub',`每 10 秒自动刷新 · ${new Date((data.generated_at||Date.now()/1000)*1000).toLocaleTimeString('zh-CN',{hour12:false})}`);

  const alerts=data.alerts||[], alertBox=$('#obsRuntimeAlert');
  if(alertBox){
    const kind=data.status==='critical'?'err':data.status==='warning'?'warn':'ok';
    const message=alerts.length?alerts.map(item=>`${item.code}：${item.message}`).join(' · '):'队列与 Worker 当前正常';
    alertBox.innerHTML=`<div class="vbar ${kind}"><b>${esc(message)}</b></div>`;
  }

  const body=$('#obsWorkers'), workers=data.workers||[];
  if(body) body.innerHTML=workers.length?workers.map(worker=>{
    const lost=!worker.alive&&worker.status!=='offline';
    const badge=lost?'fail':worker.status==='online'&&worker.alive?'ok':worker.status==='draining'?'wait':'';
    const status=lost?'heartbeat_lost':worker.status||'unknown';
    return `<tr><td><div>${esc(worker.executor_id||'—')}</div><div class="card-s mono">${esc(worker.host||'')} · pid ${esc(worker.pid||0)}</div></td>
      <td><span class="badge ${badge}">${esc(status)}</span></td>
      <td class="mono">${Number(worker.busy||0)} / ${Number(worker.concurrency||1)}</td>
      <td>${(Number(worker.utilization||0)*100).toFixed(0)}%</td>
      <td class="mono">${obsSeconds(worker.age_s)}</td>
      <td>${worker.accepting?`是 · ${Number(worker.available_slots||0)} 槽位`:'否'}</td></tr>`;
  }).join(''):'<tr><td colspan="6"><div class="empty">没有登记到 Worker</div></td></tr>';

  const samples=$('#obsQueueSamples'), items=queue.sampled||[];
  if(samples) samples.innerHTML=items.length?items.map(item=>
    `<span style="display:inline-block;margin:0 12px 5px 0">${esc(item.run_id||'无法解析')} · ${esc(item.kind||'execute')} · ${obsSeconds(item.wait_seconds)}</span>`
  ).join(''):'当前没有排队任务';
}

async function loadRuntimeObs(){
  if(MODE!=='live'||OBS_RUNTIME_LOADING)return;
  OBS_RUNTIME_LOADING=true;
  try{
    const response=await apiRaw('/v1/observability/runtime');
    if(!response.ok)throw new Error(response.body.message||'运行资源监控读取失败');
    renderRuntimeObs(response.body);
  }catch(error){
    const box=$('#obsRuntimeAlert');
    if(box)box.innerHTML=`<div class="vbar err"><b>运行资源监控不可用：${esc(error.message)}</b></div>`;
  }finally{OBS_RUNTIME_LOADING=false}
}

async function loadObs(){
  const seq=++OBS_LOAD_SEQ;
  const put = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  const at = $('#obsAt'); if(at) at.textContent = new Date().toLocaleTimeString('zh-CN', { hour12:false });
  renderObsFilters();

  if(MODE !== 'live'){
    ['obsRuns', 'obsSucc', 'obsP95', 'obsCost'].forEach(id => put(id, '—'));
    const l = $('#obsLat'), n = $('#obsNodes'), h=$('#obsNodeHistory');
    if(l) l.innerHTML = '<div class="empty">离线模式：没有后端数据可统计</div>';
    if(n) n.innerHTML = '<div class="empty">离线模式：没有后端数据可统计</div>';
    if(h)h.innerHTML='<tr><td colspan="9"><div class="empty">离线模式：没有后端数据可统计</div></td></tr>';
    return;
  }

  await loadRuntimeObs();
  const query=obsScopeQuery(), suffix='?'+query.toString();

  try{
    const s = await apiJSON('/v1/observability/runs/summary'+suffix);
    if(seq!==OBS_LOAD_SEQ)return;
    put('obsRuns', fmt(s.runs || 0));
    const done0 = s.done || 0, pend0 = s.pending || 0;
    const sc = s.status_counts || {};
    const other = Object.entries(sc).filter(([k]) => k !== 'succeeded' && k !== 'failed')
      .map(([k, v]) => `${k} ${v}`).join(' · ');
    put('obsRunsD', `${$('#obsScopeLabel').textContent} · 终态 ${done0}` + (other ? ' · ' + other : ''));
    put('obsSucc', s.success_rate == null ? '—' : (s.success_rate * 100).toFixed(1) + '%');
    put('obsP95', s.p95_latency_ms == null ? '—' : (s.p95_latency_ms / 1000).toFixed(2) + 's');
    put('obsP95D', done0 ? `最近秩 p95 · ${done0} 次终态` : '没有终态 run');
    const fx = (s.pricing && s.pricing.fx_cny) || 7.2;
    put('obsCost', s.cost_source && s.cost_source !== 'none' ? '¥' + ((s.cost_usd || 0) * fx).toFixed(3) : '—');
    put('obsCostD', fmt(s.tokens || 0) + ' tok · ' + costNote(s));
    const done = done0, pend = pend0;
    const fail = done ? Math.round(done * (1 - (s.success_rate || 0))) : 0;
    put('obsSuccD', done
      ? `${fail} 次非成功 / ${done} 次终态` + (pend ? ` · ${pend} 未计入` : '')
      : '还没有终态 run');
  }catch(e){ /* 保持 — */ }

  await loadServerRuns(query,{renderTrace:false});
  if(seq!==OBS_LOAD_SEQ)return;

  // 最近 run 耗时（真实 run.latency_ms）
  const box = $('#obsLat');
  const timed = RUNS.filter(r => r.total).slice(0, 10);
  if(box){
    if(!timed.length) box.innerHTML = '<div class="empty">还没有可统计的 run</div>';
    else{
      const max = Math.max(...timed.map(r => r.total));
      box.innerHTML = timed.map(r => `
        <div style="margin-bottom:6px">
          <div class="split" style="font-size:10.5px;color:var(--muted)">
            <span><span class="mono">${esc(r.id)}</span> · ${esc(r.agent)}@${esc(r.version)}</span><span>${r.total}ms · ${esc(r.status)}</span></div>
          <div style="height:6px;background:#f1f2f5;border-radius:3px;margin-top:3px">
            <div style="height:100%;width:${Math.max(3, r.total / max * 100)}%;border-radius:3px;background:${r.status === 'failed' ? '#b91c1c' : '#4f46e5'}"></div>
          </div>
        </div>`).join('');
    }
  }

  try{
    const nodeData=await apiJSON('/v1/observability/nodes'+suffix);
    if(seq!==OBS_LOAD_SEQ)return;
    renderObsNodePerformance(nodeData);
  }catch(error){
    const nb=$('#obsNodes'), history=$('#obsNodeHistory');
    if(nb)nb.innerHTML=`<div class="empty">节点性能读取失败：${esc(error.message)}</div>`;
    if(history)history.innerHTML=`<tr><td colspan="9"><div class="empty">节点历史读取失败：${esc(error.message)}</div></td></tr>`;
  }

  // 最近失败
  const fails = RUNS.filter(r => r.status === 'failed');
  const fs = $('#obsFailSub'); if(fs) fs.textContent = fails.length ? fails.length + ' 条' : '最近 ' + RUNS.length + ' 次全部成功';
  const fb = $('#obsFails');
  if(fb) fb.innerHTML = fails.length ? fails.map(r => `<tr>
      <td class="mono">${esc(r.id)}</td><td>${esc(r.agent)} · ${esc(r.version)}</td>
      <td class="mono" style="color:var(--red)">${esc((r.error && r.error.code) || '—')}</td>
      <td class="mono">${esc(r.time || '')}</td></tr>`).join('')
    : '<tr><td colspan="4"><div class="empty">没有失败记录</div></td></tr>';
}

/* ============ 上下文 ============ */
const MEMORY_GOV = {items:[], detail:null, busy:false};

function memoryKnowledgeOptions(value){
  const active = KNOWLEDGE_BASES.filter(x => x.status === 'active');
  return '<option value="">请选择知识库</option>' + active.map(x =>
    `<option value="${attr(x.code)}"${x.code === value ? ' selected' : ''}>${esc(x.name)} · ${esc(x.code)}</option>`).join('');
}

function syncMemoryKnowledgeOptions(){
  const ctx = $('#ctxKnowledge'), form = $('#memoryKnowledge');
  if(!ctx || !form) return;
  const previous = ctx.value;
  const active = KNOWLEDGE_BASES.filter(x => x.status === 'active');
  const selected = active.some(x => x.code === previous) ? previous : (active[0] && active[0].code) || '';
  ctx.innerHTML = memoryKnowledgeOptions(selected);
  ctx.value = selected;
  form.innerHTML = memoryKnowledgeOptions(selected);
  form.value = selected;
  const write = $('#memoryWriteBtn');
  if(write) write.disabled = !selected || (AUTH.enabled && !authCan('agent.manage'));
}

async function loadMemoryWorkbench(){
  if(MODE !== 'live') return;
  if(!KNOWLEDGE_BASES.length) await loadKnowledgeBases();
  else syncMemoryKnowledgeOptions();
  await loadMemoryList();
  await loadContextRuns();
}

const CONTEXT_DEBUG = {runs:[]};

async function loadContextRuns(){
  const select=$('#contextRunSelect');
  if(!select || MODE !== 'live') return;
  try{
    const body=await apiJSON('/v1/runs?limit=50');
    const terminal=new Set(['succeeded','succeeded_with_warnings','failed','interrupted']);
    CONTEXT_DEBUG.runs=(body.items||[]).filter(item=>terminal.has(item.status));
    const current=select.value;
    select.innerHTML='<option value="">选择最近运行</option>'+CONTEXT_DEBUG.runs.map(item=>{
      const id=item.run_id||item.id||'';
      return `<option value="${attr(id)}">${esc(item.agent||item.agent_code||'—')} · ${esc(item.version||item.agent_version||'—')} · ${esc(item.status)} · ${esc(String(id).slice(0,12))}</option>`;
    }).join('');
    if(CONTEXT_DEBUG.runs.some(item=>(item.run_id||item.id)===current)) select.value=current;
  }catch(e){
    $('#contextRunDebug').innerHTML=`<div class="empty">运行列表读取失败：${esc(e.message)}</div>`;
  }
}

async function readRunEventFrames(runId){
  const resp=await fetch(API+'/v1/runs/'+encodeURIComponent(runId)+'/events');
  if(!resp.ok) throw new Error('HTTP '+resp.status);
  const text=await resp.text();
  const events=[];
  text.split(/\n\n+/).forEach(frame=>{
    const line=frame.split('\n').find(value=>value.startsWith('data:'));
    if(!line) return;
    try{ const event=JSON.parse(line.slice(5).trim()); if(event&&event.type) events.push(event); }catch(_){}
  });
  return events;
}

function contextDebugNode(node, events){
  const manifest=(events.find(event=>event.type==='context_manifest')||{}).manifest||{};
  const classified=events.find(event=>event.type==='context_classified')||{};
  const compressed=events.find(event=>event.type==='context_compressed')||{};
  const reliability=events.find(event=>event.type==='context_reliability')||{};
  const retrieval=events.find(event=>event.type==='context_retrieved')||{};
  const sources=manifest.sources||[];
  const rows=sources.map(source=>`<tr>
    <td><span class="tag">${esc(source.source||'—')}</span><div class="card-s mono">${esc(source.path||'—')}</div></td>
    <td><span class="badge ${source.status==='included'?'ok':'fail'}">${source.status==='included'?'装入':'丢弃'}</span>${source.reason?`<div class="card-s">${esc(source.reason)}</div>`:''}</td>
    <td class="mono">${Number(source.tokens||0)}</td><td class="mono">${source.rank_score==null?'—':Number(source.rank_score).toFixed(3)}</td>
    <td class="mono">${source.rank_signals&&source.rank_signals.relevance!=null?Number(source.rank_signals.relevance).toFixed(3):'—'}</td>
    <td>${source.truncated?'已截断':'—'}${source.compressed?' · 已压缩':''}</td></tr>`).join('');
  const budget=manifest.budget||{}, loads=manifest.loads||{}, processing=manifest.model_processing||{};
  return `<div class="card" style="margin-bottom:10px">
    <div class="card-h"><div><div class="card-t mono">${esc(node)}</div><div class="card-s">策略 v${manifest.policy_version||'—'} · ${esc(String(manifest.policy_digest||'').slice(0,12))}</div></div>
      <div style="flex:1"></div><span class="badge ${Number(budget.estimated_total||0)<=Number(budget.max_tokens||0)?'ok':'fail'}">${Number(budget.estimated_total||0)} / ${Number(budget.max_tokens||0)} tokens</span></div>
    <div class="card-b">
      <div class="grid g4" style="margin-bottom:10px">
        <div class="stat"><div class="stat-v">${sources.filter(x=>x.status==='included').length}</div><div class="stat-k">装入来源</div></div>
        <div class="stat"><div class="stat-v">${Number(classified.blocked||0)}</div><div class="stat-k">语义拦截 / ${Number(classified.examined||0)}</div></div>
        <div class="stat"><div class="stat-v">${Number(compressed.history_summarized||0)+Number(compressed.evidence_summarized||0)}</div><div class="stat-k">摘要压缩</div></div>
        <div class="stat"><div class="stat-v">${Number(reliability.calls||0)}</div><div class="stat-k">上下文模型调用</div></div>
      </div>
      <div class="hint" style="margin-bottom:8px">会话加载 ${esc(JSON.stringify(loads.loaded||[]))} · 自动检索 ${retrieval.executed?`${Number(retrieval.hits||0)} 条`:(processing.retrieval&&processing.retrieval.reason)||'未执行'} · 缓存命中 ${Number(reliability.cache_hits||0)} · 调用耗时 ${Number(reliability.latency_ms||0).toFixed(1)}ms${classified.degraded||compressed.degraded?' · 已降级':''}</div>
      <table><thead><tr><th>来源 / 路径</th><th>决策</th><th>Token</th><th>综合分</th><th>相关度</th><th>处理</th></tr></thead><tbody>${rows||'<tr><td colspan="6"><div class="empty">该节点没有可展示的来源；事件不会记录上下文正文</div></td></tr>'}</tbody></table>
    </div></div>`;
}

async function loadContextRunDebug(runId){
  if(!runId){ $('#contextRunDebug').innerHTML='<div class="empty">选择一个包含 LLM 节点的运行查看上下文决策</div>'; return; }
  $('#contextRunDebug').innerHTML='<div class="empty">正在读取运行事件…</div>';
  try{
    const events=await readRunEventFrames(runId);
    const manifests=events.filter(event=>event.type==='context_manifest');
    const nodes=[...new Set(manifests.map(event=>String(event.node||'unknown')))];
    $('#contextRunDebug').innerHTML=nodes.length?nodes.map(node=>contextDebugNode(node,events.filter(event=>String(event.node||'unknown')===node))).join(''):'<div class="empty">该运行没有 context_manifest；请确认 Agent 版本启用了 context_policy 且运行经过 LLM 节点</div>';
  }catch(e){ $('#contextRunDebug').innerHTML=`<div class="empty">上下文事件读取失败：${esc(e.message)}</div>`; }
}

async function contextKnowledgeChanged(){
  await loadMemoryList();
  recall();
}

function syncRerankControls(enabled, candidateId, minScoreId){
  const candidate=$(candidateId), minScore=$(minScoreId);
  [candidate,minScore].filter(Boolean).forEach(input=>{
    input.disabled=!enabled;
    input.title=enabled?'':'仅启用 Rerank 时生效';
  });
}

function contextRerankChanged(){
  syncRerankControls($('#ctxRerank').checked,'#ctxCandidateTopN','#ctxRerankMinScore');
}

function knowledgeRerankChanged(){
  syncRerankControls($('#knowledgeSearchRerank').checked,
    '#knowledgeSearchCandidateTopN','#knowledgeSearchMinScore');
}

let CONTEXT_RECALL_BUSY = false;

function setContextRecallBusy(busy){
  CONTEXT_RECALL_BUSY = busy;
  const button = $('#contextRecallBtn');
  if(!button) return;
  button.disabled = busy;
  button.classList.toggle('loading', busy);
  if(busy){
    button.setAttribute('aria-busy', 'true');
    button.textContent = '召回中…';
  }else{
    button.removeAttribute('aria-busy');
    button.textContent = '召回';
  }
}

/* 只展示真实召回；后端不可用时不生成本地假数据。 */
async function recall(){
  if(CONTEXT_RECALL_BUSY) return;
  if(MODE !== 'live'){
    $('#hits').innerHTML = '<div class="empty">后端不可用，无法执行真实召回</div>';
    return;
  }
  const knowledge = $('#ctxKnowledge').value;
  if(!knowledge){
    $('#hits').innerHTML = '<div class="empty">请先选择要测试的知识库</div>';
    $('#fuseMeta').textContent = '未选择知识库';
    return;
  }
  const query = $('#q').value.trim();
  if(!query){
    $('#hits').innerHTML = '<div class="empty">请输入需要检索的问题后再召回</div>';
    $('#fuseMeta').textContent = '等待输入问题';
    return;
  }
  const rerankEnabled=$('#ctxRerank').checked;
  setContextRecallBusy(true);
  $('#hits').innerHTML = '<div class="empty">正在召回并装配上下文…</div>';
  try{
    const b = await apiJSON('/v1/context/recall', {
      method: 'POST',
      body: JSON.stringify({
        query,
        session_id: 's_demo', top_k: Number($('#ctxTopK').value || 5), knowledge_base: knowledge,
        rerank: rerankEnabled,
        candidate_top_n: rerankEnabled?Number($('#ctxCandidateTopN').value || 20):Number($('#ctxTopK').value || 5),
        rerank_min_score: rerankEnabled?Number($('#ctxRerankMinScore').value || 0):0,
        use_milvus: $('#srcMilvus').checked,
        use_redis: $('#srcRedis').checked
      })
    });
    renderServerRecall(b);
  }catch(e){
    $('#hits').innerHTML = `<div class="empty">召回失败：${esc(e.message)}</div>`;
  }finally{
    setContextRecallBusy(false);
  }
}

function routeTags(d){
  // M1 之后命中全部来自 Milvus 三路（dense / sparse=BM25 / sparse_m3=bge-m3），
  // 服务端 hits[].sources 是命中路列表；旧的二值 milvus/es 分类已随 ES 退役。
  const routes = (d.sources && d.sources.length ? d.sources : [d.source]).filter(Boolean);
  const NAME = { dense: 'MILVUS·稠密', sparse: 'MILVUS·BM25', sparse_m3: 'MILVUS·M3' };
  const seen = [...new Set(routes)];
  return seen.map(s => {
    const known = s in NAME;
    return `<span class="tag ${known ? 'vec' : 'bm25'}">${known ? NAME[s] : esc(String(s).toUpperCase())}</span>`;
  }).join('');
}

function recallHitManagementHtml(hit, surface){
  const metadata = hit.metadata || {};
  const canManage = !AUTH.enabled || authCan('agent.manage');
  const manageAttrs = canManage ? '' : ' disabled title="缺少 agent.manage 权限"';
  const common = `data-surface="${attr(surface || 'context')}"`;
  if(metadata.document_id){
    const knowledgeBase = metadata.knowledge_base || '';
    const documentId = metadata.document_id || '';
    const fileName = metadata.file_name || hit.title || documentId;
    const documentAttrs = `${common} data-knowledge-base="${attr(knowledgeBase)}" data-document-id="${attr(documentId)}" data-file-name="${attr(fileName)}"`;
    const locateDisabled = !knowledgeBase || !documentId ? ' disabled title="召回结果缺少文档来源信息"' : '';
    return `<div class="hit-management" aria-label="文档切片管理">
      <button class="btn sm" ${documentAttrs}${locateDisabled} onclick="locateRecallDocument(this)">定位文档</button>
      <button class="btn sm" ${documentAttrs}${manageAttrs} onclick="manageRecallDocument('disable',this)">停用文档</button>
      <button class="btn sm danger" ${documentAttrs}${manageAttrs} onclick="manageRecallDocument('delete',this)">删除文档</button>
    </div>`;
  }
  const memoryId = hit.id || hit.memory_id || '';
  const memoryAttrs = `${common} data-memory-id="${attr(memoryId)}" data-memory-title="${attr(hit.title || memoryId)}"`;
  return `<div class="hit-management" aria-label="普通记忆管理">
    <button class="btn sm" ${memoryAttrs} onclick="openRecallMemory(this)">查看</button>
    <button class="btn sm danger" ${memoryAttrs}${manageAttrs} onclick="deleteRecallMemory(this)">删除</button>
  </div>`;
}

async function refreshRecallSurface(surface){
  if(surface === 'knowledge') await knowledgeSearch();
  else await recall();
}

function openRecallMemory(button){
  const memoryId = button && button.dataset.memoryId;
  if(memoryId) openMemoryDetail(memoryId);
}

async function deleteRecallMemory(button){
  if(!button || button.disabled) return;
  await deleteMemory(button.dataset.memoryId, button.dataset.memoryTitle, button, button.dataset.surface || 'context');
}

async function locateRecallDocument(button){
  if(!button || button.disabled) return;
  const code = button.dataset.knowledgeBase, documentId = button.dataset.documentId;
  if(!code || !documentId){ toast('召回结果缺少知识库或文档来源信息'); return; }
  go('knowledge', {noLoad:true});
  await loadKnowledgePage(code);
  await knowledgeDocumentSelect(documentId);
  const target = $('#knowledgeDocumentPreview') || $('#knowledgeDocuments');
  if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
}

async function manageRecallDocument(action, button){
  if(!button || button.disabled) return;
  if(AUTH.enabled && !authCan('agent.manage')){ toast('缺少 agent.manage 权限'); return; }
  const code = button.dataset.knowledgeBase, documentId = button.dataset.documentId;
  const fileName = button.dataset.fileName || documentId;
  if(!code || !documentId){ toast('召回结果缺少知识库或文档来源信息'); return; }
  const deleting = action === 'delete';
  const message = deleting
    ? `将物理删除文档“${fileName}”、全部切片、检索真源和向量索引，确认继续？`
    : `停用文档“${fileName}”？其切片将从召回结果中移除，但保留文档真源。`;
  if(!confirm(message)) return;
  const originalLabel = button.textContent;
  button.disabled = true; button.classList.add('loading'); button.setAttribute('aria-busy','true');
  button.textContent = deleting ? '删除中…' : '停用中…';
  const base = '/v1/knowledge-bases/' + encodeURIComponent(code) + '/documents/' + encodeURIComponent(documentId);
  try{
    const options = deleting
      ? {method:'DELETE'}
      : {method:'PATCH', body:JSON.stringify({enabled:false})};
    const r = await apiRaw(deleting ? base : base + '/state', options);
    if(!r.ok){ toast(r.body.message || (deleting ? '文档删除失败' : '文档停用失败')); return; }
    toast(deleting ? '文档及其检索数据已删除' : '文档已停用并移出召回');
    await loadMemoryList();
    if(KNOWLEDGE_GOV.code === code && KNOWLEDGE_GOV.detail){
      if(KNOWLEDGE_GOV.document && KNOWLEDGE_GOV.document.document_id === documentId) KNOWLEDGE_GOV.document = null;
      await knowledgeReloadDocuments();
      renderKnowledgeDocumentPreview();
    }
    await refreshRecallSurface(button.dataset.surface || 'context');
  }finally{
    if(button.isConnected){
      button.disabled = false; button.classList.remove('loading'); button.removeAttribute('aria-busy');
      button.textContent = originalLabel;
    }
  }
}

function renderServerRecall(b){
  const hits = b.hits || [];
  const rr = b.rerank || {};
  const rrStatus = rr.requested ? (rr.applied
    ? `<div class="vbar"><b>Rerank 已应用</b> ${esc(rr.model || '—')} · ${Number(rr.latency_ms || 0).toFixed(1)}ms · ${rr.input_count || 0} → ${rr.output_count || 0}</div>`
    : rr.degraded ? `<div class="vbar warn"><b>Rerank 已降级</b> ${esc(rr.error || '调用失败')}</div>`
    : `<div class="vbar"><b>Rerank 未执行</b> 当前没有可重排候选</div>`)
    : `<div class="vbar warn"><b>仅 RRF 排序</b> 不执行语义相关度判定，RRF 排名分不能用于最低分过滤</div>`;
  $('#hits').innerHTML = rrStatus + (hits.length ? hits.map((d, i) => `
    <div class="hit">
      <div class="hit-h">
        <span class="mono" style="font-size:10px;color:var(--faint)">${String(i + 1).padStart(2, '0')}</span>
        <span class="hit-t">${esc(d.title)}</span>
        <span style="margin-left:auto;display:flex;gap:4px">${routeTags(d)}</span>
      </div>
      <div class="hit-s">${esc(d.content)}</div>
      <div class="hit-f">
        <span class="mono">${esc(d.id)}</span>
        <span>·</span><span>${esc((d.metadata && d.metadata.type) || '—')}</span>
        <span>RRF 排名分（非相关度）</span>
        <div class="score-wrap"><div class="score-bar" style="width:${Math.round(Math.min(1, d.rank_score || d.score || 0) * 100)}%"></div></div>
        <span class="mono" title="各路原始分：${attr(JSON.stringify(d.source_scores || {}))}">${Number(d.rank_score || 0).toFixed(3)}</span>
        ${d.rerank_score != null?`<span>Rerank</span><span class="mono">${Number(d.rerank_score).toFixed(3)}</span>`:''}
        <span>·</span><span>${d.tokens || 0} tok</span>
        ${recallHitManagementHtml(d,'context')}
      </div>
    </div>`).join('') : '<div class="empty">当前召回源组合无命中</div>');
  $('#fuseMeta').textContent = `${(b.fused_by || '—').toUpperCase()}${rr.applied?' + RERANK':''} · 命中 ${hits.length}`;
  const bg = b.budget || {};
  const max = bg.max || 8000;
  // history 是"预留额度"，history_used 才是实装量：画条形图和合计要用实装，
  // 否则没历史时账面上也画着 1200 tokens 的假账。
  const histUsed = (bg.history_used != null ? bg.history_used : bg.history) || 0;
  const bar = $('#budgetBar').children;
  bar[0].style.width = ((bg.system || 0) + (bg.task || 0)) / max * 100 + '%';
  bar[1].style.width = (bg.retrieved || 0) / max * 100 + '%';
  bar[2].style.width = histUsed / max * 100 + '%';
  bar[3].style.width = (bg.output_reserve || 0) / max * 100 + '%';
  $('#budgetTxt').textContent = fmt(bg.total || 0) + ' / ' + fmt(max) + ' tokens';
  $('#bRet').textContent = fmt(bg.retrieved || 0);
  $('#budgetLegend').innerHTML = [
    ['#c7cbff', 'system + 任务', (bg.system || 0) + (bg.task || 0)],
    ['#bfe3cb', '检索上下文', bg.retrieved || 0],
    ['#f6dfbd', '会话历史' + (bg.history_used != null && bg.history_used !== bg.history
      ? `（实装 ${fmt(histUsed)} / 预留 ${fmt(bg.history)}）` : ''), histUsed],
    ['#d5d9e0', '输出预留', bg.output_reserve || 0]
  ].map(([c, n, v]) => `<span><i style="background:${c}"></i>${n} ${fmt(v)}</span>`).join('');
  const slots = b.slots || {};
  $('#slots').innerHTML = Object.keys(slots).length
    ? Object.entries(slots).map(([k, v]) =>
        `<div class="slot-row"><span class="slot-k mono">${esc(k)}</span><span class="slot-v">${esc(typeof v === 'string' ? v : JSON.stringify(v))}</span></div>`).join('')
    : '<div class="empty">会话槽位为空（未勾选 Redis 或无历史）</div>';
  if(b.trimmed && b.trimmed.length) toast('预算裁剪 ' + b.trimmed.length + ' 条低分证据');
}

function setMemoryFormReadonly(readonly){
  ['memoryKnowledge','memoryType','memoryTitle','memoryContent','memoryImportance'].forEach(id => {
    const el = $('#' + id); if(el) el.disabled = readonly;
  });
  $('#memoryWriteSubmit').style.display = readonly ? 'none' : '';
}

function openMemoryWrite(){
  if(MODE !== 'live'){ toast('后端不可用，无法写入记忆'); return; }
  if(AUTH.enabled && !authCan('agent.manage')){ toast('缺少 agent.manage 权限'); return; }
  MEMORY_GOV.detail = null;
  $('#memoryWriteTitle').textContent = '写入长期记忆';
  $('#memoryWriteSub').textContent = '写入 MySQL 真源并建立 Milvus 索引';
  $('#memoryKnowledge').innerHTML = memoryKnowledgeOptions($('#ctxKnowledge').value);
  $('#memoryKnowledge').value = $('#ctxKnowledge').value;
  $('#memoryType').value = 'semantic'; $('#memoryTitle').value = '';
  $('#memoryContent').value = ''; $('#memoryImportance').value = '0.5';
  $('#memoryId').value = ''; $('#memoryWriteError').textContent = '';
  $('#memoryMeta').textContent = '租户、敏感级别与保留期限由所选知识库决定；操作会记录当前登录用户。';
  setMemoryFormReadonly(false);
  $('#memoryWriteMask').classList.add('on');
}

function closeMemoryWrite(){
  if(MEMORY_GOV.busy) return;
  $('#memoryWriteMask').classList.remove('on');
}

async function submitMemory(){
  if(MEMORY_GOV.busy) return;
  const body = {
    knowledge_base:$('#memoryKnowledge').value,
    title:$('#memoryTitle').value.trim(), content:$('#memoryContent').value.trim(),
    type:$('#memoryType').value, importance:Number($('#memoryImportance').value)
  };
  if(!body.knowledge_base || !body.title || !body.content){
    $('#memoryWriteError').textContent = '知识库、标题和正文不能为空'; return;
  }
  MEMORY_GOV.busy = true;
  const btn = $('#memoryWriteSubmit'); btn.disabled = true; btn.textContent = '写入中…';
  $('#memoryWriteError').textContent = '';
  const r = await apiRaw('/v1/context/memory',{method:'POST',body:JSON.stringify(body)});
  MEMORY_GOV.busy = false; btn.disabled = false; btn.textContent = '确认写入';
  if(!r.ok){ $('#memoryWriteError').textContent = r.body.message || '写入失败'; return; }
  $('#memoryWriteMask').classList.remove('on');
  $('#ctxKnowledge').value = body.knowledge_base;
  toast(r.body.pending_index ? '记忆已落库，索引等待补偿' : '记忆已写入并完成 Milvus 索引');
  await loadMemoryList(); recall();
}

function memorySource(item){
  if(item.document) return `文档 · ${item.document.file_name || ''}`;
  if(item.source_run_id) return `Agent Run · ${item.source_run_id}`;
  return '人工写入';
}

function memoryTime(value){
  if(!value) return '—';
  const date = new Date(typeof value === 'number' ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN',{hour12:false});
}

async function loadMemoryList(){
  const box = $('#memoryList'), count = $('#memoryCount');
  if(!box || MODE !== 'live') return;
  const kb = $('#ctxKnowledge').value;
  if(!kb){ box.innerHTML = '<div class="empty">选择知识库后查看记忆</div>'; count.textContent = '—'; return; }
  box.innerHTML = '<div class="empty">读取中…</div>';
  const r = await apiRaw(`/v1/memory?knowledge_base=${encodeURIComponent(kb)}&limit=100`);
  if(!r.ok){ box.innerHTML = `<div class="empty">${esc(r.body.message || '记忆列表读取失败')}</div>`; return; }
  MEMORY_GOV.items = r.body.items || []; count.textContent = MEMORY_GOV.items.length + ' 条';
  const canManage = !AUTH.enabled || authCan('agent.manage');
  box.innerHTML = MEMORY_GOV.items.length ? `<table><thead><tr><th>标题 / 内容</th><th>类型</th><th>来源</th><th>索引</th><th>创建时间</th><th></th></tr></thead><tbody>${MEMORY_GOV.items.map(item => `
    <tr><td><div style="font-weight:500">${esc(item.title || '未命名记忆')}</div><div class="memory-content" title="${attr(item.content || '')}">${esc(item.content || '')}</div><div class="mono">${esc(item.memory_id)}</div></td>
    <td>${esc(item.mem_type || '—')}<br><span class="mono">重要度 ${Number(item.importance || 0).toFixed(1)}</span></td>
    <td>${esc(memorySource(item))}</td>
    <td><span class="badge ${item.indexed_at ? 'ok' : 'wait'}">${item.indexed_at ? '已索引' : '待索引'}</span>${item.index_error ? `<div class="mono" title="${attr(item.index_error)}">${esc(item.index_error)}</div>` : ''}</td>
    <td>${esc(memoryTime(item.created_at))}</td><td><div class="act"><button class="btn sm" onclick="openMemoryDetail('${attr(item.memory_id)}')">查看</button>${canManage && !item.document ? `<button class="btn sm danger" onclick="deleteMemory('${attr(item.memory_id)}')">删除</button>` : ''}</div></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">当前知识库还没有长期记忆</div>';
}

async function openMemoryDetail(memoryId){
  const r = await apiRaw('/v1/memory/' + encodeURIComponent(memoryId));
  if(!r.ok){ toast(r.body.message || '记忆详情读取失败'); return; }
  const item = r.body; MEMORY_GOV.detail = item;
  $('#memoryWriteTitle').textContent = '记忆详情';
  $('#memoryWriteSub').textContent = memorySource(item);
  $('#memoryKnowledge').innerHTML = memoryKnowledgeOptions(item.knowledge_base || '');
  $('#memoryKnowledge').value = item.knowledge_base || '';
  $('#memoryType').value = item.mem_type || 'semantic'; $('#memoryTitle').value = item.title || '';
  $('#memoryContent').value = item.content || ''; $('#memoryImportance').value = item.importance || 0;
  $('#memoryId').value = item.memory_id || '';
  $('#memoryMeta').textContent = `租户 ${item.tenant_id || '—'} · 命中 ${item.hit_count || 0} 次 · 访问 ${item.access_count || 0} 次 · ${item.indexed_at ? '已建立索引' : '等待索引'}`;
  $('#memoryWriteError').textContent = item.index_error || '';
  setMemoryFormReadonly(true); $('#memoryWriteMask').classList.add('on');
}

async function deleteMemory(memoryId, title, button, refreshSurface){
  if(AUTH.enabled && !authCan('agent.manage')){ toast('缺少 agent.manage 权限'); return; }
  const item = MEMORY_GOV.items.find(x => x.memory_id === memoryId);
  const displayTitle = title || (item && item.title) || memoryId;
  if(!memoryId || !confirm(`物理删除记忆“${displayTitle}”及其 Milvus 索引？`)) return;
  const originalLabel = button && button.textContent;
  if(button){button.disabled=true;button.classList.add('loading');button.setAttribute('aria-busy','true');button.textContent='删除中…'}
  try{
    const r = await apiRaw('/v1/memory/' + encodeURIComponent(memoryId),{method:'DELETE'});
    if(!r.ok){ toast(r.body.message || '记忆删除失败'); return; }
    toast(r.body.index_deleted ? '记忆及索引已删除' : '记忆已删除，索引清理由真源过滤兜底');
    await loadMemoryList();
    await refreshRecallSurface(refreshSurface || 'context');
  }finally{
    if(button&&button.isConnected){button.disabled=false;button.classList.remove('loading');button.removeAttribute('aria-busy');button.textContent=originalLabel}
  }
}

/* ============ 知识库治理 ============ */
const KNOWLEDGE_GOV = {items:[], code:null, detail:null, documents:[], document:null, search:null,pollTimer:null};
const KNOWLEDGE_DELETE = {code:null, name:null, busy:false};
const knowledgeCodes = value => String(value || '').split(',').map(x => x.trim()).filter(Boolean);
const knowledgeCsv = value => (value || []).join(', ');

function renderKnowledgeList(){
  const box = $('#knowledgeList'), count = $('#knowledgeCount');
  if(!box || !count) return;
  count.textContent = KNOWLEDGE_GOV.items.length + ' 个';
  box.innerHTML = KNOWLEDGE_GOV.items.length ? KNOWLEDGE_GOV.items.map(item => `
    <div class="gov-agent ${item.code === KNOWLEDGE_GOV.code ? 'on' : ''}" onclick="knowledgeSelect('${attr(item.code)}')">
      <div class="g-n"><span>${esc(item.name)}</span><span class="badge ${item.status === 'active' ? 'ok' : 'fail'}">${item.status === 'active' ? '启用' : '停用'}</span></div>
      <small class="mono">${esc(item.code)} · ${esc(item.tenant_id)}</small>
    </div>`).join('') : '<div class="empty">还没有已登记的知识库</div>';
}

async function loadKnowledgePage(code){
  const detail = $('#knowledgeDetail');
  if(MODE !== 'live'){
    if(detail) detail.innerHTML = '<div class="card"><div class="empty">知识库治理接口当前不可用</div></div>';
    return;
  }
  await loadKnowledgeBases();
  KNOWLEDGE_GOV.items = KNOWLEDGE_BASES.slice();
  const target = code || KNOWLEDGE_GOV.code || (KNOWLEDGE_GOV.items[0] && KNOWLEDGE_GOV.items[0].code);
  KNOWLEDGE_GOV.code = target || null;
  renderKnowledgeList();
  if(target) await knowledgeSelect(target);
  else if(detail) detail.innerHTML = '<div class="card"><div class="empty">还没有知识库，点击右上角新建</div></div>';
}

async function knowledgeSelect(code){
  knowledgeStopPolling();
  KNOWLEDGE_GOV.code = code;
  renderKnowledgeList();
  const base = '/v1/knowledge-bases/' + encodeURIComponent(code);
  const [r, docs] = await Promise.all([apiRaw(base), apiRaw(base + '/documents')]);
  if(!r.ok){ toast(r.body.message || '知识库详情读取失败'); return; }
  KNOWLEDGE_GOV.detail = r.body;
  KNOWLEDGE_GOV.documents = docs.ok ? (docs.body.items || []) : [];
  KNOWLEDGE_GOV.document = null;
  KNOWLEDGE_GOV.search = null;
  renderKnowledgeDetail();
  knowledgeSchedulePolling();
}

function knowledgeAgentOptions(selected){
  return `<option value="">— 不限定负责人 Agent —</option>` + AGENTS.map(a =>
    `<option value="${attr(a.code)}"${a.code === selected ? ' selected' : ''}>${esc(a.name || a.code)} · ${esc(a.code)}</option>`).join('');
}

function knowledgeForm(item, prefix, isNew){
  const d = item || {tenant_id:'t_001', sensitivity:'internal', retention_days:365,
    max_content_chars:20000, daily_write_quota:10000, status:'active'};
  return `<div class="frm">
    <div class="fld"><label>编码（code） <b>*</b></label><input class="inp mono" id="${prefix}Code" value="${attr(d.code || '')}" ${isNew ? '' : 'disabled'}></div>
    <div class="fld"><label>名称（name） <b>*</b></label><input class="inp" id="${prefix}Name" value="${attr(d.name || '')}"></div>
    <div class="fld"><label>租户（tenant_id） <b>*</b></label><input class="inp mono" id="${prefix}Tenant" value="${attr(d.tenant_id || 't_001')}"></div>
    <div class="fld"><label>负责人 Agent（owner_agent_code）</label><select class="inp" id="${prefix}Owner">${knowledgeAgentOptions(d.owner_agent_code || '')}</select></div>
    <div class="fld"><label>敏感级别（sensitivity）</label><select class="inp" id="${prefix}Sensitivity">
      ${[['public','公开'],['internal','内部'],['confidential','机密'],['restricted','严格受限']].map(([v,n]) => `<option value="${v}"${d.sensitivity === v ? ' selected' : ''}>${n} · ${v}</option>`).join('')}
    </select></div>
    <div class="fld"><label>状态（status）</label><select class="inp" id="${prefix}Status"><option value="active"${d.status !== 'disabled' ? ' selected' : ''}>启用</option><option value="disabled"${d.status === 'disabled' ? ' selected' : ''}>停用</option></select></div>
    <div class="fld"><label>保留天数（retention_days）</label><input class="inp" type="number" min="0" max="3650" id="${prefix}Retention" value="${attr(d.retention_days ?? 365)}"></div>
    <div class="fld"><label>单条正文上限（max_content_chars）</label><input class="inp" type="number" min="1" max="2000000" id="${prefix}MaxChars" value="${attr(d.max_content_chars ?? 20000)}"></div>
    <div class="fld"><label>每日写入配额（daily_write_quota）</label><input class="inp" type="number" min="1" max="10000000" id="${prefix}Quota" value="${attr(d.daily_write_quota ?? 10000)}"></div>
    <div class="fld wide"><label>允许使用的 Agent（allowed_agents）</label><input class="inp mono" id="${prefix}AllowedAgents" value="${attr(knowledgeCsv(d.allowed_agents))}" placeholder="agent-a, agent-b；* 表示全部"></div>
    <div class="fld wide"><label>授权角色（allowed_roles）</label><input class="inp mono" id="${prefix}AllowedRoles" value="${attr(knowledgeCsv(d.allowed_roles))}" placeholder="agent_reviewer, system_admin"></div>
    <div class="fld wide"><label>说明（description）</label><textarea class="inp" id="${prefix}Description" style="min-height:90px">${esc(d.description || '')}</textarea></div>
  </div>`;
}

function knowledgeReadForm(prefix){
  return {
    code:$('#' + prefix + 'Code').value.trim(), name:$('#' + prefix + 'Name').value.trim(),
    description:$('#' + prefix + 'Description').value.trim(), tenant_id:$('#' + prefix + 'Tenant').value.trim(),
    owner_agent_code:$('#' + prefix + 'Owner').value, allowed_agents:knowledgeCodes($('#' + prefix + 'AllowedAgents').value),
    allowed_roles:knowledgeCodes($('#' + prefix + 'AllowedRoles').value), sensitivity:$('#' + prefix + 'Sensitivity').value,
    retention_days:Number($('#' + prefix + 'Retention').value), max_content_chars:Number($('#' + prefix + 'MaxChars').value),
    daily_write_quota:Number($('#' + prefix + 'Quota').value), status:$('#' + prefix + 'Status').value
  };
}

function knowledgeNew(){
  KNOWLEDGE_GOV.code = null; KNOWLEDGE_GOV.detail = null; renderKnowledgeList();
  $('#knowledgeDetail').innerHTML = `<div class="card">
    <div class="card-h"><div><div class="card-t">新建知识库</div><div class="card-s">登记后才可在严格模式下被检索或写入</div></div></div>
    <div class="card-b">${knowledgeForm(null, 'knowledgeNew', true)}
      <div style="margin-top:10px"><button class="btn primary" onclick="knowledgeCreate(this)">创建知识库</button></div>
    </div></div>`;
}

function knowledgeAuditDetail(raw){
  if(!raw) return '—';
  if(typeof raw === 'object') return JSON.stringify(raw);
  try{return JSON.stringify(JSON.parse(raw));}catch(e){return String(raw)}
}

function renderKnowledgeDetail(){
  const d = KNOWLEDGE_GOV.detail, box = $('#knowledgeDetail'); if(!d || !box) return;
  const audits = d.audit || [];
  const rows = audits.length ? audits.map(x => `<tr><td>${esc(x.action)}</td><td>${esc(x.operator || '—')}</td><td class="mono">${esc(knowledgeAuditDetail(x.detail))}</td><td class="mono">${fmtTs(x.created_at)}</td></tr>`).join('') : '<tr><td colspan="4"><div class="empty">暂无审计记录</div></td></tr>';
  box.innerHTML = `<div class="card" id="knowledgeImportCard"><div class="card-h"><div><div class="card-t">文档导入 · ${esc(d.name)}</div><div class="card-s">上传后先预览切片，确认后才进入 Agent 检索范围</div></div><span class="badge">${KNOWLEDGE_GOV.documents.length} 个文档</span></div>
      <div class="card-b"><div class="knowledge-toolbar">
        <div class="fld"><label>文件（file）</label><input class="inp" id="knowledgeFile" type="file" accept=".pdf,.docx,.xlsx,.txt,.md"></div>
        <div class="fld"><label>PDF 解析方式（parse_mode）</label><select class="inp" id="knowledgeParseMode"><option value="auto">自动识别</option><option value="text">纯文本</option><option value="ocr">扫描 OCR</option><option value="layout">复杂版面</option></select></div>
        <div class="fld"><label>切片长度（chunk_size）</label><input class="inp" id="knowledgeChunkSize" type="number" min="200" max="8000" value="1200"></div>
        <div class="fld"><label>重叠字符（chunk_overlap）</label><input class="inp" id="knowledgeChunkOverlap" type="number" min="0" max="1000" value="120"></div>
        <button class="btn primary" id="knowledgeUploadBtn" onclick="knowledgeUpload(this)">上传并解析</button>
      </div></div>
      <div id="knowledgeDocuments">${knowledgeDocumentListHtml()}</div>
      <div id="knowledgeDocumentPreview"></div>
    </div>
    <div class="card"><div class="card-h"><div><div class="card-t">测试检索</div><div class="card-s">与 knowledge_retrieval 节点使用同一套召回链路</div></div></div>
      <div class="card-b"><div class="knowledge-search">
        <input class="inp" id="knowledgeSearchQuery" placeholder="输入要检索的问题" onkeydown="if(event.key==='Enter')knowledgeSearch()">
        <select class="inp" id="knowledgeSearchMode"><option value="hybrid">混合召回</option><option value="semantic">语义召回</option><option value="keyword">关键词召回</option></select>
        <button class="btn primary" id="knowledgeSearchBtn" onclick="knowledgeSearch(this)">检索</button>
        <div class="knowledge-search-options">
	          <label><input type="checkbox" id="knowledgeSearchRerank" checked onchange="knowledgeRerankChanged()">启用重排（rerank）</label>
          <label>候选数量（candidate_top_n） <input class="inp" id="knowledgeSearchCandidateTopN" type="number" min="1" max="100" value="20"></label>
          <label>最终返回数（top_k） <input class="inp" id="knowledgeSearchTopK" type="number" min="1" max="20" value="5"></label>
	          <label>重排最低分（rerank_min_score） <input class="inp" id="knowledgeSearchMinScore" type="number" min="0" max="1" step="0.05" value="0"></label>
        </div>
      </div><div id="knowledgeSearchResult" class="knowledge-search-result"><div class="empty">输入问题后查看实际召回结果</div></div></div>
    </div>
    <div class="card">
      <div class="card-h"><div><div class="card-t">知识库配置 <span class="mono" style="font-weight:400;color:var(--muted)">${esc(d.code)}</span></div><div class="card-s">节点只能访问同租户且已授权的知识库</div></div>
        <span class="badge ${d.status === 'active' ? 'ok' : 'fail'}">${d.status === 'active' ? '启用' : '停用'}</span></div>
      <div class="card-b">${knowledgeForm(d, 'knowledgeEdit', false)}
        <div class="act" style="margin-top:10px"><button class="btn primary" onclick="knowledgeSave(this)">保存配置</button><button class="btn danger" onclick="knowledgeDelete(this)">删除知识库</button></div>
      </div>
    </div>
    <div class="card"><div class="card-h"><div><div class="card-t">变更审计</div><div class="card-s">最近 ${audits.length} 条</div></div></div>
      <div class="card-b" style="overflow:auto"><table><thead><tr><th>动作</th><th>操作人</th><th>详情</th><th>时间</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function knowledgeOpenUpload(){
  if(!KNOWLEDGE_GOV.code || !KNOWLEDGE_GOV.detail){toast('请先从左侧选择一个知识库');return}
  const card=$('#knowledgeImportCard'), input=$('#knowledgeFile');
  if(card) card.scrollIntoView({behavior:'smooth',block:'start'});
  if(input) setTimeout(()=>input.click(),180);
}

function knowledgeStatus(status){
  return {queued:['排队中','wait'],parsed:['待确认','wait'],parsing:['解析中','run'],ready:['已入库','ok'],failed:['失败','fail'],disabled:['已停用','fail']}[status] || [status || '未知',''];
}

function knowledgeStopPolling(){if(KNOWLEDGE_GOV.pollTimer){clearTimeout(KNOWLEDGE_GOV.pollTimer);KNOWLEDGE_GOV.pollTimer=null}}
function knowledgeSchedulePolling(){
  knowledgeStopPolling();
  if(!KNOWLEDGE_GOV.documents.some(x=>x.status==='queued'||x.status==='parsing'))return;
  KNOWLEDGE_GOV.pollTimer=setTimeout(async()=>{
    KNOWLEDGE_GOV.pollTimer=null;
    if(!$('#view-knowledge')||!$('#view-knowledge').classList.contains('active'))return;
    const selected=KNOWLEDGE_GOV.document&&KNOWLEDGE_GOV.document.document_id;
    await knowledgeReloadDocuments(selected);
  },1200);
}

function knowledgeDocumentListHtml(){
  if(!KNOWLEDGE_GOV.documents.length) return '<div class="empty">暂无文档，上传 PDF、DOCX、XLSX、TXT 或 Markdown 文件开始导入</div>';
  return KNOWLEDGE_GOV.documents.map(doc=>{
    const status=knowledgeStatus(doc.status), selected=KNOWLEDGE_GOV.document && KNOWLEDGE_GOV.document.document_id===doc.document_id;
    return `<div class="knowledge-doc ${selected?'on':''}" data-document-id="${attr(doc.document_id)}">
      <div onclick="knowledgeDocumentSelect('${attr(doc.document_id)}')" style="cursor:pointer;min-width:0"><div class="knowledge-doc-name">${esc(doc.file_name)}</div>
      <div class="knowledge-doc-meta mono">${esc(doc.file_ext.toUpperCase())} · ${fmt(Number(doc.file_size||0))} bytes · ${esc(doc.parse_mode||'auto')} · ${esc(doc.document_id)}</div>${doc.status==='queued'||doc.status==='parsing'?`<div class="knowledge-progress"><i style="width:${Math.max(2,Math.min(100,Number(doc.parse_progress||0)))}%"></i></div>`:''}${doc.error_message?`<div class="trace-error" style="margin-top:6px">${esc(doc.error_message)}</div>`:''}</div>
      <div class="act"><span class="badge knowledge-doc-status ${status[1]}">${status[0]}</span><button class="btn sm" onclick="knowledgeDocumentSelect('${attr(doc.document_id)}')">查看</button></div>
    </div>`;
  }).join('');
}

async function knowledgeReloadDocuments(selectId){
  const code=KNOWLEDGE_GOV.code, path='/v1/knowledge-bases/'+encodeURIComponent(code)+'/documents';
  const r=await apiRaw(path); if(!r.ok){toast(r.body.message||'文档列表读取失败');return}
  KNOWLEDGE_GOV.documents=r.body.items||[];
  const list=$('#knowledgeDocuments'); if(list) list.innerHTML=knowledgeDocumentListHtml();
  if(selectId) await knowledgeDocumentSelect(selectId);
  knowledgeSchedulePolling();
}

async function knowledgeUpload(btn){
  const input=$('#knowledgeFile'), file=input && input.files && input.files[0];
  if(!file){toast('请先选择文件');return}
  const data=new FormData(); data.append('file',file);
  data.append('chunk_size',$('#knowledgeChunkSize').value||'1200');
  data.append('chunk_overlap',$('#knowledgeChunkOverlap').value||'120');
  data.append('parse_mode',$('#knowledgeParseMode').value||'auto');
  btn.disabled=true; btn.textContent='上传中…';
  try{
    const response=await fetch(API+'/v1/knowledge-bases/'+encodeURIComponent(KNOWLEDGE_GOV.code)+'/documents',{method:'POST',body:data});
    let body={}; try{body=await response.json()}catch(e){}
    if(!response.ok){toast(body.message||'上传解析失败');await knowledgeReloadDocuments();return}
    const pending=body.document.status==='queued'||body.document.status==='parsing';
    toast(pending?'上传完成，已进入解析队列':'解析完成，请预览切片后确认入库'); input.value='';
    await knowledgeReloadDocuments(body.document.document_id);
  }catch(e){toast('上传失败：'+e.message)}finally{btn.disabled=false;btn.textContent='上传并解析'}
}

async function knowledgeDocumentSelect(documentId){
  const path='/v1/knowledge-bases/'+encodeURIComponent(KNOWLEDGE_GOV.code)+'/documents/'+encodeURIComponent(documentId);
  const r=await apiRaw(path); if(!r.ok){toast(r.body.message||'文档详情读取失败');return}
  KNOWLEDGE_GOV.document=r.body;
  const list=$('#knowledgeDocuments'); if(list) list.innerHTML=knowledgeDocumentListHtml();
  renderKnowledgeDocumentPreview();
}

function knowledgeLocator(locator, chunkNo){
  const bits=[]; if(locator&&locator.page)bits.push('第 '+locator.page+' 页'); if(locator&&locator.sheet)bits.push('Sheet '+locator.sheet);
  if(locator&&locator.block_type)bits.push('区块 '+locator.block_type);if(locator&&locator.reading_order)bits.push('顺序 '+locator.reading_order);if(locator&&locator.ocr_confidence!=null)bits.push('OCR '+(Number(locator.ocr_confidence)*100).toFixed(1)+'%');
  if(locator&&Array.isArray(locator.bbox)&&locator.bbox.length>=4)bits.push('坐标 ['+locator.bbox.slice(0,4).join(', ')+']');
  bits.push('切片 '+chunkNo); return bits.join(' · ');
}

function renderKnowledgeDocumentPreview(){
  const box=$('#knowledgeDocumentPreview'), d=KNOWLEDGE_GOV.document; if(!box)return;
  if(!d){box.innerHTML='';return}
  const status=knowledgeStatus(d.status), chunks=d.chunks||[];
  const busy=d.status==='queued'||d.status==='parsing',canConfirm=!!d.preview_is_draft&&!busy&&(d.status==='parsed'||d.status==='ready'), canToggle=Number(d.active_revision||0)>0&&!busy;
  box.innerHTML=`<div class="card-h" style="border-top:1px solid var(--line-2)"><div><div class="card-t">${esc(d.file_name)} <span class="badge ${status[1]}">${status[0]}</span></div><div class="card-s">${d.preview_is_draft?'待确认版本':'当前生效版本'} v${esc(d.preview_revision||0)} · ${chunks.length} 个切片 · ${esc(d.parser||'—')} · ${esc(d.parse_mode||'auto')}</div><div class="knowledge-search-meta"><span class="tag">${Number(d.page_count||0)} 页</span><span class="tag">OCR ${Number(d.ocr_page_count||0)} 页</span><span class="tag">版面区块 ${Number(d.layout_block_count||0)}</span></div></div>
    <div class="act">${canConfirm?`<button class="btn primary sm" onclick="knowledgeDocumentAction('confirm',undefined,this)">确认入库</button>`:''}<button class="btn sm" ${busy?'disabled':''} onclick="knowledgeDocumentAction('reparse')">重新解析</button>${d.status==='failed'||chunks.some(x=>x.status==='pending_index')?`<button class="btn sm" onclick="knowledgeDocumentAction('retry')">重试</button>`:''}${canToggle?`<button class="btn sm" onclick="knowledgeDocumentAction('state',${d.status==='disabled'?'true':'false'})">${d.status==='disabled'?'启用':'停用'}</button>`:''}<button class="btn danger sm" onclick="knowledgeDocumentAction('delete')">删除</button></div></div>
    ${busy?`<div style="padding:10px 12px"><div class="hint">解析进度 ${Number(d.parse_progress||0)}%</div><div class="knowledge-progress"><i style="width:${Math.max(2,Math.min(100,Number(d.parse_progress||0)))}%"></i></div></div>`:''}
    ${d.error_message?`<div class="trace-error" style="margin:10px 12px">${esc(d.error_message)}</div>`:''}
    <div class="knowledge-preview">${chunks.length?chunks.map(c=>`<div class="knowledge-chunk"><div class="knowledge-chunk-head"><b>#${c.chunk_no}</b><span>${esc(knowledgeLocator(c.locator,c.chunk_no))}</span><span>${fmt(Number(c.char_count||0))} 字符</span><span class="badge ${c.status==='indexed'?'ok':c.status==='pending_index'?'wait':''}">${esc(c.status)}</span></div><div class="knowledge-chunk-body">${esc(c.content||'')}</div>${c.index_error?`<div class="trace-error">${esc(c.index_error)}</div>`:''}</div>`).join(''):'<div class="empty">暂无可预览切片</div>'}</div>`;
}

async function knowledgeDocumentAction(action, enabled, button){
  const d=KNOWLEDGE_GOV.document;if(!d)return;
  if(button&&button.disabled)return;
  if(action==='delete'&&!confirm('将物理删除文档、全部切片、检索真源和向量索引，确认继续？'))return;
  if(action==='reparse'&&!confirm('将按当前切片参数重新解析源文件，确认后才会替换生效版本。继续？'))return;
  const base='/v1/knowledge-bases/'+encodeURIComponent(KNOWLEDGE_GOV.code)+'/documents/'+encodeURIComponent(d.document_id);
  const opts={method:'POST'};
  let path=base+'/'+action;
  if(action==='delete'){path=base;opts.method='DELETE'}
  if(action==='state'){path=base+'/state';opts.method='PATCH';opts.body=JSON.stringify({enabled:!!enabled})}
  if(action==='reparse'){opts.body=JSON.stringify({chunk_size:Number($('#knowledgeChunkSize').value||1200),chunk_overlap:Number($('#knowledgeChunkOverlap').value||120),parse_mode:$('#knowledgeParseMode').value||d.parse_mode||'auto'})}
  const originalLabel=button&&button.textContent;
  if(button){button.disabled=true;button.classList.add('loading');button.setAttribute('aria-busy','true');button.textContent=action==='confirm'?'入库中…':'处理中…'}
  try{
    const r=await apiRaw(path,opts); if(!r.ok){toast(r.body.message||'文档操作失败');return}
    const deleteMessage=r.body.warning?'文档真源已删除：'+r.body.warning:'文档已物理删除';
    toast(action==='delete'?deleteMessage:'操作完成'); KNOWLEDGE_GOV.document=null;
    renderKnowledgeDocumentPreview();
    await knowledgeReloadDocuments(action==='delete'?null:d.document_id);
  }finally{
    if(button&&button.isConnected){button.disabled=false;button.classList.remove('loading');button.removeAttribute('aria-busy');button.textContent=originalLabel}
  }
}

async function knowledgeSearch(btn){
  const query=($('#knowledgeSearchQuery')&&$('#knowledgeSearchQuery').value||'').trim();if(!query){toast('请输入检索问题');return}
  btn=btn||$('#knowledgeSearchBtn'); if(btn){btn.disabled=true;btn.textContent='检索中…'}
  const path='/v1/knowledge-bases/'+encodeURIComponent(KNOWLEDGE_GOV.code)+'/search', rerankEnabled=$('#knowledgeSearchRerank').checked;
  const r=await apiRaw(path,{method:'POST',body:JSON.stringify({query,retrieval_mode:$('#knowledgeSearchMode').value,top_k:Number($('#knowledgeSearchTopK').value||5),candidate_top_n:rerankEnabled?Number($('#knowledgeSearchCandidateTopN').value||20):Number($('#knowledgeSearchTopK').value||5),rerank:rerankEnabled,rerank_min_score:rerankEnabled?Number($('#knowledgeSearchMinScore').value||0):0})});
  if(btn){btn.disabled=false;btn.textContent='检索'}
  const box=$('#knowledgeSearchResult'); if(!r.ok){box.innerHTML=`<div class="trace-error">${esc(r.body.message||'检索失败')} ${esc(JSON.stringify(r.body.details||''))}</div>`;return}
  KNOWLEDGE_GOV.search=r.body; const hits=r.body.hits||[], degraded=r.body.degraded||{}, rr=r.body.rerank||{};
  const rrMeta=rr.requested?(rr.applied?`<div class="vbar"><b>Rerank 已应用</b> ${esc(rr.model||'—')} · ${Number(rr.latency_ms||0).toFixed(1)}ms · 候选 ${rr.input_count||0}</div>`:rr.degraded?`<div class="vbar warn"><b>Rerank 已降级</b> ${esc(rr.error||'调用失败')}</div>`:`<div class="vbar"><b>Rerank 未执行</b> 当前没有可重排候选</div>`):`<div class="vbar warn"><b>仅 RRF 排序</b> 不执行语义相关度判定，RRF 排名分不能用于最低分过滤</div>`;
  box.innerHTML=`${degraded.active?`<div class="vbar warn"><b>召回链路已降级</b> ${esc((degraded.reasons||[]).join('；'))}</div>`:''}${rrMeta}<div class="hint">命中 ${hits.length} 条 · dense ${r.body.sources.dense||0} / BM25 ${r.body.sources.sparse||0} / sparse_m3 ${r.body.sources.sparse_m3||0} · encoder ${esc(r.body.encoder||'—')}</div>${hits.length?hits.map((h,i)=>{const m=h.metadata||{};return `<div class="knowledge-search-hit"><div class="hit-h"><b>${i+1}. ${esc(h.title||h.id)}</b><span class="badge ok" title="RRF 排名分（非相关度）${Number(h.rank_score||0).toFixed(4)}">${h.rerank_score!=null?'Rerank '+Number(h.rerank_score).toFixed(4):'RRF 排名 '+Number(h.rank_score||h.score||0).toFixed(4)}</span></div><div class="hit-s">${esc(h.content||'')}</div><div class="knowledge-search-meta"><span class="tag">${esc(m.file_name||'非文档记忆')}</span>${m.page?`<span class="tag">第 ${m.page} 页</span>`:''}${m.sheet?`<span class="tag">Sheet ${esc(m.sheet)}</span>`:''}${m.chunk_no?`<span class="tag">切片 ${m.chunk_no}</span>`:''}<span class="tag">${esc((h.sources||[]).join('+')||h.source||'')}</span><span class="tag">RRF 排名分 ${Number(h.rank_score||0).toFixed(4)}</span><span class="tag mono">${esc(h.id)}</span></div></div>`}).join(''):'<div class="empty">没有命中内容，请检查文档是否已确认入库、索引是否完成以及查询词是否合适</div>'}`;
  box.querySelectorAll('.knowledge-search-hit').forEach((element,index)=>{
    const footer=element.querySelector('.knowledge-search-meta');
    if(footer && hits[index]) footer.insertAdjacentHTML('beforeend',recallHitManagementHtml(hits[index],'knowledge'));
  });
}

async function knowledgePut(body, btn){
  if(!body.code || !body.name || !body.tenant_id){toast('code、名称和租户不能为空');return}
  if(btn) btn.disabled = true;
  const r = await apiRaw('/v1/knowledge-bases/' + encodeURIComponent(body.code), {method:'PUT', body:JSON.stringify(body)});
  if(btn) btn.disabled = false;
  if(!r.ok){toast(r.body.message || '保存失败');return}
  toast(`${body.code} 已保存`);
  await loadKnowledgePage(body.code);
}

async function knowledgeCreate(btn){ await knowledgePut(knowledgeReadForm('knowledgeNew'), btn); }
async function knowledgeSave(btn){ await knowledgePut(knowledgeReadForm('knowledgeEdit'), btn); }
function knowledgeDelete(){
  const d=KNOWLEDGE_GOV.detail;if(!d)return;
  KNOWLEDGE_DELETE.code=d.code;KNOWLEDGE_DELETE.name=d.name;KNOWLEDGE_DELETE.busy=false;
  const confirmBtn=$('#knowledgeDeleteConfirm');
  confirmBtn.disabled=true;confirmBtn.classList.remove('loading');confirmBtn.removeAttribute('aria-busy');confirmBtn.textContent='确认删除';
  $('#knowledgeDeleteCancel').disabled=false;$('#knowledgeDeleteClose').disabled=false;
  $('#knowledgeDeleteTarget').textContent=`${d.name} · ${d.code}`;
  $('#knowledgeDeleteSummary').textContent=`${KNOWLEDGE_GOV.documents.length} 个文档将被一并删除`;
  $('#knowledgeDeleteLabel').textContent=`输入 ${d.code} 以确认`;
  $('#knowledgeDeleteInput').value='';$('#knowledgeDeleteError').textContent='';
  $('#knowledgeDeleteMask').classList.add('on');
  setTimeout(()=>$('#knowledgeDeleteInput').focus(),0);
}

function knowledgeDeleteInputChanged(){
  $('#knowledgeDeleteConfirm').disabled=KNOWLEDGE_DELETE.busy||$('#knowledgeDeleteInput').value.trim()!==KNOWLEDGE_DELETE.code;
  $('#knowledgeDeleteError').textContent='';
}

function closeKnowledgeDelete(){
  if(KNOWLEDGE_DELETE.busy)return;
  $('#knowledgeDeleteMask').classList.remove('on');
  KNOWLEDGE_DELETE.code=null;KNOWLEDGE_DELETE.name=null;
}

async function confirmKnowledgeDelete(btn){
  const code=KNOWLEDGE_DELETE.code;
  if(!code||KNOWLEDGE_DELETE.busy||$('#knowledgeDeleteInput').value.trim()!==code)return;
  KNOWLEDGE_DELETE.busy=true;
  const cancel=$('#knowledgeDeleteCancel'),close=$('#knowledgeDeleteClose');
  btn.disabled=true;cancel.disabled=true;close.disabled=true;btn.classList.add('loading');btn.setAttribute('aria-busy','true');btn.textContent='删除中…';
  const r=await apiRaw('/v1/knowledge-bases/'+encodeURIComponent(code),{method:'DELETE'});
  if(!r.ok){
    KNOWLEDGE_DELETE.busy=false;btn.disabled=false;cancel.disabled=false;close.disabled=false;btn.classList.remove('loading');btn.removeAttribute('aria-busy');btn.textContent='确认删除';
    $('#knowledgeDeleteError').textContent=r.body.message||'知识库删除失败';return;
  }
  KNOWLEDGE_DELETE.busy=false;$('#knowledgeDeleteMask').classList.remove('on');
  toast(r.body.warning?'知识库真源已删除：'+r.body.warning:'知识库已物理删除');
  knowledgeStopPolling();KNOWLEDGE_GOV.code=null;KNOWLEDGE_GOV.detail=null;KNOWLEDGE_GOV.documents=[];KNOWLEDGE_GOV.document=null;KNOWLEDGE_GOV.search=null;
  KNOWLEDGE_DELETE.code=null;KNOWLEDGE_DELETE.name=null;
  await loadKnowledgePage();
}

/* ============ 契约 ============ */
let curTab = 'input';
/* 契约页选中的 agent 直接读 CUR.code（顶栏那一个），不再单独维护 curAgent，
   否则切了顶栏、契约页还停在上一个 agent 上。 */

function renderJSON(obj){
  const s = JSON.stringify(obj, null, 2);
  return s.split('\n').map(line=>{
    const m = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)(.*)$/);
    if(m){
      const rest = m[4];
      let cls = 'jv-nu';
      if(/^"/.test(rest)) cls='jv-s';
      else if(/^(true|false)/.test(rest)) cls='jv-b';
      else if(/^null/.test(rest)) cls='jv-n';
      const tail = /,$/.test(rest) ? ',' : '';
      const val = rest.replace(/,$/,'');
      return `${m[1]}<span class="jk">${esc(m[2])}</span>${m[3]}<span class="${cls}">${esc(val)}</span>${tail}`;
    }
    return esc(line);
  }).join('\n');
}

function renderAgentPick(){
  // 只使用注册表真实清单；离线时明确显示不可用，不回落到静态样例。
  let rows;
  if(MODE === 'live'){
    rows = AGENTS.map(a => {
      const v = pickVersion(a);
      const vs = (a.versions || []).find(x => typeof x === 'object' && x.version === v);
      const st = (vs && vs.status) || '—';
      const dot = st === 'published' ? 'ok' : (st === 'testing' ? 'run' : 'fail');
      const smoke = SMOKE_RE.test(a.code);
      return `<div class="agent-pick ${a.code === CUR.code ? 'on' : ''}" data-a="${esc(a.code)}"
                onclick="pickAgent('${esc(a.code)}')" style="${smoke ? 'opacity:.62' : ''}">
        ${esc(a.name || a.code)}<small class="mono">${esc(a.code)} · ${esc(v || '—')} · <span class="badge ${dot}">${esc(st)}</span></small>
      </div>`;
    }).join('') || '<div class="empty">还没有 Agent</div>';
  } else {
    rows = '<div class="empty">后端不可用，无法读取 Agent</div>';
  }
  const list = $('#agentPickList'); if(list) list.innerHTML = rows;
  const cnt = $('#agentCount'); if(cnt) cnt.textContent = (MODE === 'live' ? AGENTS.length : 0) + ' 个';
}

function pickAgent(k){ switchAgent(k); }

async function loadContract(code, version){
  if(MODE !== 'live' || !code) return;
  const ver = version || (LIVE_CONTRACTS[code] && LIVE_CONTRACTS[code].version) || 'v3';
  try{
    const c = await apiJSON(`/v1/agents/${encodeURIComponent(code)}/versions/${encodeURIComponent(ver)}/contract`);
    if(c && c.input_schema) LIVE_CONTRACTS[code] = Object.assign({}, c, {version: ver});
  }catch(e){ /* 后端未注册该 agent，保留静态契约 */ }
}

function effContract(){
  const code = CUR.code;
  const skeleton = {
    id: '—', title: code,
    input: {'type':'object','properties':{}}, output: {'type':'object','properties':{}},
    errors: [], events: [['node_start','节点开始'],['node_end','节点结束'],['run_end','结束']]
  };
  const live = LIVE_CONTRACTS[code];
  if(MODE === 'live'){
    // live 模式绝不回落到静态契约表：取不到就明说取不到，
    // 否则页面上会出现一份"看起来是真的"但其实来自前端的 schema。
    if(!live) return Object.assign({}, skeleton, {title: code, missing: true});
    return Object.assign({}, skeleton, {
      id: live.id || live.contract_hash || '—',
      title: code + ' · ' + (live.version || CUR.version || ''),
      input: live.input_schema,
      output: live.output_schema,
      errors: (live.error_codes || []).map(c => ERR_DESC[c] || [c, '—', '—', '否'])
    });
  }
  return Object.assign({}, skeleton, {title: '后端不可用', missing: true});
}

function renderContract(){
  const c = effContract();
  $('#cTitle').textContent = c.title;
  $('#cId').textContent = c.id;
  $$('#cTabs .tab').forEach(t=>t.classList.toggle('on', t.dataset.tab===curTab));
  const body = $('#cBody');
  if(c.missing){
    body.innerHTML = `<div class="empty">没有取到 ${esc(c.title)} 的后端契约<br>
      <span style="font-size:10.5px;color:var(--faint)">GET /v1/agents/${esc(c.title)}/versions/&lt;ver&gt;/contract 失败，或该版本未注册</span></div>`;
    return;
  }
  if(curTab==='input') body.innerHTML = renderJSON(c.input);
  else if(curTab==='output') body.innerHTML = renderJSON(c.output);
  else if(curTab==='errors'){
    body.innerHTML = `<div style="padding:0"><table><thead><tr><th>code</th><th>HTTP</th><th>含义</th><th>retryable</th></tr></thead><tbody>`
      + c.errors.map(e=>`<tr><td class="mono">${e[0]}</td><td>${e[1]}</td><td>${e[2]}</td><td>${e[3]==='是'?'<span class="badge ok">是</span>':'<span class="badge fail">否</span>'}</td></tr>`).join('')
      + `</tbody></table></div>`;
  } else {
    body.innerHTML = `<div style="padding:0"><table><thead><tr><th>event</th><th>payload</th></tr></thead><tbody>`
      + c.events.map(e=>`<tr><td class="mono">${e[0]}</td><td style="color:var(--muted)">${e[1]}</td></tr>`).join('')
      + `</tbody></table></div>`;
  }
}

$$('#cTabs .tab').forEach(t=>t.onclick=()=>{ curTab = t.dataset.tab; renderContract(); });

/* ============ 项目治理 ============ */
let PROJECT_GOV = {code:null, detail:null, appId:'', tokens:[], tokenAudit:[]};

async function loadProjects(includeArchived=false){
  if(MODE !== 'live') return false;
  const response = await apiRaw('/v1/projects' + (includeArchived ? '?include_archived=true' : ''));
  if(!response.ok){ toast(response.body.message || '项目列表加载失败'); return false; }
  PROJECTS = response.body.items || [];
  renderProjectSelects();
  return true;
}

function projectOptions(current='', activeOnly=true){
  const rows = activeOnly ? PROJECTS.filter(x=>x.status==='active') : PROJECTS;
  return '<option value="">未归类</option>' + rows.map(item =>
    `<option value="${attr(item.code)}" ${item.code===current?'selected':''}>${esc(item.name)} · ${esc(item.code)}</option>`).join('');
}

function renderProjectSelects(){
  const wizard = $('#wProject'); if(wizard) wizard.innerHTML = projectOptions(wizard.value);
  const filter = $('#govProjectFilter');
  if(filter){ const current=filter.value; filter.innerHTML='<option value="">全部项目</option><option value="__unassigned__">未归类</option>'+PROJECTS.map(x=>`<option value="${attr(x.code)}">${esc(x.name)}</option>`).join(''); filter.value=current; }
}

async function loadProjectPage(code){
  if(MODE !== 'live') return;
  if(AUTH.enabled && !authCan('agent.read')){ $('#projectNotice').innerHTML='<div class="vbar err"><b>当前账号没有 agent.read 权限</b></div>'; return; }
  $('#newProjectBtn').disabled = AUTH.enabled && !authCan('agent.manage');
  if(!await loadProjects(true)) return;
  renderProjectList();
  const target = code && PROJECTS.some(x=>x.code===code) ? code : (PROJECTS[0]&&PROJECTS[0].code);
  if(target) await projectSelect(target); else projectNew();
}

function renderProjectList(){
  $('#projectCount').textContent=PROJECTS.length+' 个';
  $('#projectList').innerHTML=PROJECTS.length?PROJECTS.map(item=>`<div class="gov-agent ${item.code===PROJECT_GOV.code?'on':''}" onclick="projectSelect('${attr(item.code)}')"><div class="g-n">${esc(item.name)}<span class="badge ${item.status==='active'?'ok':'fail'}" style="margin-left:auto">${item.status==='active'?'启用':'停用'}</span></div><small class="mono">${esc(item.code)} · ${item.agent_count||0} Agent</small></div>`).join(''):'<div class="empty">尚未创建项目</div>';
}

async function projectSelect(code){
  PROJECT_GOV.code=code; renderProjectList();
  const [response,tokens,audit]=await Promise.all([
    apiRaw('/v1/projects/'+encodeURIComponent(code)),
    apiRaw('/v1/projects/'+encodeURIComponent(code)+'/api-tokens'),
    apiRaw('/v1/projects/'+encodeURIComponent(code)+'/api-token-audit?limit=20')
  ]);
  if(!response.ok){ $('#projectDetail').innerHTML=`<div class="card"><div class="empty">${esc(response.body.message||'项目读取失败')}</div></div>`; return; }
  PROJECT_GOV.detail=response.body;
  PROJECT_GOV.appId=tokens.ok?(tokens.body.app_id||''):'';
  PROJECT_GOV.tokens=tokens.ok?(tokens.body.items||[]):[];
  PROJECT_GOV.tokenAudit=audit.ok?(audit.body.items||[]):[];
  renderProjectDetail();
}

function projectNew(){ PROJECT_GOV.code=null; PROJECT_GOV.detail=null; PROJECT_GOV.appId=''; PROJECT_GOV.tokens=[]; PROJECT_GOV.tokenAudit=[]; renderProjectList(); renderProjectDetail(true); }

function projectTokenCardHtml(canManage){
  const appId=PROJECT_GOV.appId||'尚未生成',items=PROJECT_GOV.tokens||[],audit=PROJECT_GOV.tokenAudit||[];
  const rows=items.map(item=>`<tr><td><b>${esc(item.name)}</b><div class="mono" style="font-size:10px;color:var(--muted);margin-top:3px">${esc(item.token_prefix)}</div></td><td>${(item.scopes||[]).map(scope=>`<span class="tag mono" style="margin:0 3px 3px 0">${esc(scope)}</span>`).join('')}</td><td>${(item.agent_codes||[]).length?(item.agent_codes||[]).map(code=>`<span class="tag mono" style="margin:0 3px 3px 0">${esc(code)}</span>`).join(''):'<span class="hint">项目内全部</span>'}</td><td><span class="badge ${item.status==='active'?'ok':'fail'}">${item.status==='active'?'启用':'停用'}</span><div class="hint" style="margin-top:4px">最近 ${fmtTs(item.last_used_at)}<br>到期 ${fmtTs(item.expires_at)}</div></td><td><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="btn sm" ${canManage?'':'disabled'} onclick="projectTokenRotate(${item.id},this)">轮换</button><button class="btn sm" ${canManage?'':'disabled'} onclick="projectTokenToggle(${item.id},${item.status!=='active'},this)">${item.status==='active'?'停用':'启用'}</button><button class="btn danger sm" ${canManage?'':'disabled'} onclick="projectTokenDelete(${item.id})">删除</button></div></td></tr>`).join('');
  const auditRows=audit.slice(0,8).map(item=>`<tr><td>${fmtTs(item.created_at)}</td><td>${esc(item.action)}</td><td><span class="badge ${item.result==='success'?'ok':'fail'}">${esc(item.result)}</span></td><td class="mono">${esc(item.token_prefix||'—')}</td><td>${esc((item.detail&&item.detail.reason)||'—')}</td></tr>`).join('');
  return `<div class="card"><div class="card-h"><div><div class="card-t">接口调用凭证</div><div class="card-s">业务系统必须同时携带项目 App ID 与 Token；Token 明文只展示一次</div></div><button class="btn primary" ${canManage?'':'disabled'} onclick="projectTokenOpen()">创建 Token</button></div><div class="card-b"><div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:10px 12px;background:#f7f8fa;border:1px solid var(--line-2);margin-bottom:12px"><div><div class="hint">项目 App ID（X-Project-App-Id）</div><div class="mono" style="font-size:13px;margin-top:3px;overflow-wrap:anywhere">${esc(appId)}</div></div><button class="btn sm" data-value="${attr(appId)}" onclick="projectCopyValue(this)">复制</button></div><div style="overflow:auto"><table><thead><tr><th>凭证</th><th>权限</th><th>Agent 范围</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows||'<tr><td colspan="5"><div class="empty">尚未创建项目 Token</div></td></tr>'}</tbody></table></div></div></div><div class="card"><div class="card-h"><div><div class="card-t">Token 审计</div><div class="card-s">创建、轮换、停用、删除及拒绝记录</div></div></div><div class="card-b" style="overflow:auto"><table><thead><tr><th>时间</th><th>动作</th><th>结果</th><th>Token</th><th>说明</th></tr></thead><tbody>${auditRows||'<tr><td colspan="5"><div class="empty">暂无 Token 审计</div></td></tr>'}</tbody></table></div></div>`;
}

function renderProjectDetail(creating=false){
  const d=PROJECT_GOV.detail||{}, canManage=!AUTH.enabled||authCan('agent.manage'), agents=d.agents||[];
  $('#projectDetail').innerHTML=`<div class="card"><div class="card-h"><div><div class="card-t">${creating?'新建项目':esc(d.name||d.code)}</div><div class="card-s">${creating?'创建业务治理空间；code 创建后不可修改':esc(d.code||'')}</div></div>${creating?'':`<div style="margin-left:auto;display:flex;gap:7px"><button class="btn" ${canManage?'':'disabled'} onclick="projectToggleStatus()">${d.status==='active'?'停用项目':'重新启用'}</button><button class="btn danger" ${canManage?'':'disabled'} onclick="projectDelete()">删除项目</button></div>`}</div><div class="card-b"><div class="frm"><div class="fld"><label>编码（code） <b>*</b></label><input class="inp mono" id="pgCode" value="${attr(d.code||'')}" ${creating?'':'disabled'} placeholder="supply_chain"></div><div class="fld"><label>名称（name） <b>*</b></label><input class="inp" id="pgName" value="${attr(d.name||'')}" placeholder="供应链"></div><div class="fld wide"><label>说明（description）</label><input class="inp" id="pgDesc" value="${attr(d.description||'')}" placeholder="项目覆盖的业务范围"></div><div class="fld"><label>负责人（owner_user）</label><input class="inp" id="pgOwner" value="${attr(d.owner_user||'')}"></div><div class="fld"><label>排序（sort_order）</label><input class="inp" id="pgSort" type="number" value="${attr(d.sort_order||0)}"></div><div class="fld wide"><button class="btn primary" ${canManage?'':'disabled'} onclick="projectSave(this,${creating})">${creating?'创建项目':'保存项目'}</button></div></div></div></div>${creating?'':`<div class="card"><div class="card-h"><div class="card-t">归属 Agent</div><div class="card-s">${agents.length} 个；请在 Agent 基本信息中迁移归属</div></div><div class="card-b">${agents.length?agents.map(code=>`<span class="tag mono" style="margin:0 5px 5px 0">${esc(code)}</span>`).join(''):'<div class="empty">当前没有 Agent</div>'}</div></div>${projectTokenCardHtml(canManage)}`}`;
}

function projectCopyValue(button){return copyTextValue(button.dataset.value||'',button)}
function projectTokenOpen(){
  const d=PROJECT_GOV.detail;if(!d)return;
  $('#projectTokenTitle').textContent='创建项目 API Token';$('#projectTokenSub').textContent=`${d.name} · ${d.code}`;
  $('#projectTokenForm').style.display='grid';$('#projectTokenSecret').style.display='none';$('#projectTokenSubmit').style.display='inline-flex';$('#projectTokenFoot').textContent='Token 明文只在创建或轮换后展示一次。';
  $('#projectTokenName').value='';$('#projectTokenIps').value='';$('#projectTokenCallbacks').value='';$('#projectTokenRate').value='60';$('#projectTokenExpiry').value='';
  $$('.project-token-scope').forEach(box=>box.checked=box.value!=='run.event');
  $('#projectTokenAgents').innerHTML=(d.agents||[]).map(code=>`<option value="${attr(code)}">${esc(code)}</option>`).join('');
  $('#projectTokenMask').classList.add('on');
}
function projectTokenClose(){
  $('#projectTokenMask').classList.remove('on');
  if(PROJECT_GOV.code)projectSelect(PROJECT_GOV.code);
}
function projectTokenLines(id){return $(id).value.split(/[\n,]+/).map(x=>x.trim()).filter(Boolean)}
function projectTokenShowSecret(body,title){
  $('#projectTokenTitle').textContent=title;$('#projectTokenForm').style.display='none';$('#projectTokenSubmit').style.display='none';$('#projectTokenSecret').style.display='block';$('#projectTokenFoot').textContent='关闭后平台不会再次显示 Token 明文。';
  $('#projectTokenSecret').innerHTML=`<div class="vbar warn"><b>请立即保存以下凭证</b><div style="margin-top:4px">Token 明文只展示这一次，遗失后只能轮换。</div></div><div style="margin-top:12px"><div class="hint">项目 App ID</div><div style="display:flex;gap:7px;margin-top:4px"><input class="inp mono" value="${attr(body.app_id||'')}" readonly><button class="btn" data-value="${attr(body.app_id||'')}" onclick="projectCopyValue(this)">复制</button></div></div><div style="margin-top:12px"><div class="hint">API Token</div><div style="display:flex;gap:7px;margin-top:4px"><input class="inp mono" value="${attr(body.secret||'')}" readonly><button class="btn primary" data-value="${attr(body.secret||'')}" onclick="projectCopyValue(this)">复制 Token</button></div></div><div style="margin-top:14px" class="hint">请求头：<span class="mono">X-Project-App-Id</span> + <span class="mono">Authorization: Bearer &lt;Token&gt;</span></div>`;
}
async function projectTokenCreate(button){
  const name=$('#projectTokenName').value.trim();if(!name)return toast('Token 名称不能为空');
  const scopes=$$('.project-token-scope').filter(box=>box.checked).map(box=>box.value);if(!scopes.length)return toast('至少选择一个权限范围');
  const expiry=$('#projectTokenExpiry').value;
  const body={name,scopes,agent_codes:Array.from($('#projectTokenAgents').selectedOptions).map(option=>option.value),allowed_ips:projectTokenLines('#projectTokenIps'),callback_hosts:projectTokenLines('#projectTokenCallbacks'),rate_limit_per_min:+$('#projectTokenRate').value||60,expires_at:expiry?new Date(expiry).getTime()/1000:null};
  button.disabled=true;button.textContent='创建中…';
  const response=await apiRaw('/v1/projects/'+encodeURIComponent(PROJECT_GOV.code)+'/api-tokens',{method:'POST',body:JSON.stringify(body)});
  button.disabled=false;button.textContent='创建 Token';if(!response.ok)return toast(response.body.message||'Token 创建失败');
  projectTokenShowSecret(response.body,'项目 API Token 已创建');
}
async function projectTokenRotate(id,button){
  if(!confirm('轮换后旧 Token 会立即失效，确认继续？'))return;button.disabled=true;
  const response=await apiRaw('/v1/projects/'+encodeURIComponent(PROJECT_GOV.code)+'/api-tokens/'+id+'/rotate',{method:'POST'});button.disabled=false;
  if(!response.ok)return toast(response.body.message||'Token 轮换失败');projectTokenOpen();projectTokenShowSecret(response.body,'项目 API Token 已轮换');
}
async function projectTokenToggle(id,enabled,button){
  button.disabled=true;const response=await apiRaw('/v1/projects/'+encodeURIComponent(PROJECT_GOV.code)+'/api-tokens/'+id+'/state',{method:'PATCH',body:JSON.stringify({enabled})});button.disabled=false;
  if(!response.ok)return toast(response.body.message||'Token 状态更新失败');toast(enabled?'Token 已启用':'Token 已停用');await projectSelect(PROJECT_GOV.code);
}
async function projectTokenDelete(id){
  if(!confirm('删除 Token 后不可恢复，调用方会立即失去访问权限。确认删除？'))return;
  const response=await apiRaw('/v1/projects/'+encodeURIComponent(PROJECT_GOV.code)+'/api-tokens/'+id,{method:'DELETE'});if(!response.ok)return toast(response.body.message||'Token 删除失败');toast('Token 已删除');await projectSelect(PROJECT_GOV.code);
}

async function projectSave(btn,creating){
  const body={name:$('#pgName').value.trim(),description:$('#pgDesc').value.trim(),owner_user:$('#pgOwner').value.trim(),sort_order:+$('#pgSort').value||0};
  if(!body.name) return toast('项目名称不能为空');
  if(creating){ body.code=$('#pgCode').value.trim(); if(!/^[A-Za-z0-9_-]+$/.test(body.code)) return toast('项目 code 只能包含字母、数字、下划线、连字符'); }
  btn.disabled=true;
  const response=await apiRaw(creating?'/v1/projects':'/v1/projects/'+encodeURIComponent(PROJECT_GOV.code),{method:creating?'POST':'PATCH',body:JSON.stringify(body)});
  if(!response.ok){ btn.disabled=false; return toast(response.body.message||'项目保存失败'); }
  PROJECT_GOV.code=(response.body.project||{}).code; toast(creating?'项目已创建':'项目已更新'); await loadProjectPage(PROJECT_GOV.code); await loadAgents();
}

async function projectToggleStatus(){
  const d=PROJECT_GOV.detail;if(!d)return; const status=d.status==='active'?'archived':'active';
  if(status==='archived'&&!confirm(`停用项目 ${d.name}？项目仍有 Agent 时后端会拒绝。`))return;
  const response=await apiRaw('/v1/projects/'+encodeURIComponent(d.code),{method:'PATCH',body:JSON.stringify({status})});
  if(!response.ok)return toast(response.body.message||'项目状态更新失败');
  toast(status==='active'?'项目已启用':'项目已停用');await loadProjectPage(d.code);
}

async function projectDelete(){
  const d=PROJECT_GOV.detail;if(!d||!confirm(`物理删除空项目 ${d.name}（${d.code}）？`))return;
  const response=await apiRaw('/v1/projects/'+encodeURIComponent(d.code),{method:'DELETE'});
  if(!response.ok)return toast(response.body.message||'项目删除失败');
  PROJECT_GOV.code=null;toast('项目已删除');await loadProjectPage();
}

/* ============ Agent 治理（注册 / 版本 / 评测 / 灰度 / 依赖 / 审计） ============
   后端这些能力一直都在（/v1/agents 全套），此前界面上没有出口，只能 curl 调。
   这里把治理流程补成可点击的：评测是进 canary/published 的硬门槛，跳过它会被后端
   以 EVAL_REQUIRED 拒掉，所以按钮的可用性直接照 TRANSITIONS 渲染，不猜。 */
const TRANSITIONS = {
  testing:['canary','published'], canary:['published','testing'],
  published:['deprecated'], deprecated:['published','retired'], retired:[]
};
const PROMOTE_LABEL = {testing:'退回测试', canary:'进灰度', published:'发布', deprecated:'弃用', retired:'下线'};
const STATE_BADGE = {ok:'ok', risky:'wait', unpublished:'fail', empty:'fail'};

let GOV = { code:null, detail:null, deps:[], audit:[], access:null, msg:null, items:[] };

/** fetch 包装：治理接口的错误信息全在 body 里（code/message/details），
 *  不能用 apiJSON——它只回一句 http 500，用户看不到 EVAL_REQUIRED 之类的真原因。 */
async function apiRaw(path, opts){
  try{
    const r = await fetch(API + path, Object.assign({ headers:{'Content-Type':'application/json'} }, opts || {}));
    let body = null;
    try{ body = await r.json(); }catch(e){ body = null; }
    return { ok:r.ok, status:r.status, body: body || {} };
  }catch(e){
    return { ok:false, status:0, body:{ code:'NETWORK', message:'后端不可达：' + e.message } };
  }
}

const ACCOUNT = {users:[], roles:[], audit:[], selected:null};

function accountNotice(kind, text){
  const el = $('#accountNotice');
  el.innerHTML = text ? `<div class="vbar ${kind}" style="margin-bottom:12px"><b>${esc(text)}</b></div>` : '';
}

async function loadAccountPage(){
  if(MODE !== 'live'){
    accountNotice('warn', '后端未连接，无法读取账号权限'); return;
  }
  if(AUTH.enabled && !AUTH.authenticated){ showAuthGate(AUTH.config); return; }
  if(AUTH.enabled && !authCan('account.read')){
    accountNotice('err', '当前账号没有 account.read 权限');
    $('#accountWorkspace').style.display = 'none';
    $('#accountAuditCard').style.display = 'none';
    $('#accountSyncBtn').style.display = 'none';
    return;
  }
  $('#accountWorkspace').style.display = 'grid';
  $('#accountAuditCard').style.display = 'block';
  $('#accountSyncBtn').style.display = authCan('account.sync') ? '' : 'none';
  $('#logoutBtn').style.display = AUTH.enabled ? '' : 'none';
  accountNotice(AUTH.enabled ? 'ok' : 'warn', AUTH.enabled
    ? `已通过服务端会话登录 · ${AUTH.user.name} · 权限实时从数据库读取`
    : 'AUTH_ENABLED=false：当前处于兼容模式，接口尚未强制登录');
  const [users, roles, audit] = await Promise.all([
    apiRaw('/v1/admin/users'), apiRaw('/v1/admin/roles'), apiRaw('/v1/admin/audit?limit=100')
  ]);
  if(!users.ok || !roles.ok || !audit.ok){
    accountNotice('err', (users.body.message || roles.body.message || audit.body.message || '账号数据加载失败'));
    return;
  }
  ACCOUNT.users = users.body.items || [];
  ACCOUNT.roles = roles.body.items || [];
  ACCOUNT.audit = audit.body.items || [];
  if(!ACCOUNT.users.some(x=>x.id===ACCOUNT.selected)) ACCOUNT.selected = ACCOUNT.users[0] && ACCOUNT.users[0].id;
  renderAccountList(); renderAccountDetail(); renderAccountAudit();
}

function renderAccountList(){
  $('#accountCount').textContent = ACCOUNT.users.length + ' 个';
  $('#accountList').innerHTML = ACCOUNT.users.length ? ACCOUNT.users.map(user => {
    const active = user.enabled && user.directory_active && user.directory_in_scope;
    const roles = (user.roles || []).map(x=>x.name).join('、') || '未分配角色';
    return `<div class="account-user ${user.id===ACCOUNT.selected?'on':''}" onclick="accountSelect(${user.id})">
      <div class="au-h">${esc(user.name)}<span class="badge ${active?'ok':'fail'}" style="margin-left:auto">${active?'有效':'不可用'}</span></div>
      <div class="au-m">${esc(roles)} · ${esc(user.open_id)}</div>
    </div>`;
  }).join('') : '<div class="empty">还没有账号；首次飞书登录或通讯录同步后会出现在这里</div>';
}

function accountSelect(id){ ACCOUNT.selected=id; renderAccountList(); renderAccountDetail(); }

function renderAccountDetail(){
  const user = ACCOUNT.users.find(x=>x.id===ACCOUNT.selected);
  if(!user){ $('#accountDetail').innerHTML='<div class="card"><div class="empty">暂无账号</div></div>'; return; }
  const selected = new Set((user.roles || []).map(x=>x.code));
  const canManage = authCan('account.manage');
  $('#accountDetail').innerHTML = `<div class="card">
    <div class="card-h"><div><div class="card-t">${esc(user.name)}</div><div class="card-s mono">${esc(user.tenant_key)} / ${esc(user.open_id)}</div></div>
      <div style="margin-left:auto;display:flex;gap:7px">
        <button class="btn ${user.enabled?'danger':''}" ${canManage?'':'disabled'} onclick="accountToggleUser(${user.id},${!user.enabled})">${user.enabled?'停用账号':'启用账号'}</button>
        <button class="btn primary" ${canManage?'':'disabled'} onclick="accountSaveRoles(${user.id})">保存角色</button>
      </div></div>
    <div class="card-b">
      <dl class="kv" style="grid-template-columns:100px 1fr;margin-bottom:14px">
        <dt>来源</dt><dd>${esc(user.source)}</dd><dt>通讯录状态</dt><dd>${user.directory_active?'在职':'离职/冻结'} · ${user.directory_in_scope?'授权范围内':'范围外'}</dd>
        <dt>部门</dt><dd>${esc((user.department_ids||[]).join(', ')||'—')}</dd><dt>最后登录</dt><dd>${fmtTs(user.last_login_at)}</dd>
      </dl>
      <div class="pm-lbl">角色分配（role_codes）</div>
      <div class="role-grid">${ACCOUNT.roles.map(role=>`<label class="role-option">
        <input type="checkbox" name="accountRole" value="${attr(role.code)}" ${selected.has(role.code)?'checked':''} ${canManage?'':'disabled'}>
        <span><b>${esc(role.name)}</b><small>${esc(role.description)}<br>${role.permissions.length} 个权限点</small></span>
      </label>`).join('')}</div>
      <div class="pm-lbl" style="margin-top:14px">当前权限（多角色取并集）</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">${(user.permissions||[]).map(p=>`<span class="pm-tag">${esc(p)}</span>`).join('')||'<span class="hint">无平台访问权限</span>'}</div>
    </div></div>`;
}

async function accountSaveRoles(userId){
  const role_codes = $$('input[name=accountRole]:checked').map(x=>x.value);
  const result = await apiRaw(`/v1/admin/users/${userId}/roles`, {method:'PUT',body:JSON.stringify({role_codes})});
  if(!result.ok){ toast(result.body.message || '角色保存失败'); return; }
  toast('角色已更新，后续请求立即生效'); await loadAccountPage(); ACCOUNT.selected=userId; renderAccountList(); renderAccountDetail();
}

async function accountToggleUser(userId, enabled){
  const result = await apiRaw(`/v1/admin/users/${userId}/state`, {method:'PATCH',body:JSON.stringify({enabled})});
  if(!result.ok){ toast(result.body.message || '账号状态更新失败'); return; }
  toast(enabled?'账号已启用':'账号已停用且现有会话已撤销'); await loadAccountPage();
}

async function accountSyncDirectory(){
  const btn=$('#accountSyncBtn'); btn.disabled=true; btn.textContent='同步中…';
  const result = await apiRaw('/v1/admin/directory/sync', {method:'POST'});
  btn.disabled=false; btn.textContent='同步飞书通讯录';
  if(!result.ok){ toast(result.body.message || '通讯录同步失败'); return; }
  toast(`已同步 ${result.body.synced} 个账号`); await loadAccountPage();
}

function renderAccountAudit(){
  $('#accountAudit').innerHTML = ACCOUNT.audit.length ? ACCOUNT.audit.map(item=>`<tr>
    <td>${fmtTs(item.created_at)}</td><td class="mono">${esc(item.actor||'—')}</td><td>${esc(item.action)}</td>
    <td class="mono">${esc(item.target_type||'—')} ${esc(item.target_ref||'')}</td>
    <td><span class="badge ${item.result==='success'?'ok':'fail'}">${esc(item.result)}</span></td>
  </tr>`).join('') : '<tr><td colspan="5"><div class="empty">暂无安全审计</div></td></tr>';
}

function fmtTs(t){
  if(!t) return '—';
  const d = new Date(typeof t === 'number' ? t * 1000 : t);
  if(isNaN(d.getTime())) return '—';
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function govMsg(kind, title, lines){
  GOV.msg = { kind, title, lines: lines || [] };
  renderGovMsg();
}
function renderGovMsg(){
  const el = $('#govMsg'); if(!el) return;
  const m = GOV.msg;
  if(!m){ el.innerHTML = ''; return; }
  el.innerHTML = `<div class="vbar ${m.kind}" style="margin-bottom:0"><b>${esc(m.title)}</b>
    <div style="flex:1">${m.lines.map(l => `<div>${l}</div>`).join('')}</div></div>`;
}

async function loadGov(code){
  if(MODE !== 'live'){
    const l = $('#govList'), d = $('#govDetail');
    if(l) l.innerHTML = '<div class="empty">需要后端在线</div>';
    if(d) d.innerHTML = `<div class="card"><div class="card-b"><div class="empty">
      治理能力来自 /v1/agents 注册表，离线模式下没有可操作对象。<br>连上后端后这里会列出全部 agent 与版本。</div></div></div>`;
    return;
  }
  const [, , governed] = await Promise.all([
    loadAgents(), loadProjects(true), apiRaw('/v1/agents?include_archived=true')
  ]);
  GOV.items = governed.ok ? (governed.body.items || []) : AGENTS.slice();
  renderGovList();
  const target = code || GOV.code
    || (GOV.items.some(a => a.code === CUR.code) ? CUR.code : (GOV.items[0] && GOV.items[0].code));
  if(target) await govSelect(target);
}

async function refreshGovRegistry(code){
  const governed = await apiRaw('/v1/agents?include_archived=true');
  GOV.items = governed.ok ? (governed.body.items || []) : AGENTS.slice();
  renderGovList();
  if(code) await govSelect(code);
  return governed.ok;
}

function renderGovList(){
  const el = $('#govList'); if(!el) return;
  const cnt = $('#govCount');
  const projectFilter = ($('#govProjectFilter') && $('#govProjectFilter').value) || '';
  const items = GOV.items || [];
  const scoped = items.filter(a => !projectFilter || (projectFilter==='__unassigned__' ? !a.project_code : a.project_code===projectFilter));
  if(cnt) cnt.textContent = (MODE === 'live' ? scoped.length : 0) + ' 个';
  if(!items.length){ el.innerHTML = '<div class="empty">注册表为空</div>'; return; }
  // 真 agent 在前，冒烟 agent 收尾并降透明，免得几十个 qa_demo 把列表淹掉
  const rows = scoped.slice().sort((a, b) => {
    const aa = a.status === 'archived' ? 1 : 0, ab = b.status === 'archived' ? 1 : 0;
    const sa = SMOKE_RE.test(a.code) ? 1 : 0, sb = SMOKE_RE.test(b.code) ? 1 : 0;
    return aa - ab || sa - sb || String(a.code).localeCompare(String(b.code));
  });
  el.innerHTML = rows.map(a => {
    const smoke = SMOKE_RE.test(a.code);
    const vs = a.versions || [];
    const nPub = vs.filter(v => v.status === 'published').length;
    const nTest = vs.filter(v => v.status === 'testing').length;
    const archived = a.status === 'archived';
    const st = archived ? 'fail' : (nPub ? (vs.every(v => v.status !== 'published' || v.eval_pass) ? 'ok' : 'wait') : 'fail');
    return `<div class="gov-agent ${a.code === GOV.code ? 'on' : ''}" onclick="govSelect('${esc(a.code)}')"
              style="${smoke || archived ? 'opacity:.68' : ''}">
      <div class="g-n">${esc(a.name || a.code)}
        <span class="badge ${st}" style="margin-left:auto">${archived ? '已归档' : (nPub ? nPub + ' 发布' : '未发布')}</span></div>
      <small class="mono">${esc(a.code)} · ${esc((a.project&&a.project.name)||'未归类')} · ${vs.length} 版本${nTest ? ' · ' + nTest + ' 待评' : ''}</small>
    </div>`;
  }).join('');
}

async function govSelect(code){
  if(!code) return;
  GOV.code = code;
  renderGovList();
  const d = await apiRaw('/v1/agents/' + encodeURIComponent(code));
  if(!d.ok){
    $('#govDetail').innerHTML = `<div class="card"><div class="card-b"><div class="empty">
      读不到 ${esc(code)}：${esc(d.body.message || ('http ' + d.status))}</div></div></div>`;
    return;
  }
  GOV.detail = d.body;
  const [dep, aud, access] = await Promise.all([
    apiRaw(`/v1/agents/${encodeURIComponent(code)}/dependents`),
    apiRaw(`/v1/agents/${encodeURIComponent(code)}/audit?limit=12`),
    authCan('agent.manage_access')
      ? apiRaw(`/v1/agents/${encodeURIComponent(code)}/access`)
      : Promise.resolve({ok:false,body:null})
  ]);
  GOV.deps = dep.ok ? (dep.body.items || []) : [];
  GOV.audit = aud.ok ? (aud.body.items || []) : [];
  GOV.access = access.ok ? access.body : null;
  renderGovDetail();
}

function renderGovDetail(){
  const d = GOV.detail, box = $('#govDetail');
  if(!box) return;
  if(!d){ box.innerHTML = ''; return; }

  const h = d.health || {};
  const access = new Set(d.access || []);
  const canManage = !AUTH.enabled || access.has('manage') || authCan('system.admin');
  const canPublish = !AUTH.enabled || access.has('publish') || authCan('system.admin');
  const archived = d.status === 'archived';
  const canEdit = canManage && !archived;
  const canRelease = canPublish && !archived;
  const hb = STATE_BADGE[h.state] || 'wait';
  const aliases = d.aliases || {};
  const aliasRows = ['stable', 'latest', 'canary'].map(al => {
    const a = aliases[al];
    return `<tr>
      <td class="mono">${al}</td>
      <td class="mono">${a ? esc(a.version) : '—'}</td>
      <td>${a ? a.weight + '%' : '—'}</td>
      <td style="text-align:right"><button class="btn sm" ${canRelease?'':'disabled'} onclick="govAlias('${esc(d.code)}','${al}')">调整</button></td>
    </tr>`;
  }).join('');

  const versions = (d.versions || []).slice().sort((a, b) => {
    const na = parseFloat(String(a.version).replace(/^v/, '')) || 0;
    const nb = parseFloat(String(b.version).replace(/^v/, '')) || 0;
    return nb - na;
  });
  const verRows = versions.map(v => {
    const acts = [];
    const pointedAliases = ['stable', 'latest', 'canary'].filter(alias =>
      aliases[alias] && aliases[alias].version === v.version);
    const isStable = pointedAliases.includes('stable');
    const aliasBadges = pointedAliases.map(alias =>
      `<span class="badge ${alias==='stable'?'run':(alias==='canary'?'wait':'ok')}" style="margin-left:4px" title="${alias} 别名当前指向 ${esc(v.version)}">${alias}</span>`).join('');
    if(canEdit){
      acts.push(`<button class="btn sm" title="读取此版本的 input/output，修改后创建新版本" onclick="openWizard('version',{code:'${esc(d.code)}',version:'${esc(v.version)}'})">编辑契约</button>`);
    }
    if(canRelease){
      acts.push(`<button class="btn sm" onclick="govEval('${esc(d.code)}','${esc(v.version)}',this)">评测</button>`);
      for(const to of (TRANSITIONS[v.status] || [])){
        acts.push(`<button class="btn sm" onclick="govPromote('${esc(d.code)}','${esc(v.version)}','${to}',this)">${PROMOTE_LABEL[to]}</button>`);
      }
      if(v.status === 'canary' || v.status === 'published'){
        acts.push(isStable
          ? '<span class="badge run" title="生产 stable 别名当前已指向此版本">当前 stable</span>'
          : `<button class="btn sm" data-gov-alias-action="stable" onclick="govAlias('${esc(d.code)}','stable','${esc(v.version)}',this)">设为 stable</button>`);
      }
    }
    const st = v.status === 'published' ? 'ok' : (v.status === 'canary' ? 'run' : (v.status === 'testing' ? 'wait' : 'fail'));
    return `<tr${isStable?' style="background:#f7f7ff"':''}>
      <td class="mono" style="color:var(--text)">${esc(v.version)}<span style="color:var(--faint)"> · ${esc(v.bump || '')}</span>
        ${aliasBadges}
        ${(v.context_policy||{}).enabled ? `<span class="tag" style="margin-left:4px" title="上下文策略 ${esc(String(v.context_policy_digest||'').slice(0,8))}">CTX</span>` : ''}</td>
      <td><span class="badge ${st}">${esc(v.status)}</span></td>
      <td>${v.eval_pass ? '<span class="badge ok">通过</span>' : '<span class="badge fail">未评</span>'}</td>
      <td class="mono">${esc(v.graph_key || '—')}${(v.graph_refs && v.graph_refs.length)
        ? `<span class="tag" style="margin-left:4px" title="子 Agent：${esc(v.graph_refs.map(r => r.agent + '@' + r.ref + '（' + r.node + '）').join(', '))}">↳${v.graph_refs.length}</span>` : ''}</td>
      <td class="mono">${esc(String(v.contract_hash || '').slice(0, 8))}</td>
      <td><div class="act">${acts.join('') || '<span class="hint">只读</span>'}</div></td>
    </tr>`;
  }).join('');

  const depRows = GOV.deps.length ? GOV.deps.map(x => {
    const isGraph = x.source === 'graph';
    const who = isGraph ? `图 ${x.graph_id}.${x.node}` : `${x.code}@${x.version}`;
    const tag = isGraph ? '<span class="badge wait">图引用</span>'
      : `<span class="badge ${x.version_status === 'published' ? 'ok' : 'wait'}">${esc(x.version_status)}</span>`;
    return `<tr><td>${tag}</td><td class="mono">${esc(who)}</td><td class="mono">${esc(x.ref)}</td></tr>`;
  }).join('') : '<tr><td colspan="3"><div class="empty">没有上游引用，可安全下线</div></td></tr>';

  const audRows = GOV.audit.length ? GOV.audit.map(x => `<tr>
      <td>${esc(x.action)}</td>
      <td class="mono">${esc(x.version || '—')}</td>
      <td style="color:var(--muted)">${esc(x.note || '')}</td>
      <td class="mono">${fmtTs(x.at)}</td>
    </tr>`).join('') : '<tr><td colspan="4"><div class="empty">暂无审计记录</div></td></tr>';

  box.innerHTML = `
    <div id="govMsg"></div>
    <div class="card">
      <div class="card-h">
        <div class="card-t">${esc(d.code)} <span class="card-s" style="font-weight:400">${esc(d.name || '')}</span></div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <span class="badge ${archived ? 'fail' : hb}">${archived ? '已归档' : esc(h.state || 'unknown')}</span>
          <button class="btn sm" ${archived?'disabled':''} onclick="govOpenCanvas('${esc(d.code)}')">在画布打开</button>
          <button class="btn sm" ${canEdit?'':'disabled'} onclick="govEditIdentity()">编辑基本信息</button>
          <button class="btn sm" ${canEdit?'':'disabled'} onclick="openWizard('version',{code:'${esc(d.code)}'})">${versions.length ? '创建新版本' : '创建首个版本'}</button>
          ${archived
            ? `<button class="btn sm danger" ${(!AUTH.enabled||authCan('system.admin'))?'':'disabled'} onclick="openAgentPurge('${esc(d.code)}')">永久删除</button>`
            : `<button class="btn sm danger" ${canEdit?'':'disabled'} onclick="govDeleteAgent('${esc(d.code)}')">删除 Agent</button>`}
        </div>
      </div>
      <div class="card-b" id="govIdentitySummary" style="display:flex;gap:20px;flex-wrap:wrap">
        <div style="flex:1;min-width:230px">
          <dl class="kv"><dt>健康</dt><dd>${esc(h.hint || '—')}</dd></dl>
          <dl class="kv"><dt>描述</dt><dd>${esc(d.description || '—')}</dd></dl>
          <dl class="kv"><dt>责任</dt><dd>${esc(d.owner_dept || '—')} / ${esc(d.owner_user || '—')}</dd></dl>
          <dl class="kv"><dt>所属项目</dt><dd>${esc((d.project&&d.project.name)||'未归类')}${d.project_code?' · '+esc(d.project_code):''}</dd></dl>
          <dl class="kv"><dt>可见性</dt><dd>${esc(d.visibility || '—')}</dd></dl>
          <dl class="kv"><dt>标签</dt><dd>${(d.tags && d.tags.length) ? d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(' ') : '—'}</dd></dl>
          <dl class="kv"><dt>注册于</dt><dd>${fmtTs(d.created_at)}</dd></dl>
        </div>
        <div style="flex:1;min-width:260px">
          <div class="sub-t">别名指针（调用方只写别名，改指针即灰度/回滚）</div>
          <table><thead><tr><th>别名</th><th>指向</th><th>权重</th><th></th></tr></thead><tbody>${aliasRows}</tbody></table>
        </div>
      </div>
      ${archived ? '<div class="vbar warn" style="margin:0 16px 16px"><b>历史引用</b><div>该 Agent 已归档，不再参与运行选择，但不可变版本仍会保护它引用的编排图。需要删除编排图时，应先按数据清理流程处理 Agent 版本及运行历史。</div></div>' : ''}
      <div class="card-b" id="govIdentityEditor" style="display:none">
        <div class="frm">
          <div class="fld"><label>名称（name） <b>*</b></label><input class="inp" id="geName" value="${attr(d.name || '')}"></div>
          <div class="fld"><label>可见性（visibility）</label><select class="inp" id="geVis"><option value="internal" ${d.visibility==='internal'?'selected':''}>internal</option><option value="public" ${d.visibility==='public'?'selected':''}>public</option></select></div>
          <div class="fld wide"><label>说明（description）</label><input class="inp" id="geDesc" value="${attr(d.description || '')}"></div>
          <div class="fld"><label>责任部门（owner_dept）</label><input class="inp" id="geDept" value="${attr(d.owner_dept || '')}"></div>
          <div class="fld"><label>负责人（owner_user）</label><input class="inp" id="geOwner" value="${attr(d.owner_user || '')}"></div>
          <div class="fld"><label>所属项目（project_code）</label><select class="inp" id="geProject">${projectOptions(d.project_code||'')}</select></div>
          <div class="fld wide"><label>标签（tags，逗号分隔）</label><input class="inp" id="geTags" value="${attr((d.tags || []).join(','))}"></div>
          <div class="fld wide"><div style="display:flex;gap:7px"><button class="btn primary" onclick="govSaveIdentity(this)">保存基本信息</button><button class="btn" onclick="govCancelIdentityEdit()">取消</button></div><div class="hint">Agent code 和历史版本不可修改；input/output 请使用“编辑契约”创建新版本。</div></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><div class="card-t">版本与契约</div><div class="card-s">${versions.length} 个 · 编辑 input/output 会创建新版本，历史版本不覆盖</div></div>
      <table><thead><tr><th>版本</th><th>状态</th><th>评测</th><th>绑定图</th><th>契约</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${verRows || '<tr><td colspan="6"><div class="empty">还没有版本</div></td></tr>'}</tbody></table>
    </div>

    ${renderAgentAccessCard()}

    <div class="grid g2">
      <div class="card">
        <div class="card-h"><div class="card-t">反向依赖</div><div class="card-s">${GOV.deps.length} 处引用（含图内 subgraph）</div></div>
        <table><thead><tr><th>来源</th><th>上游</th><th>引用</th></tr></thead><tbody>${depRows}</tbody></table>
      </div>
      <div class="card">
        <div class="card-h"><div class="card-t">审计</div><div class="card-s">最近 12 条</div></div>
        <table><thead><tr><th>动作</th><th>版本</th><th>说明</th><th>时间</th></tr></thead><tbody>${audRows}</tbody></table>
      </div>
    </div>`;
  renderGovMsg();
}

function govEditIdentity(){
  const summary = $('#govIdentitySummary'), editor = $('#govIdentityEditor');
  if(summary) summary.style.display = 'none';
  if(editor) editor.style.display = '';
}

function govCancelIdentityEdit(){
  const summary = $('#govIdentitySummary'), editor = $('#govIdentityEditor');
  if(summary) summary.style.display = 'flex';
  if(editor) editor.style.display = 'none';
}

async function govSaveIdentity(btn){
  if(!GOV.code) return;
  const name = $('#geName').value.trim();
  if(!name) return toast('Agent 名称不能为空');
  if(btn){ btn.disabled = true; btn.textContent = '保存中…'; }
  const result = await apiRaw(`/v1/agents/${encodeURIComponent(GOV.code)}`, {
    method:'PATCH', body:JSON.stringify({
      name, description:$('#geDesc').value.trim(), owner_dept:$('#geDept').value.trim(),
      owner_user:$('#geOwner').value.trim(), visibility:$('#geVis').value,
      project_code:$('#geProject').value,
      tags:$('#geTags').value.split(',').map(x => x.trim()).filter(Boolean)
    })
  });
  if(!result.ok){
    if(btn){ btn.disabled = false; btn.textContent = '保存基本信息'; }
    return toast(result.body.message || 'Agent 基本信息保存失败');
  }
  toast('Agent 基本信息已更新');
  await loadAgents();
  await govSelect(GOV.code);
}

function renderAgentAccessCard(){
  const data = GOV.access;
  if(!data || !authCan('agent.manage_access')) return '';
  const labels = {read:'查看',run:'运行',manage:'开发',publish:'发布'};
  const rows = (data.users || []).map(user => {
    const granted = new Set(user.permissions || []);
    const globals = new Set(user.global_permissions || []);
    const active = user.enabled && user.directory_active && user.directory_in_scope;
    const controls = (data.actions || []).map(action => {
      const available = user.system_admin || globals.has('agent.' + action);
      return `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px">
        <input type="checkbox" data-agent-user="${user.user_id}" value="${action}"
          ${granted.has(action)?'checked':''} ${(user.system_admin||!available)?'disabled':''}>
        ${labels[action] || esc(action)}</label>`;
    }).join('');
    return `<tr><td><b>${esc(user.name)}</b><div class="hint mono">${esc(user.open_id)}</div></td>
      <td>${(user.roles||[]).map(role=>`<span class="tag">${esc(role.name)}</span>`).join(' ')||'—'}</td>
      <td>${user.system_admin?'<span class="badge ok">管理员全量</span>':controls}</td>
      <td><span class="badge ${active?'ok':'fail'}">${active?'有效':'不可用'}</span></td></tr>`;
  }).join('');
  return `<div class="card">
    <div class="card-h"><div><div class="card-t">访问授权</div><div class="card-s">角色决定动作上限，这里决定可访问当前哪个 Agent</div></div>
      <button class="btn primary" onclick="saveAgentAccess()">保存授权</button></div>
    <div style="max-height:360px;overflow:auto"><table><thead><tr><th>账号</th><th>角色</th><th>Agent 权限</th><th>状态</th></tr></thead>
      <tbody>${rows||'<tr><td colspan="4"><div class="empty">还没有平台账号</div></td></tr>'}</tbody></table></div>
  </div>`;
}

async function saveAgentAccess(){
  if(!GOV.code || !authCan('agent.manage_access')) return;
  const grouped = new Map();
  $$('[data-agent-user]:checked').forEach(input => {
    const userId = Number(input.dataset.agentUser);
    if(!grouped.has(userId)) grouped.set(userId, []);
    grouped.get(userId).push(input.value);
  });
  const grants = [...grouped.entries()].map(([user_id, permissions]) => ({user_id, permissions}));
  const result = await apiRaw(`/v1/agents/${encodeURIComponent(GOV.code)}/access`, {
    method:'PUT', body:JSON.stringify({grants})
  });
  if(!result.ok){ toast(result.body.message || 'Agent 授权保存失败'); return; }
  GOV.access = result.body;
  toast('Agent 授权已更新，后续请求立即生效');
  await loadAgents();
  await govSelect(GOV.code);
}

async function govEval(code, version, btn){
  if(btn){ btn.disabled = true; btn.textContent = '评测中…'; }
  const gate = await apiRaw(`/v1/evaluations/gates/${encodeURIComponent(code)}`);
  if(gate.ok && gate.body.enabled){
    const automated = await apiRaw('/v1/evaluations/runs', {
      method:'POST', body:JSON.stringify({agent_code:code,version,dataset_code:gate.body.dataset_code})
    });
    if(!automated.ok){
      govMsg('err', `自动化评测 ${code}@${version} 提交失败 · ${esc(automated.body.code||automated.status)}`,
             [esc(automated.body.message||'')].concat((automated.body.details||[]).map(esc)));
    }else{
      govMsg('ok', `自动化评测 ${code}@${version} 已提交`,
             [`任务 ${esc(automated.body.eval_id)} 正通过 Worker 执行；到“评测与门禁”查看逐用例结果。`]);
      toast('自动化评测任务已提交');
    }
    if(btn){btn.disabled=false;btn.textContent='评测';}
    return;
  }
  const r = await apiRaw(`/v1/agents/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/eval`, { method:'POST' });
  const checks = r.body.checks || [];
  const passed = r.ok && r.body.eval_pass !== false;
  const lines = checks.map(c =>
    `<div class="chk-item ${c.ok ? 'ok' : 'no'}"><span class="m">${c.ok ? '✓' : '✗'}</span>
      <span>${esc(c.check)}${c.detail ? ' · ' + esc(c.detail) : ''}</span></div>`);
  govMsg(passed ? 'ok' : 'err', `评测 ${code}@${version} · ${passed ? '通过' : '未通过'}`,
         lines.length ? lines : [esc(r.body.message || '无检查项')]);
  await govSelect(code);
}

async function govPromote(code, version, to, btn){
  if(to === 'retired' && !confirm(`下线 ${version}？retired 是终态，之后无法再被调用。`)) return;
  if(to === 'deprecated' && !confirm(`弃用 ${version}？会保留 30 天再允许下线。`)) return;
  if(btn){ btn.disabled = true; btn.textContent = '处理中…'; }
  const body = { version, to, note:'', deprecate_days:30 };
  const r = await apiRaw(`/v1/agents/${encodeURIComponent(code)}/promote`,
                         { method:'POST', body: JSON.stringify(body) });
  if(!r.ok){
    const b = r.body || {};
    const hint = b.code === 'EVAL_REQUIRED' ? '先点左侧“评测”，通过后再晋升。' : '';
    govMsg('err', `${version} → ${to} 被拒 · ${esc(b.code || ('http ' + r.status))}`,
           [esc(b.message || '')].concat((b.details || []).map(esc), hint ? [hint] : []));
  }else{
    const extra = [];
    if(r.body.alias_moved) extra.push('别名 ' + esc(r.body.alias_moved) + ' 已跟随移动');
    govMsg('ok', `${version} · ${r.body.from} → ${r.body.to}`, extra);
  }
  await govSelect(code);
}

async function govAlias(code, alias, preset, btn){
  const cur = (GOV.detail && GOV.detail.aliases && GOV.detail.aliases[alias]) || {};
  const ver = preset || (prompt(`把别名 ${alias} 指向哪个版本？`, cur.version || '') || '').trim();
  if(!ver) return;
  if(cur.version === ver && alias !== 'canary'){
    toast(`${ver} 已经是当前 ${alias} 版本`);
    return;
  }
  let weight = cur.weight == null ? 100 : cur.weight;
  if(alias === 'canary'){
    const w = prompt('canary 权重（0-100），stable/latest 的调用按此比例分流', String(weight));
    if(w === null) return;
    weight = Math.max(0, Math.min(100, parseInt(w, 10) || 0));
  }
  const oldText = btn && btn.textContent;
  if(btn){btn.disabled=true;btn.classList.add('loading');btn.setAttribute('aria-busy','true');btn.textContent='设置中…';}
  const r = await apiRaw(`/v1/agents/${encodeURIComponent(code)}/aliases/${alias}`, {
    method:'PUT', body: JSON.stringify({ version: ver, weight })
  });
  if(!r.ok){
    govMsg('err', `别名 ${alias} 未更新 · ${esc(r.body.code || r.status)}`, [esc(r.body.message || '')]);
    toast(r.body.message || `别名 ${alias} 更新失败`);
  }else{
    govMsg('ok', `别名 ${alias} → ${ver}（${weight}%）`, []);
    toast(`${ver} 已设为 ${alias}`);
  }
  if(btn){btn.disabled=false;btn.classList.remove('loading');btn.removeAttribute('aria-busy');btn.textContent=oldText;}
  await govSelect(code);
}

async function govOpenCanvas(code){
  if(code !== CUR.code) await switchAgent(code, { silent:true });
  go('canvas');
}

async function govDeleteAgent(code){
  if(!agentCan('manage', code)) return toast('没有这个 Agent 的开发权限');
  const versions = (GOV.detail && GOV.detail.versions) || [];
  const hasHistory = versions.some(v => v.status !== 'testing');
  const action = hasHistory ? '归档并停止新调用' : '删除未发布配置';
  const typed = prompt(`${action} ${code}。\n仍在发布、灰度、弃用保留期或被引用时，系统会拒绝操作。\n请输入 Agent code 确认：`, '');
  if(typed === null) return;
  if(typed.trim() !== code){ toast('Agent code 不匹配，已取消'); return; }
  const result = await apiRaw(`/v1/agents/${encodeURIComponent(code)}`, {method:'DELETE'});
  if(!result.ok){
    const body = result.body || {};
    govMsg('err', body.message || 'Agent 删除失败', (body.details || []).map(esc));
    return;
  }
  toast(result.body.mode === 'purged' ? 'Agent 已彻底删除' : 'Agent 已归档，历史记录仍可追溯');
  GOV.code = null; GOV.detail = null; GOV.deps = []; GOV.audit = []; GOV.access = null;
  await loadGov();
}

const AGENT_PURGE = {code:null,busy:false,preview:null};

function detachPurgedAgentState(code, result){
  const deletedGraphs = new Set((((result || {}).deleted || {}).graphs || [])
    .map(item => String(item.graph_id || '')).filter(Boolean));
  GRAPHS = GRAPHS.filter(item => !deletedGraphs.has(String(item.graph_id || '')));
  if(CUR.code === code){
    CUR = {code:'',name:'',version:'',graphId:'default',boundGraph:null};
    try{localStorage.removeItem(CUR_KEY)}catch(e){}
    return;
  }
  if(deletedGraphs.has(CUR.boundGraph)) CUR.boundGraph = null;
  if(deletedGraphs.has(CUR.graphId)){
    CUR.graphId = CUR.boundGraph && !deletedGraphs.has(CUR.boundGraph)
      ? CUR.boundGraph : '';
  }
  saveCur();
}

function closeAgentPurge(){
  if(AGENT_PURGE.busy)return;
  $('#agentPurgeMask').classList.remove('on');
  AGENT_PURGE.code=null;AGENT_PURGE.preview=null;
}

function agentPurgeInputChanged(){
  const ready=AGENT_PURGE.preview&&AGENT_PURGE.preview.can_purge;
  $('#agentPurgeConfirm').disabled=AGENT_PURGE.busy||!ready||$('#agentPurgeInput').value.trim()!==AGENT_PURGE.code;
  $('#agentPurgeError').textContent='';
}

function renderAgentPurgePreview(){
  const p=AGENT_PURGE.preview,box=$('#agentPurgePreview');
  if(!p){box.innerHTML='<div class="empty">正在分析影响范围…</div>';return}
  const records=(p.delete&&p.delete.records)||{};
  const labels={agent_versions:'Agent 版本',runs:'运行记录',run_events:'运行事件',review_decisions:'审核记录',memories:'长期记忆',triggers:'触发器',evaluation_datasets:'评测数据集',evaluation_runs:'评测任务',prompt_templates:'Prompt 模板',builder_sessions:'搭建会话',access_grants:'访问授权'};
  const recordTags=Object.entries(records).filter(([,value])=>Number(value)>0).map(([key,value])=>`<span class="tag">${esc(labels[key]||key)} ${Number(value)}</span>`).join(' ')||'<span class="hint">没有关联业务记录</span>';
  const graphDelete=((p.delete||{}).graphs||[]).map(item=>`<div class="pm-rev"><span class="badge fail">删除</span><span class="mono">${esc(item.graph_id)}</span><span>${item.versions||0} 版本</span></div>`).join('')||'<div class="hint">无独占编排图</div>';
  const kbDelete=((p.delete||{}).knowledge_bases||[]).map(item=>`<div class="pm-rev"><span class="badge fail">删除</span><span class="mono">${esc(item.code)}</span><span>${item.documents||0} 文档 · ${item.chunks||0} 切片</span></div>`).join('')||'<div class="hint">无独占知识库</div>';
  const retained=[...((p.retain||{}).graphs||[]).map(item=>`编排图 ${item.graph_id}：${item.reason}`),...((p.retain||{}).knowledge_bases||[]).map(item=>`知识库 ${item.code}：${item.reason}`)];
  const blockers=p.blockers||[];
  box.innerHTML=`${blockers.length?`<div class="vbar err"><b>当前不能删除</b><div>${blockers.map(item=>`<div>${esc(item)}</div>`).join('')}</div></div>`:'<div class="vbar ok"><b>预检通过</b><div>未发现运行中任务或上游 Agent 引用</div></div>'}
    <div class="sub-t" style="margin-top:14px">将物理删除的记录</div><div style="display:flex;gap:6px;flex-wrap:wrap">${recordTags}</div>
    <div class="grid g2" style="margin-top:12px"><div><div class="sub-t">独占编排图</div>${graphDelete}</div><div><div class="sub-t">独占知识库</div>${kbDelete}</div></div>
    ${retained.length?`<div class="vbar warn" style="margin-top:12px"><b>共享资源保留</b><div>${retained.map(item=>`<div>${esc(item)}</div>`).join('')}</div></div>`:''}`;
  agentPurgeInputChanged();
}

async function openAgentPurge(code){
  if(!code||AGENT_PURGE.busy)return;
  AGENT_PURGE.code=code;AGENT_PURGE.preview=null;
  $('#agentPurgeTarget').textContent=code;
  $('#agentPurgeLabel').textContent=`输入 ${code} 以确认`;
  $('#agentPurgeInput').value='';$('#agentPurgeError').textContent='';
  $('#agentPurgeConfirm').disabled=true;$('#agentPurgeMask').classList.add('on');
  renderAgentPurgePreview();
  const response=await apiRaw(`/v1/agents/${encodeURIComponent(code)}/purge-preview`);
  if(AGENT_PURGE.code!==code)return;
  if(!response.ok){
    $('#agentPurgePreview').innerHTML=`<div class="vbar err"><b>预检失败</b><div>${esc(response.body.message||'无法读取影响范围')}</div></div>`;
    return;
  }
  AGENT_PURGE.preview=response.body;renderAgentPurgePreview();
  setTimeout(()=>$('#agentPurgeInput').focus(),0);
}

async function confirmAgentPurge(btn){
  const code=AGENT_PURGE.code;
  if(!code||AGENT_PURGE.busy||!AGENT_PURGE.preview||!AGENT_PURGE.preview.can_purge||$('#agentPurgeInput').value.trim()!==code)return;
  AGENT_PURGE.busy=true;btn.disabled=true;btn.classList.add('loading');btn.setAttribute('aria-busy','true');btn.textContent='删除中…';
  $('#agentPurgeCancel').disabled=true;$('#agentPurgeClose').disabled=true;
  const response=await apiRaw(`/v1/agents/${encodeURIComponent(code)}/purge`,{method:'POST',body:JSON.stringify({confirmation:code})});
  if(!response.ok){
    AGENT_PURGE.busy=false;btn.classList.remove('loading');btn.removeAttribute('aria-busy');btn.textContent='永久删除';
    $('#agentPurgeCancel').disabled=false;$('#agentPurgeClose').disabled=false;
    $('#agentPurgeError').textContent=response.body.message||'永久删除失败';
    if(response.body.details&&response.body.details.length)$('#agentPurgeError').textContent+='：'+response.body.details.join('；');
    agentPurgeInputChanged();return;
  }
  AGENT_PURGE.busy=false;$('#agentPurgeMask').classList.remove('on');
  const warnings=response.body.warnings||[];
  detachPurgedAgentState(code,response.body);
  toast(warnings.length?'Agent 真源已删除：'+warnings.join('；'):'Agent 及独占资源已永久删除');
  AGENT_PURGE.code=null;AGENT_PURGE.preview=null;
  GOV.code=null;GOV.detail=null;GOV.deps=[];GOV.audit=[];GOV.access=null;
  await loadGov();
}

/* ============ 新建 Agent / 新版本 向导 ============ */
let WIZ = { mode:'agent', step:1, code:null, busy:false };

const WIZ_TEMPLATE_IN = {
  type:'object', required:['asin'],
  properties:{ asin:{ type:'string', pattern:'^B0[A-Z0-9]{8}$' } },
  additionalProperties:false
};
const WIZ_TEMPLATE_OUT = {
  type:'object', required:['summary', 'confidence'],
  properties:{ summary:{ type:'string' }, confidence:{ type:'number', minimum:0, maximum:1 } }
};
const WIZ_CONTEXT_POLICY = {
  version:4,
  enabled:false,
  sources:{
    input:{enabled:true,paths:['input'],priority:100,required:true},
    selected:{enabled:true,priority:95,required:true},
    variables:{enabled:false,paths:['variables.validation'],priority:90},
    history:{enabled:false,max_turns:8,max_tokens:1200,priority:70},
    knowledge:{enabled:false,paths:['variables.knowledge.hits'],max_tokens:2400,priority:85},
    memory:{enabled:false,paths:['variables.memory'],max_tokens:1200,priority:65}
  },
  budget:{max_tokens:8000,system_tokens:800,task_tokens:1600,output_reserve:1600},
  overflow_strategy:'compress_then_drop',
  persist_history:false,
  persist_slots:false,
  compression:{
    enabled:false,model_ref:'',model_version:'stable',trigger_tokens:2400,
    recent_turns:6,summary_tokens:600,cache_ttl_s:3600,fail_open:true,
    sources:['history','knowledge','memory'],rolling_summary:false,
    rolling_summary_min_new_turns:4
  },
  semantic_guard:{
    enabled:false,model_ref:'',model_version:'stable',min_relevance:.6,
    min_confidence:.75,block_prompt_injection:true,block_sensitive:true,
    cache_ttl_s:3600,batch_size:12,fail_open:false,
    sources:['knowledge','memory','skill']
  },
  retrieval:{enabled:false,source:'knowledge',knowledge_base:'',query_path:'',target_path:'variables.knowledge',retrieval_mode:'hybrid',top_k:5,candidate_top_n:20,rerank:true,rerank_required:false,rerank_min_score:0},
  reliability:{max_model_calls:8,max_classification_items:100,max_input_tokens:32000,max_concurrency:4,timeout_ms:15000,circuit_breaker_failures:5,circuit_breaker_cooldown_s:60}
};

async function openWizard(mode, opts){
  if(MODE !== 'live') return toast('需要连接后端才能注册 Agent');
  mode = mode || 'agent';
  opts = opts || {};
  const code = (opts && opts.code) || CUR.code;
  let base = null, baseVersion = opts.version || '';
  if(mode === 'version'){
    let detail = GOV.detail && GOV.detail.code === code ? GOV.detail : null;
    if(!detail){
      const response = await apiRaw('/v1/agents/' + encodeURIComponent(code));
      if(response.ok) detail = response.body;
    }
    if(!baseVersion && detail) baseVersion = pickVersion(detail) || '';
    if(baseVersion){
      const response = await apiRaw(`/v1/agents/${encodeURIComponent(code)}/versions/${encodeURIComponent(baseVersion)}/contract`);
      if(response.ok) base = response.body;
    }
  }
  WIZ = { mode, step: mode === 'version' ? 2 : 1, code, busy:false, baseVersion };

  // 编辑契约必须读取指定 Agent/版本，不能误用顶部当前选中的另一个 Agent。
  const eff = base ? {input:base.input_schema, output:base.output_schema,
                      errors:(base.error_codes || []).map(code => [code])}
                   : (mode === 'agent' ? effContract() : null);
  const inSch = (eff && eff.input && Object.keys(eff.input).length) ? eff.input : WIZ_TEMPLATE_IN;
  const outSch = (eff && eff.output && Object.keys(eff.output).length) ? eff.output : WIZ_TEMPLATE_OUT;
  $('#wIn').value = JSON.stringify(inSch, null, 2);
  $('#wOut').value = JSON.stringify(outSch, null, 2);
  $('#wContextPolicy').value = JSON.stringify(
    (base && base.context_policy && Object.keys(base.context_policy).length)
      ? base.context_policy : WIZ_CONTEXT_POLICY, null, 2);

  const errs = (eff && eff.errors && eff.errors.length) ? eff.errors.map(e => e[0]) : ['CONTRACT_INPUT_INVALID', 'TOOL_TIMEOUT'];
  $('#wErrs').value = errs.join(',');

  await Promise.all([loadGraphList(), loadProjects(true)]);
  renderWizardGraphOptions();
  if(base && GRAPHS.some(g => g.graph_id === base.graph_id)) $('#wGraph').value = base.graph_id;

  $('#wizErr').classList.remove('on');
  $('#wizErr').textContent = '';
  $('#wizTitle').textContent = mode === 'version'
    ? (baseVersion ? `编辑 ${code} 契约 · 基于 ${baseVersion} 创建新版本` : `为 ${code} 创建首个版本`)
    : '新建 Agent';
  $('#wCode').value = mode === 'version' ? code : '';
  $('#wCode').disabled = mode === 'version';
  $('#wName').value = '';
  $('#wProject').value = (GOV.detail && GOV.detail.code === code && GOV.detail.project_code) || '';
  $('#wDesc').value = '';
  $('#wDept').value = (GOV.detail && GOV.detail.code === code && GOV.detail.owner_dept) || '';
  $('#wOwner').value = '';
  $('#wVis').value = 'internal';
  $('#wTags').value = '';
  $('#wQps').value = (base && base.quota && base.quota.qps) || 10;
  $('#wTokens').value = (base && base.quota && base.quota.daily_tokens) || 2000000;

  renderWiz();
  $('#wizMask').classList.add('on');
  wizPreview();
}

function renderWizardGraphOptions(){
  const gsel = $('#wGraph'), hint = $('#wGraphHint'), actions = $('#wGraphActions');
  if(!gsel) return;
  if(GRAPH_LIST_ERROR){
    gsel.innerHTML = '<option value="" selected>编排图加载失败</option>';
    gsel.disabled = true;
    if(hint) hint.textContent = GRAPH_LIST_ERROR;
    if(actions) actions.style.display = 'flex';
    return;
  }
  const eligible = wizardEligibleGraphs();
  if(!eligible.length){
    gsel.innerHTML = '<option value="__auto__" selected>自动创建 start → end 最小编排图</option>';
    gsel.disabled = false;
    if(hint) hint.textContent = GRAPHS.length
      ? '现有编排图均已绑定其他 Agent；系统将创建最小图并绑定当前 Agent，之后可在画布继续编辑'
      : '当前没有未绑定编排图；系统将创建最小图并绑定当前 Agent，之后可在画布继续编辑';
    if(actions) actions.style.display = 'flex';
    return;
  }
  gsel.disabled = false;
  gsel.innerHTML = eligible.map(g =>
    `<option value="${esc(g.graph_id)}"${g.graph_id === (CUR.boundGraph || CUR.graphId) ? ' selected' : ''}>`
    + `${esc(g.name || g.graph_id)} · ${esc(g.graph_id)}@${esc(g.latest || '')}${WIZ.mode==='agent'?' · 未绑定':''}</option>`).join('');
  if(hint) hint.textContent = WIZ.mode === 'agent'
    ? '新 Agent 只能绑定尚未归属其他 Agent 的编排图'
    : '可继续使用当前 Agent 的编排图，或绑定一张未绑定图';
  if(actions) actions.style.display = 'none';
}

function wizardEligibleGraphs(){
  const currentCode = WIZ.mode === 'version' ? String(WIZ.code || '') : '';
  return GRAPHS.filter(graph => {
    const bindings = new Set((Array.isArray(graph.agents) ? graph.agents : [])
      .map(String).map(item => item.trim()).filter(Boolean));
    const owner = String(graph.owner_agent_code || '').trim();
    if(owner) bindings.add(owner);
    if(WIZ.mode === 'agent') return bindings.size === 0;
    return [...bindings].every(code => code === currentCode);
  });
}

async function refreshWizardGraphs(){
  const btn = $('#wizNext');
  btn.disabled = true;
  const ok = await loadGraphList();
  renderWizardGraphOptions();
  renderWiz();
  wizPreview();
  if(!ok && GRAPH_LIST_ERROR) wizErr(GRAPH_LIST_ERROR);
}

async function wizCreateStarterGraph(){
  if(!authCan('agent.manage')) return wizErr('当前账号没有 agent.manage 权限，不能创建编排图');
  const code = (WIZ.mode === 'version' ? WIZ.code : $('#wCode').value.trim()) || 'agent';
  const suggested = `${code}_graph`;
  const gid = (prompt('输入新编排图 graph_id（创建 start → end 最小图）', suggested) || '').trim();
  if(!gid) return;
  if(!/^[A-Za-z0-9_.-]+$/.test(gid)) return wizErr('graph_id 只能包含字母、数字、点、下划线和连字符');
  if(GRAPHS.some(g => g.graph_id === gid)) return wizErr(`编排图已存在：${gid}，请刷新列表后选择`);

  const name = ($('#wName').value.trim() || code) + ' 编排图';
  const dsl = starterGraphDsl(gid, name);
  const r = await apiRaw('/v1/graphs/' + encodeURIComponent(gid), {
    method:'PUT', body:JSON.stringify({dsl,publish:false,owner_agent_code:null})
  });
  if(!r.ok) return wizErr(`${r.body.code || r.status} · ${r.body.message || '编排图创建失败'}`);

  await loadGraphList();
  renderWizardGraphOptions();
  $('#wGraph').value = gid;
  renderWiz();
  wizPreview();
  toast(`已创建 ${gid}@${r.body.version || 'v1'}，可继续创建 Agent`);
}

function starterGraphDsl(gid, name){
  return {
    id:gid, name, entry:'start',
    nodes:[
      {id:'start',type:'start',x:120,y:120,config:{copy_input:true,load_context:false}},
      {id:'end',type:'end',x:420,y:120,config:{source_path:'variables'}}
    ],
    edges:[{from:'start',to:'end'}]
  };
}

function closeWizard(){
  $('#wizMask').classList.remove('on');
  WIZ.busy = false;
}

function wizErr(msg){
  const el = $('#wizErr');
  el.textContent = msg;
  el.classList.add('on');
  el.scrollIntoView({ block:'nearest' });
}

function clearWizErr(){
  const el = $('#wizErr');
  el.textContent = '';
  el.classList.remove('on');
}

function renderWiz(){
  const single = WIZ.mode === 'version';
  $('#wizStep1').style.display = WIZ.step === 1 ? '' : 'none';
  $('#wizStep2').style.display = WIZ.step === 2 ? '' : 'none';
  $('#wizSteps').innerHTML = single
    ? `<span class="s on">版本与图</span>`
    : `<span class="s ${WIZ.step === 1 ? 'on' : ''}">① 身份</span><span class="s ${WIZ.step === 2 ? 'on' : ''}">② 版本与图</span>`;
  $('#wizBack').style.display = (!single && WIZ.step === 2) ? '' : 'none';
  $('#wizNext').textContent = WIZ.step === 1 ? '下一步' : (single ? '创建版本' : '创建 Agent');
  $('#wizNext').disabled = WIZ.busy || (WIZ.step === 2 && !$('#wGraph').value);
}

function wizBody(){
  const code = WIZ.mode === 'version' ? WIZ.code : ($('#wCode').value.trim() || '<code>');
  const errs = $('#wErrs').value.split(',').map(s => s.trim()).filter(Boolean);
  const selectedGraph = $('#wGraph').value;
  const graphId = selectedGraph === '__auto__' ? `${code}_graph（自动创建）` : selectedGraph;
  let contextPolicy = {};
  try{
    const rawPolicy = ($('#wContextPolicy').value || '').trim();
    contextPolicy = rawPolicy ? JSON.parse(rawPolicy) : {};
  }catch(e){ contextPolicy = '<context_policy>'; }
  const vBody = {
    input_schema:'<input_schema>', output_schema:'<output_schema>',
    graph_id: graphId, error_codes: errs,
    context_policy:contextPolicy,
    quota:{ qps: +$('#wQps').value || 10, daily_tokens: +$('#wTokens').value || 2000000 }
  };
  let s = '';
  if(WIZ.mode !== 'version') s += `POST /v1/agents\n${JSON.stringify({
    code, name: $('#wName').value.trim() || '<name>', description: $('#wDesc').value.trim(),
    owner_dept: $('#wDept').value.trim(), owner_user: $('#wOwner').value.trim(),
    visibility: $('#wVis').value, project_code:$('#wProject').value,
    tags: $('#wTags').value.split(',').map(x => x.trim()).filter(Boolean)
  }, null, 2)}\n\n`;
  if(selectedGraph === '__auto__'){
    s += `PUT /v1/graphs/${code}_graph\n${JSON.stringify({
      dsl:'<start → end 最小编排图>', publish:false, owner_agent_code:code
    }, null, 2)}\n\n`;
  }
  s += `POST /v1/agents/${code}/versions\n${JSON.stringify(vBody, null, 2)}`;
  if($('#wPublish').checked) s += `\n\nPOST /v1/agents/${code}/versions/<版本>/eval\nPOST /v1/agents/${code}/promote  {to:"published"}`;
  return s;
}
function wizPreview(){
  const el = $('#wizReq'); if(el) el.textContent = wizBody();
}

function wizPrev(){ if(WIZ.step === 2){ WIZ.step = 1; renderWiz(); } }

async function wizNext(){
  if(WIZ.busy) return;
  try{
    if(WIZ.step === 1){
      const code = $('#wCode').value.trim();
      if(!/^[a-z][a-z0-9_.-]{2,95}$/.test(code)) return wizErr('code 必须为 3–96 个字符，以小写字母开头，且只能包含小写字母、数字、点、下划线和连字符');
      if(!$('#wName').value.trim()) return wizErr('名称必填（下拉框和治理列表都靠它认人）');
      if(AGENTS.some(a => a.code === code)) return wizErr(`code 已存在：${code}。要加版本请用「发布新版本」。`);
      clearWizErr();
      WIZ.step = 2; renderWiz(); wizPreview();
      return;
    }
    return await wizSubmit();
  }catch(error){
    const message = error && error.message ? error.message : String(error || '未知异常');
    return wizErr('无法继续：' + message);
  }
}

async function wizSubmit(){
  const code = WIZ.mode === 'version' ? WIZ.code : $('#wCode').value.trim();
  let inSch, outSch, contextPolicy;
  try{ inSch = JSON.parse($('#wIn').value); }
  catch(e){ return wizErr('input_schema 不是合法 JSON：' + e.message); }
  try{ outSch = JSON.parse($('#wOut').value); }
  catch(e){ return wizErr('output_schema 不是合法 JSON：' + e.message); }
  try{
    const rawPolicy = ($('#wContextPolicy').value || '').trim();
    contextPolicy = rawPolicy ? JSON.parse(rawPolicy) : {};
  }catch(e){ return wizErr('context_policy 不是合法 JSON：' + e.message); }
  if(!inSch || inSch.type !== 'object') return wizErr('input_schema 必须是 type=object 的 JSON Schema');
  if(!outSch || outSch.type !== 'object') return wizErr('output_schema 必须是 type=object 的 JSON Schema');
  const errs = $('#wErrs').value.split(',').map(s => s.trim()).filter(Boolean);
  if(!errs.length) return wizErr('至少声明一个错误码，否则评测的 errors 项一定不通过');
  const selectedGraph = $('#wGraph').value;
  if(!selectedGraph) return wizErr('编排图列表不可用，请先处理页面显示的加载错误');
  const autoGraph = selectedGraph === '__auto__';
  if(!autoGraph && !wizardEligibleGraphs().some(item => item.graph_id === selectedGraph)){
    renderWizardGraphOptions();
    return wizErr('所选编排图已绑定其他 Agent，请选择未绑定编排图或使用系统默认图');
  }
  let graphId = autoGraph ? `${code}_graph` : selectedGraph;

  WIZ.busy = true;
  const hint = $('#wizHint'), btn = $('#wizNext');
  btn.disabled = true;
  $('#wizErr').classList.remove('on');
  const step = t => { hint.textContent = t; };
  let identityCreated = false;
  let versionCreated = false;

  try{
    if(!autoGraph){
      // Graph 列表可能在向导打开后被其他人删除；在写入 Agent 身份前再次确认。
      step('检查编排图…');
      const graphCheck = await apiRaw(`/v1/graphs/${encodeURIComponent(graphId)}`);
      if(!graphCheck.ok){
        await loadGraphList();
        renderWizardGraphOptions();
        throw new Error(`${graphCheck.body.code || graphCheck.status} · ${graphCheck.body.message || `编排图 ${graphId} 不可用`}`);
      }
    }

    if(WIZ.mode !== 'version'){
      step('注册身份…');
      const r = await apiRaw('/v1/agents', { method:'POST', body: JSON.stringify({
        code, name: $('#wName').value.trim(), description: $('#wDesc').value.trim(),
        owner_dept: $('#wDept').value.trim(), owner_user: $('#wOwner').value.trim(),
        visibility: $('#wVis').value, project_code:$('#wProject').value,
        tags: $('#wTags').value.split(',').map(x => x.trim()).filter(Boolean)
      })});
      if(!r.ok) throw new Error(`${r.body.code || r.status} · ${r.body.message || '注册失败'}`);
      identityCreated = true;
    }

    if(autoGraph){
      step('创建最小编排图…');
      const graphResult = await apiRaw('/v1/graphs/' + encodeURIComponent(graphId), {
        method:'PUT', body:JSON.stringify({
          dsl:starterGraphDsl(graphId, ($('#wName').value.trim() || code) + ' 编排图'),
          publish:false, owner_agent_code:code
        })
      });
      if(!graphResult.ok) throw new Error(`${graphResult.body.code || graphResult.status} · ${graphResult.body.message || '自动创建编排图失败'}`);
      if(!GRAPHS.some(item => item.graph_id === graphId)){
        GRAPHS.push({graph_id:graphId, name:($('#wName').value.trim() || code) + ' 编排图', latest:graphResult.body.version || 'v1'});
      }
      GRAPH_LIST_ERROR = '';
      renderWizardGraphOptions();
      $('#wGraph').value = graphId;
    }

    step('注册版本…');
    const vres = await apiRaw(`/v1/agents/${encodeURIComponent(code)}/versions`, { method:'POST', body: JSON.stringify({
      input_schema: inSch, output_schema: outSch, graph_id: graphId, error_codes: errs,
      context_policy: contextPolicy,
      quota:{ qps: +$('#wQps').value || 10, daily_tokens: +$('#wTokens').value || 2000000 }
    })});
    if(!vres.ok) throw new Error(`${vres.body.code || vres.status} · ${vres.body.message || '建版本失败'}`);
    versionCreated = true;
    const version = vres.body.version;

    let published = false, note = '';
    if($('#wPublish').checked){
      step('评测准入…');
      const ev = await apiRaw(`/v1/agents/${encodeURIComponent(code)}/versions/${version}/eval`, { method:'POST' });
      const checks = (ev.body.checks || []);
      const passed = ev.ok && ev.body.eval_pass !== false;
      if(!passed){
        note = '评测未通过，停在 testing：' + checks.filter(c => !c.ok).map(c => c.check).join('、');
      }else{
        const gate = await apiRaw(`/v1/evaluations/gates/${encodeURIComponent(code)}`);
        if(gate.ok && gate.body.enabled){
          step('提交自动化评测…');
          const automated = await apiRaw('/v1/evaluations/runs', {method:'POST',body:JSON.stringify({
            agent_code:code,version,dataset_code:gate.body.dataset_code
          })});
          note = automated.ok
            ? `自动化评测 ${automated.body.eval_id} 已提交，完成且门禁通过后再发布`
            : `自动化评测提交失败：${automated.body.code} · ${automated.body.message}`;
        }else{
          step('发布…');
          const pr = await apiRaw(`/v1/agents/${encodeURIComponent(code)}/promote`, {
            method:'POST', body: JSON.stringify({ version, to:'published', note:'向导创建' })
          });
          if(pr.ok) published = true;
          else note = `发布被拒：${pr.body.code} · ${pr.body.message}`;
        }
      }
    }

    step('刷新注册表…');
    closeWizard();
    await loadAgents();
    await loadGraphList();
    await switchAgent(code, { version, silent:true });
    GOV.code = code;                 // 先认人再切视图，否则 loadGov 还会去拉上一个 agent
    go('govern', { noLoad:true });
    await refreshGovRegistry(code);

    if(published){
      govMsg('ok', `${code}@${version} 已创建并发布`,
        [`绑定图 ${esc(graphId)} · stable/latest 已指向 ${esc(version)}`,
         '画布与契约页已切到该 agent，可直接试跑。']);
      toast(`已创建 ${code}@${version} 并发布`);
    }else{
      govMsg('warn', `${code}@${version} 已创建 · 停在 testing`, [esc(note || '未执行发布')]);
      toast(`已创建 ${code}@${version}（testing，未发布）`);
    }
  }catch(e){
    const message = String(e.message || e);
    if(identityCreated && !versionCreated && WIZ.mode !== 'version'){
      await loadAgents();
      WIZ.mode = 'version';
      WIZ.step = 2;
      WIZ.code = code;
      $('#wCode').disabled = true;
      $('#wizTitle').textContent = `为 ${code} 补建首个版本`;
      wizErr(`Agent 身份 ${code} 已创建，但版本创建失败：${message}。请检查配置后直接重试，无需重新创建 Agent。`);
    }else{
      wizErr(message);
    }
  }finally{
    WIZ.busy = false;
    hint.textContent = '';
    renderWiz();
  }
}

/* ============ 凭证治理（加密存储 / 轮换 / 启停 / 引用保护） ============ */
/* ============ LLM 模型治理 ============ */
const MODEL_GOV = {items:[], code:null, detail:null, deps:[], audit:[]};

function modelCredentialOptions(selected=''){
  const items=(CREDENTIAL_GOV.items||[]).filter(item=>item.status==='active'&&['api_key','bearer'].includes(item.credential_type));
  return `<option value="">— 选择 API Key / Bearer 凭证 —</option>`+items.map(item=>
    `<option value="${attr(item.code)}"${item.code===selected?' selected':''}>${esc(item.name)} · ${esc(item.code)} · ${esc(item.environment)}</option>`).join('');
}

function modelFallbackOptions(selected='', current=''){
  return `<option value="">不设置备用模型</option>`+MODEL_GOV.items.filter(item=>item.code!==current).map(item=>
    `<option value="${attr(item.code)}"${item.code===selected?' selected':''}>${esc(item.name)} · ${esc(item.code)}</option>`).join('');
}

function modelVersionFields(prefix, value={}, current=''){
  const defaults=value.defaults||{temperature:0.2};
  return `<div class="frm">
    <div class="fld"><label>模型服务商（provider） <b>*</b></label><select class="inp" id="${prefix}Provider"><option value="openai_compatible"${value.provider!=='mock'?' selected':''}>OpenAI Compatible</option><option value="mock"${value.provider==='mock'?' selected':''}>Mock</option></select></div>
    <div class="fld"><label>实际模型名（model_name） <b>*</b></label><input class="inp mono" id="${prefix}ModelName" value="${attr(value.model_name||'')}" placeholder="gpt-5.6-sol"></div>
    <div class="fld wide"><label>基础地址（base_url）</label><input class="inp mono" id="${prefix}BaseUrl" value="${attr(value.base_url||'')}" placeholder="https://api.openai.com/v1"></div>
    <div class="fld"><label>平台凭证（credential_ref）</label><select class="inp" id="${prefix}Credential">${modelCredentialOptions(value.credential_ref||'')}</select></div>
    <div class="fld"><label>超时秒数（timeout_s）</label><input class="inp" id="${prefix}Timeout" type="number" min="1" max="3600" value="${attr(value.timeout_s||120)}"></div>
    <div class="fld"><label>输入单价（input_price_per_m，USD/1M tokens）</label><input class="inp" id="${prefix}InputPrice" type="number" min="0" step="0.000001" value="${attr(value.input_price_per_m||0)}"></div>
    <div class="fld"><label>输出单价（output_price_per_m，USD/1M tokens）</label><input class="inp" id="${prefix}OutputPrice" type="number" min="0" step="0.000001" value="${attr(value.output_price_per_m||0)}"></div>
    <div class="fld"><label>备用模型（fallback_model_ref）</label><select class="inp" id="${prefix}Fallback">${modelFallbackOptions(value.fallback_model_ref||'',current)}</select></div>
    <div class="fld"><label>备用版本（fallback_version）</label><input class="inp mono" id="${prefix}FallbackVersion" value="${attr(value.fallback_version||'stable')}"></div>
    <div class="fld wide"><label>能力标签（capabilities，逗号分隔）</label><input class="inp" id="${prefix}Caps" value="${attr((value.capabilities||['text','json']).join(','))}" placeholder="text,json,vision,tools"></div>
    <div class="fld wide"><label>默认调用参数（defaults，JSON）</label><textarea class="pm-tpl" style="min-height:130px" id="${prefix}Defaults">${esc(JSON.stringify(defaults,null,2))}</textarea></div>
  </div>`;
}

function modelVersionBody(prefix){
  let defaults;
  try{defaults=JSON.parse($('#'+prefix+'Defaults').value||'{}')}catch(e){toast('默认调用参数不是合法 JSON');throw e}
  return {provider:$('#'+prefix+'Provider').value,model_name:$('#'+prefix+'ModelName').value.trim(),
    base_url:$('#'+prefix+'BaseUrl').value.trim(),credential_ref:$('#'+prefix+'Credential').value,
    timeout_s:Number($('#'+prefix+'Timeout').value)||120,input_price_per_m:Number($('#'+prefix+'InputPrice').value)||0,
    output_price_per_m:Number($('#'+prefix+'OutputPrice').value)||0,
    fallback_model_ref:$('#'+prefix+'Fallback').value,fallback_version:$('#'+prefix+'FallbackVersion').value.trim()||'stable',
    capabilities:$('#'+prefix+'Caps').value.split(',').map(x=>x.trim()).filter(Boolean),defaults};
}

async function loadModelRegistry(){
  if(MODE!=='live')return;
  const r=await apiRaw('/v1/models');
  MODEL_GOV.items=r.ok?(r.body.items||[]):[];
  renderModelList();
}

async function loadModelPage(preferred){
  await Promise.all([loadCredentialList(),loadModelRegistry()]);
  const target=preferred&&MODEL_GOV.items.some(item=>item.code===preferred)?preferred:(MODEL_GOV.items[0]||{}).code;
  if(target)await modelSelect(target);else modelNew();
}

function renderModelList(){
  const list=$('#modelList');if(!list)return;
  $('#modelCount').textContent=MODEL_GOV.items.length+' 个';
  list.innerHTML=MODEL_GOV.items.length?MODEL_GOV.items.map(item=>{
    const stable=(item.aliases||{}).stable||'未发布';
    return `<div class="gov-agent ${item.code===MODEL_GOV.code?'on':''}" onclick="modelSelect('${attr(item.code)}')"><b>${esc(item.name)}</b><small class="mono">${esc(item.code)} · stable ${esc(stable)} · ${item.versions.length} 版本</small></div>`;
  }).join(''):'<div class="empty">还没有登记模型</div>';
}

async function modelSelect(code){
  MODEL_GOV.code=code;renderModelList();
  const [detail,deps,audit]=await Promise.all([apiRaw('/v1/models/'+encodeURIComponent(code)),apiRaw('/v1/models/'+encodeURIComponent(code)+'/dependents'),apiRaw('/v1/models/'+encodeURIComponent(code)+'/audit?limit=20')]);
  if(!detail.ok){toast(detail.body.message||'模型读取失败');return}
  MODEL_GOV.detail=detail.body;MODEL_GOV.deps=deps.ok?(deps.body.items||[]):[];MODEL_GOV.audit=audit.ok?(audit.body.items||[]):[];
  renderModelDetail();
}

function modelNew(){
  MODEL_GOV.code=null;MODEL_GOV.detail=null;renderModelList();
  $('#modelDetail').innerHTML=`<div class="card"><div class="card-h"><div><div class="card-t">注册模型与首个版本</div><div class="card-s">连接配置进入 testing，通过真实连通性测试后才能发布</div></div></div><div class="card-b"><div class="frm">
    <div class="fld"><label>模型编码（code） <b>*</b></label><input class="inp mono" id="modelNewCode" placeholder="general-chat"></div>
    <div class="fld"><label>显示名称（name） <b>*</b></label><input class="inp" id="modelNewName" placeholder="通用对话模型"></div>
    <div class="fld"><label>负责人（owner_user）</label><input class="inp" id="modelNewOwner" value="console"></div>
    <div class="fld"><label>标签（tags）</label><input class="inp" id="modelNewTags" value="通用,JSON"></div>
    <div class="fld wide"><label>说明（description）</label><input class="inp" id="modelNewDesc" placeholder="适用场景和边界"></div></div>
    <div class="sub-t" style="margin-top:14px">首个连接版本</div>${modelVersionFields('modelNew')}
    <div style="margin-top:12px"><button class="btn primary" onclick="modelCreate(this)">注册并创建 v1</button></div></div></div>`;
}

async function modelCreate(btn){
  let version;try{version=modelVersionBody('modelNew')}catch(e){return}
  const identity={code:$('#modelNewCode').value.trim(),name:$('#modelNewName').value.trim(),description:$('#modelNewDesc').value.trim(),owner_user:$('#modelNewOwner').value.trim(),tags:$('#modelNewTags').value.split(',').map(x=>x.trim()).filter(Boolean)};
  btn.disabled=true;btn.textContent='创建中…';
  let r=await apiRaw('/v1/models',{method:'POST',body:JSON.stringify(identity)});
  if(r.ok)r=await apiRaw('/v1/models/'+encodeURIComponent(identity.code)+'/versions',{method:'POST',body:JSON.stringify(version)});
  btn.disabled=false;btn.textContent='注册并创建 v1';
  if(!r.ok){toast(r.body.message||'模型创建失败');return}
  toast(`${identity.code}@${r.body.version} 已创建，等待测试`);await loadModelRegistry();await modelSelect(identity.code);
}

function renderModelDetail(){
  const d=MODEL_GOV.detail;if(!d)return;
  const versions=(d.versions||[]).map(v=>`<div class="pm-rev" style="align-items:flex-start"><div style="flex:1;min-width:0"><div><span class="pm-tag">${esc(v.version)}</span> <span class="badge ${v.status==='published'?'ok':v.status==='testing'?'wait':'fail'}">${esc(v.status)}</span> ${v.test_pass?'<span class="pm-tag good">测试通过</span>':'<span class="pm-tag warn">待测试</span>'}</div><div class="card-s mono" style="margin-top:5px">${esc(v.provider)} · ${esc(v.model_name)} · timeout ${v.timeout_s}s · credential ${esc(v.credential_ref||'无')}</div><div class="card-s" style="margin-top:3px">输入 $${Number(v.input_price_per_m).toFixed(4)} / 输出 $${Number(v.output_price_per_m).toFixed(4)} · 1M tokens</div>${v.test_detail&&v.test_detail.message?`<div class="hint">最近测试：${esc(v.test_detail.message)}</div>`:''}</div><div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm" onclick="modelTest('${attr(v.version)}',this)">测试</button><button class="btn sm" onclick="modelPromote('${attr(v.version)}',this)" ${!v.test_pass||v.status==='published'?'disabled':''}>发布</button><button class="btn sm" onclick="modelDeprecate('${attr(v.version)}',this)" ${v.status==='deprecated'?'disabled':''}>弃用</button></div></div>`).join('');
  const deps=MODEL_GOV.deps.length?MODEL_GOV.deps.map(x=>`<div class="pm-rev"><span class="mono">${esc(x.agent)}@${esc(x.version)}</span><span>${esc(x.reference)}</span><span class="badge run">${esc(x.status||'')}</span></div>`).join(''):'<div class="empty">暂无已发布 Agent 引用</div>';
  const audit=MODEL_GOV.audit.length?MODEL_GOV.audit.map(x=>`<div class="pm-rev"><span class="pm-tag">${esc(x.action)}</span><span>${esc(x.version||'身份')}</span><span style="flex:1">${esc(x.note||'')}</span><span class="card-s">${new Date(x.at*1000).toLocaleString()}</span></div>`).join(''):'<div class="empty">暂无审计记录</div>';
  $('#modelDetail').innerHTML=`<div class="card"><div class="card-h"><div><div class="card-t">${esc(d.name)}</div><div class="card-s mono">${esc(d.code)} · stable ${(d.aliases||{}).stable||'未发布'}</div></div><button class="btn sm" onclick="go('credential')">管理凭证</button></div><div class="card-b"><div class="frm"><div class="fld"><label>名称（name）</label><input class="inp" id="modelEditName" value="${attr(d.name)}"></div><div class="fld"><label>负责人（owner_user）</label><input class="inp" id="modelEditOwner" value="${attr(d.owner_user||'')}"></div><div class="fld wide"><label>说明（description）</label><input class="inp" id="modelEditDesc" value="${attr(d.description||'')}"></div><div class="fld wide"><label>标签（tags）</label><input class="inp" id="modelEditTags" value="${attr((d.tags||[]).join(','))}"></div></div><button class="btn" style="margin-top:10px" onclick="modelSave(this)">保存资料</button></div></div>
  <div class="card"><div class="card-h"><div class="card-t">不可变版本</div><div class="card-s">测试 → 发布 → Agent 引用</div></div><div class="card-b" style="display:flex;flex-direction:column;gap:7px">${versions||'<div class="empty">暂无版本</div>'}</div></div>
  <div class="card"><div class="card-h"><div><div class="card-t">创建新连接版本</div><div class="card-s">修改端点、模型名、凭证或单价必须创建新版本</div></div></div><div class="card-b">${modelVersionFields('modelVer',{},d.code)}<button class="btn primary" style="margin-top:12px" onclick="modelAddVersion(this)">创建 testing 版本</button></div></div>
  <div class="card"><div class="card-h"><div class="card-t">Agent 引用</div><div class="card-s">${MODEL_GOV.deps.length} 处</div></div><div class="card-b">${deps}</div></div>
  <div class="card"><div class="card-h"><div class="card-t">审计记录</div></div><div class="card-b" style="display:flex;flex-direction:column;gap:6px">${audit}</div></div>`;
}

async function modelSave(btn){
  const d=MODEL_GOV.detail,body={name:$('#modelEditName').value.trim(),description:$('#modelEditDesc').value.trim(),owner_user:$('#modelEditOwner').value.trim(),tags:$('#modelEditTags').value.split(',').map(x=>x.trim()).filter(Boolean)};
  btn.disabled=true;const r=await apiRaw('/v1/models/'+encodeURIComponent(d.code),{method:'PUT',body:JSON.stringify(body)});btn.disabled=false;
  toast(r.ok?'模型资料已保存':(r.body.message||'保存失败'));if(r.ok){await loadModelRegistry();await modelSelect(d.code)}
}

async function modelAddVersion(btn){
  let body;try{body=modelVersionBody('modelVer')}catch(e){return}
  btn.disabled=true;btn.textContent='创建中…';const r=await apiRaw('/v1/models/'+encodeURIComponent(MODEL_GOV.code)+'/versions',{method:'POST',body:JSON.stringify(body)});btn.disabled=false;btn.textContent='创建 testing 版本';
  toast(r.ok?`${r.body.version} 已创建`:(r.body.message||'创建失败'));if(r.ok){await loadModelRegistry();await modelSelect(MODEL_GOV.code)}
}

async function modelTest(version,btn){
  btn.disabled=true;btn.textContent='测试中…';const r=await apiRaw(`/v1/models/${encodeURIComponent(MODEL_GOV.code)}/versions/${encodeURIComponent(version)}/test`,{method:'POST',body:JSON.stringify({prompt:'请返回一个 JSON 对象，字段 ok 的值为布尔值 true。'})});btn.disabled=false;btn.textContent='测试';
  toast(r.ok?'模型连通性测试通过':(r.body.message||'测试失败'));await modelSelect(MODEL_GOV.code);
}

async function modelPromote(version,btn){
  btn.disabled=true;const r=await apiRaw(`/v1/models/${encodeURIComponent(MODEL_GOV.code)}/versions/${encodeURIComponent(version)}/promote`,{method:'POST',body:JSON.stringify({note:'控制台发布'})});
  toast(r.ok?`${version} 已发布并切换 stable/latest`:(r.body.message||'发布失败'));await loadModelRegistry();await modelSelect(MODEL_GOV.code);
}

async function modelDeprecate(version,btn){
  btn.disabled=true;const r=await apiRaw(`/v1/models/${encodeURIComponent(MODEL_GOV.code)}/versions/${encodeURIComponent(version)}/deprecate`,{method:'POST',body:JSON.stringify({note:'控制台弃用'})});
  toast(r.ok?`${version} 已弃用`:(r.body.message||'弃用失败'));await modelSelect(MODEL_GOV.code);
}

const CREDENTIAL_GOV = { items:[], code:null, detail:null, deps:[], audit:[] };

async function loadCredentialList(){
  if(MODE !== 'live') return false;
  const r = await apiRaw('/v1/credentials');
  if(!r.ok) return false;
  CREDENTIAL_GOV.items = r.body.items || [];
  renderCredentialList();
  return true;
}

async function loadCredentialPage(code){
  const list = $('#credentialList'), detail = $('#credentialDetail');
  if(MODE !== 'live'){
    if(list) list.innerHTML = '<div class="empty">需要后端在线</div>';
    if(detail) detail.innerHTML = '<div class="card"><div class="empty">凭证治理接口当前不可用</div></div>';
    return;
  }
  await loadCredentialList();
  const target = code || CREDENTIAL_GOV.code || (CREDENTIAL_GOV.items[0] && CREDENTIAL_GOV.items[0].code);
  if(target) await credentialSelect(target);
  else if(detail) detail.innerHTML = '<div class="card"><div class="empty">还没有凭证，点击右上角新建</div></div>';
}

function renderCredentialList(){
  const el = $('#credentialList'); if(!el) return;
  const count = $('#credentialCount'); if(count) count.textContent = CREDENTIAL_GOV.items.length + ' 个';
  if(!CREDENTIAL_GOV.items.length){ el.innerHTML = '<div class="empty">保险箱为空</div>'; return; }
  el.innerHTML = CREDENTIAL_GOV.items.map(c => {
    const active = c.status === 'active';
    return `<div class="gov-agent ${c.code === CREDENTIAL_GOV.code ? 'on' : ''}" onclick="credentialSelect('${attr(c.code)}')">
      <div class="g-n">${esc(c.name)}<span class="badge ${active ? 'ok' : 'fail'}" style="margin-left:auto">${active ? '启用' : '停用'}</span></div>
      <small class="mono">${esc(c.code)} · ${esc(c.environment)} · ${esc(c.credential_type)} · r${c.secret_version}</small>
    </div>`;
  }).join('');
}

async function credentialSelect(code){
  if(!code) return;
  CREDENTIAL_GOV.code = code; renderCredentialList();
  const path = '/v1/credentials/' + encodeURIComponent(code);
  const [d, dep, aud] = await Promise.all([
    apiRaw(path), apiRaw(path + '/dependents'), apiRaw(path + '/audit?limit=20')
  ]);
  if(!d.ok){
    $('#credentialDetail').innerHTML = `<div class="card"><div class="empty">${esc(d.body.message || '读取失败')}</div></div>`;
    return;
  }
  CREDENTIAL_GOV.detail = d.body;
  CREDENTIAL_GOV.deps = dep.ok ? (dep.body.items || []) : [];
  CREDENTIAL_GOV.audit = aud.ok ? (aud.body.items || []) : [];
  renderCredentialDetail();
}

function credentialSecretFields(type, prefix){
  if(type === 'basic') return `<div class="frm">
    <div class="fld"><label>用户名（username） <b>*</b></label><input class="inp" id="${prefix}Username" autocomplete="off"></div>
    <div class="fld"><label>密码（password） <b>*</b></label><input class="inp" id="${prefix}Password" type="password" autocomplete="new-password"></div>
  </div>`;
  return `<div class="fld"><label>${type === 'bearer' ? '访问令牌（access_token）' : 'API 密钥（api_key）'} <b>*</b></label>
    <input class="inp mono" id="${prefix}Value" type="password" autocomplete="new-password"></div>`;
}

function credentialReadSecret(type, prefix){
  return type === 'basic'
    ? {username:$('#' + prefix + 'Username').value, password:$('#' + prefix + 'Password').value}
    : {value:$('#' + prefix + 'Value').value};
}

function credentialRenderNewSecret(){
  const type = $('#credentialNewType').value;
  $('#credentialNewSecret').innerHTML = credentialSecretFields(type, 'credentialNew');
}

function credentialNew(){
  CREDENTIAL_GOV.code = null; renderCredentialList();
  $('#credentialDetail').innerHTML = `<div class="card">
    <div class="card-h"><div><div class="card-t">新建凭证</div><div class="card-s">凭证正文只在提交时出现，保存后只显示掩码</div></div></div>
    <div class="card-b"><div class="frm">
      <div class="fld"><label>编码（code） <b>*</b></label><input class="inp mono" id="credentialNewCode" value="weather-api-dev"></div>
      <div class="fld"><label>名称（name） <b>*</b></label><input class="inp" id="credentialNewName" value="天气 API 开发凭证"></div>
      <div class="fld"><label>凭证类型（credential_type） <b>*</b></label><select class="inp" id="credentialNewType" onchange="credentialRenderNewSecret()"><option value="api_key">API Key</option><option value="bearer">Bearer Token</option><option value="basic">Basic Auth</option></select></div>
      <div class="fld"><label>环境（environment） <b>*</b></label><select class="inp" id="credentialNewEnv"><option value="dev">dev</option><option value="test">test</option><option value="prod">prod</option></select></div>
      <div class="fld"><label>负责人（owner_user）</label><input class="inp" id="credentialNewOwner" value="console"></div>
      <div class="fld"><label>过期时间（expires_at）</label><input class="inp" id="credentialNewExpiry" type="datetime-local"></div>
      <div class="fld wide"><label>说明（description）</label><input class="inp" id="credentialNewDesc" value="用于外部天气服务连接"></div>
      <div class="fld wide" id="credentialNewSecret">${credentialSecretFields('api_key','credentialNew')}</div>
      <div class="fld wide"><div><button class="btn primary" onclick="credentialCreate(this)">加密保存</button></div></div>
    </div></div></div>`;
}

function credentialExpiry(raw){
  if(!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms / 1000 : null;
}

function credentialDateValue(ts){
  if(!ts) return '';
  const d = new Date(Number(ts) * 1000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}

async function credentialCreate(btn){
  const type = $('#credentialNewType').value;
  const body = {
    code:$('#credentialNewCode').value.trim(), name:$('#credentialNewName').value.trim(),
    description:$('#credentialNewDesc').value.trim(), credential_type:type,
    environment:$('#credentialNewEnv').value, owner_user:$('#credentialNewOwner').value.trim(),
    expires_at:credentialExpiry($('#credentialNewExpiry').value),
    secret:credentialReadSecret(type, 'credentialNew')
  };
  btn.disabled=true; btn.textContent='保存中…';
  const r=await apiRaw('/v1/credentials',{method:'POST',body:JSON.stringify(body)});
  btn.disabled=false; btn.textContent='加密保存';
  if(!r.ok){toast(r.body.message || '创建失败');return}
  toast(`${body.code} 已加密保存`);
  await loadCredentialList(); await credentialSelect(body.code);
}

function renderCredentialDetail(){
  const d=CREDENTIAL_GOV.detail, box=$('#credentialDetail'); if(!d || !box)return;
  const active=d.status==='active';
  const expired=d.expires_at && Number(d.expires_at) <= Date.now()/1000;
  const depRows=CREDENTIAL_GOV.deps.length ? CREDENTIAL_GOV.deps.map(x=>`<tr><td>${esc(x.resource_type)}</td><td class="mono">${esc(x.resource_ref)}</td><td><span class="badge ${x.blocking?'wait':'ok'}">${esc(x.resource_status||(x.blocking?'使用中':'已释放'))}</span></td><td class="mono">${fmtTs(x.created_at)}</td></tr>`).join('') : '<tr><td colspan="4"><div class="empty">暂无资源引用</div></td></tr>';
  const auditRows=CREDENTIAL_GOV.audit.length ? CREDENTIAL_GOV.audit.map(x=>`<tr><td>${esc(x.action)}</td><td>${esc(x.note||'')}</td><td>${esc(x.operator||'—')}</td><td class="mono">${fmtTs(x.at)}</td></tr>`).join('') : '<tr><td colspan="4"><div class="empty">暂无审计记录</div></td></tr>';
  box.innerHTML=`
    <div class="card">
      <div class="card-h"><div><div class="card-t">${esc(d.name)} <span class="mono" style="font-weight:400;color:var(--muted)">${esc(d.code)}</span></div><div class="card-s">${esc(d.description||'')}</div></div>
        <div style="display:flex;gap:6px"><span class="badge ${active?'ok':'fail'}">${active?'启用':'停用'}</span>${expired?'<span class="badge fail">已过期</span>':''}</div></div>
      <div class="card-b" style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px">
        <dl class="kv"><dt>类型 / 环境</dt><dd><span class="mono">${esc(d.credential_type)} · ${esc(d.environment)}</span></dd></dl>
        <dl class="kv"><dt>凭证掩码</dt><dd class="mono">${esc(d.secret_mask)}</dd></dl>
        <dl class="kv"><dt>轮换版本</dt><dd>r${d.secret_version}</dd></dl><dl class="kv"><dt>最后轮换</dt><dd>${fmtTs(d.last_rotated_at)}</dd></dl>
      </div>
    </div>
    <div class="card"><div class="card-h"><div><div class="card-t">资料与状态</div><div class="card-s">类型、环境和 code 创建后不可变</div></div><div style="display:flex;gap:6px">
      <button class="btn sm" onclick="credentialState(${active?'false':'true'},this)">${active?'停用':'启用'}</button>
      <button class="btn sm" onclick="credentialDelete(this)" ${active?'disabled title="请先停用"':''}>删除</button></div></div>
      <div class="card-b"><div class="frm">
        <div class="fld"><label>名称（name）</label><input class="inp" id="credentialEditName" value="${attr(d.name)}"></div>
        <div class="fld"><label>负责人（owner_user）</label><input class="inp" id="credentialEditOwner" value="${attr(d.owner_user||'')}"></div>
        <div class="fld"><label>过期时间（expires_at）</label><input class="inp" id="credentialEditExpiry" type="datetime-local" value="${attr(credentialDateValue(d.expires_at))}"></div>
        <div class="fld wide"><label>说明（description）</label><input class="inp" id="credentialEditDesc" value="${attr(d.description||'')}"></div>
        <div class="fld wide"><div><button class="btn" onclick="credentialSave(this)">保存资料</button></div></div>
      </div></div></div>
    <div class="card"><div class="card-h"><div><div class="card-t">轮换凭证</div><div class="card-s">成功后旧密文立即失效，版本号递增</div></div></div>
      <div class="card-b"><div id="credentialRotateSecret">${credentialSecretFields(d.credential_type,'credentialRotate')}</div>
        <div style="margin-top:10px"><button class="btn primary" onclick="credentialRotate(this)">执行轮换</button></div></div></div>
    <div class="grid g2">
      <div class="card"><div class="card-h"><div class="card-t">反向引用</div><div class="card-s">${CREDENTIAL_GOV.deps.filter(x=>x.blocking).length} 处使用中</div></div><table><thead><tr><th>资源类型</th><th>资源</th><th>状态</th><th>绑定时间</th></tr></thead><tbody>${depRows}</tbody></table></div>
      <div class="card"><div class="card-h"><div class="card-t">审计</div><div class="card-s">正文不会写入审计</div></div><table><thead><tr><th>动作</th><th>说明</th><th>操作人</th><th>时间</th></tr></thead><tbody>${auditRows}</tbody></table></div>
    </div>`;
}

async function credentialSave(btn){
  const body={name:$('#credentialEditName').value.trim(),description:$('#credentialEditDesc').value.trim(),owner_user:$('#credentialEditOwner').value.trim(),expires_at:credentialExpiry($('#credentialEditExpiry').value)};
  btn.disabled=true;
  const r=await apiRaw('/v1/credentials/'+encodeURIComponent(CREDENTIAL_GOV.code),{method:'PUT',body:JSON.stringify(body)});
  toast(r.ok?'资料已保存':(r.body.message||'保存失败'));
  await loadCredentialList(); await credentialSelect(CREDENTIAL_GOV.code);
}

async function credentialRotate(btn){
  const d=CREDENTIAL_GOV.detail;
  const body={secret:credentialReadSecret(d.credential_type,'credentialRotate'),note:'控制台轮换'};
  btn.disabled=true; btn.textContent='轮换中…';
  const r=await apiRaw('/v1/credentials/'+encodeURIComponent(d.code)+'/rotate',{method:'POST',body:JSON.stringify(body)});
  toast(r.ok?`已轮换到 r${r.body.credential.secret_version}`:(r.body.message||'轮换失败'));
  await loadCredentialList(); await credentialSelect(d.code);
}

async function credentialState(enabled,btn){
  const d=CREDENTIAL_GOV.detail;
  if(!enabled && !confirm(`停用 ${d.code}？存在引用时后端会拒绝。`))return;
  btn.disabled=true;
  const r=await apiRaw('/v1/credentials/'+encodeURIComponent(d.code)+'/state',{method:'POST',body:JSON.stringify({enabled,note:'控制台操作'})});
  toast(r.ok?(enabled?'凭证已启用':'凭证已停用'):(r.body.message||'状态变更失败'));
  await loadCredentialList(); await credentialSelect(d.code);
}

async function credentialDelete(btn){
  const code=CREDENTIAL_GOV.code;
  if(!confirm(`永久删除 ${code} 的密文和元数据？审计记录会保留。`))return;
  btn.disabled=true;
  const r=await apiRaw('/v1/credentials/'+encodeURIComponent(code),{method:'DELETE'});
  if(!r.ok){toast(r.body.message||'删除失败');await credentialSelect(code);return}
  CREDENTIAL_GOV.code=null; CREDENTIAL_GOV.detail=null;
  toast(`${code} 已删除`); await loadCredentialPage(null);
}

/* ============ 节点管理（代码注册表 / 运行期开关 / 引用影响 / 审计） ============ */
/* ============ 触发器治理 ============ */
/* ============ 自动化评测与发布门禁 ============ */
const EVAL_GOV = {datasets:[], code:null, detail:null, gate:null, runs:[], editCase:null, report:null,
  pollTimer:null, pollEvalId:null, pollGeneration:0};

function evaluationAgentOptions(selected=''){
  return AGENTS.map(agent=>`<option value="${attr(agent.code)}"${agent.code===selected?' selected':''}>${esc(agent.name||agent.code)} · ${esc(agent.code)}</option>`).join('');
}

async function loadEvaluationPage(code){
  if(MODE!=='live'){
    $('#evaluationDatasetList').innerHTML='<div class="empty">需要后端在线</div>';
    return;
  }
  await loadAgents();
  const response=await apiRaw('/v1/evaluations/datasets');
  EVAL_GOV.datasets=response.ok?(response.body.items||[]):[];
  const filter=$('#evaluationAgentFilter');
  if(filter){
    const current=filter.value;
    filter.innerHTML='<option value="">全部 Agent</option>'+evaluationAgentOptions(current);
    if([...filter.options].some(option=>option.value===current))filter.value=current;
  }
  renderEvaluationDatasetList();
  const target=code||EVAL_GOV.code||(EVAL_GOV.datasets[0]&&EVAL_GOV.datasets[0].code);
  if(target)await evaluationSelect(target);
}

function renderEvaluationDatasetList(){
  const box=$('#evaluationDatasetList');if(!box)return;
  const search=($('#evaluationSearch')&&$('#evaluationSearch').value||'').trim().toLowerCase();
  const agent=($('#evaluationAgentFilter')&&$('#evaluationAgentFilter').value)||'';
  const items=EVAL_GOV.datasets.filter(item=>(!agent||item.agent_code===agent)&&(!search||`${item.code} ${item.name}`.toLowerCase().includes(search)));
  $('#evaluationDatasetCount').textContent=items.length+' 个';
  box.innerHTML=items.length?items.map(item=>`<div class="gov-agent ${item.code===EVAL_GOV.code?'on':''}" onclick="evaluationSelect('${attr(item.code)}')">
    <div class="g-n">${esc(item.name)}<span class="badge ${item.status==='active'?'ok':'fail'}" style="margin-left:auto">${esc(item.status)}</span></div>
    <small class="mono">${esc(item.code)} · ${esc(item.agent_code)} · ${item.case_count||0} 用例</small>
  </div>`).join(''):'<div class="empty">没有匹配的评测数据集</div>';
}

async function evaluationSelect(code){
  stopEvaluationPolling();
  EVAL_GOV.code=code;EVAL_GOV.editCase=null;EVAL_GOV.report=null;renderEvaluationDatasetList();
  const detail=await apiRaw('/v1/evaluations/datasets/'+encodeURIComponent(code));
  if(!detail.ok){toast(detail.body.message||'数据集加载失败');return;}
  EVAL_GOV.detail=detail.body;
  const [gate,runs]=await Promise.all([
    apiRaw('/v1/evaluations/gates/'+encodeURIComponent(detail.body.agent_code)),
    apiRaw('/v1/evaluations/runs?agent_code='+encodeURIComponent(detail.body.agent_code)+'&limit=30')
  ]);
  EVAL_GOV.gate=gate.ok?gate.body:null;EVAL_GOV.runs=runs.ok?(runs.body.items||[]):[];
  renderEvaluationDetail();
}

function evaluationNewDataset(){
  stopEvaluationPolling();
  EVAL_GOV.code=null;EVAL_GOV.detail=null;EVAL_GOV.gate=null;EVAL_GOV.runs=[];EVAL_GOV.editCase=null;EVAL_GOV.report=null;
  renderEvaluationDatasetList();renderEvaluationDetail(true);
}

function evaluationDatasetForm(isNew){
  const d=EVAL_GOV.detail||{code:'',agent_code:CUR.code||(AGENTS[0]||{}).code||'',name:'',description:'',status:'active'};
  return `<div class="card"><div class="card-h"><div><div class="card-t">${isNew?'新建评测数据集':'数据集设置'}</div><div class="card-s">用例属于固定 Agent，创建后不可更换归属</div></div></div>
    <div class="card-b"><div class="frm">
      <div class="fld"><label>数据集编码（code） <b>*</b></label><input class="inp mono" id="evalDatasetCode" value="${attr(d.code)}" ${isNew?'':'disabled'} placeholder="hello.regression"></div>
      <div class="fld"><label>所属 Agent（agent_code） <b>*</b></label><select class="inp" id="evalDatasetAgent" ${isNew?'':'disabled'}>${evaluationAgentOptions(d.agent_code)}</select></div>
      <div class="fld"><label>名称（name） <b>*</b></label><input class="inp" id="evalDatasetName" value="${attr(d.name)}"></div>
      <div class="fld"><label>状态（status）</label><select class="inp" id="evalDatasetStatus"><option value="active" ${d.status==='active'?'selected':''}>active</option><option value="disabled" ${d.status==='disabled'?'selected':''}>disabled</option></select></div>
      <div class="fld wide"><label>说明（description）</label><input class="inp" id="evalDatasetDesc" value="${attr(d.description||'')}"></div>
    </div><div style="display:flex;gap:7px;margin-top:10px"><button class="btn primary" onclick="evaluationSaveDataset(this,${isNew})">保存数据集</button>${isNew?'':`<button class="btn danger" onclick="evaluationDeleteDataset()">删除数据集</button>`}</div></div></div>`;
}

function evaluationRunRowsHtml(){
  return EVAL_GOV.runs.map(run=>`<tr><td class="mono"><button class="link-btn" onclick="evaluationOpenReport('${attr(run.eval_id)}')">${esc(run.eval_id)}</button></td><td class="mono">${esc(run.agent_version)}</td><td><span class="badge ${run.status==='completed'?(run.gate_pass?'ok':'fail'):'run'}">${run.status==='completed'?(run.gate_pass?'通过':'未通过'):'运行中'}</span></td><td>${run.passed_cases}/${run.total_cases}</td><td>${run.metrics&&run.metrics.pass_rate!=null?(run.metrics.pass_rate*100).toFixed(1)+'%':'—'}</td><td>${fmtTs(run.completed_at||run.created_at)}</td></tr>`).join('');
}

function renderEvaluationDetail(isNew=false){
  const box=$('#evaluationDetail');if(!box)return;
  if(isNew){box.innerHTML=evaluationDatasetForm(true);return;}
  const d=EVAL_GOV.detail;if(!d){box.innerHTML='<div class="card"><div class="empty">选择或新建一个评测数据集</div></div>';return;}
  const gate=EVAL_GOV.gate||{dataset_code:d.code,enabled:false,min_pass_rate:1,max_p95_latency_ms:0,max_avg_tokens:0,require_no_regression:true,required_tags:['smoke'],allow_side_effects:false};
  const edit=EVAL_GOV.editCase?d.cases.find(item=>item.case_id===EVAL_GOV.editCase):null;
  const c=edit||{name:'',input:{},assertions:[{type:'schema'},{type:'status',value:'succeeded'}],tags:['smoke'],enabled:true,sort_order:(d.cases||[]).length};
  const caseRows=(d.cases||[]).map(item=>`<tr><td><b>${esc(item.name)}</b><div class="hint mono">${esc(item.case_id)}</div></td><td>${(item.tags||[]).map(tag=>`<span class="tag">${esc(tag)}</span>`).join(' ')||'—'}</td><td>${(item.assertions||[]).length}</td><td><span class="badge ${item.enabled?'ok':'fail'}">${item.enabled?'启用':'停用'}</span></td><td><div class="act"><button class="btn sm" onclick="evaluationEditCase('${attr(item.case_id)}')">编辑</button><button class="btn sm danger" onclick="evaluationDeleteCase('${attr(item.case_id)}')">删除</button></div></td></tr>`).join('');
  const agent=(AGENTS||[]).find(item=>item.code===d.agent_code)||{};
  const versions=(agent.versions||[]).map(item=>typeof item==='string'?item:item.version);
  const runRows=evaluationRunRowsHtml();
  box.innerHTML=evaluationDatasetForm(false)+`
    <div class="card"><div class="card-h"><div><div class="card-t">发布门禁策略</div><div class="card-s">策略或用例变更会使旧报告失效</div></div><span class="badge ${gate.enabled?'ok':'wait'}">${gate.enabled?'已启用':'未启用'}</span></div>
      <div class="card-b"><div class="frm">
        <div class="fld"><label class="chk"><input type="checkbox" id="evalGateEnabled" ${gate.enabled?'checked':''}> 启用发布门禁（enabled）</label></div>
        <div class="fld"><label>门禁数据集（dataset_code）</label><select class="inp" id="evalGateDataset">${EVAL_GOV.datasets.filter(item=>item.agent_code===d.agent_code).map(item=>`<option value="${attr(item.code)}"${item.code===(gate.dataset_code||d.code)?' selected':''}>${esc(item.name)} · ${esc(item.code)}</option>`).join('')}</select></div>
        <div class="fld"><label>最低通过率（min_pass_rate，0-1）</label><input class="inp" id="evalGateRate" type="number" min="0" max="1" step="0.01" value="${gate.min_pass_rate==null?1:gate.min_pass_rate}"></div>
        <div class="fld"><label>P95 最大耗时（max_p95_latency_ms，0 不限）</label><input class="inp" id="evalGateLatency" type="number" min="0" value="${gate.max_p95_latency_ms||0}"></div>
        <div class="fld"><label>平均 Token 上限（max_avg_tokens，0 不限）</label><input class="inp" id="evalGateTokens" type="number" min="0" value="${gate.max_avg_tokens||0}"></div>
        <div class="fld"><label>必过标签（required_tags，逗号分隔）</label><input class="inp" id="evalGateTags" value="${attr((gate.required_tags||[]).join(','))}"></div>
        <div class="fld"><label class="chk"><input type="checkbox" id="evalGateRegression" ${gate.require_no_regression?'checked':''}> 不得低于最近通过基线（require_no_regression）</label></div>
        <div class="fld"><label class="chk"><input type="checkbox" id="evalGateSideEffects" ${gate.allow_side_effects?'checked':''}> 允许真实副作用节点（allow_side_effects）</label><div class="hint">仅在 Skill/子 Agent 已隔离到测试环境时开启</div></div>
      </div><button class="btn primary" style="margin-top:10px" onclick="evaluationSaveGate(this)">保存门禁</button></div></div>
    <div class="card"><div class="card-h"><div><div class="card-t">评测用例</div><div class="card-s">${(d.cases||[]).length} 个 · 运行时会快照输入和断言</div></div><button class="btn sm" onclick="evaluationEditCase('')">新建用例</button></div>
      <table><thead><tr><th>用例</th><th>标签</th><th>断言</th><th>状态</th><th>操作</th></tr></thead><tbody>${caseRows||'<tr><td colspan="5"><div class="empty">至少创建一个已启用用例</div></td></tr>'}</tbody></table>
      <div class="card-b" style="border-top:1px solid var(--line-2)"><div class="sub-t">${edit?'编辑用例':'新增用例'}</div><div class="frm">
        <div class="fld"><label>用例名称（name） <b>*</b></label><input class="inp" id="evalCaseName" value="${attr(c.name)}"></div>
        <div class="fld"><label>标签（tags）</label><input class="inp" id="evalCaseTags" value="${attr((c.tags||[]).join(','))}" placeholder="smoke,boundary"></div>
        <div class="fld"><label>输入（input，JSON）</label><textarea class="inp schema-editor" id="evalCaseInput">${esc(JSON.stringify(c.input||{},null,2))}</textarea></div>
        <div class="fld"><label>断言（assertions，JSON 数组）</label><textarea class="inp schema-editor" id="evalCaseAssertions">${esc(JSON.stringify(c.assertions||[],null,2))}</textarea><div class="hint">除契约、字段、耗时与 Token 外，支持 context_budget_compliance、context_min_relevance、context_min/max_block_rate、context_max_degraded_calls、context_summary_facts</div></div>
        <div class="fld"><label class="chk"><input type="checkbox" id="evalCaseEnabled" ${c.enabled?'checked':''}> 启用（enabled）</label></div>
        <div class="fld"><label>排序（sort_order）</label><input class="inp" id="evalCaseSort" type="number" value="${c.sort_order||0}"></div>
      </div><div style="display:flex;gap:7px;margin-top:10px"><button class="btn primary" onclick="evaluationSaveCase(this)">${edit?'保存用例':'添加用例'}</button>${edit?'<button class="btn" onclick="evaluationEditCase(\'\')">取消编辑</button>':''}</div></div></div>
    <div class="card"><div class="card-h"><div><div class="card-t">版本回归评测</div><div class="card-s">通过普通 Run/Worker 执行，保留完整节点追踪</div></div><div style="display:flex;gap:7px"><select class="inp" id="evalRunVersion" style="width:120px">${versions.map(version=>`<option value="${attr(version)}">${esc(version)}</option>`).join('')}</select><button class="btn primary" onclick="evaluationStartRun(this)" ${versions.length?'':'disabled'}>开始评测</button></div></div>
      <table><thead><tr><th>任务</th><th>版本</th><th>门禁</th><th>通过</th><th>通过率</th><th>时间</th></tr></thead><tbody id="evaluationRunRows">${runRows||'<tr><td colspan="6"><div class="empty">还没有评测任务</div></td></tr>'}</tbody></table></div>
    <div id="evaluationReport">${renderEvaluationReport()}</div>`;
}

async function evaluationSaveDataset(btn,isNew){
  const body={code:$('#evalDatasetCode').value.trim(),agent_code:$('#evalDatasetAgent').value,name:$('#evalDatasetName').value.trim(),description:$('#evalDatasetDesc').value.trim(),status:$('#evalDatasetStatus').value};
  if(!body.code||!body.name||!body.agent_code)return toast('code、Agent 和名称必填');
  btn.disabled=true;btn.textContent='保存中…';
  const url=isNew?'/v1/evaluations/datasets':'/v1/evaluations/datasets/'+encodeURIComponent(body.code);
  const result=await apiRaw(url,{method:isNew?'POST':'PUT',body:JSON.stringify(body)});
  if(!result.ok){btn.disabled=false;btn.textContent='保存数据集';return toast(result.body.message||'保存失败');}
  toast('评测数据集已保存');EVAL_GOV.code=body.code;await loadEvaluationPage(body.code);
}

async function evaluationDeleteDataset(){
  const d=EVAL_GOV.detail;if(!d||!confirm(`删除评测数据集 ${d.code}？已有评测历史时系统会拒绝物理删除。`))return;
  const result=await apiRaw('/v1/evaluations/datasets/'+encodeURIComponent(d.code),{method:'DELETE'});
  if(!result.ok)return toast(result.body.message||'删除失败');
  EVAL_GOV.code=null;EVAL_GOV.detail=null;toast('数据集已删除');await loadEvaluationPage();
}

function evaluationEditCase(caseId){EVAL_GOV.editCase=caseId||null;renderEvaluationDetail();requestAnimationFrame(()=>$('#evalCaseName')&&$('#evalCaseName').focus());}

async function evaluationSaveCase(btn){
  let input,assertions;try{input=JSON.parse($('#evalCaseInput').value)}catch(e){return toast('输入 JSON 无效：'+e.message)}
  try{assertions=JSON.parse($('#evalCaseAssertions').value)}catch(e){return toast('断言 JSON 无效：'+e.message)}
  const body={name:$('#evalCaseName').value.trim(),input,assertions,tags:$('#evalCaseTags').value.split(',').map(x=>x.trim()).filter(Boolean),enabled:$('#evalCaseEnabled').checked,sort_order:Number($('#evalCaseSort').value)||0};
  if(!body.name)return toast('用例名称必填');
  btn.disabled=true;const base='/v1/evaluations/datasets/'+encodeURIComponent(EVAL_GOV.code)+'/cases';
  const result=await apiRaw(EVAL_GOV.editCase?base+'/'+encodeURIComponent(EVAL_GOV.editCase):base,{method:EVAL_GOV.editCase?'PUT':'POST',body:JSON.stringify(body)});
  if(!result.ok){btn.disabled=false;return toast(result.body.message||'用例保存失败');}
  toast('评测用例已保存');await evaluationSelect(EVAL_GOV.code);
}

async function evaluationDeleteCase(caseId){
  if(!confirm('删除这个评测用例？'))return;
  const result=await apiRaw('/v1/evaluations/datasets/'+encodeURIComponent(EVAL_GOV.code)+'/cases/'+encodeURIComponent(caseId),{method:'DELETE'});
  if(!result.ok)return toast(result.body.message||'用例删除失败');
  toast('用例已删除');await evaluationSelect(EVAL_GOV.code);
}

async function evaluationSaveGate(btn){
  const body={dataset_code:$('#evalGateDataset').value,enabled:$('#evalGateEnabled').checked,min_pass_rate:Number($('#evalGateRate').value),max_p95_latency_ms:Number($('#evalGateLatency').value)||0,max_avg_tokens:Number($('#evalGateTokens').value)||0,require_no_regression:$('#evalGateRegression').checked,required_tags:$('#evalGateTags').value.split(',').map(x=>x.trim()).filter(Boolean),allow_side_effects:$('#evalGateSideEffects').checked};
  btn.disabled=true;btn.textContent='保存中…';const result=await apiRaw('/v1/evaluations/gates/'+encodeURIComponent(EVAL_GOV.detail.agent_code),{method:'PUT',body:JSON.stringify(body)});
  if(!result.ok){btn.disabled=false;btn.textContent='保存门禁';return toast(result.body.message||'门禁保存失败');}
  toast('发布门禁已保存；策略变化后需重新评测');await evaluationSelect(EVAL_GOV.code);
}

async function evaluationStartRun(btn){
  const version=$('#evalRunVersion').value;if(!version)return;
  btn.disabled=true;btn.textContent='提交中…';
  const result=await apiRaw('/v1/evaluations/runs',{method:'POST',body:JSON.stringify({agent_code:EVAL_GOV.detail.agent_code,version,dataset_code:EVAL_GOV.code})});
  btn.disabled=false;btn.textContent='开始评测';
  if(!result.ok)return toast(`${result.body.code||'EVAL_FAILED'} · ${result.body.message||'评测提交失败'}`);
  toast(`评测任务 ${result.body.eval_id} 已提交`);await evaluationSelect(EVAL_GOV.code);await evaluationOpenReport(result.body.eval_id);
}

async function evaluationOpenReport(evalId){
  stopEvaluationPolling();
  const result=await apiRaw('/v1/evaluations/runs/'+encodeURIComponent(evalId));
  if(!result.ok)return toast(result.body.message||'评测报告加载失败');
  applyEvaluationReport(result.body);
  if(result.body.status!=='completed')startEvaluationPolling(evalId);
}

function applyEvaluationReport(report){
  EVAL_GOV.report=report;
  const found=EVAL_GOV.runs.find(item=>item.eval_id===report.eval_id);
  if(found)Object.assign(found,report);else EVAL_GOV.runs.unshift(report);
  const rows=$('#evaluationRunRows');
  if(rows)rows.innerHTML=evaluationRunRowsHtml()||'<tr><td colspan="6"><div class="empty">还没有评测任务</div></td></tr>';
  const detail=$('#evaluationReport');if(detail)detail.innerHTML=renderEvaluationReport();
}

function stopEvaluationPolling(){
  if(EVAL_GOV.pollTimer)clearTimeout(EVAL_GOV.pollTimer);
  EVAL_GOV.pollTimer=null;EVAL_GOV.pollEvalId=null;EVAL_GOV.pollGeneration+=1;
}

function startEvaluationPolling(evalId){
  stopEvaluationPolling();
  EVAL_GOV.pollEvalId=evalId;
  const generation=EVAL_GOV.pollGeneration;
  EVAL_GOV.pollTimer=setTimeout(()=>pollEvaluationReport(evalId,generation),2000);
}

async function pollEvaluationReport(evalId=EVAL_GOV.pollEvalId,generation=EVAL_GOV.pollGeneration){
  if(!evalId||generation!==EVAL_GOV.pollGeneration)return;
  if(!$('#view-evaluation').classList.contains('active')){stopEvaluationPolling();return;}
  EVAL_GOV.pollTimer=null;
  const result=await apiRaw('/v1/evaluations/runs/'+encodeURIComponent(evalId));
  if(generation!==EVAL_GOV.pollGeneration||evalId!==EVAL_GOV.pollEvalId)return;
  if(result.ok){
    applyEvaluationReport(result.body);
    if(result.body.status==='completed'){
      const passed=!!result.body.gate_pass;
      stopEvaluationPolling();
      toast(passed?'评测完成 · 门禁通过':'评测完成 · 门禁未通过');
      return;
    }
  }
  EVAL_GOV.pollTimer=setTimeout(()=>pollEvaluationReport(evalId,generation),result.ok?2000:4000);
}

function renderEvaluationReport(){
  const report=EVAL_GOV.report;if(!report)return '';
  const checks=(report.gate_checks||[]).map(item=>`<div class="chk-item ${item.ok?'ok':'no'}"><span class="m">${item.ok?'✓':'✗'}</span><span>${esc(item.check)} · ${esc(item.actual)} / ${esc(item.threshold)}</span></div>`).join('');
  const cases=(report.cases||[]).map(item=>`<tr><td><b>${esc(item.name)}</b><div class="hint mono">${esc(item.run_id||'未创建 Run')}</div></td><td><span class="badge ${item.status==='passed'?'ok':item.status==='failed'?'fail':'run'}">${esc(item.status)}</span></td><td>${item.latency_ms}ms</td><td>${item.tokens}</td><td>${(item.assertion_results||[]).map(a=>`<div class="chk-item ${a.ok?'ok':'no'}"><span class="m">${a.ok?'✓':'✗'}</span><span>${esc(a.type)}${a.path?' · '+esc(a.path):''}${a.ok?'':' · 实际 '+esc(JSON.stringify(a.actual))}</span></div>`).join('')||esc(item.error_message||'等待运行完成')}</td></tr>`).join('');
  return `<div class="card"><div class="card-h"><div><div class="card-t">评测报告 · ${esc(report.eval_id)}</div><div class="card-s mono">${esc(report.agent_code)}@${esc(report.agent_version)} · ${esc(report.dataset_code)}</div></div><span class="badge ${report.status==='completed'?(report.gate_pass?'ok':'fail'):'run'}">${report.status==='completed'?(report.gate_pass?'门禁通过':'门禁未通过'):'运行中'}</span></div>
    <div class="card-b"><div class="grid g4"><div><div class="kpi-l">通过率</div><div class="kpi-v" style="font-size:20px">${report.metrics&&report.metrics.pass_rate!=null?(report.metrics.pass_rate*100).toFixed(1)+'%':'—'}</div></div><div><div class="kpi-l">P95 耗时</div><div class="kpi-v" style="font-size:20px">${report.metrics&&report.metrics.p95_latency_ms!=null?report.metrics.p95_latency_ms+'ms':'—'}</div></div><div><div class="kpi-l">平均 Token</div><div class="kpi-v" style="font-size:20px">${report.metrics&&report.metrics.avg_tokens!=null?report.metrics.avg_tokens:'—'}</div></div><div><div class="kpi-l">通过用例</div><div class="kpi-v" style="font-size:20px">${report.passed_cases}/${report.total_cases}</div></div></div>${checks?`<div style="margin-top:12px">${checks}</div>`:''}</div>
    <table><thead><tr><th>用例 / Run</th><th>状态</th><th>耗时</th><th>Token</th><th>断言结果</th></tr></thead><tbody>${cases}</tbody></table></div>`;
}

/* ============ 触发器治理 ============ */
const TRIGGER_GOV = {items:[], code:null, detail:null, executions:[], audit:[], secret:''};
const TRIGGER_LABEL = {cron:'定时任务',webhook:'Webhook',event:'事件订阅'};

async function loadTriggerPage(code){
  const detail=$('#triggerDetail');
  if(MODE!=='live'){
    $('#triggerList').innerHTML='<div class="empty">需要后端在线</div>';
    detail.innerHTML='<div class="card"><div class="empty">触发器治理接口当前不可用</div></div>';
    return;
  }
  await loadAgents();
  const r=await apiRaw('/v1/triggers');
  if(!r.ok){detail.innerHTML=`<div class="card"><div class="empty">${esc(r.body.message||'触发器读取失败')}</div></div>`;return}
  TRIGGER_GOV.items=r.body.items||[];
  const filter=$('#triggerAgentFilter'), previous=filter.value;
  filter.innerHTML='<option value="">全部 Agent</option>'+AGENTS.map(a=>`<option value="${attr(a.code)}">${esc(a.name||a.code)}</option>`).join('');
  filter.value=previous;
  $('#newTriggerBtn').disabled=AUTH.enabled&&!authCan('agent.manage');
  renderTriggerList();
  const target=code||TRIGGER_GOV.code||(TRIGGER_GOV.items[0]&&TRIGGER_GOV.items[0].code);
  if(target)await triggerSelect(target);
  else detail.innerHTML='<div class="card"><div class="empty">还没有触发器，先新建一个</div></div>';
}

function renderTriggerList(){
  const box=$('#triggerList');if(!box)return;
  const q=($('#triggerSearch').value||'').trim().toLowerCase(), type=$('#triggerTypeFilter').value;
  const status=$('#triggerStatusFilter').value, agent=$('#triggerAgentFilter').value;
  const items=TRIGGER_GOV.items.filter(x=>(!q||`${x.name} ${x.code}`.toLowerCase().includes(q))&&(!type||x.trigger_type===type)&&(!status||x.status===status)&&(!agent||x.agent_code===agent));
  $('#triggerCount').textContent=`${items.length} / ${TRIGGER_GOV.items.length} 个`;
  box.innerHTML=items.length?items.map(x=>`<div class="gov-agent ${x.code===TRIGGER_GOV.code?'on':''}" onclick="triggerSelect('${attr(x.code)}')">
    <div class="g-n">${esc(x.name)}<span class="badge ${x.status==='active'?'ok':'wait'}" style="margin-left:auto">${x.status==='active'?'已启用':'已停用'}</span></div>
    <small><span class="mono">${esc(x.code)}</span> · ${esc(TRIGGER_LABEL[x.trigger_type]||x.trigger_type)} · ${esc(x.agent_code)}</small>
  </div>`).join(''):'<div class="empty">没有符合条件的触发器</div>';
}

async function triggerSelect(code){
  TRIGGER_GOV.code=code;TRIGGER_GOV.secret='';renderTriggerList();
  const base='/v1/triggers/'+encodeURIComponent(code);
  const [d,e,a]=await Promise.all([apiRaw(base),apiRaw(base+'/executions?limit=50'),apiRaw(base+'/audit?limit=30')]);
  if(!d.ok){$('#triggerDetail').innerHTML=`<div class="card"><div class="empty">${esc(d.body.message||'读取失败')}</div></div>`;return}
  TRIGGER_GOV.detail=d.body;TRIGGER_GOV.executions=e.ok?(e.body.items||[]):[];TRIGGER_GOV.audit=a.ok?(a.body.items||[]):[];
  renderTriggerDetail();
}

function triggerConfigSummary(d){
  if(d.trigger_type==='cron')return `${d.config.cron||'—'} · ${d.config.timezone||'Asia/Shanghai'}`;
  if(d.trigger_type==='event')return `${d.config.event_name||'—'} · ${Object.keys(d.config.match||{}).length} 个匹配条件`;
  return `HMAC-SHA256 · ${d.config.signature_ttl_s||300}s 有效`;
}

function renderTriggerDetail(){
  const d=TRIGGER_GOV.detail, box=$('#triggerDetail');if(!d||!box)return;
  const canManage=agentCan('manage',d.agent_code), canRun=agentCan('run',d.agent_code);
  const executions=TRIGGER_GOV.executions.map(x=>`<tr><td class="mono">${esc(x.run_id||'—')}</td><td><span class="badge ${x.status==='succeeded'?'ok':x.status==='failed'?'fail':'wait'}">${esc(x.status)}</span></td><td>${fmtTs(x.created_at)}</td><td>${x.latency_ms==null?'—':esc(x.latency_ms)+' ms'}</td><td>${x.error_code?`<span class="mono">${esc(x.error_code)}</span><div class="hint">${esc(x.error_message||'')}</div>`:'—'}</td><td>${x.status==='failed'&&canRun?`<button class="btn sm" onclick="triggerReplay(${Number(x.id)},this)">重放</button>`:''}</td></tr>`).join('');
  const audit=TRIGGER_GOV.audit.map(x=>`<tr><td>${fmtTs(x.created_at)}</td><td>${esc(x.action)}</td><td>${esc(x.operator||'system')}</td><td>${esc(x.note||'')}</td></tr>`).join('');
  const secret=TRIGGER_GOV.secret?`<div class="vbar warn"><b>Webhook 密钥仅本次显示</b><div class="mono" style="margin-top:6px;word-break:break-all">${esc(TRIGGER_GOV.secret)}</div></div>`:'';
  box.innerHTML=`${secret}<div class="card"><div class="card-h"><div><div class="card-t">${esc(d.name)} <span class="mono" style="font-weight:400;color:var(--muted)">${esc(d.code)}</span></div><div class="card-s">${esc(d.description||'')}</div></div><div style="display:flex;gap:6px;align-items:center"><span class="badge ${d.status==='active'?'ok':'wait'}">${d.status==='active'?'已启用':'已停用'}</span>${canManage?`<button class="btn sm" onclick="triggerEdit()">编辑</button><button class="btn sm" onclick="triggerSetState(${d.status!=='active'},this)">${d.status==='active'?'停用':'启用'}</button>`:''}</div></div>
    <div class="card-b"><div class="frm"><dl class="kv"><dt>类型</dt><dd>${esc(TRIGGER_LABEL[d.trigger_type]||d.trigger_type)}</dd></dl><dl class="kv"><dt>目标 Agent</dt><dd class="mono">${esc(d.agent_code)}@${esc(d.agent_version_ref)}</dd></dl><dl class="kv"><dt>配置</dt><dd class="mono">${esc(triggerConfigSummary(d))}</dd></dl><dl class="kv"><dt>最近触发</dt><dd>${d.last_triggered_at?fmtTs(d.last_triggered_at):'尚未触发'}</dd></dl>${d.trigger_type==='cron'?`<dl class="kv"><dt>下次执行</dt><dd>${d.next_trigger_at?fmtTs(d.next_trigger_at):'停用后不计算'}</dd></dl>`:''}${d.trigger_type==='webhook'?`<dl class="kv wide"><dt>Webhook 路径</dt><dd class="mono">${esc(d.webhook_path)}</dd></dl>`:''}</div></div>
    <div class="card-b" style="border-top:1px solid var(--line)"><div class="act">${canRun?'<button class="btn primary" onclick="triggerTest(this)">测试触发</button>':''}${d.trigger_type==='webhook'&&canManage?'<button class="btn" onclick="triggerRotateSecret(this)">轮换密钥</button>':''}${canManage&&d.status==='disabled'?'<button class="btn danger" onclick="triggerDelete(this)">删除</button>':''}</div></div></div>
    <div class="card"><div class="card-h"><div><div class="card-t">测试输入</div><div class="card-s">与 input_template 顶层合并，测试值优先</div></div></div><div class="card-b"><textarea class="pm-tpl" id="triggerTestInput" style="min-height:130px">{}</textarea></div></div>
    <div class="card"><div class="card-h"><div class="card-t">执行记录</div><div class="card-s">最近 ${TRIGGER_GOV.executions.length} 条</div></div><div style="overflow:auto"><table><thead><tr><th>Run</th><th>状态</th><th>触发时间</th><th>耗时</th><th>失败原因</th><th>操作</th></tr></thead><tbody>${executions||'<tr><td colspan="6"><div class="empty">暂无执行记录</div></td></tr>'}</tbody></table></div></div>
    <div class="card"><div class="card-h"><div class="card-t">变更审计</div><div class="card-s">最近 ${TRIGGER_GOV.audit.length} 条</div></div><div style="overflow:auto"><table><thead><tr><th>时间</th><th>动作</th><th>操作人</th><th>说明</th></tr></thead><tbody>${audit||'<tr><td colspan="4"><div class="empty">暂无审计记录</div></td></tr>'}</tbody></table></div></div>`;
}

function triggerAgentOptions(selected){
  return AGENTS.filter(a=>agentCan('manage',a.code)||a.code===selected).map(a=>`<option value="${attr(a.code)}"${a.code===selected?' selected':''}>${esc(a.name||a.code)} · ${esc(a.code)}</option>`).join('');
}

function triggerConfigFields(type,config={}){
  if(type==='cron')return `<div class="fld"><label>Cron 表达式（cron） <b>*</b></label><input class="inp mono" id="trCron" value="${attr(config.cron||'0 9 * * 1-5')}"><div class="hint">5 段格式：分 时 日 月 周</div></div><div class="fld"><label>时区（timezone）</label><input class="inp mono" id="trTimezone" value="${attr(config.timezone||'Asia/Shanghai')}"></div>`;
  if(type==='event')return `<div class="fld"><label>事件名称（event_name） <b>*</b></label><input class="inp mono" id="trEventName" value="${attr(config.event_name||'order.created')}"></div><div class="fld wide"><label>匹配条件（match，JSON）</label><textarea class="pm-tpl" id="trEventMatch" style="min-height:100px">${esc(JSON.stringify(config.match||{},null,2))}</textarea><div class="hint">键支持点路径，例如 order.region；全部匹配才触发。</div></div>`;
  return `<div class="fld"><label>签名有效期秒数（signature_ttl_s）</label><input class="inp" id="trSignatureTtl" type="number" min="30" max="3600" value="${attr(config.signature_ttl_s||300)}"></div><div class="fld wide"><div class="hint">调用方发送 X-Trigger-Timestamp 与 X-Trigger-Signature；签名正文为 timestamp + "." + 原始请求体，算法 HMAC-SHA256。</div></div>`;
}

function triggerForm(d,creating){
  d=d||{code:'',name:'',description:'',trigger_type:'cron',agent_code:CUR.code||(AGENTS[0]||{}).code||'',agent_version_ref:'stable',config:{cron:'0 9 * * 1-5',timezone:'Asia/Shanghai'},input_template:{},callback_url:''};
  $('#triggerDetail').innerHTML=`<div class="card"><div class="card-h"><div><div class="card-t">${creating?'新建触发器':'编辑触发器'}</div><div class="card-s">触发器只调用 Agent，不直接执行 Graph</div></div></div><div class="card-b"><div class="frm">
    <div class="fld"><label>编码（code） <b>*</b></label><input class="inp mono" id="trCode" value="${attr(d.code)}" ${creating?'':'disabled'}></div><div class="fld"><label>名称（name） <b>*</b></label><input class="inp" id="trName" value="${attr(d.name)}"></div>
    <div class="fld"><label>触发器类型（trigger_type） <b>*</b></label><select class="inp" id="trType" onchange="triggerTypeChanged()" ${creating?'':'disabled'}><option value="cron"${d.trigger_type==='cron'?' selected':''}>定时任务</option><option value="webhook"${d.trigger_type==='webhook'?' selected':''}>Webhook</option><option value="event"${d.trigger_type==='event'?' selected':''}>事件订阅</option></select></div>
    <div class="fld"><label>目标 Agent（agent_code） <b>*</b></label><select class="inp" id="trAgent">${triggerAgentOptions(d.agent_code)}</select></div><div class="fld"><label>Agent 版本引用（agent_version_ref）</label><input class="inp mono" id="trVersion" value="${attr(d.agent_version_ref||'stable')}"></div>
    <div class="fld wide"><label>说明（description）</label><input class="inp" id="trDescription" value="${attr(d.description||'')}"></div><div id="triggerTypeFields" class="fld wide"><div class="frm">${triggerConfigFields(d.trigger_type,d.config)}</div></div>
    <div class="fld wide"><label>Agent 输入模板（input_template，JSON）</label><textarea class="pm-tpl" id="trInput" style="min-height:150px">${esc(JSON.stringify(d.input_template||{},null,2))}</textarea></div><div class="fld wide"><label>完成回调地址（callback_url，可选）</label><input class="inp mono" id="trCallback" value="${attr(d.callback_url||'')}"></div>
    <div class="fld wide"><div class="act"><button class="btn" onclick="${creating?'loadTriggerPage(TRIGGER_GOV.code)':'triggerSelect(TRIGGER_GOV.code)'}">取消</button><button class="btn primary" onclick="triggerSave(${creating},this)">保存</button></div></div>
  </div></div></div>`;
}

function triggerNew(){TRIGGER_GOV.code=null;TRIGGER_GOV.detail=null;triggerForm(null,true)}
function triggerEdit(){triggerForm(TRIGGER_GOV.detail,false)}
function triggerTypeChanged(){const type=$('#trType').value;$('#triggerTypeFields').innerHTML=`<div class="frm">${triggerConfigFields(type,{})}</div>`}
function triggerReadJson(id,label){try{const value=JSON.parse($(id).value||'{}');if(!value||Array.isArray(value)||typeof value!=='object')throw new Error();return value}catch(e){throw new Error(label+' 必须是 JSON object')}}

async function triggerSave(creating,btn){
  try{
    const type=$('#trType').value, config=type==='cron'?{cron:$('#trCron').value.trim(),timezone:$('#trTimezone').value.trim()}:type==='event'?{event_name:$('#trEventName').value.trim(),match:triggerReadJson('#trEventMatch','匹配条件')}:{signature_ttl_s:Number($('#trSignatureTtl').value||300)};
    const body={name:$('#trName').value.trim(),description:$('#trDescription').value.trim(),agent_code:$('#trAgent').value,agent_version_ref:$('#trVersion').value.trim()||'stable',config,input_template:triggerReadJson('#trInput','输入模板'),callback_url:$('#trCallback').value.trim()};
    if(creating){body.code=$('#trCode').value.trim();body.trigger_type=type;body.status='disabled'}
    btn.disabled=true;btn.textContent='保存中…';const path=creating?'/v1/triggers':'/v1/triggers/'+encodeURIComponent(TRIGGER_GOV.code);const r=await apiRaw(path,{method:creating?'POST':'PATCH',body:JSON.stringify(body)});
    if(!r.ok){btn.disabled=false;btn.textContent='保存';return toast(r.body.message||'保存失败')}
    TRIGGER_GOV.code=(r.body.trigger||{}).code;TRIGGER_GOV.secret=r.body.webhook_secret||'';await loadTriggerPage(TRIGGER_GOV.code);if(r.body.webhook_secret){TRIGGER_GOV.secret=r.body.webhook_secret;renderTriggerDetail()}toast(creating?'触发器已创建':'触发器已更新');
  }catch(e){toast(e.message)}
}

async function triggerSetState(enabled,btn){if(!confirm(`${enabled?'启用':'停用'}触发器 ${TRIGGER_GOV.detail.name}？`))return;btn.disabled=true;const r=await apiRaw('/v1/triggers/'+encodeURIComponent(TRIGGER_GOV.code)+'/state',{method:'POST',body:JSON.stringify({enabled,note:'控制台操作'})});if(!r.ok){btn.disabled=false;return toast(r.body.message||'状态更新失败')}toast(enabled?'触发器已启用':'触发器已停用');await loadTriggerPage(TRIGGER_GOV.code)}
async function triggerRotateSecret(btn){if(!confirm('轮换后旧密钥立即失效，确认继续？'))return;btn.disabled=true;const r=await apiRaw('/v1/triggers/'+encodeURIComponent(TRIGGER_GOV.code)+'/secret/rotate',{method:'POST'});if(!r.ok){btn.disabled=false;return toast(r.body.message||'轮换失败')}TRIGGER_GOV.secret=r.body.webhook_secret||'';renderTriggerDetail();toast('Webhook 密钥已轮换')}
async function triggerTest(btn){let input;try{input=triggerReadJson('#triggerTestInput','测试输入')}catch(e){return toast(e.message)}btn.disabled=true;btn.textContent='触发中…';const r=await apiRaw('/v1/triggers/'+encodeURIComponent(TRIGGER_GOV.code)+'/test',{method:'POST',body:JSON.stringify({input})});if(!r.ok){btn.disabled=false;btn.textContent='测试触发';return toast(r.body.message||'触发失败')}toast(`已创建 Run ${r.body.run_id||''}`);await triggerSelect(TRIGGER_GOV.code)}
async function triggerReplay(id,btn){if(!confirm('使用原始输入创建一次新的执行？'))return;btn.disabled=true;const r=await apiRaw(`/v1/triggers/${encodeURIComponent(TRIGGER_GOV.code)}/executions/${id}/replay`,{method:'POST'});if(!r.ok){btn.disabled=false;return toast(r.body.message||'重放失败')}toast(`已重放为 ${r.body.run_id||'新 Run'}`);await triggerSelect(TRIGGER_GOV.code)}
async function triggerDelete(btn){if(!confirm(`物理删除触发器定义 ${TRIGGER_GOV.code}？执行历史会保留。`))return;btn.disabled=true;const r=await apiRaw('/v1/triggers/'+encodeURIComponent(TRIGGER_GOV.code),{method:'DELETE'});if(!r.ok){btn.disabled=false;return toast(r.body.message||'删除失败')}TRIGGER_GOV.code=null;TRIGGER_GOV.detail=null;toast('触发器定义已删除，执行历史已保留');await loadTriggerPage()}

const NODE_GOV = {items:[], selected:null, detail:null, query:'', category:'', scope:'', status:''};

async function loadNodePage(selected){
  const list = $('#nodeList'), detail = $('#nodeDetail');
  if(MODE !== 'live'){
    if(list) list.innerHTML = '<div class="empty">需要后端在线</div>';
    if(detail) detail.innerHTML = '<div class="card"><div class="empty">节点管理接口当前不可用</div></div>';
    return;
  }
  const [r, ir] = await Promise.all([apiRaw('/v1/nodes'), apiRaw('/v1/nodes/instances')]);
  if(!r.ok){
    if(detail) detail.innerHTML = `<div class="card"><div class="empty">${esc(r.body.message || '节点目录读取失败')}</div></div>`;
    return;
  }
  const types = (r.body.items || []).map(x => Object.assign({key:'type:' + x.type}, x));
  const instances = ir.ok ? (ir.body.items || []) : [];
  NODE_GOV.items = types.concat(instances);
  const category = $('#nodeCategory');
  const currentCategory = category ? category.value : NODE_GOV.category;
  const categories = [...new Set(NODE_GOV.items.map(x => x.cat).filter(Boolean))].sort();
  if(category){
    category.innerHTML = '<option value="">全部分类</option>' + categories
      .map(x => `<option value="${attr(x)}">${esc(x)}</option>`).join('');
    category.value = categories.includes(currentCategory) ? currentCategory : '';
  }
  nodeApplyFilters();
  const target = selected || NODE_GOV.selected || (NODE_GOV.items[0] && NODE_GOV.items[0].key);
  const match = NODE_GOV.items.find(x => x.key === target || x.type === target);
  if(match) await nodeSelect(match.key);
}

function nodeFilteredItems(){
  const q = String(NODE_GOV.query || '').toLowerCase();
  return NODE_GOV.items.filter(item => {
    const text = `${item.type} ${item.node_id || ''} ${item.label} ${item.desc} ${item.source_label || ''} ${item.owner_agent_code || ''} ${item.graph_id || ''}`.toLowerCase();
    if(q && !text.includes(q)) return false;
    if(NODE_GOV.category && item.cat !== NODE_GOV.category) return false;
    if(NODE_GOV.scope && item.scope_type !== NODE_GOV.scope) return false;
    if(NODE_GOV.status === 'enabled' && item.enabled === false) return false;
    if(NODE_GOV.status === 'disabled' && item.enabled !== false) return false;
    return true;
  });
}

function nodeApplyFilters(){
  NODE_GOV.query = ($('#nodeSearch') && $('#nodeSearch').value.trim()) || '';
  NODE_GOV.category = ($('#nodeCategory') && $('#nodeCategory').value) || '';
  NODE_GOV.scope = ($('#nodeScope') && $('#nodeScope').value) || '';
  NODE_GOV.status = ($('#nodeStatus') && $('#nodeStatus').value) || '';
  renderNodeList();
}

function renderNodeList(){
  const el = $('#nodeList'); if(!el) return;
  const rows = nodeFilteredItems();
  $('#nodeCount').textContent = rows.length === NODE_GOV.items.length
    ? `${rows.length} 个` : `${rows.length} / ${NODE_GOV.items.length}`;
  if(!rows.length){ el.innerHTML = '<div class="empty">没有符合条件的节点</div>'; return; }
  el.innerHTML = rows.map(item => `<div class="gov-agent ${item.key === NODE_GOV.selected ? 'on' : ''}"
      onclick="nodeSelect('${attr(item.key)}')">
    <div class="g-n"><span class="node-swatch" style="background:${attr(item.color || '#6b7280')};height:12px"></span>${esc(item.label)}
      <span class="badge ${lifecycleClass(item.lifecycle)}" style="margin-left:auto">${lifecycleLabel(item.lifecycle)}</span>
      <span class="badge ${item.enabled === false ? 'fail' : 'ok'}">${item.enabled === false ? '已停用' : '已启用'}</span></div>
    <small><span class="badge ${item.scope_type === 'agent' ? 'wait' : ''}">${esc(item.scope_label || '平台共享')}</span>
      <span class="mono">${esc(item.scope_type === 'agent' ? (item.owner_agent_code + ' · ' + item.node_id) : item.type)} · ${esc(item.cat)}</span></small>
  </div>`).join('');
}

async function nodeSelect(key){
  NODE_GOV.selected = key; renderNodeList();
  const cached = NODE_GOV.items.find(x => x.key === key);
  if(cached && cached.kind === 'node_instance'){
    NODE_GOV.detail = cached;
    renderNodeInstanceDetail();
    return;
  }
  const type = cached ? cached.type : String(key || '').replace(/^type:/, '');
  const r = await apiRaw('/v1/nodes/' + encodeURIComponent(type));
  if(!r.ok){
    $('#nodeDetail').innerHTML = `<div class="card"><div class="empty">${esc(r.body.message || '节点详情读取失败')}</div></div>`;
    return;
  }
  NODE_GOV.detail = r.body;
  renderNodeDetail();
}

function renderNodeInstanceDetail(){
  const d = NODE_GOV.detail, box = $('#nodeDetail'); if(!d || !box) return;
  const typeNode = NODE_GOV.items.find(item => item.kind !== 'node_instance' && item.type === d.type) || d;
  let config = '{}';
  try{ config = JSON.stringify(d.config || {}, null, 2) }catch(e){ config = '{}' }
  box.innerHTML = `<div class="card">
    <div class="card-h"><div class="node-title"><span class="node-swatch" style="background:${attr(d.color || '#6b7280')}"></span>
      <div><div class="card-t">${esc(d.label)}</div><div class="card-s mono">${esc(d.node_id)} · ${esc(d.type)}</div></div></div>
      <div class="act"><span class="badge wait">Agent 专属</span><span class="badge ${lifecycleClass(d.lifecycle)}">${lifecycleLabel(d.lifecycle)}</span>
        <button class="btn primary" onclick="nodeEditInstance('${attr(d.key)}')">在画布编辑</button></div>
    </div>
    <div class="card-b"><div class="grid g2" style="gap:12px">
      <dl><div class="kv"><dt>归属 Agent</dt><dd class="mono">${esc(d.owner_agent_code)}</dd></div>
        <div class="kv"><dt>底层类型</dt><dd class="mono">${esc(d.type)}</dd></div>
        <div class="kv"><dt>超时</dt><dd>${esc(d.timeout)}s</dd></div></dl>
      <dl><div class="kv"><dt>Graph</dt><dd class="mono">${esc(d.graph_id)}@${esc(d.graph_version)}</dd></div>
        <div class="kv"><dt>Graph 状态</dt><dd><span class="badge ${d.graph_status === 'published' ? 'ok' : 'wait'}">${esc(d.graph_status)}</span></dd></div>
        <div class="kv"><dt>运行状态</dt><dd><span class="badge ${d.enabled === false ? 'fail' : 'ok'}">${d.enabled === false ? '底层类型已停用' : '可用'}</span></dd></div></dl>
    </div></div>
  </div>
  <div class="card"><div class="card-h"><div class="card-t">实例配置</div><div class="card-s">随 Graph 版本固化</div></div>
    <div class="card-b"><pre class="mono" style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere">${esc(config)}</pre></div></div>
  ${nodeGuideHtml(typeNode)}`;
}

async function nodeEditInstance(key){
  const d = NODE_GOV.items.find(x => x.key === key);
  if(!d) return;
  go('canvas');
  await switchAgent(d.owner_agent_code, {graphId:d.graph_id, silent:true});
  if(GRAPH.nodes.some(x => x.id === d.node_id)) selectNode(d.node_id);
}

function nodeAddPrivate(){
  go('canvas');
  const palette = $('#palette'); if(palette) palette.focus();
  toast('选择节点类型后添加，实例将归属 ' + CUR.code);
}

function nodeDate(ts){
  if(!ts) return '—';
  const d = new Date(Number(ts) * 1000);
  return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString('zh-CN', {hour12:false});
}

function nodeSchemaValue(value){
  if(value === undefined) return '—';
  if(typeof value === 'string') return value || "''";
  try{return JSON.stringify(value)}catch(e){return String(value)}
}

function nodeGuideList(items, empty='无'){
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  return rows.length ? `<ul class="node-guide-list">${rows.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
    : `<div class="hint" style="margin-top:6px">${esc(empty)}</div>`;
}

function nodeGuideExample(title, value, testid){
  return `<div class="node-guide-example"><div class="sub-t">${esc(title)}</div>
    ${jsonViewerMarkup(value||{},{testid})}</div>`;
}

function nodeGuideHtml(node){
  const g = (node && node.guide) || {};
  if(!g.purpose) return `<div class="card" data-testid="node-guide-missing"><div class="empty">该节点尚未补充结构化使用说明</div></div>`;
  const errors = Array.isArray(g.errors) ? g.errors : [];
  const errorRows = errors.map(item => `<tr><td class="mono">${esc(item.code || '—')}</td>
    <td>${esc(item.cause || '—')}</td><td>${esc(item.solution || '—')}</td></tr>`).join('');
  const related = (g.related_nodes || []).map(type => `<button class="btn sm mono" onclick="nodeSelect('type:${attr(type)}')">${esc(type)}</button>`).join('');
  return `<div class="card" data-testid="node-usage-guide">
    <div class="card-h"><div><div class="card-t">使用说明</div><div class="card-s">适用边界、前置条件与操作建议</div></div></div>
    <div class="card-b">
      <div class="node-guide-copy" data-testid="node-guide-purpose">${esc(g.purpose)}</div>
      <div class="grid g2" style="gap:16px;margin-top:14px">
        <div><div class="sub-t">适用场景</div>${nodeGuideList(g.use_when)}</div>
        <div><div class="sub-t">不适用场景</div>${nodeGuideList(g.avoid_when)}</div>
        <div><div class="sub-t">前置条件</div>${nodeGuideList(g.prerequisites)}</div>
        <div><div class="sub-t">使用建议</div>${nodeGuideList(g.tips)}</div>
      </div>
    </div></div>
  <div class="card" data-testid="node-guide-examples">
    <div class="card-h"><div><div class="card-t">配置与状态示例</div><div class="card-s">执行前状态、完整配置和返回补丁</div></div></div>
    <div class="card-b node-guide-examples">
      ${nodeGuideExample('输入 AgentState', g.input_example, 'node-guide-input')}
      ${nodeGuideExample('节点 config', g.config_example, 'node-guide-config')}
      ${nodeGuideExample('输出状态补丁', g.output_example, 'node-guide-output')}
    </div></div>
  <div class="card" data-testid="node-guide-constraints">
    <div class="card-h"><div><div class="card-t">运行约束</div><div class="card-s">副作用、常见错误和相关节点</div></div></div>
    <div class="card-b">
      <div class="sub-t">副作用</div>${nodeGuideList(g.side_effects, '无外部副作用')}
      <div class="sub-t" style="margin-top:14px">常见错误</div>
      <div style="overflow:auto;margin-top:6px"><table><thead><tr><th>错误码</th><th>原因</th><th>处理建议</th></tr></thead>
        <tbody>${errorRows || '<tr><td colspan="3"><div class="empty">无节点专属错误码</div></td></tr>'}</tbody></table></div>
      <div class="sub-t" style="margin-top:14px">相关节点</div>
      <div class="node-contract" style="margin-top:6px">${related || '<span class="hint">无</span>'}</div>
    </div></div>`;
}

function renderNodeDetail(){
  const d = NODE_GOV.detail, box = $('#nodeDetail'); if(!d || !box) return;
  const canManage = authCan('node.manage');
  const schemaRows = Object.entries(d.config_schema || {}).map(([field, spec]) => `<tr>
    <td class="mono">${esc(field)}</td><td class="mono">${esc(spec.type || 'any')}</td>
    <td>${spec.required ? '<span class="badge wait">必填</span>' : '否'}</td>
    <td class="mono">${esc(nodeSchemaValue(spec.default))}</td>
    <td>${esc(spec.description || spec.desc || '')}</td>
  </tr>`).join('');
  const usageRows = (d.usage || []).map(item => {
    const agents = (item.agents || []).map(a => `${a.code}@${a.version} (${a.version_status})`).join('、') || '未绑定 Agent';
    return `<tr><td class="mono">${esc(item.graph_id)}@${esc(item.graph_version)}</td>
      <td><span class="badge ${item.graph_status === 'published' ? 'ok' : 'wait'}">${esc(item.graph_status)}</span></td>
      <td>${esc(agents)}</td><td class="mono">${esc((item.node_ids || []).join('、'))}</td>
      <td>${item.blocking ? '<span class="badge fail">阻止停用</span>' : '<span class="badge ok">仅历史引用</span>'}</td></tr>`;
  }).join('');
  const auditRows = (d.audit || []).map(item => `<tr><td>${esc(nodeDate(item.at))}</td>
    <td><span class="badge ${item.action === 'enable' ? 'ok' : 'fail'}">${esc(item.action)}</span></td>
    <td class="mono">${esc(item.operator || 'system')}</td><td>${esc(item.note || '—')}</td></tr>`).join('');
  const targetButton = d.type === 'skill'
    ? '<button class="btn" onclick="go(\'skill\')">Skill 治理</button>'
    : (d.type === 'subgraph' ? '<button class="btn" onclick="go(\'govern\')">Agent 治理</button>' : '');
  const stateLabel = d.enabled === false ? '启用节点' : '停用节点';
  const canCreate = d.enabled !== false && d.creatable !== false;
  box.innerHTML = `<div class="card">
    <div class="card-h"><div class="node-title"><span class="node-swatch" style="background:${attr(d.color || '#6b7280')}"></span>
      <div><div class="node-heading-line"><div class="card-t">${esc(d.label)}</div><span class="badge ${lifecycleClass(d.lifecycle)}">${lifecycleLabel(d.lifecycle)}</span><span class="badge ${d.enabled === false ? 'fail' : 'ok'}">${d.enabled === false ? '已停用' : '已启用'}</span></div>
        <div class="card-s"><span class="mono">${esc(d.type)}</span> · 平台共享</div></div></div>
      <div class="act">
        ${targetButton}<button class="btn" ${canCreate ? '' : `disabled title="${d.enabled === false ? '节点已停用' : '该类型仅供历史编排运行'}"`} onclick="nodeUseInCanvas('${attr(d.type)}')">在画布使用</button>
        <button class="btn ${d.enabled === false ? 'primary' : ''}" ${canManage ? '' : 'disabled title="缺少 node.manage 权限"'} onclick="nodeSetState(${d.enabled === false})">${stateLabel}</button></div>
    </div>
    <div class="card-b"><div class="grid g2" style="gap:12px">
      <dl><div class="kv"><dt>说明</dt><dd>${esc(d.desc || '—')}</dd></div><div class="kv"><dt>分类</dt><dd>${esc(d.cat)}</dd></div><div class="kv"><dt>生命周期</dt><dd>${lifecycleLabel(d.lifecycle)}${d.replacement ? ` · 建议改用 <span class="mono">${esc(d.replacement)}</span>` : ''}</dd></div><div class="kv"><dt>来源</dt><dd>${esc(d.source_label)} <span class="mono">${esc(d.source)}</span></dd></div></dl>
      <dl><div class="kv"><dt>实现模块</dt><dd class="mono">${esc(d.module || '—')}</dd></div><div class="kv"><dt>实现版本</dt><dd class="mono">v${esc(d.implementation_version || '—')} · ${esc(d.implementation_digest || '—')}</dd></div><div class="kv"><dt>更新人</dt><dd>${esc(d.updated_by || 'system')}</dd></div><div class="kv"><dt>更新时间</dt><dd>${esc(nodeDate(d.updated_at))}</dd></div></dl>
    </div></div>
  </div>
  ${nodeGuideHtml(d)}
  <div class="card"><div class="card-h"><div class="card-t">状态写入与分支</div></div><div class="card-b">
    <div class="sub-t">写入 AgentState</div><div class="node-contract">${(d.writes || []).length ? d.writes.map(x => `<span class="pm-tag">${esc(x)}</span>`).join('') : '<span class="hint">无声明</span>'}</div>
    <div class="sub-t" style="margin-top:12px">可用分支</div><div class="node-contract">${(d.conditions || []).length ? d.conditions.map(x => `<span class="pm-tag ${d.required_conditions.includes(x) ? 'warn' : ''}">${esc(x)}${d.required_conditions.includes(x) ? ' · 必连' : ''}</span>`).join('') : (d.dynamic_conditions ? '<span class="hint">由节点 cases 配置动态生成，所有分支均必连</span>' : '<span class="hint">顺序执行</span>')}</div>
  </div></div>
  <div class="card"><div class="card-h"><div class="card-t">配置 Schema</div><div class="card-s">${Object.keys(d.config_schema || {}).length} 个字段</div></div>
    <div style="overflow:auto"><table><thead><tr><th>字段</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr></thead><tbody>${schemaRows || '<tr><td colspan="5"><div class="empty">该节点无需额外配置</div></td></tr>'}</tbody></table></div></div>
  <div class="card"><div class="card-h"><div class="card-t">编排引用</div><div class="card-s">${d.usage_instances || 0} 个节点实例 · ${d.blocking_references || 0} 个阻断引用</div></div>
    <div style="overflow:auto"><table><thead><tr><th>Graph 版本</th><th>状态</th><th>Agent</th><th>节点 ID</th><th>停用影响</th></tr></thead><tbody>${usageRows || '<tr><td colspan="5"><div class="empty">暂无编排引用</div></td></tr>'}</tbody></table></div></div>
  <div class="card"><div class="card-h"><div class="card-t">变更审计</div><div class="card-s">最近 30 条</div></div>
    <div style="overflow:auto"><table><thead><tr><th>时间</th><th>动作</th><th>操作人</th><th>备注</th></tr></thead><tbody>${auditRows || '<tr><td colspan="4"><div class="empty">暂无变更记录</div></td></tr>'}</tbody></table></div></div>`;
}

function nodeUseInCanvas(type){
  const item = NODE_GOV.items.find(x => x.type === type);
  if(!item || item.enabled === false){ toast('该节点已停用'); return; }
  if(item.creatable === false){ toast(`该节点仅供历史编排运行${item.replacement ? '，请改用 ' + item.replacement : ''}`); return; }
  go('canvas');
  const palette = $('#palette');
  if(palette && [...palette.options].some(x => x.value === type)) palette.value = type;
}

async function nodeSetState(enabled){
  const d = NODE_GOV.detail; if(!d || !authCan('node.manage')) return;
  const action = enabled ? '启用' : '停用';
  if(!confirm(`${action}节点 ${d.label}（${d.type}）？`)) return;
  const note = prompt('变更备注（可选）', '') || '';
  const r = await apiRaw('/v1/nodes/' + encodeURIComponent(d.type) + '/state', {
    method:'POST', body:JSON.stringify({enabled:!!enabled, note})
  });
  if(!r.ok){
    const details = (r.body.details || []).join('\n');
    alert((r.body.message || `${action}失败`) + (details ? '\n\n' + details : ''));
    return;
  }
  toast(`${d.label} 已${action}`);
  await loadNodeTypes();
  await loadNodePage(d.type);
}

/* ============ Skill 治理（注册 / 版本 / 契约测试 / 发布 / 在线运行） ============ */
const SKILL_GOV = { items:[], code:null, detail:null, deps:[], audit:[], result:null, discovered:[] };
const SKILL_IMPL_TYPES = ['builtin','http','mcp','script'];
const SCRIPT_SKILL_TEMPLATE = {
  language:'javascript', runtime:'sandbox-v1', entrypoint:'main',
  source:[
    'function main(input) {',
    '  const name = String(input.name || "World").trim();',
    '  console.log("generate greeting for", name);',
    '  return { message: "Hello, " + name + "!" };',
    '}'
  ].join('\n'),
  limits:{timeout_ms:500,memory_mb:32,max_output_bytes:65536,max_log_bytes:16384}
};
const SCRIPT_SKILL_INPUT_SCHEMA = {type:'object',required:['name'],properties:{name:{type:'string',minLength:1}},additionalProperties:false};
const SCRIPT_SKILL_OUTPUT_SCHEMA = {type:'object',required:['message'],properties:{message:{type:'string'}},additionalProperties:false};

function skillImplLabel(type){
  return type==='script'?'script · 沙箱脚本':(type==='mcp'?'mcp · Streamable HTTP':type);
}

async function loadSkillRegistry(){
  if(MODE !== 'live') return false;
  const r = await apiRaw('/v1/skills');
  if(!r.ok) return false;
  SKILL_GOV.items = r.body.items || [];
  renderSkillList();
  return true;
}

async function loadSkillPage(code){
  const list = $('#skillList'), detail = $('#skillDetail');
  if(MODE !== 'live'){
    if(list) list.innerHTML = '<div class="empty">需要后端在线</div>';
    if(detail) detail.innerHTML = '<div class="card"><div class="empty">Skill 治理接口当前不可用</div></div>';
    return;
  }
  await Promise.all([loadSkillRegistry(), loadCredentialList()]);
  const target = code || SKILL_GOV.code || (SKILL_GOV.items[0] && SKILL_GOV.items[0].code);
  if(target) await skillSelect(target);
}

function renderSkillList(){
  const el = $('#skillList'); if(!el) return;
  const count = $('#skillCount'); if(count) count.textContent = SKILL_GOV.items.length + ' 个';
  if(!SKILL_GOV.items.length){ el.innerHTML = '<div class="empty">Registry 为空</div>'; return; }
  el.innerHTML = SKILL_GOV.items.map(s => {
    const pub = (s.versions || []).filter(v => v.status === 'published').length;
    const testing = (s.versions || []).filter(v => v.status === 'testing').length;
    return `<div class="gov-agent ${s.code === SKILL_GOV.code ? 'on' : ''}" onclick="skillSelect('${esc(s.code)}')">
      <div class="g-n">${esc(s.name || s.code)}<span class="badge ${pub ? 'ok' : 'wait'}" style="margin-left:auto">${pub ? pub + ' 发布' : '未发布'}</span></div>
      <small class="mono">${esc(s.code)} · ${(s.versions || []).length} 版本${testing ? ' · ' + testing + ' 待测试' : ''}</small>
    </div>`;
  }).join('');
}

async function skillSelect(code){
  if(!code) return;
  SKILL_GOV.code = code; SKILL_GOV.result = null; renderSkillList();
  const [d, dep, aud] = await Promise.all([
    apiRaw('/v1/skills/' + encodeURIComponent(code)),
    apiRaw('/v1/skills/' + encodeURIComponent(code) + '/dependents'),
    apiRaw('/v1/skills/' + encodeURIComponent(code) + '/audit?limit=12')
  ]);
  if(!d.ok){
    $('#skillDetail').innerHTML = `<div class="card"><div class="empty">${esc(d.body.message || '读取失败')}</div></div>`;
    return;
  }
  SKILL_GOV.detail = d.body;
  SKILL_GOV.deps = dep.ok ? (dep.body.items || []) : [];
  SKILL_GOV.audit = aud.ok ? (aud.body.items || []) : [];
  renderSkillDetail();
}

function skillExampleInput(d){
  const tested = (d.versions || []).find(v => v.test_detail && v.test_detail.input);
  if(tested) return tested.test_detail.input;
  if(d.code === 'network.ip.inspect') return {ip:'192.0.2.1'};
  const schema = ((d.versions || [])[0] || {}).input_schema || {};
  const out = {};
  for(const k of (schema.required || [])) out[k] = '';
  return out;
}

function renderSkillDetail(){
  const d = SKILL_GOV.detail, box = $('#skillDetail'); if(!d || !box) return;
  const versions = (d.versions || []).slice().sort((a,b) =>
    (parseFloat(String(b.version).replace(/^v/,'')) || 0) - (parseFloat(String(a.version).replace(/^v/,'')) || 0));
  const runnable = versions.filter(v => v.status === 'published' && SKILL_IMPL_TYPES.includes(v.impl_type));
  const versionRows = versions.map(v => {
    const badge = v.status === 'published' ? 'ok' : (v.status === 'testing' ? 'wait' : 'fail');
    const supported = SKILL_IMPL_TYPES.includes(v.impl_type);
    const actions = [`<button class="btn sm" onclick="skillUseVersion('${esc(v.version)}')">查看契约</button>`];
    if(supported) actions.push(
      `<button class="btn sm" onclick="skillNewVersion('${esc(v.version)}')">基于此版本新建</button>`,
      `<button class="btn sm" onclick="skillTest('${esc(d.code)}','${esc(v.version)}',this)">测试</button>`);
    if(v.status === 'testing' && supported) actions.push(`<button class="btn sm" ${v.test_pass ? '' : 'disabled title="先测试通过"'} onclick="skillPromote('${esc(d.code)}','${esc(v.version)}',this)">发布</button>`);
    if(v.status === 'published') actions.push(`<button class="btn sm" onclick="skillDeprecate('${esc(d.code)}','${esc(v.version)}',this)">停用</button>`);
    return `<tr>
      <td class="mono">${esc(v.version)}</td><td><span class="badge ${badge}">${esc(v.status)}</span></td>
      <td>${v.test_pass ? '<span class="badge ok">通过</span>' : '<span class="badge fail">未通过</span>'}</td>
      <td class="mono">${esc(v.impl_type)}${supported?'':' <span class="badge fail">历史占位，不可运行</span>'}</td><td>${v.timeout_s}s / ${v.retries} 次</td>
      <td class="mono">${esc(v.contract_hash.slice(0,8))}</td><td><div class="act">${actions.join('')}</div></td>
    </tr>`;
  }).join('');
  const aliases = Object.entries(d.aliases || {}).map(([k,v]) => `<span class="pm-tag">${esc(k)} → ${esc(v.version)}</span>`).join(' ') || '—';
  const example = JSON.stringify(skillExampleInput(d), null, 2);
  const selected = runnable[0] || versions[0] || {};
  const depRows = SKILL_GOV.deps.length ? SKILL_GOV.deps.map(x => `<tr>
    <td><span class="badge wait">${esc(x.source)}</span></td>
    <td class="mono">${esc(x.agent || x.graph_id || '—')}</td>
    <td class="mono">${esc(x.ref || '—')}</td></tr>`).join('')
    : '<tr><td colspan="3"><div class="empty">暂无 Agent 或编排引用</div></td></tr>';
  const auditRows = SKILL_GOV.audit.length ? SKILL_GOV.audit.map(x => `<tr>
    <td>${esc(x.action)}</td><td class="mono">${esc(x.version || '—')}</td>
    <td>${esc(x.note || '')}</td><td class="mono">${fmtTs(x.at)}</td></tr>`).join('')
    : '<tr><td colspan="4"><div class="empty">暂无审计记录</div></td></tr>';
  box.innerHTML = `
    <div class="card">
      <div class="card-h"><div><div class="card-t">${esc(d.name)} <span class="mono" style="font-weight:400;color:var(--muted)">${esc(d.code)}</span></div>
        <div class="card-s">${esc(d.description || '')}</div></div><div style="display:flex;gap:6px;align-items:center">
          ${d.code === 'network.ip.inspect' ? '<button class="btn sm" onclick="skillStartAgentExample(this)">用它创建示例 Agent</button>' : ''}
          <button class="btn sm" onclick="skillEditIdentity()">编辑资料</button>
          ${selected.version ? `<button class="btn sm" onclick="skillNewVersion('${esc(selected.version)}')">新建版本</button>` : ''}
          <span class="badge ok">${esc(d.status)}</span></div></div>
      <div class="card-b" style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px">
        <dl class="kv"><dt>分类</dt><dd>${esc(d.category)}</dd></dl><dl class="kv"><dt>负责人</dt><dd>${esc(d.owner_user || '—')}</dd></dl>
        <dl class="kv"><dt>调用别名</dt><dd>${aliases}</dd></dl><dl class="kv"><dt>标签</dt><dd>${(d.tags || []).map(t=>`<span class="tag">${esc(t)}</span>`).join(' ') || '—'}</dd></dl>
      </div>
    </div>
    <div class="card">
      <div class="card-h"><div><div class="card-t">在线试运行</div><div class="card-s">请求发送到真实 Skill Runtime，依次执行输入校验、版本解析、处理器和输出校验</div></div>
        <div style="display:flex;gap:6px;align-items:center"><select class="select mono" id="skillRunVer">
          ${runnable.length ? ['stable','latest'].concat(runnable.map(v=>v.version)).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('') : '<option value="">没有已发布版本</option>'}
        </select><button class="btn primary" ${runnable.length ? '' : 'disabled'} onclick="skillRun(this)">运行</button></div></div>
      <div class="card-b" style="display:grid;grid-template-columns:minmax(260px,.8fr) minmax(320px,1.2fr);gap:12px">
        <div><div class="pm-lbl">运行输入（input，JSON）</div><textarea class="pm-tpl" id="skillInput" style="min-height:210px">${esc(example)}</textarea>
          <div class="hint">可试：<span class="mono">192.0.2.1</span>、<span class="mono">1.1.1.1</span>、<span class="mono">2001:4860:4860::8888</span>。位置为 IP 对应网络的近似位置，不代表用户精确位置。</div></div>
        <div><div class="pm-lbl">运行结果</div><div class="pm-out" id="skillRunOutput" style="min-height:210px">尚未运行</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-h"><div class="card-t">版本</div><div class="card-s">版本正文不可修改；变更契约或实现时创建新版本</div></div>
      <table><thead><tr><th>版本</th><th>状态</th><th>测试</th><th>实现</th><th>超时/重试</th><th>契约</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${versionRows || '<tr><td colspan="7"><div class="empty">还没有版本</div></td></tr>'}</tbody></table>
    </div>
    <div class="card" id="skillContract">
      <div class="card-h"><div class="card-t">契约与实现 · ${esc(selected.version || '—')}</div><div class="card-s">input_schema / output_schema 是节点之间稳定的数据边界</div></div>
      ${skillContractBody(selected)}
    </div>
    <div class="grid g2">
      <div class="card"><div class="card-h"><div class="card-t">反向引用</div><div class="card-s">${SKILL_GOV.deps.length} 处</div></div>
        <table><thead><tr><th>来源</th><th>Agent / 图</th><th>引用</th></tr></thead><tbody>${depRows}</tbody></table></div>
      <div class="card"><div class="card-h"><div class="card-t">审计</div><div class="card-s">测试、发布和调用都有记录</div></div>
        <table><thead><tr><th>动作</th><th>版本</th><th>说明</th><th>时间</th></tr></thead><tbody>${auditRows}</tbody></table></div>
    </div>`;
}

function skillContractBody(v){
  if(!v || !v.version) return '<div class="empty">创建版本后显示契约</div>';
  const cfg=v.impl_config||{};
  const implementation=v.impl_type==='script'?`
    <div style="grid-column:1/-1"><div class="pm-lbl">JavaScript 源码（source） · ${esc(cfg.runtime||'sandbox-v1')} · ${esc(cfg.entrypoint||'main')}</div><pre class="pm-out" style="min-height:180px">${esc(cfg.source||'')}</pre></div>
    <div style="grid-column:1/-1"><div class="pm-lbl">运行限制（limits）</div><pre class="pm-out">${esc(JSON.stringify(cfg.limits||{},null,2))}</pre></div>`:`
    <div style="grid-column:1/-1"><div class="pm-lbl">实现配置（impl_config） · ${esc(v.impl_type)}</div><pre class="pm-out">${esc(JSON.stringify(cfg,null,2))}</pre></div>`;
  return `<div class="card-b" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div><div class="pm-lbl">输入契约（input_schema）</div><pre class="pm-out">${esc(JSON.stringify(v.input_schema,null,2))}</pre></div>
    <div><div class="pm-lbl">输出契约（output_schema）</div><pre class="pm-out">${esc(JSON.stringify(v.output_schema,null,2))}</pre></div>
    ${implementation}
  </div>`;
}

function skillUseVersion(version){
  const v = (SKILL_GOV.detail.versions || []).find(x => x.version === version);
  const el = $('#skillContract'); if(!v || !el) return;
  el.innerHTML = `<div class="card-h"><div class="card-t">契约与实现 · ${esc(v.version)}</div><div class="card-s">contract ${esc(v.contract_hash.slice(0,12))}</div></div>${skillContractBody(v)}`;
  el.scrollIntoView({behavior:'smooth', block:'start'});
}

function skillEditIdentity(){
  const d=SKILL_GOV.detail, box=$('#skillDetail'); if(!d || !box)return;
  box.innerHTML=`<div class="card">
    <div class="card-h"><div><div class="card-t">编辑 Skill 基本资料</div><div class="card-s mono">${esc(d.code)} · code 创建后不可修改</div></div></div>
    <div class="card-b"><div class="frm">
      <div class="fld"><label>名称（name） <b>*</b></label><input class="inp" id="skillEditName" value="${attr(d.name)}"></div>
      <div class="fld"><label>分类（category）</label><input class="inp" id="skillEditCategory" value="${attr(d.category||'business')}"></div>
      <div class="fld"><label>负责人（owner_user）</label><input class="inp" id="skillEditOwner" value="${attr(d.owner_user||'')}"></div>
      <div class="fld"><label>标签（tags）</label><input class="inp" id="skillEditTags" value="${attr((d.tags||[]).join(','))}"></div>
      <div class="fld wide"><label>说明（description）</label><textarea class="inp" id="skillEditDesc" style="min-height:90px">${esc(d.description||'')}</textarea></div>
      <div class="fld wide"><div style="display:flex;gap:8px"><button class="btn" onclick="skillSelect('${attr(d.code)}')">取消</button><button class="btn primary" onclick="skillSaveIdentity(this)">保存资料</button></div></div>
    </div></div></div>`;
}

async function skillSaveIdentity(btn){
  const code=SKILL_GOV.code;
  const body={
    name:$('#skillEditName').value.trim(), description:$('#skillEditDesc').value.trim(),
    category:$('#skillEditCategory').value.trim(), owner_user:$('#skillEditOwner').value.trim(),
    tags:$('#skillEditTags').value.split(',').map(x=>x.trim()).filter(Boolean)
  };
  btn.disabled=true; btn.textContent='保存中…';
  const r=await apiRaw('/v1/skills/'+encodeURIComponent(code),{method:'PUT',body:JSON.stringify(body)});
  if(!r.ok){btn.disabled=false;btn.textContent='保存资料';toast(r.body.message||'保存失败');return}
  toast('Skill 基本资料已更新');
  await loadSkillRegistry(); await skillSelect(code);
}

function skillCredentialOptions(selected=''){
  const now=Date.now()/1000;
  const items=(CREDENTIAL_GOV.items||[]).filter(c=>c.code===selected || (
    c.status==='active' && (!c.expires_at || Number(c.expires_at)>now) && c.environment===PLATFORM_ENV));
  return `<option value="">不使用平台凭证</option>`+items.map(c=>`<option value="${attr(c.code)}"${c.code===selected?' selected':''}>${esc(c.name)} · ${esc(c.code)} · ${esc(c.credential_type)} · ${esc(c.environment)}</option>`).join('');
}

function skillCredentialControls(prefix, auth={}, runtime=''){
  if(typeof auth==='string')auth={credential_ref:auth};
  auth=auth||{};
  const selected=auth.credential_ref||'';
  const current=(CREDENTIAL_GOV.items||[]).find(c=>c.code===selected);
  const apiKey=current && current.credential_type==='api_key';
  const location=runtime==='mcp'?'header':(auth.in||'header');
  const name=auth.name||'X-API-Key';
  return `<div class="fld wide"><label>平台凭证（auth.credential_ref）</label><select class="inp" id="${prefix}Ref" onchange="skillAuthChanged('${prefix}')">${skillCredentialOptions(selected)}</select></div>
    <div class="fld wide" id="${prefix}ApiOptions" style="display:${apiKey?'grid':'none'};grid-template-columns:1fr 1fr;gap:12px">
      <div class="fld"><label>API Key 位置（auth.in）</label><select class="inp" id="${prefix}Location" onchange="skillAuthChanged('${prefix}')"><option value="header"${location==='header'?' selected':''}>Header</option><option value="query"${location==='query'?' selected':''}${runtime==='mcp'?' disabled':''}>Query</option></select></div>
      <div class="fld"><label>参数名称（auth.name）</label><input class="inp mono" id="${prefix}Name" value="${attr(name)}" oninput="skillAuthChanged('${prefix}')"></div>
    </div>`;
}

function skillAuthRuntime(prefix){
  if(prefix==='skillVersionAuth')return ($('#skillVersionImplType')||{}).value||'';
  if(prefix==='skillNewAuth')return ($('#nsImplType')||{}).value||'';
  if(prefix==='skillInstallAuth'){
    try{return (((JSON.parse(($('#skillManifest')||{}).value||'{}')||{}).spec||{}).runtime)||''}catch(e){return ''}
  }
  return '';
}

function skillAuthChanged(prefix){
  const refEl=$('#'+prefix+'Ref'); if(!refEl)return;
  const ref=refEl.value;
  const credential=(CREDENTIAL_GOV.items||[]).find(c=>c.code===ref);
  const options=$('#'+prefix+'ApiOptions');
  if(options)options.style.display=credential && credential.credential_type==='api_key'?'grid':'none';
  const location=$('#'+prefix+'Location');
  if(location){
    const query=location.querySelector('option[value="query"]'), mcp=skillAuthRuntime(prefix)==='mcp';
    if(query)query.disabled=mcp;
    if(mcp&&location.value==='query')location.value='header';
  }
  if(prefix==='skillInstallAuth')skillSyncInstallCredential();
}

function skillScriptEditor(prefix, config={}){
  const cfg=config&&config.language?config:SCRIPT_SKILL_TEMPLATE, limits=cfg.limits||{};
  return `<div class="fld wide" id="${prefix}ScriptBlock" style="display:${config&&config.language?'block':'none'}">
    <div class="hint" style="margin-bottom:10px">脚本只接收 JSON input，并返回 JSON；不支持网络、文件、数据库、环境变量、系统命令、模块导入或异步函数。</div>
    <div class="frm">
      <div class="fld"><label>语言（language）</label><select class="inp" id="${prefix}ScriptLanguage" disabled><option value="javascript">JavaScript</option></select></div>
      <div class="fld"><label>运行时（runtime）</label><select class="inp" id="${prefix}ScriptRuntime" disabled><option value="sandbox-v1">sandbox-v1</option></select></div>
      <div class="fld"><label>入口函数（entrypoint）</label><input class="inp mono" id="${prefix}ScriptEntrypoint" value="${attr(cfg.entrypoint||'main')}"></div>
      <div class="fld"><label>执行超时毫秒数（limits.timeout_ms）</label><input class="inp" type="number" min="10" max="2000" id="${prefix}ScriptTimeout" value="${Number(limits.timeout_ms)||500}"></div>
      <div class="fld"><label>Heap 上限 MB（limits.memory_mb）</label><input class="inp" type="number" min="16" max="64" id="${prefix}ScriptMemory" value="${Number(limits.memory_mb)||32}"></div>
      <div class="fld"><label>输出上限 bytes（limits.max_output_bytes）</label><input class="inp" type="number" min="1024" max="262144" id="${prefix}ScriptOutput" value="${Number(limits.max_output_bytes)||65536}"></div>
      <div class="fld"><label>日志上限 bytes（limits.max_log_bytes）</label><input class="inp" type="number" min="0" max="65536" id="${prefix}ScriptLog" value="${Number(limits.max_log_bytes)||16384}"></div>
      <div class="fld wide"><label>JavaScript 源码（source） <b>*</b></label><textarea class="pm-tpl script-editor" spellcheck="false" id="${prefix}ScriptSource">${esc(cfg.source||SCRIPT_SKILL_TEMPLATE.source)}</textarea></div>
      <div class="fld wide"><div style="display:flex;gap:8px;align-items:center"><button class="btn" type="button" onclick="skillInspectScript('${prefix}',this)">检查代码</button><span class="hint">检查语法、入口函数和禁用能力，不创建版本。</span></div><div class="pm-out" id="${prefix}ScriptInspect" style="display:none;margin-top:8px"></div></div>
    </div>
  </div>`;
}

function skillImplFields(prefix, implType, config){
  const script=implType==='script';
  return `<div class="fld wide" id="${prefix}ImplJsonBlock" style="display:${script?'none':'block'}"><label>实现配置（impl_config） <b>*</b></label><textarea class="pm-tpl impl-editor" id="${prefix}Impl">${esc(JSON.stringify(script?{}:(config||{}),null,2))}</textarea></div>
    ${skillScriptEditor(prefix,script?(config||SCRIPT_SKILL_TEMPLATE):{})}`;
}

function skillImplTypeChanged(prefix){
  const typeEl=$('#'+prefix+'ImplType'), type=typeEl?typeEl.value:'';
  const credentials=$('#'+prefix+'CredentialBlock');
  if(credentials)credentials.style.display=type==='script'?'none':'contents';
  const jsonBlock=$('#'+prefix+'ImplJsonBlock'), scriptBlock=$('#'+prefix+'ScriptBlock');
  if(jsonBlock)jsonBlock.style.display=type==='script'?'none':'block';
  if(scriptBlock)scriptBlock.style.display=type==='script'?'block':'none';
  if(prefix==='ns'&&type==='script'){
    const input=$('#nsInput'),output=$('#nsOutput');
    try{
      const oldInput=JSON.parse(input.value),oldOutput=JSON.parse(output.value);
      if(JSON.stringify(oldInput.required||[])===JSON.stringify(['id'])&&oldOutput.properties&&oldOutput.properties.result){
        input.value=JSON.stringify(SCRIPT_SKILL_INPUT_SCHEMA,null,2);
        output.value=JSON.stringify(SCRIPT_SKILL_OUTPUT_SCHEMA,null,2);
      }
    }catch(e){}
  }
  if(type!=='script')skillAuthChanged(prefix==='ns'?'skillNewAuth':'skillVersionAuth');
}

function skillReadImpl(prefix, implType){
  if(implType!=='script')return JSON.parse($('#'+prefix+'Impl').value);
  return {
    language:'javascript',runtime:'sandbox-v1',
    entrypoint:$('#'+prefix+'ScriptEntrypoint').value.trim()||'main',
    source:$('#'+prefix+'ScriptSource').value,
    limits:{
      timeout_ms:Number($('#'+prefix+'ScriptTimeout').value)||500,
      memory_mb:Number($('#'+prefix+'ScriptMemory').value)||32,
      max_output_bytes:Number($('#'+prefix+'ScriptOutput').value)||65536,
      max_log_bytes:Number($('#'+prefix+'ScriptLog').value)||0
    }
  };
}

async function skillInspectScript(prefix,btn){
  let config;try{config=skillReadImpl(prefix,'script')}catch(e){toast('脚本配置格式错误');return}
  const out=$('#'+prefix+'ScriptInspect');out.style.display='block';out.textContent='检查中…';
  btn.disabled=true;
  const r=await apiRaw('/v1/skills/script/inspect',{method:'POST',body:JSON.stringify({config})});
  btn.disabled=false;
  out.textContent=r.ok?`检查通过 · ${r.body.runtime||'sandbox-v1'} · ${Number(r.body.duration_ms)||0} ms`:
    `${r.body.code||'SCRIPT_INVALID'} · ${r.body.message||'检查失败'}\n${JSON.stringify(r.body.details||[],null,2)}`;
  if(r.ok)toast('沙箱脚本检查通过');
}

function skillAuthConfig(prefix){
  const ref=$('#'+prefix+'Ref').value;
  if(!ref)return null;
  const credential=(CREDENTIAL_GOV.items||[]).find(c=>c.code===ref);
  if(!credential)return null;
  const auth={type:credential.credential_type,credential_ref:ref};
  if(credential.credential_type==='api_key'){
    auth.in=$('#'+prefix+'Location').value;
    auth.name=$('#'+prefix+'Name').value.trim()||'X-API-Key';
  }
  return auth;
}

function skillApplyAuth(config,prefix){
  const next=Object.assign({},config||{}), auth=skillAuthConfig(prefix);
  delete next.auth;
  if(!auth)return next;
  const headers=Object.assign({},next.headers||{});
  if(auth.type==='bearer'||auth.type==='basic'){
    for(const key of Object.keys(headers))if(key.toLowerCase()==='authorization')delete headers[key];
  }else if(auth.type==='api_key'&&auth.in==='header'){
    for(const key of Object.keys(headers))if(key.toLowerCase()===auth.name.toLowerCase())delete headers[key];
  }
  next.headers=headers;next.auth=auth;
  return next;
}

function skillNewVersion(baseVersion){
  const d=SKILL_GOV.detail, box=$('#skillDetail'); if(!d || !box)return;
  const base=(d.versions||[]).find(v=>v.version===baseVersion) || (d.versions||[])[0];
  if(!base){toast('当前 Skill 还没有可复制的版本');return}
  if(!SKILL_IMPL_TYPES.includes(base.impl_type)){toast(`实现类型 ${base.impl_type} 是历史占位，不能创建新版本`);return}
  const baseAuth=((base.impl_config||{}).auth||{});
  box.innerHTML=`<div class="card">
    <div class="card-h"><div><div class="card-t">基于 ${esc(d.code)}@${esc(base.version)} 创建新版本</div><div class="card-s">提交后生成新的 testing 版本；原版本不会被修改</div></div></div>
    <div class="card-b"><div class="frm">
      <div class="fld"><label>新版本号（version）</label><input class="inp mono" id="skillVersionName" placeholder="留空自动生成"></div>
      <div class="fld"><label>实现类型（impl_type）</label><select class="inp" id="skillVersionImplType" onchange="skillImplTypeChanged('skillVersion')">${SKILL_IMPL_TYPES.map(x=>`<option value="${x}"${x===base.impl_type?' selected':''}>${skillImplLabel(x)}</option>`).join('')}</select></div>
      <div class="fld"><label>超时秒数（timeout_s）</label><input class="inp" id="skillVersionTimeout" type="number" min="1" max="120" value="${Number(base.timeout_s)||10}"></div>
      <div class="fld"><label>重试次数（retries）</label><input class="inp" id="skillVersionRetries" type="number" min="0" max="3" value="${Number(base.retries)||0}"></div>
      <div class="fld wide"><label>能力标签（capabilities）</label><input class="inp" id="skillVersionCaps" value="${attr((base.capabilities||[]).join(','))}"></div>
      <div id="skillVersionCredentialBlock" style="display:${base.impl_type==='script'?'none':'contents'}">${skillCredentialControls('skillVersionAuth',baseAuth,base.impl_type)}</div>
      <div class="fld wide"><label>输入契约（input_schema） <b>*</b></label><textarea class="pm-tpl schema-editor" id="skillVersionInput">${esc(JSON.stringify(base.input_schema,null,2))}</textarea></div>
      <div class="fld wide"><label>输出契约（output_schema） <b>*</b></label><textarea class="pm-tpl schema-editor" id="skillVersionOutput">${esc(JSON.stringify(base.output_schema,null,2))}</textarea></div>
      ${skillImplFields('skillVersion',base.impl_type,base.impl_config)}
      <div class="fld wide"><div class="pm-out" id="skillVersionError" style="display:none"></div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" onclick="skillSelect('${attr(d.code)}')">取消</button><button class="btn primary" onclick="skillCreateVersion(this)">创建 testing 版本</button></div></div>
    </div></div></div>`;
}

async function skillCreateVersion(btn){
  let input_schema,output_schema,impl_config;
  try{
    input_schema=JSON.parse($('#skillVersionInput').value);
    output_schema=JSON.parse($('#skillVersionOutput').value);
    impl_config=skillReadImpl('skillVersion',$('#skillVersionImplType').value);
  }catch(e){toast('Schema 或实现配置不是合法 JSON');return}
  const code=SKILL_GOV.code;
  const version=$('#skillVersionName').value.trim();
  const implType=$('#skillVersionImplType').value;
  if(implType==='http'||implType==='mcp')impl_config=skillApplyAuth(impl_config,'skillVersionAuth');
  else delete impl_config.auth;
  const body={
    input_schema,output_schema,impl_config,impl_type:implType,
    capabilities:$('#skillVersionCaps').value.split(',').map(x=>x.trim()).filter(Boolean),
    timeout_s:Number($('#skillVersionTimeout').value)||10,
    retries:Number($('#skillVersionRetries').value)||0
  };
  if(version)body.version=version;
  btn.disabled=true;btn.textContent='创建中…';
  const r=await apiRaw('/v1/skills/'+encodeURIComponent(code)+'/versions',{method:'POST',body:JSON.stringify(body)});
  if(!r.ok){
    btn.disabled=false;btn.textContent='创建 testing 版本';
    const err=$('#skillVersionError');err.style.display='block';err.textContent=(r.body.message||'创建失败')+'\n'+JSON.stringify(r.body.details||[],null,2);
    return;
  }
  toast(`${r.body.version} 已创建，等待测试`);
  await loadSkillRegistry();await skillSelect(code);skillUseVersion(r.body.version);
}

function skillInputJSON(){
  try{ return JSON.parse($('#skillInput').value); }
  catch(e){ toast('JSON 输入格式错误'); throw e; }
}

async function skillRun(btn){
  let input; try{ input = skillInputJSON(); }catch(e){ return; }
  btn.disabled = true; btn.textContent = '运行中…';
  const out = $('#skillRunOutput'); out.textContent = '执行中…';
  const r = await apiRaw(`/v1/skills/${encodeURIComponent(SKILL_GOV.code)}/invoke`, {
    method:'POST', body:JSON.stringify({version:$('#skillRunVer').value,input})});
  btn.disabled = false; btn.textContent = '运行';
  if(!r.ok){
    out.innerHTML = `<span class="pm-tag bad">${esc(r.body.code || 'ERROR')}</span>\n${esc(r.body.message || '执行失败')}\n${esc(JSON.stringify(r.body.details || [],null,2))}`;
    return;
  }
  out.textContent = JSON.stringify(r.body, null, 2);
  toast(`运行成功 · ${r.body.latency_ms} ms`);
}

async function skillTest(code, version, btn){
  let input; try{ input = skillInputJSON(); }catch(e){ return; }
  btn.disabled = true; btn.textContent = '测试中…';
  const r = await apiRaw(`/v1/skills/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/test`, {
    method:'POST', body:JSON.stringify({input})});
  toast(r.ok ? `${version} 测试通过` : (r.body.message || '测试失败'));
  await skillSelect(code);
}

async function skillPromote(code, version, btn){
  btn.disabled = true;
  const r = await apiRaw(`/v1/skills/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/promote`, {
    method:'POST', body:JSON.stringify({note:'控制台发布'})});
  toast(r.ok ? `${version} 已发布，stable/latest 已切换` : (r.body.message || '发布失败'));
  await loadSkillRegistry(); await skillSelect(code);
}

async function skillDeprecate(code, version, btn){
  if(!confirm(`停用 ${code}@${version}？存在引用时后端会拒绝。`)) return;
  btn.disabled = true;
  const r = await apiRaw(`/v1/skills/${encodeURIComponent(code)}/versions/${encodeURIComponent(version)}/deprecate`, {
    method:'POST', body:JSON.stringify({note:'控制台停用'})});
  toast(r.ok ? `${version} 已停用` : (r.body.message || '停用失败'));
  await loadSkillRegistry(); await skillSelect(code);
}

async function skillStartAgentExample(btn){
  const d = SKILL_GOV.detail;
  const v = (d.versions || []).find(x => x.status === 'published');
  if(!v) return toast('这个 Skill 还没有已发布版本');
  btn.disabled = true; btn.textContent = '准备画布…';
  const gid = 'ip_geolocation_agent';
  const dsl = {
    id:gid, name:'IP 地理位置查询 Agent', entry:'geolocate_ip', created_at:Math.floor(Date.now()/1000),
    nodes:[{id:'geolocate_ip',type:'skill',x:80,y:100,timeout:12,config:{
      skill_code:d.code,version:'stable',input_path:'input',output_path:'variables.skill_output'}}],
    edges:[]
  };
  const saved = await apiRaw('/v1/graphs/' + gid, {
    method:'PUT', body:JSON.stringify({dsl,publish:true})});
  if(!saved.ok){ btn.disabled=false; btn.textContent='用它创建示例 Agent'; toast(saved.body.message || '示例图创建失败'); return; }
  GRAPH = Object.assign({}, dsl, {version:saved.body.version,status:saved.body.status});
  CUR.graphId = gid; saveCur(); renderGraph(); await loadGraphList();
  await openWizard('agent');
  $('#wCode').value = 'ip_geolocation_agent';
  $('#wName').value = 'IP 地理位置查询 Agent';
  $('#wDesc').value = '调用 network.ip.inspect@stable，查询公网 IP 的近似地区、时区和运营商';
  $('#wDept').value = '平台研发'; $('#wOwner').value = 'console'; $('#wTags').value = '示例,IP,Skill';
  $('#wIn').value = JSON.stringify(v.input_schema,null,2);
  $('#wOut').value = JSON.stringify(v.output_schema,null,2);
  $('#wErrs').value = 'SKILL_INPUT_INVALID,IP_INVALID,IP_NOT_PUBLIC,IP_GEO_RATE_LIMITED,IP_GEO_UPSTREAM_REJECTED,IP_GEO_UPSTREAM_UNAVAILABLE,IP_GEO_UPSTREAM_ERROR,IP_GEO_LOOKUP_FAILED';
  $('#wGraph').value = gid; $('#wPublish').checked = true; wizPreview();
  btn.disabled=false; btn.textContent='用它创建示例 Agent';
}

function skillNew(){
  SKILL_GOV.code = null; renderSkillList();
  const inputSchema = {type:'object',required:['id'],properties:{id:{type:'string'}},additionalProperties:false};
  const outputSchema = {type:'object',required:['result'],properties:{result:{type:'object'}}};
  $('#skillDetail').innerHTML = `<div class="card">
    <div class="card-h"><div><div class="card-t">注册新 Skill 与首个版本</div><div class="card-s">Skill 是原子业务能力；多个 Skill 的固定组合应建子流程或 Agent</div></div></div>
    <div class="card-b"><div class="frm">
      <div class="fld"><label>编码（code） <b>*</b></label><input class="inp mono" id="nsCode" placeholder="utility.lookup"></div>
      <div class="fld"><label>名称（name） <b>*</b></label><input class="inp" id="nsName" placeholder="通用查询"></div>
      <div class="fld wide"><label>说明（description）</label><input class="inp" id="nsDesc" placeholder="这个 Skill 只负责什么"></div>
      <div class="fld"><label>分类（category）</label><input class="inp" id="nsCategory" value="通用工具"></div>
      <div class="fld"><label>负责人（owner_user）</label><input class="inp" id="nsOwner" value="console"></div>
      <div class="fld"><label>实现类型（impl_type）</label><select class="inp" id="nsImplType" onchange="skillImplTypeChanged('ns')"><option value="http">http</option><option value="mcp">mcp · Streamable HTTP</option><option value="builtin">builtin</option><option value="script">script · 沙箱脚本</option></select></div>
      <div class="fld"><label>超时秒数（timeout_s）</label><input class="inp" id="nsTimeout" type="number" value="10" min="1" max="120"></div>
      <div id="nsCredentialBlock" style="display:contents">${skillCredentialControls('skillNewAuth',{},'http')}</div>
      ${skillImplFields('ns','http',{url:'https://api.example.com/skill',method:'POST'})}
      <div class="fld wide"><label>输入契约（input_schema） <b>*</b></label><textarea class="pm-tpl schema-editor" id="nsInput">${esc(JSON.stringify(inputSchema,null,2))}</textarea></div>
      <div class="fld wide"><label>输出契约（output_schema） <b>*</b></label><textarea class="pm-tpl schema-editor" id="nsOutput">${esc(JSON.stringify(outputSchema,null,2))}</textarea></div>
      <div class="fld wide"><div><button class="btn primary" onclick="skillCreate()">注册并创建 v1</button></div><div class="hint">新版本先进入 testing；用上方版本操作完成测试后，发布按钮才会启用。</div></div>
    </div></div></div>`;
}

function skillInstallTemplate(kind){
  if(kind === 'mcp') return {
    apiVersion:'agent-platform/v1', kind:'Skill',
    metadata:{code:'external.mcp.tool',name:'外部 MCP Tool',version:'v1',description:'通过远程 MCP Server 调用 Tool',category:'外部能力',owner:'console',tags:['MCP']},
    spec:{runtime:'mcp',inputSchema:{type:'object',properties:{},additionalProperties:true},outputSchema:{type:'object',additionalProperties:true},
      config:{transport:'streamable_http',url:'https://mcp.example.com/mcp',tool:'',headers:{},allowed_hosts:['mcp.example.com'],protocol_version:'auto'},
      capabilities:['mcp'],timeoutSeconds:20,retries:1}
  };
  return {
    apiVersion:'agent-platform/v1', kind:'Skill',
    metadata:{code:'external.ip.geolocate',name:'外部 IP 地理查询',version:'v1',description:'通过公开 HTTP API 查询 IP 的国家和城市',category:'外部能力',owner:'console',tags:['HTTP','IP']},
    spec:{runtime:'http',inputSchema:{type:'object',required:['ip'],properties:{ip:{type:'string'}},additionalProperties:false},
      outputSchema:{type:'object',required:['ip','country','city'],properties:{ip:{type:'string'},country:{type:'string'},city:{type:'string'}},additionalProperties:false},
      config:{url:'https://api.example.com/ip/{{input.ip}}',method:'GET',query:{lang:'zh-CN'},headers:{},allowed_hosts:['api.example.com'],response:{mapping:{ip:'$.ip',country:'$.country',city:'$.city'}}},
      capabilities:['ip-geolocation'],timeoutSeconds:10,retries:1}
  };
}

async function skillInstall(){
  await loadCredentialList();
  SKILL_GOV.code = null; SKILL_GOV.discovered = []; renderSkillList();
  const manifest = JSON.stringify(skillInstallTemplate('http'), null, 2);
  $('#skillDetail').innerHTML = `<div class="card">
    <div class="card-h"><div><div class="card-t">安装外部 Skill</div><div class="card-s">Manifest 预检后生成不可变 testing 版本；优先绑定平台凭证</div></div>
      <div style="display:flex;gap:6px"><button class="btn sm" onclick="skillLoadInstallTemplate('http')">HTTP 示例</button><button class="btn sm" onclick="skillLoadInstallTemplate('mcp')">MCP 示例</button></div></div>
    <div class="card-b">
      <div class="frm" style="margin-bottom:12px">
      ${skillCredentialControls('skillInstallAuth',{},'http')}
      </div>
      <div class="pm-lbl">Skill 清单（manifest）</div>
      <textarea class="pm-tpl" id="skillManifest" style="min-height:430px">${esc(manifest)}</textarea>
      <div class="hint">选择平台凭证后只会把 <span class="mono">credential_ref</span> 写入 Manifest；密钥正文不会进入 Skill 配置。仍兼容 <span class="mono">\${ENV_VAR}</span>。默认禁止访问本机和内网地址。</div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="btn" onclick="skillInspectManifest(this)">预检</button><button class="btn" onclick="skillDiscoverMcp(this)">发现 MCP Tools</button><button class="btn primary" onclick="skillInstallSubmit(this)">安装到 Registry</button></div>
    </div></div>
    <div class="card"><div class="card-h"><div class="card-t">安装检查</div></div><div class="card-b"><div class="pm-out" id="skillInstallResult">等待预检</div><div id="mcpToolList"></div></div></div>`;
}

function skillLoadInstallTemplate(kind){
  $('#skillManifest').value = JSON.stringify(skillInstallTemplate(kind), null, 2);
  skillAuthChanged('skillInstallAuth');
  $('#skillInstallResult').textContent = kind === 'mcp' ? '请修改 MCP Server URL，按需选择平台凭证，然后发现 Tools' : 'HTTP 示例可直接预检和安装';
  $('#mcpToolList').innerHTML = '';
}

function skillSyncInstallCredential(){
  const area=$('#skillManifest');if(!area)return;
  let manifest;try{manifest=JSON.parse(area.value)}catch(e){return}
  manifest.spec=manifest.spec||{};
  manifest.spec.config=skillApplyAuth(manifest.spec.config||{},'skillInstallAuth');
  area.value=JSON.stringify(manifest,null,2);
}

function skillManifestJSON(){
  try{return JSON.parse($('#skillManifest').value)}catch(e){toast('Manifest JSON 格式错误');throw e}
}

async function skillInspectManifest(btn){
  let manifest; try{manifest=skillManifestJSON()}catch(e){return}
  btn.disabled=true;
  const r=await apiRaw('/v1/skills/install/inspect',{method:'POST',body:JSON.stringify({manifest})});
  btn.disabled=false;
  $('#skillInstallResult').textContent=JSON.stringify(r.body,null,2);
  toast(r.ok?'Manifest 预检通过':(r.body.message||'Manifest 预检失败'));
}

async function skillInstallSubmit(btn){
  let manifest; try{manifest=skillManifestJSON()}catch(e){return}
  btn.disabled=true; btn.textContent='安装中…';
  const r=await apiRaw('/v1/skills/install',{method:'POST',body:JSON.stringify({manifest})});
  btn.disabled=false; btn.textContent='安装到 Registry';
  $('#skillInstallResult').textContent=JSON.stringify(r.body,null,2);
  if(!r.ok){toast(r.body.message||'安装失败');return}
  toast(`${r.body.skill}@${r.body.version} 已安装，等待测试`);
  await loadSkillRegistry(); await skillSelect(r.body.skill);
}

async function skillDiscoverMcp(btn){
  let manifest; try{manifest=skillManifestJSON()}catch(e){return}
  if((manifest.spec||{}).runtime!=='mcp'){toast('当前 Manifest 不是 MCP Skill');return}
  btn.disabled=true; btn.textContent='发现中…';
  const r=await apiRaw('/v1/skills/mcp/discover',{method:'POST',body:JSON.stringify({config:(manifest.spec||{}).config||{}})});
  btn.disabled=false; btn.textContent='发现 MCP Tools';
  $('#skillInstallResult').textContent=JSON.stringify(r.body,null,2);
  if(!r.ok){toast(r.body.message||'MCP 发现失败');return}
  SKILL_GOV.discovered=r.body.tools||[];
  $('#mcpToolList').innerHTML=SKILL_GOV.discovered.length?`<table style="margin-top:12px"><thead><tr><th>Tool</th><th>说明</th><th></th></tr></thead><tbody>${SKILL_GOV.discovered.map((t,i)=>`<tr><td class="mono">${esc(t.name)}</td><td>${esc(t.description||'')}</td><td style="text-align:right"><button class="btn sm" onclick="skillChooseMcpTool(${i})">选择</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Server 没有返回 Tools</div>';
  toast(`发现 ${SKILL_GOV.discovered.length} 个 MCP Tool`);
}

function skillChooseMcpTool(index){
  const tool=SKILL_GOV.discovered[index]; if(!tool)return;
  let manifest; try{manifest=skillManifestJSON()}catch(e){return}
  manifest.spec.config.tool=tool.name;
  manifest.spec.inputSchema=tool.input_schema||{type:'object'};
  manifest.spec.outputSchema=tool.output_schema||{type:'object',additionalProperties:true};
  if(!manifest.metadata.name||manifest.metadata.name==='外部 MCP Tool') manifest.metadata.name=tool.name;
  $('#skillManifest').value=JSON.stringify(manifest,null,2);
  toast(`已选择 ${tool.name}，输入契约已同步`);
}

async function skillCreate(){
  const code = $('#nsCode').value.trim(), name = $('#nsName').value.trim();
  if(!code || !name){ toast('code 和名称必填'); return; }
  let impl,input_schema,output_schema;
  try{ impl=skillReadImpl('ns',$('#nsImplType').value); input_schema=JSON.parse($('#nsInput').value); output_schema=JSON.parse($('#nsOutput').value); }
  catch(e){ toast('JSON 配置格式错误'); return; }
  const implType=$('#nsImplType').value;
  if(implType==='http'||implType==='mcp')impl=skillApplyAuth(impl,'skillNewAuth');
  else delete impl.auth;
  let r = await apiRaw('/v1/skills',{method:'POST',body:JSON.stringify({
    code,name,description:$('#nsDesc').value.trim(),category:$('#nsCategory').value.trim(),
    owner_user:$('#nsOwner').value.trim(),tags:[]})});
  if(!r.ok){ toast(r.body.message || '注册失败'); return; }
  r = await apiRaw(`/v1/skills/${encodeURIComponent(code)}/versions`,{method:'POST',body:JSON.stringify({
    input_schema,output_schema,impl_type:implType,impl_config:impl,
    capabilities:[],timeout_s:Number($('#nsTimeout').value)||10,retries:0})});
  if(!r.ok){ toast(r.body.message || '版本创建失败'); await loadSkillPage(code); return; }
  toast(`${code}@${r.body.version} 已创建，等待测试`);
  await loadSkillPage(code);
}

/* ============ init ============ */
$('#palette').innerHTML = Object.keys(TYPE_META)
  .filter(t => TYPE_META[t].enabled !== false && TYPE_META[t].creatable !== false)
  .map(t => `<option value="${t}">${t} · ${TYPE_META[t].label}</option>`).join('');
initInspector();
initRuntimeInspector();
renderCapabilityCatalog();
renderGraph();
fitZoom();
updateZoomUI();
renderRunList();
renderTrace(null);          // 空态起步，不再先渲染一条编造的 trace
renderAgentPick();
renderContract();
recall();
$('#kProg').textContent = '0 节点';
if($('#kProgHead'))$('#kProgHead').textContent = '0 节点';
$('#runState').textContent='idle';
$('#runState').className='badge run';
(async () => {
  await probe();
  const authReady = await loadAuthStatus();
  if(MODE === 'live' && AUTH.enabled && !authReady) return;
  // agent 切换器依赖 /v1/agents；离线时它自己回落到静态契约表
  renderAgentPick();
  renderContract();
  recall();
  if(MODE === 'live'){
    await Promise.all([loadSkillRegistry(), loadModelRegistry(), loadKnowledgeBases(), loadReviewPendingCount()]);
    await loadMemoryWorkbench();
    recall();
    await loadNodeTypes();
    await loadGraphList();
    const hasAgents = await loadAgents();
    if(!hasAgents) await loadGraph();
    fitZoom();
    await loadServerRuns();
    refreshSummary();
    // 直接落在地下 hash（#govern / #obs）时要等 probe 完成再拉数据，否则会渲染"离线"态
    if($('#view-govern').classList.contains('active')) await loadGov(GOV.code);
    if($('#view-obs').classList.contains('active')) await loadObs();
    if($('#view-knowledge').classList.contains('active')) await loadKnowledgePage(KNOWLEDGE_GOV.code);
    if($('#view-prompt').classList.contains('active')) await loadPromptPage();
    if($('#view-model').classList.contains('active')) await loadModelPage(MODEL_GOV.code);
    if($('#view-credential').classList.contains('active')) await loadCredentialPage(CREDENTIAL_GOV.code);
    if($('#view-skill').classList.contains('active')) await loadSkillPage(SKILL_GOV.code);
    if($('#view-account').classList.contains('active')) await loadAccountPage();
    toast('已加载脱敏演示 · 欢迎语示例由本地规则模拟');
  }
})();
/* ============ 人工审核模板治理 ============ */
const REVIEW_TEMPLATE_GOV={items:[],code:null,version:null,detail:null,preview:null,designerMode:'visual',selectedComponent:0,dragIndex:null,dirty:false,dependents:[],impact:null,audit:[]};
const REVIEW_COMPONENT_TYPES=[
  ['summary','摘要'],['key_value','键值信息'],['text','文本'],['table','表格'],['image','图片'],
  ['link','链接'],['web_preview','网页预览'],['attachment','附件'],['diff','前后差异'],['evidence','知识证据'],
  ['form','审核表单'],['json','JSON 详情']
];
const HELLO_REVIEW_LAYOUT={
  title:'HelloWorld 欢迎语审核',
  description:'核对请求人、拟生成欢迎语和相关知识证据后给出审核结论。',
  components:[
    {id:'request',type:'key_value',title:'请求摘要',fields:[
      {label:'用户名称',value_path:'input.name'},
      {label:'请求编号',value_path:'input.request_id'}]},
    {id:'message',type:'text',title:'拟通过欢迎语',value_path:'variables.llm_result.message',empty_text:'尚未生成欢迎语'},
    {id:'evidence',type:'evidence',title:'知识证据',data_path:'evidence',empty_text:'本次没有召回证据'},
    {id:'form',type:'form',title:'审核补充信息'}
  ]
};
const HELLO_REVIEW_SAMPLE={
  input:{name:'World',request_id:'HELLO_001'},
  variables:{llm_result:{message:'你好，World！欢迎你的到来，很高兴见到你！'}},
  evidence:[{title:'HelloWorld 使用说明',content:'欢迎语应简短、自然、友好。',source:'helloworld-kb',score:.96}]
};

function reviewTemplateCan(action){return !AUTH.enabled||authCan('review_template.'+action)}
function syncReviewTemplatePermissionUi(){const button=$('#reviewTemplateNewBtn');if(!button)return;const allowed=reviewTemplateCan('manage');button.disabled=!allowed;button.title=allowed?'':'当前角色没有 review_template.manage 权限'}
function syncReviewTemplateActionUi(){const root=$('#reviewTemplateDetail');if(!root)return;const manage=reviewTemplateCan('manage'),publish=reviewTemplateCan('publish');root.querySelectorAll('button[onclick^="reviewTemplateSaveMeta"],button[onclick^="reviewTemplateCreate("],button[onclick^="reviewTemplateCreateVersion"],button[onclick^="reviewTemplateGenerate"],button[onclick^="reviewTemplateToggleAi"],button[onclick^="reviewTemplateDeleteDraft"],button[onclick^="reviewTemplateArchive"]').forEach(button=>{button.disabled=!manage;if(!manage)button.title='当前角色没有 review_template.manage 权限'});root.querySelectorAll('button[onclick^="reviewTemplatePublish"],button[onclick^="reviewTemplateSetStable"],button[onclick^="reviewTemplateDeprecate"]').forEach(button=>{button.disabled=!publish;if(!publish)button.title='当前角色没有 review_template.publish 权限'});root.querySelectorAll('button[onclick^="reviewTemplatePurge"]').forEach(button=>{button.disabled=AUTH.enabled&&!authCan('system.admin');if(button.disabled)button.title='只有系统管理员可以永久删除'})}
function reviewTemplateNotice(kind,text){const el=$('#reviewTemplateNotice');if(!el)return;el.innerHTML=text?`<div class="vbar ${kind}" style="margin-bottom:12px"><b>${esc(text)}</b></div>`:''}
async function refreshReviewTemplateCatalog(){if(MODE!=='live')return;const r=await apiRaw('/v1/review-templates');if(!r.ok)return;REVIEW_TEMPLATE_GOV.items=r.body.items||[];if(NODE_EDITOR.open)renderDetail()}
async function loadReviewTemplateOptions(nodeId,button){if(button){button.disabled=true;button.classList.add('loading');button.setAttribute('aria-busy','true')}try{const r=await apiRaw('/v1/review-templates');if(!r.ok)return toast(r.body.message||'审核模板加载失败');REVIEW_TEMPLATE_GOV.items=r.body.items||[];if(NODE_EDITOR.open&&NODE_EDITOR.nodeId===nodeId)renderDetail();toast('审核模板已刷新')}catch(error){toast(error.message||'审核模板加载失败')}finally{if(button&&button.isConnected){button.disabled=false;button.classList.remove('loading');button.removeAttribute('aria-busy')}}}
async function loadReviewTemplatePage(preferred){
  if(reviewTemplateHasUnsavedChanges()&&!reviewTemplateCanDiscard())return;
  if(MODE!=='live'){reviewTemplateNotice('warn','后端未连接，无法读取审核模板');return}
  const [r,projects,agents]=await Promise.all([apiRaw('/v1/review-templates?include_archived=true'),apiRaw('/v1/projects'),apiRaw('/v1/agents')]);if(!r.ok){reviewTemplateNotice('err',r.body.message||'审核模板加载失败');return}
  if(projects.ok)PROJECTS=projects.body.items||PROJECTS;if(agents.ok)AGENTS=agents.body.items||AGENTS;
  REVIEW_TEMPLATE_GOV.items=r.body.items||[];
  const wanted=preferred||REVIEW_TEMPLATE_GOV.code,found=REVIEW_TEMPLATE_GOV.items.find(item=>item.code===wanted);
  REVIEW_TEMPLATE_GOV.code=found?found.code:(REVIEW_TEMPLATE_GOV.items[0]||{}).code||null;
  REVIEW_TEMPLATE_GOV.detail=REVIEW_TEMPLATE_GOV.items.find(item=>item.code===REVIEW_TEMPLATE_GOV.code)||null;
  if(REVIEW_TEMPLATE_GOV.detail){const versions=REVIEW_TEMPLATE_GOV.detail.versions||[];if(!versions.some(item=>item.version===REVIEW_TEMPLATE_GOV.version))REVIEW_TEMPLATE_GOV.version=(versions[0]||{}).version||null}
  reviewTemplateNotice('', '');renderReviewTemplateList();renderReviewTemplateDetail();await loadReviewTemplateGovernance();
}
function reviewTemplateScopeLabel(item){const labels={platform:'平台共享',project:'项目',agent:'Agent 独享',team:'团队/部门'},type=item.scope_type||'platform';return labels[type]+(item.scope_ref?' · '+item.scope_ref:'')}
function renderReviewTemplateList(){const el=$('#reviewTemplateList');if(!el)return;$('#reviewTemplateCount').textContent=REVIEW_TEMPLATE_GOV.items.length+' 个';el.innerHTML=REVIEW_TEMPLATE_GOV.items.length?REVIEW_TEMPLATE_GOV.items.map(item=>{const selected=item.code===REVIEW_TEMPLATE_GOV.code,versions=(item.versions||[]).length,stable=(item.aliases||{}).stable||'未发布',label=item.status==='active'?'启用':item.status==='archived'?'已归档':'停用',enabled=item.status==='active';return `<button type="button" class="review-template-item ${selected?'active':''}" aria-pressed="${selected?'true':'false'}" onclick="reviewTemplateSelect('${attr(item.code)}')"><span class="review-template-item-head"><span class="review-template-item-name">${esc(item.name)}</span><span class="review-template-status ${enabled?'active':''}">${label}</span></span><span class="review-template-item-code mono">${esc(item.code)}</span><span class="review-template-item-meta"><span class="review-template-meta-chip">${versions} 个版本</span><span class="review-template-meta-chip">${esc(reviewTemplateScopeLabel(item))}</span><span class="review-template-meta-chip stable">stable · ${esc(stable)}</span></span></button>`}).join(''):'<div class="empty">暂无审核模板<br><span class="hint">点击右上角“新建模板”开始配置</span></div>'}
async function reviewTemplateSelect(code){if(code!==REVIEW_TEMPLATE_GOV.code&&!reviewTemplateCanDiscard())return;REVIEW_TEMPLATE_GOV.code=code;REVIEW_TEMPLATE_GOV.detail=REVIEW_TEMPLATE_GOV.items.find(item=>item.code===code)||null;REVIEW_TEMPLATE_GOV.version=((REVIEW_TEMPLATE_GOV.detail||{}).versions||[])[0]?.version||null;REVIEW_TEMPLATE_GOV.preview=null;REVIEW_TEMPLATE_GOV.dirty=false;REVIEW_TEMPLATE_GOV.dependents=[];REVIEW_TEMPLATE_GOV.audit=[];REVIEW_TEMPLATE_GOV.impact=null;renderReviewTemplateList();renderReviewTemplateDetail();await loadReviewTemplateGovernance()}
function reviewTemplateVersion(){return ((REVIEW_TEMPLATE_GOV.detail||{}).versions||[]).find(item=>item.version===REVIEW_TEMPLATE_GOV.version)||null}
function reviewTemplateEditor(layout,sample){
  const canManage=reviewTemplateCan('manage'),manageAttrs=canManage?'':'disabled title="当前角色没有 review_template.manage 权限"';
  setTimeout(syncReviewTemplateActionUi,0);
  const modelOptions=MODEL_GOV.items.filter(item=>item.status==='active'&&item.aliases&&item.aliases.stable).map(item=>`<option value="${attr(item.code)}">${esc(item.name)} · ${esc(item.code)} · stable ${esc(item.aliases.stable)}</option>`).join('');
  return `<div class="review-template-tools"><div class="view-switch"><button type="button" id="reviewTemplateVisualBtn" class="active" onclick="reviewTemplateSetEditorMode('visual')">可视化设计</button><button type="button" id="reviewTemplateJsonBtn" onclick="reviewTemplateSetEditorMode('json')">JSON</button></div><span class="review-template-dirty" id="reviewTemplateDirty">有未保存的模板改动</span><span class="spacer"></span><button class="btn" type="button" onclick="reviewTemplateDirectPreview(this)">直接预览</button><button class="btn" type="button" onclick="reviewTemplateDirectPreview(this,'feishu')">飞书预览</button><button class="btn" type="button" ${manageAttrs} onclick="reviewTemplateToggleAi()">智能生成模板</button></div>
  <div class="review-template-ai" id="reviewTemplateAi"><div class="review-template-ai-grid"><div class="fld wide-mobile"><label>业务审核描述</label><textarea class="inp" id="reviewTemplateAiPrompt" placeholder="例如：审核采购单金额、供应商和物料明细，突出风险项并展示制度证据">${esc(layout.description||'')}</textarea></div><div class="fld"><label>生成模型</label><select class="inp" id="reviewTemplateAiModel"><option value="">规则生成（无需模型）</option>${modelOptions}</select></div><div class="fld"><label>生成方式</label><select class="inp" id="reviewTemplateAiMode"><option value="replace">重新生成</option><option value="refine">保留并补充当前组件</option></select></div><button class="btn primary" type="button" ${manageAttrs} onclick="reviewTemplateGenerate(this)">生成草稿</button></div><div class="review-generation-status" id="reviewTemplateGenerationStatus">模型生成会把业务描述和样例发送到所选治理模型，请使用脱敏样例。生成结果只进入当前编辑区，创建新版本并发布后才生效。</div></div>
  <div class="review-template-workspace"><div><div class="review-template-visual-pane" id="reviewTemplateVisualPane"><div class="review-designer" id="reviewTemplateDesigner"></div></div><div class="review-template-json-pane" id="reviewTemplateJsonPane"><div class="fld"><label>模板布局（layout）</label><textarea class="pm-tpl" id="reviewTemplateLayout" data-json-editor="true" style="min-height:540px" oninput="reviewTemplateJsonChanged()">${esc(JSON.stringify(layout,null,2))}</textarea><div class="hint">JSON 与可视化设计器双向同步；路径只能读取数据，不能执行表达式。</div></div></div></div><div class="fld review-template-sample"><label>预览数据（sample_data）</label><textarea class="pm-tpl" id="reviewTemplateSample" data-json-editor="true" oninput="reviewTemplateJsonChanged()">${esc(JSON.stringify(sample,null,2))}</textarea><div class="hint">组件路径从该 JSON 中选择。智能生成不会保存或发布模板。</div></div></div>`
}
function reviewTemplateLayoutValue(){const area=$('#reviewTemplateLayout');if(!area)throw new Error('模板编辑器尚未初始化');try{return JSON.parse(area.value)}catch(e){throw new Error('模板布局不是合法 JSON：'+e.message)}}
function reviewTemplateSetDirty(dirty){REVIEW_TEMPLATE_GOV.dirty=Boolean(dirty);const mark=$('#reviewTemplateDirty');if(mark)mark.classList.toggle('on',REVIEW_TEMPLATE_GOV.dirty);return REVIEW_TEMPLATE_GOV.dirty}
function reviewTemplateCanonical(value){const normalize=item=>Array.isArray(item)?item.map(normalize):item&&typeof item==='object'?Object.keys(item).sort().reduce((result,key)=>{result[key]=normalize(item[key]);return result},{}):item;return JSON.stringify(normalize(value))}
function reviewTemplateHasUnsavedChanges(){const layoutArea=$('#reviewTemplateLayout'),sampleArea=$('#reviewTemplateSample'),version=reviewTemplateVersion();if(!layoutArea||!sampleArea||!version)return REVIEW_TEMPLATE_GOV.dirty;try{const current=reviewTemplateReadEditors(),changed=reviewTemplateCanonical(current.layout)!==reviewTemplateCanonical(version.layout||{})||reviewTemplateCanonical(current.sample_data)!==reviewTemplateCanonical(version.sample_data||{});return reviewTemplateSetDirty(changed)}catch(e){return reviewTemplateSetDirty(true)}}
function reviewTemplateJsonChanged(){REVIEW_TEMPLATE_GOV.preview=null;if(!reviewTemplateVersion())return reviewTemplateSetDirty(true);reviewTemplateHasUnsavedChanges()}
function reviewTemplateCanDiscard(){return !reviewTemplateHasUnsavedChanges()||confirm('当前模板有尚未创建版本的改动，确定放弃这些改动吗？')}
function reviewTemplateWriteLayout(layout,dirty=true){const area=$('#reviewTemplateLayout');if(!area)return;area.value=JSON.stringify(layout,null,2);area.dispatchEvent(new Event('input',{bubbles:true}));REVIEW_TEMPLATE_GOV.preview=null;if(dirty)reviewTemplateHasUnsavedChanges()}
function reviewTemplateSetEditorMode(mode){if(mode==='visual'){try{reviewTemplateLayoutValue()}catch(e){toast(e.message);return}}REVIEW_TEMPLATE_GOV.designerMode=mode;const visual=$('#reviewTemplateVisualPane'),jsonPane=$('#reviewTemplateJsonPane');if(visual)visual.classList.toggle('off',mode!=='visual');if(jsonPane)jsonPane.classList.toggle('on',mode==='json');const visualBtn=$('#reviewTemplateVisualBtn'),jsonBtn=$('#reviewTemplateJsonBtn');if(visualBtn)visualBtn.classList.toggle('active',mode==='visual');if(jsonBtn)jsonBtn.classList.toggle('active',mode==='json');if(mode==='visual')reviewTemplateRenderDesigner()}
function reviewTemplateDefaultComponent(type,index){const id=(type==='key_value'||type==='summary'?'summary':type)+'_'+(index+1),base={id,type,title:REVIEW_COMPONENT_TYPES.find(item=>item[0]===type)?.[1]||type};if(type==='key_value'||type==='summary')return{...base,fields:[{label:'字段名称',value_path:'input.request_id'}]};if(type==='text')return{...base,value_path:'output.message',empty_text:'暂无内容'};if(type==='table')return{...base,data_path:'output.items',columns:[{field:'name',label:'名称'}],max_items:100,empty_text:'暂无数据'};if(type==='image')return{...base,url_path:'output.image_url',alt:'审核图片',allow_hosts:[]};if(type==='link'||type==='web_preview')return{...base,url_path:'output.url',label:'查看详情',allow_hosts:[]};if(type==='attachment')return{...base,data_path:'output.attachments',name_field:'name',url_field:'url',size_field:'size',mime_field:'mime_type',allow_hosts:[],max_items:20,empty_text:'暂无附件'};if(type==='diff')return{...base,before_path:'input',after_path:'output'};if(type==='evidence')return{...base,data_path:'evidence',empty_text:'暂无知识证据'};if(type==='json')return{...base,data_path:'output'};return base}
function reviewTemplatePropertyInput(label,key,value,index,kind='text',wide=false){const cls=wide?'wide':'',help=key==='allow_hosts'?'<div class="hint">填写 [] 表示允许任意公网 HTTPS 域名；填写域名数组表示仅允许精确匹配的域名。本机和内网地址始终禁止。</div>':'';if(kind==='json')return `<div class="${cls}"><label>${esc(label)}（${esc(key)}）</label><textarea class="inp" onchange="reviewTemplateUpdateProperty(${index},'${key}',this.value,'json')">${esc(JSON.stringify(value??[],null,2))}</textarea>${help}</div>`;if(kind==='number')return `<div class="${cls}"><label>${esc(label)}（${esc(key)}）</label><input class="inp" type="number" min="1" max="500" value="${attr(value??100)}" onchange="reviewTemplateUpdateProperty(${index},'${key}',this.value,'number')"></div>`;return `<div class="${cls}"><label>${esc(label)}（${esc(key)}）</label><input class="inp" value="${attr(value??'')}" onchange="reviewTemplateUpdateProperty(${index},'${key}',this.value)"></div>`}
function reviewTemplateLayoutWidthInput(component,index){const value=component.layout_width||'auto';return `<div><label>布局宽度（layout_width）</label><select class="inp" onchange="reviewTemplateUpdateProperty(${index},'layout_width',this.value)"><option value="auto"${value==='auto'?' selected':''}>auto · 按组件自动</option><option value="half"${value==='half'?' selected':''}>half · 半行</option><option value="full"${value==='full'?' selected':''}>full · 整行</option></select><div class="hint">auto 下图片、表格、网页、附件、差异、证据、表单和 JSON 默认整行。</div></div>`}
function reviewTemplatePropertyPanel(component,index){if(!component)return '<div class="empty">从左侧选择组件后编辑属性</div>';let fields=reviewTemplatePropertyInput('组件编码','id',component.id,index)+reviewTemplatePropertyInput('标题','title',component.title,index)+reviewTemplatePropertyInput('说明','description',component.description,index,'text',true);const type=component.type;if(type==='key_value'||type==='summary')fields+=reviewTemplatePropertyInput('字段列表','fields',component.fields,index,'json',true);if(type==='text')fields+=reviewTemplatePropertyInput('内容路径','value_path',component.value_path,index,'text',true);if(type==='table')fields+=reviewTemplatePropertyInput('数据数组路径','data_path',component.data_path,index,'text',true)+reviewTemplatePropertyInput('表格列','columns',component.columns,index,'json',true)+reviewTemplatePropertyInput('最大条数','max_items',component.max_items,index,'number');if(type==='image')fields+=reviewTemplatePropertyInput('图片地址路径','url_path',component.url_path,index,'text',true)+reviewTemplatePropertyInput('替代文本','alt',component.alt,index)+reviewTemplatePropertyInput('允许域名白名单（必填，仅 HTTPS）','allow_hosts',component.allow_hosts,index,'json',true);if(type==='link'||type==='web_preview')fields+=reviewTemplatePropertyInput('链接地址路径','url_path',component.url_path,index,'text',true)+reviewTemplatePropertyInput('链接标题路径','title_path',component.title_path,index)+reviewTemplatePropertyInput('固定按钮文字','label',component.label,index)+reviewTemplatePropertyInput('允许域名白名单（必填，仅 HTTPS）','allow_hosts',component.allow_hosts,index,'json',true);if(type==='attachment')fields+=reviewTemplatePropertyInput('附件数组路径','data_path',component.data_path,index,'text',true)+reviewTemplatePropertyInput('文件名字段','name_field',component.name_field||'name',index)+reviewTemplatePropertyInput('下载地址字段','url_field',component.url_field||'url',index)+reviewTemplatePropertyInput('文件大小字段','size_field',component.size_field||'size',index)+reviewTemplatePropertyInput('文件类型字段','mime_field',component.mime_field||'mime_type',index)+reviewTemplatePropertyInput('最大条数','max_items',component.max_items||20,index,'number')+reviewTemplatePropertyInput('允许域名白名单（必填，仅 HTTPS）','allow_hosts',component.allow_hosts,index,'json',true)+reviewTemplatePropertyInput('空数据提示','empty_text',component.empty_text||'暂无附件',index,'text',true);if(type==='diff')fields+=reviewTemplatePropertyInput('调整前路径','before_path',component.before_path,index,'text',true)+reviewTemplatePropertyInput('调整后路径','after_path',component.after_path,index,'text',true);if(type==='evidence'||type==='json')fields+=reviewTemplatePropertyInput('数据路径','data_path',component.data_path,index,'text',true);if(['text','table','evidence'].includes(type))fields+=reviewTemplatePropertyInput('空数据提示','empty_text',component.empty_text,index,'text',true);return `<div class="sub-t" style="margin-bottom:9px">组件属性</div><div class="review-property-grid"><div><label>组件类型（type）</label><select class="inp" onchange="reviewTemplateChangeType(${index},this.value)">${REVIEW_COMPONENT_TYPES.map(item=>`<option value="${item[0]}"${item[0]===type?' selected':''}>${item[1]}（${item[0]}）</option>`).join('')}</select></div>${reviewTemplateLayoutWidthInput(component,index)}${fields}</div>`}
function reviewTemplateRenderDesigner(){const root=$('#reviewTemplateDesigner');if(!root)return;let layout;try{layout=reviewTemplateLayoutValue()}catch(e){root.innerHTML=`<div class="empty">${esc(e.message)}</div>`;return}const components=Array.isArray(layout.components)?layout.components:[];if(REVIEW_TEMPLATE_GOV.selectedComponent>=components.length)REVIEW_TEMPLATE_GOV.selectedComponent=Math.max(0,components.length-1);root.innerHTML=`<div class="review-designer-head"><div class="review-property-grid"><div><label>页面标题（title）</label><input class="inp" value="${attr(layout.title||'')}" onchange="reviewTemplateUpdateRoot('title',this.value)"></div><div><label>页面说明（description）</label><input class="inp" value="${attr(layout.description||'')}" onchange="reviewTemplateUpdateRoot('description',this.value)"></div></div><div class="review-component-palette">${REVIEW_COMPONENT_TYPES.map(item=>`<button class="btn" type="button" onclick="reviewTemplateAddComponent('${item[0]}')">＋ ${item[1]}</button>`).join('')}</div></div><div class="review-designer-body"><div class="review-component-list">${components.length?components.map((component,index)=>`<div class="review-component-card ${index===REVIEW_TEMPLATE_GOV.selectedComponent?'active':''}" draggable="true" ondragstart="reviewTemplateDragStart(event,${index})" ondragend="reviewTemplateDragEnd(event)" ondragover="event.preventDefault()" ondrop="reviewTemplateDrop(event,${index})" onclick="reviewTemplateSelectComponent(${index})"><span class="review-drag" title="拖动排序">⋮⋮</span><div><div class="review-component-card-title">${esc(component.title||component.id||'未命名组件')}</div><div class="review-component-card-meta">${esc(REVIEW_COMPONENT_TYPES.find(item=>item[0]===component.type)?.[1]||component.type)} · ${esc(component.id||'缺少 id')}</div></div><div class="review-component-actions"><button type="button" title="上移" onclick="event.stopPropagation();reviewTemplateMoveComponent(${index},-1)">↑</button><button type="button" title="下移" onclick="event.stopPropagation();reviewTemplateMoveComponent(${index},1)">↓</button><button type="button" title="复制" onclick="event.stopPropagation();reviewTemplateDuplicateComponent(${index})">⧉</button><button type="button" title="删除" onclick="event.stopPropagation();reviewTemplateRemoveComponent(${index})">×</button></div></div>`).join(''):'<div class="empty">点击上方组件按钮开始设计审核页面</div>'}</div><div class="review-property-panel">${reviewTemplatePropertyPanel(components[REVIEW_TEMPLATE_GOV.selectedComponent],REVIEW_TEMPLATE_GOV.selectedComponent)}</div></div>`}
function initReviewTemplateDesigner(){REVIEW_TEMPLATE_GOV.selectedComponent=0;reviewTemplateSetEditorMode(REVIEW_TEMPLATE_GOV.designerMode||'visual')}
function reviewTemplateUpdateRoot(key,value){const layout=reviewTemplateLayoutValue();layout[key]=value;reviewTemplateWriteLayout(layout);reviewTemplateRenderDesigner()}
function reviewTemplateSelectComponent(index){REVIEW_TEMPLATE_GOV.selectedComponent=index;reviewTemplateRenderDesigner()}
function reviewTemplateAddComponent(type){const layout=reviewTemplateLayoutValue();layout.components=Array.isArray(layout.components)?layout.components:[];let component=reviewTemplateDefaultComponent(type,layout.components.length);const ids=new Set(layout.components.map(item=>item.id));let id=component.id,n=2;while(ids.has(id))id=component.id+'_'+n++;component.id=id;layout.components.push(component);REVIEW_TEMPLATE_GOV.selectedComponent=layout.components.length-1;reviewTemplateWriteLayout(layout);reviewTemplateRenderDesigner()}
function reviewTemplateUpdateProperty(index,key,value,kind='text'){const layout=reviewTemplateLayoutValue(),component=(layout.components||[])[index];if(!component)return;try{if(kind==='json')value=JSON.parse(value||'[]');else if(kind==='number')value=Math.max(1,Math.min(500,Number(value)||1));if(value===''&&!['id','title'].includes(key))delete component[key];else component[key]=value;reviewTemplateWriteLayout(layout);reviewTemplateRenderDesigner()}catch(e){toast(`${key} 不是合法 JSON：${e.message}`)}}
function reviewTemplateChangeType(index,type){const layout=reviewTemplateLayoutValue(),old=(layout.components||[])[index];if(!old)return;const fresh=reviewTemplateDefaultComponent(type,index);layout.components[index]={...fresh,id:old.id||fresh.id,title:old.title||fresh.title,description:old.description||''};reviewTemplateWriteLayout(layout);reviewTemplateRenderDesigner()}
function reviewTemplateRemoveComponent(index){const layout=reviewTemplateLayoutValue();layout.components.splice(index,1);REVIEW_TEMPLATE_GOV.selectedComponent=Math.max(0,index-1);reviewTemplateWriteLayout(layout);reviewTemplateRenderDesigner()}
function reviewTemplateDuplicateComponent(index){const layout=reviewTemplateLayoutValue(),source=layout.components[index];if(!source)return;const copy=JSON.parse(JSON.stringify(source)),ids=new Set(layout.components.map(item=>item.id));let base=(copy.id||'component')+'_copy',id=base,n=2;while(ids.has(id))id=base+'_'+n++;copy.id=id;copy.title=(copy.title||'组件')+' 副本';layout.components.splice(index+1,0,copy);REVIEW_TEMPLATE_GOV.selectedComponent=index+1;reviewTemplateWriteLayout(layout);reviewTemplateRenderDesigner()}
function reviewTemplateMoveComponent(index,offset){const layout=reviewTemplateLayoutValue(),target=index+offset;if(target<0||target>=layout.components.length)return;const [item]=layout.components.splice(index,1);layout.components.splice(target,0,item);REVIEW_TEMPLATE_GOV.selectedComponent=target;reviewTemplateWriteLayout(layout);reviewTemplateRenderDesigner()}
function reviewTemplateDragStart(event,index){REVIEW_TEMPLATE_GOV.dragIndex=index;event.currentTarget.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(index))}
function reviewTemplateDragEnd(event){event.currentTarget.classList.remove('dragging');REVIEW_TEMPLATE_GOV.dragIndex=null}
function reviewTemplateDrop(event,target){event.preventDefault();const source=REVIEW_TEMPLATE_GOV.dragIndex??Number(event.dataTransfer.getData('text/plain'));if(!Number.isInteger(source)||source===target)return;const layout=reviewTemplateLayoutValue(),[item]=layout.components.splice(source,1);layout.components.splice(target,0,item);REVIEW_TEMPLATE_GOV.selectedComponent=target;reviewTemplateWriteLayout(layout);reviewTemplateRenderDesigner()}
function reviewTemplateToggleAi(){const panel=$('#reviewTemplateAi');if(panel)panel.classList.toggle('on')}
async function reviewTemplateGenerate(btn){btn.disabled=true;const old=btn.textContent;btn.textContent='生成中…';const status=$('#reviewTemplateGenerationStatus');try{const layout=reviewTemplateLayoutValue();let sample;try{sample=JSON.parse($('#reviewTemplateSample').value)}catch(e){throw new Error('预览数据不是合法 JSON：'+e.message)}const modelRef=$('#reviewTemplateAiModel').value,body={description:$('#reviewTemplateAiPrompt').value.trim(),sample_data:sample,existing_layout:layout,mode:$('#reviewTemplateAiMode').value,use_model:!!modelRef,model_ref:modelRef,model_version:'stable'};const r=await apiRaw('/v1/review-templates/generate',{method:'POST',body:JSON.stringify(body)});if(!r.ok)throw new Error((r.body&&r.body.message)||'模板生成失败');reviewTemplateWriteLayout(r.body.layout);REVIEW_TEMPLATE_GOV.selectedComponent=0;reviewTemplateSetEditorMode('visual');const warnings=r.body.warnings||[];if(status)status.textContent=(r.body.generation_mode==='model'?'模型已生成可编辑草稿':'规则已生成可编辑草稿')+(warnings.length?'；'+warnings.join('；'):'')+'。请校验、直接预览并创建新版本后发布。';toast(warnings.length?'已生成草稿，模型异常已自动回退':'审核模板草稿已生成')}catch(e){if(status)status.textContent=e.message;toast(e.message)}finally{btn.disabled=false;btn.textContent=old}}
function reviewTemplatePreviewValue(value){if(value===null||value===undefined)return'暂无数据';return typeof value==='object'?JSON.stringify(value,null,2):String(value)}
function reviewTemplatePreviewPath(value,path){if(!path)return{found:false,value:null};let current=value;for(const part of String(path).split('.')){if(current&&typeof current==='object'&&!Array.isArray(current)&&Object.prototype.hasOwnProperty.call(current,part))current=current[part];else if(Array.isArray(current)&&/^\d+$/.test(part)&&Number(part)<current.length)current=current[Number(part)];else return{found:false,value:null}}return{found:true,value:current}}
function reviewTemplateUnsafeHost(raw){const host=String(raw||'').trim().toLowerCase().replace(/\.$/,'');if(!host||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.lan')||host.endsWith('.home')||host.endsWith('.arpa')||!host.includes('.'))return true;if(host.startsWith('[')&&host.endsWith(']'))return true;const parts=host.split('.');if(parts.length===4&&parts.every(part=>/^\d+$/.test(part))){const nums=parts.map(Number);if(nums.some(part=>part<0||part>255))return true;const [a,b]=nums;return a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)}return false}
function reviewTemplatePreviewUrl(raw,allowHosts=[]){try{if(!Array.isArray(allowHosts))return'';const url=new URL(String(raw||''));const hosts=allowHosts.map(item=>String(item).toLowerCase().replace(/\.$/,'')),hostname=url.hostname.toLowerCase().replace(/\.$/,'');if(url.protocol!=='https:'||url.username||url.password||reviewTemplateUnsafeHost(hostname)||(hosts.length&&!hosts.includes(hostname)))return'';return url.href}catch(e){return''}}
function reviewTemplateAttachmentSize(value){const size=Number(value);if(!Number.isFinite(size)||size<0)return'';if(size<1024)return `${size} B`;if(size<1024**2)return `${(size/1024).toFixed(1)} KB`;if(size<1024**3)return `${(size/1024**2).toFixed(1)} MB`;return `${(size/1024**3).toFixed(1)} GB`}
function reviewTemplateAttachmentName(raw,index){try{const path=new URL(String(raw||''),location.origin).pathname,name=decodeURIComponent(path.split('/').filter(Boolean).pop()||'');return name||`附件 ${index+1}`}catch(e){return `附件 ${index+1}`}}
function reviewTemplateAttachmentRows(component){const source=component.resolved_data,items=Array.isArray(source)?source:(source===null||source===undefined?[]:[source]);return items.slice(0,Number(component.max_items)||20).map((item,index)=>{const objectItem=item&&typeof item==='object'&&!Array.isArray(item)?item:null,field=path=>objectItem?reviewTemplatePreviewPath(objectItem,path):{found:false,value:null},urlValue=typeof item==='string'?item:field(component.url_field||'url').value,url=reviewTemplatePreviewUrl(urlValue,component.allow_hosts||[]),nameValue=field(component.name_field||'name'),mimeValue=field(component.mime_field||'mime_type'),sizeValue=field(component.size_field||'size'),name=nameValue.found&&nameValue.value?String(nameValue.value):reviewTemplateAttachmentName(urlValue,index),meta=[mimeValue.found&&mimeValue.value?String(mimeValue.value):'',sizeValue.found?reviewTemplateAttachmentSize(sizeValue.value):''].filter(Boolean).join(' · ');return `<div class="review-preview-attachment"><div class="review-preview-attachment-main"><div class="review-preview-attachment-name">${esc(name)}</div>${meta?`<div class="review-preview-attachment-meta">${esc(meta)}</div>`:''}</div>${url?`<a class="review-preview-download" href="${attr(url)}" download target="_blank" rel="noopener noreferrer">下载</a>`:'<span class="review-preview-missing">下载地址无效</span>'}</div>`}).join('')}
function reviewTemplateComponentIsWide(component){if(component.layout_width==='full')return true;if(component.layout_width==='half')return false;return ['image','table','web_preview','attachment','diff','evidence','form','json'].includes(component.type)}
function reviewTemplatePreviewForm(sample){const schema=((sample.human||{}).form_schema)||((sample.pending||{}).form_schema)||{},properties=schema.properties||{},required=schema.required||[];const fields=Object.entries(properties);if(!fields.length)return'<div class="review-preview-missing">当前样例没有 human.form_schema，运行时会按节点表单配置展示</div>';return `<div class="review-preview-form">${fields.map(([name,field])=>{const title=field.title||name,req=required.includes(name)?' *':'',wide=field.type==='object'||field.type==='array'||field.format==='textarea';let control='';if(Array.isArray(field.enum))control=`<select class="inp" disabled><option>${esc(field.enum[0]??'请选择')}</option></select>`;else if(field.type==='boolean')control='<label><input type="checkbox" disabled> 是</label>';else if(wide)control=`<textarea class="inp" disabled placeholder="${attr(field.description||'请输入内容')}"></textarea>`;else control=`<input class="inp" disabled placeholder="${attr(field.description||'请输入'+title)}">`;return `<div class="${wide?'wide':''}"><label>${esc(title+req)}</label>${control}</div>`}).join('')}</div>`}
function reviewTemplateBusinessComponent(component,sample,missing){const type=component.type,wide=reviewTemplateComponentIsWide(component),heading=`${component.title?`<div class="review-preview-component-title">${esc(component.title)}</div>`:''}${component.description?`<div class="review-preview-component-desc">${esc(component.description)}</div>`:''}`;let content='';if(type==='summary'||type==='key_value'){content=`<div class="review-preview-kv">${(component.resolved_fields||[]).map(field=>`<div class="review-preview-kv-item"><div class="review-preview-label">${esc(field.label||field.value_path)}</div><div class="review-preview-value ${field.found?'':'review-preview-missing'}">${esc(field.found?reviewTemplatePreviewValue(field.value):(component.empty_text||'暂无数据'))}</div></div>`).join('')}</div>`}else if(type==='text'){const absent=missing.has(component.value_path);content=`<div class="review-preview-text ${absent?'review-preview-missing':''}">${esc(absent?(component.empty_text||'暂无数据'):reviewTemplatePreviewValue(component.resolved_value))}</div>`}else if(type==='table'){const rows=Array.isArray(component.resolved_data)?component.resolved_data.slice(0,Number(component.max_items)||100):[],columns=component.columns||[];content=rows.length?`<div style="overflow:auto"><table class="review-preview-table"><thead><tr>${columns.map(column=>`<th>${esc(column.label||column.field)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(column=>{const cell=reviewTemplatePreviewPath(row,column.field);return `<td>${esc(cell.found?reviewTemplatePreviewValue(cell.value):'—')}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="review-preview-missing">${esc(component.empty_text||'暂无表格数据')}</div>`}else if(type==='image'){const url=reviewTemplatePreviewUrl(component.resolved_url,component.allow_hosts||[]);content=url?`<img class="review-preview-image" src="${attr(url)}" alt="${attr(component.alt||component.title||'审核图片')}" loading="lazy">`:'<div class="review-preview-missing">图片地址不存在或不在允许域名中</div>'}else if(type==='link'||type==='web_preview'){const url=reviewTemplatePreviewUrl(component.resolved_url,component.allow_hosts||[]),label=component.resolved_title||component.label||url;if(!url)content='<div class="review-preview-missing">链接不存在或不在允许域名中</div>';else if(type==='web_preview')content=`<a class="review-preview-link" href="${attr(url)}" target="_blank" rel="noopener noreferrer">${esc(label||'查看详情')}</a><iframe class="review-preview-web" src="${attr(url)}" sandbox="allow-scripts allow-forms allow-popups" referrerpolicy="no-referrer" title="${attr(component.title||'网页预览')}"></iframe><div class="review-preview-web-note">若目标网站禁止嵌入，请点击上方链接在新窗口查看。</div>`;else content=`<a class="review-preview-link" href="${attr(url)}" target="_blank" rel="noopener noreferrer">${esc(label||'查看详情')}</a>`}else if(type==='diff'){content=`<div class="review-preview-diff"><div><div class="review-preview-label">调整前</div><pre class="review-preview-code">${esc(reviewTemplatePreviewValue(component.resolved_before))}</pre></div><div><div class="review-preview-label">调整后</div><pre class="review-preview-code">${esc(reviewTemplatePreviewValue(component.resolved_after))}</pre></div></div>`}else if(type==='evidence'){const rows=Array.isArray(component.resolved_data)?component.resolved_data:[];content=rows.length?rows.map((item,index)=>`<div class="review-preview-evidence"><div class="review-preview-evidence-head"><span>#${index+1} ${esc(item.title||item.id||'证据')}</span><span class="review-preview-score">${esc(item.rerank_score??item.score??'')}</span></div><div class="review-preview-evidence-body">${esc(item.content||'')}</div></div>`).join(''):`<div class="review-preview-missing">${esc(component.empty_text||'暂无知识证据')}</div>`}else if(type==='form'){content=reviewTemplatePreviewForm(sample)}else if(type==='json'){content=`<pre class="review-preview-code">${esc(reviewTemplatePreviewValue(component.resolved_data))}</pre>`}return `<section class="review-preview-component ${wide?'wide':''}" data-preview-component="${attr(type)}" data-layout-width="${attr(component.layout_width||'auto')}">${heading}${content}</section>`}
function reviewTemplateBusinessComponentView(component,sample,missing){if(component.type!=='attachment')return reviewTemplateBusinessComponent(component,sample,missing);const wide=reviewTemplateComponentIsWide(component),heading=`${component.title?`<div class="review-preview-component-title">${esc(component.title)}</div>`:''}${component.description?`<div class="review-preview-component-desc">${esc(component.description)}</div>`:''}`,rows=reviewTemplateAttachmentRows(component),content=rows?`<div class="review-preview-attachments">${rows}</div>`:`<div class="review-preview-missing">${esc(component.empty_text||'暂无附件')}</div>`;return `<section class="review-preview-component ${wide?'wide':''}" data-preview-component="attachment" data-layout-width="${attr(component.layout_width||'auto')}">${heading}${content}</section>`}
function renderReviewTemplateDirectPreview(layout,sample,result){const missing=new Set(result.missing_paths||[]),body=$('#reviewTemplatePreviewBody');body.innerHTML=`<div class="review-preview-shell"><div class="review-preview-alert ${missing.size?'':'ok'}">${missing.size?'以下路径没有命中样例数据：'+esc([...missing].join('、')):'模板校验通过，所有配置路径均已命中样例数据'}</div><div class="review-preview-head"><div class="review-preview-title">${esc(layout.title||'业务审核')}</div>${layout.description?`<div class="review-preview-desc">${esc(layout.description)}</div>`:''}</div><div class="review-preview-components">${(result.components||[]).map(component=>reviewTemplateBusinessComponentView(component,sample,missing)).join('')}</div><div class="review-preview-actions"><button class="btn">驳回</button><button class="btn primary">通过</button></div></div>`}
function renderReviewTemplateFeishuPreview(result){const card=result.card||{},header=card.header||{},body=$('#reviewTemplatePreviewBody'),template=header.template||'orange',elements=((card.body||{}).elements||[]),degraded=result.degraded_components||[];body.innerHTML=`<div class="review-preview-shell feishu-preview"><div class="feishu-preview-head ${template==='green'?'green':template==='red'?'red':''}"><div class="review-preview-title">${esc((header.title||{}).content||'飞书审核卡片')}</div><div class="feishu-preview-sub">${esc((header.subtitle||{}).content||'卡片 2.0')}</div></div><div class="feishu-preview-body">${elements.map(item=>item.tag==='button'?`<span class="btn ${item.type==='primary'?'primary':''} feishu-preview-button">${esc((item.text||{}).content||'打开')}</span>`:`<div class="feishu-preview-element">${esc(item.content||'')}</div>`).join('')}${degraded.length?`<div class="feishu-preview-degraded"><b>飞书降级说明</b>${degraded.map(item=>`<div>${esc(item.type||'组件')} · ${esc(item.reason||'已降级')}</div>`).join('')}</div>`:''}</div></div>`}
async function reviewTemplateDirectPreview(btn,mode='business'){const mask=$('#reviewTemplatePreviewMask'),body=$('#reviewTemplatePreviewBody'),feishu=mode==='feishu';mask.classList.add('on');$('#reviewTemplatePreviewTitle').textContent=feishu?'飞书消息卡片预览':'业务审核效果预览';body.innerHTML=`<div class="empty">正在校验并生成${feishu?'飞书卡片':'业务'}预览…</div>`;const old=btn.textContent;btn.disabled=true;btn.textContent='预览中…';try{const editors=reviewTemplateReadEditors(),path=feishu?'/v1/review-templates/preview/feishu':'/v1/review-templates/preview',r=await apiRaw(path,{method:'POST',body:JSON.stringify({layout:editors.layout,data:editors.sample_data})});if(!r.ok||r.body.ok===false)throw new Error((r.body.message||'预览失败')+((r.body.details||[]).length?'：'+r.body.details.join('；'):''));REVIEW_TEMPLATE_GOV.preview=r.body;if(feishu)renderReviewTemplateFeishuPreview(r.body);else renderReviewTemplateDirectPreview(editors.layout,editors.sample_data,r.body)}catch(e){body.innerHTML=`<div class="empty"><div><b>无法生成预览</b><div class="hint" style="margin-top:6px">${esc(e.message)}</div></div></div>`;toast(e.message)}finally{btn.disabled=false;btn.textContent=old}}
function closeReviewTemplateDirectPreview(){$('#reviewTemplatePreviewMask').classList.remove('on')}
function reviewTemplatePreviewBackdrop(event){if(event.target===event.currentTarget)closeReviewTemplateDirectPreview()}
function reviewTemplateScopeRefHtml(type,value,prefix='reviewTemplate'){if(type==='platform')return '<div class="hint">平台共享模板对所有 Agent 可见。</div>';if(type==='project')return `<select class="inp" id="${prefix}ScopeRef"><option value="">请选择项目</option>${PROJECTS.map(item=>`<option value="${attr(item.code)}"${item.code===value?' selected':''}>${esc(item.name||item.code)} · ${esc(item.code)}</option>`).join('')}</select>`;if(type==='agent')return `<select class="inp" id="${prefix}ScopeRef"><option value="">请选择 Agent</option>${AGENTS.map(item=>`<option value="${attr(item.code)}"${item.code===value?' selected':''}>${esc(item.name||item.code)} · ${esc(item.code)}</option>`).join('')}</select>`;return `<input class="inp" id="${prefix}ScopeRef" value="${attr(value||'')}" placeholder="填写责任部门编码，与 Agent owner_dept 一致">`}
function reviewTemplateScopeChanged(prefix='reviewTemplate'){const type=$('#'+prefix+'ScopeType').value,box=$('#'+prefix+'ScopeRefBox');if(box)box.innerHTML=reviewTemplateScopeRefHtml(type,'',prefix)}
function reviewTemplateScopeValue(prefix='reviewTemplate'){const type=$('#'+prefix+'ScopeType').value,ref=$('#'+prefix+'ScopeRef');return{scope_type:type,scope_ref:type==='platform'?'':(ref?ref.value.trim():'')}}
async function loadReviewTemplateGovernance(){const code=REVIEW_TEMPLATE_GOV.code;if(!code)return;const requests=[apiRaw('/v1/review-templates/'+encodeURIComponent(code)+'/dependents'),apiRaw('/v1/review-templates/'+encodeURIComponent(code)+'/impact?action=stable'),reviewTemplateCan('audit')?apiRaw('/v1/review-templates/'+encodeURIComponent(code)+'/audit'):Promise.resolve({ok:false,body:{}})];const [deps,impact,audit]=await Promise.all(requests);if(REVIEW_TEMPLATE_GOV.code!==code)return;REVIEW_TEMPLATE_GOV.dependents=deps.ok?(deps.body.items||[]):[];REVIEW_TEMPLATE_GOV.impact=impact.ok?impact.body:null;REVIEW_TEMPLATE_GOV.audit=audit.ok?(audit.body.items||[]):[];renderReviewTemplateDetail()}
function reviewTemplateGovernanceHtml(d){const deps=REVIEW_TEMPLATE_GOV.dependents||[],impact=REVIEW_TEMPLATE_GOV.impact||{},audit=REVIEW_TEMPLATE_GOV.audit||[],blocking=Number(impact.blocking_count||0),refs=deps.length?deps.map(item=>{const agents=(item.agents||[]).map(agent=>`${agent.agent_code}@${agent.agent_version}`).join('、')||'未绑定 Agent';return `<div class="review-template-ref"><span class="mono">${esc(item.graph_id)}@${esc(item.graph_version)}</span><span>${esc(agents)}</span><span class="mono">${esc(item.node_id)} · ${esc(item.version_ref)}</span><span class="badge ${item.blocking?'fail':'ok'}">${item.blocking?'阻断':'历史'}</span></div>`}).join(''):'<div class="review-template-empty">暂无编排引用</div>',audits=audit.length?audit.map(item=>`<div class="review-template-audit"><span class="mono">${esc(fmtTs(item.created_at))}</span><span>${esc(item.action)}</span><span>${esc(item.operator||'system')}</span><span title="${attr(JSON.stringify(item.detail||{}))}">${esc(item.note||'—')}</span></div>`).join(''):`<div class="review-template-empty">${reviewTemplateCan('audit')?'暂无审计记录':'当前角色没有 review_template.audit 权限'}</div>`;return `<div class="card"><div class="card-h"><div><div class="card-t">引用、影响与审计</div><div class="card-s">发布前识别受影响编排；所有生命周期变更保留操作记录</div></div></div><div class="card-b"><div class="review-template-governance"><div class="review-template-governance-card"><div class="review-template-governance-title">全部引用</div><div class="review-template-metric">${deps.length}<small> 条</small></div></div><div class="review-template-governance-card"><div class="review-template-governance-title">运行中引用</div><div class="review-template-metric">${blocking}<small> 条</small></div></div><div class="review-template-governance-card"><div class="review-template-governance-title">当前范围</div><div style="font-weight:650">${esc(reviewTemplateScopeLabel(d))}</div><div class="hint" style="margin-top:5px">Graph 保存时校验 Agent 是否在范围内</div></div><div class="review-template-governance-card wide"><div class="review-template-governance-title">反向引用 <span class="hint">stable 切换会要求二次确认</span></div>${refs}</div><div class="review-template-governance-card wide"><div class="review-template-governance-title">审计时间线</div>${audits}</div></div></div></div>`}
function renderReviewTemplateDetail(){const el=$('#reviewTemplateDetail');if(!el)return;const d=REVIEW_TEMPLATE_GOV.detail;if(!d){el.innerHTML='<div class="card"><div class="empty">选择模板查看版本，或创建一份业务审核模板</div></div>';return}const version=reviewTemplateVersion(),layout=version&&version.layout||HELLO_REVIEW_LAYOUT,sample=version&&version.sample_data||HELLO_REVIEW_SAMPLE,archived=d.status==='archived',scopeOptions=[['platform','平台共享'],['project','项目'],['agent','Agent 独享'],['team','团队/部门']].map(([value,label])=>`<option value="${value}"${(d.scope_type||'platform')===value?' selected':''}>${label}（${value}）</option>`).join(''),versionStatus={draft:'草稿',published:'已发布',deprecated:'已弃用'},versionActions=version&&!archived?(version.status==='draft'?`<button class="btn danger" onclick="reviewTemplateDeleteDraft('${attr(version.version)}',this)">删除草稿</button><button class="btn primary" onclick="reviewTemplatePublish('${attr(version.version)}',this)">发布 ${esc(version.version)} 并设为 stable</button>`:version.status==='published'?`${(d.aliases||{}).stable!==version.version?`<button class="btn primary" onclick="reviewTemplateSetStable('${attr(version.version)}',this)">设为 stable</button>`:''}<button class="btn" onclick="reviewTemplateDeprecate('${attr(version.version)}',this)">弃用版本</button>`:''):'';el.innerHTML=`<div class="card"><div class="card-h"><div><div class="card-t">${esc(d.name)}</div><div class="card-s mono">${esc(d.code)} · revision ${esc(d.revision||1)}</div></div><div style="display:flex;gap:7px">${archived?'':`<button class="btn" onclick="reviewTemplateSaveMeta(this)">保存资料</button>`}</div></div><div class="card-b"><div class="frm"><div class="fld"><label>模板名称（name）</label><input class="inp" id="reviewTemplateName" value="${attr(d.name)}"${archived?' disabled':''}></div><div class="fld"><label>状态（status）</label><select class="inp" id="reviewTemplateStatus"${archived?' disabled':''}><option value="active"${d.status==='active'?' selected':''}>active · 启用</option><option value="disabled"${d.status==='disabled'?' selected':''}>disabled · 停用</option>${archived?'<option value="archived" selected>archived · 已归档</option>':''}</select></div><div class="fld"><label>共享范围（scope_type）</label><select class="inp" id="reviewTemplateScopeType" onchange="reviewTemplateScopeChanged()"${archived?' disabled':''}>${scopeOptions}</select></div><div class="fld"><label>范围对象（scope_ref）</label><div id="reviewTemplateScopeRefBox">${reviewTemplateScopeRefHtml(d.scope_type||'platform',d.scope_ref||'')}</div></div><div class="fld wide"><label>说明（description）</label><input class="inp" id="reviewTemplateDescription" value="${attr(d.description||'')}"${archived?' disabled':''}></div></div></div></div><div class="card"><div class="card-h"><div><div class="card-t">生命周期</div><div class="card-s">启用 → 停用 → 归档；已发布版本只能弃用，不能物理删除</div></div></div><div class="card-b"><div class="review-template-lifecycle">${d.status==='disabled'?'<button class="btn danger" onclick="reviewTemplateArchive(this)">归档模板</button>':''}${d.status==='archived'?'<button class="btn danger" onclick="reviewTemplatePurge(this)">永久删除模板</button>':''}<span class="hint">归档和删除前会检查所有 Graph 反向引用</span></div></div></div><div class="card"><div class="card-h"><div><div class="card-t">版本与发布</div><div class="card-s">版本内容不可覆盖；修改后保存会创建下一版本</div></div></div><div class="card-b"><div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px">${(d.versions||[]).map(item=>`<button class="btn sm ${item.version===REVIEW_TEMPLATE_GOV.version?'primary':''}" onclick="reviewTemplatePickVersion('${attr(item.version)}')">${esc(item.version)} · ${esc(versionStatus[item.status]||item.status)}${(d.aliases||{}).stable===item.version?' · stable':''}${(d.aliases||{}).latest===item.version?' · latest':''}</button>`).join('')||'<span class="hint">尚无版本，编辑后创建 v1</span>'}</div>${reviewTemplateEditor(layout,sample)}${archived?'':`<div class="act" style="margin-top:10px"><input class="inp" id="reviewTemplateNotes" placeholder="本次版本说明" style="flex:1"><button class="btn" onclick="reviewTemplateValidate(this)">校验</button><button class="btn" onclick="reviewTemplateCreateVersion(this)">保存为新版本</button>${versionActions}</div>`}</div></div>${reviewTemplateGovernanceHtml(d)}`;reviewTemplateSetDirty(false);enhanceJsonEditors(el);initReviewTemplateDesigner();syncReviewTemplateActionUi()}
function reviewTemplatePickVersion(version){if(version!==REVIEW_TEMPLATE_GOV.version&&!reviewTemplateCanDiscard())return;REVIEW_TEMPLATE_GOV.version=version;REVIEW_TEMPLATE_GOV.preview=null;REVIEW_TEMPLATE_GOV.dirty=false;renderReviewTemplateDetail()}
function reviewTemplateNew(){if(!reviewTemplateCanDiscard())return;REVIEW_TEMPLATE_GOV.code=null;REVIEW_TEMPLATE_GOV.detail=null;REVIEW_TEMPLATE_GOV.preview=null;REVIEW_TEMPLATE_GOV.dirty=false;renderReviewTemplateList();const scopeOptions=[['platform','平台共享'],['project','项目'],['agent','Agent 独享'],['team','团队/部门']].map(([value,label])=>`<option value="${value}">${label}（${value}）</option>`).join('');$('#reviewTemplateDetail').innerHTML=`<div class="card"><div class="card-h"><div class="card-t">新建人工审核模板</div><div class="card-s">先定义可见范围并生成可编辑草稿，创建 v1 后仍需人工发布</div></div><div class="card-b"><div class="frm"><div class="fld"><label>模板编码（code） <b>*</b></label><input class="inp mono" id="reviewTemplateNewCode" value="helloworld-review"></div><div class="fld"><label>模板名称（name） <b>*</b></label><input class="inp" id="reviewTemplateNewName" value="HelloWorld 业务审核"></div><div class="fld"><label>共享范围（scope_type）</label><select class="inp" id="reviewTemplateNewScopeType" onchange="reviewTemplateScopeChanged('reviewTemplateNew')">${scopeOptions}</select></div><div class="fld"><label>范围对象（scope_ref）</label><div id="reviewTemplateNewScopeRefBox">${reviewTemplateScopeRefHtml('platform','','reviewTemplateNew')}</div></div><div class="fld wide"><label>说明（description）</label><input class="inp" id="reviewTemplateNewDescription" value="以业务字段、欢迎语和知识证据组织审核内容"></div><div class="fld wide">${reviewTemplateEditor(HELLO_REVIEW_LAYOUT,HELLO_REVIEW_SAMPLE)}</div><div class="fld wide"><div class="act"><button class="btn" onclick="loadReviewTemplatePage()">取消</button><button class="btn" onclick="reviewTemplateValidate(this)">校验</button><button class="btn primary" onclick="reviewTemplateCreate(this)">创建模板与 v1 草稿</button></div></div></div></div></div>`;enhanceJsonEditors($('#reviewTemplateDetail'));initReviewTemplateDesigner()}
function reviewTemplateReadEditors(){let layout,sample;try{layout=JSON.parse($('#reviewTemplateLayout').value)}catch(e){throw new Error('模板布局不是合法 JSON：'+e.message)}try{sample=JSON.parse($('#reviewTemplateSample').value)}catch(e){throw new Error('预览数据不是合法 JSON：'+e.message)}return{layout,sample_data:sample,notes:($('#reviewTemplateNotes')||{}).value||''}}
async function reviewTemplateCreate(btn){btn.disabled=true;try{const code=$('#reviewTemplateNewCode').value.trim(),scope=reviewTemplateScopeValue('reviewTemplateNew'),created=await apiRaw('/v1/review-templates',{method:'POST',body:JSON.stringify({code,name:$('#reviewTemplateNewName').value.trim(),description:$('#reviewTemplateNewDescription').value.trim(),tags:['business-review'],...scope})});if(!created.ok)throw new Error(created.body.message||'模板创建失败');const body=reviewTemplateReadEditors(),version=await apiRaw('/v1/review-templates/'+encodeURIComponent(code)+'/versions',{method:'POST',body:JSON.stringify(body)});if(!version.ok)throw new Error(version.body.message+((version.body.details||[]).length?'：'+version.body.details.join('；'):''));REVIEW_TEMPLATE_GOV.code=code;REVIEW_TEMPLATE_GOV.dirty=false;toast('模板与 v1 草稿已创建');await loadReviewTemplatePage(code)}catch(e){toast(e.message);btn.disabled=false}}
async function reviewTemplateSaveMeta(btn){const d=REVIEW_TEMPLATE_GOV.detail;if(!d)return;btn.disabled=true;try{const scope=reviewTemplateScopeValue(),r=await apiRaw('/v1/review-templates/'+encodeURIComponent(d.code),{method:'PUT',body:JSON.stringify({name:$('#reviewTemplateName').value.trim(),description:$('#reviewTemplateDescription').value.trim(),status:$('#reviewTemplateStatus').value,tags:d.tags||[],expected_revision:d.revision,...scope})});if(!r.ok)throw new Error(r.body.message||'保存失败');toast('模板资料已保存，当前布局改动已保留');await loadReviewTemplatePage(d.code)}catch(e){toast(e.message)}finally{if(btn.isConnected)btn.disabled=false}}
async function reviewTemplateCreateVersion(btn){const d=REVIEW_TEMPLATE_GOV.detail;if(!d)return;btn.disabled=true;try{const body=reviewTemplateReadEditors(),r=await apiRaw('/v1/review-templates/'+encodeURIComponent(d.code)+'/versions',{method:'POST',body:JSON.stringify(body)});if(!r.ok)throw new Error(r.body.message+((r.body.details||[]).length?'：'+r.body.details.join('；'):''));REVIEW_TEMPLATE_GOV.version=r.body.version;reviewTemplateSetDirty(false);toast(`已保存为 ${r.body.version} 草稿`);await loadReviewTemplatePage(d.code);reviewTemplateSetDirty(false)}catch(e){toast(e.message);btn.disabled=false}}
async function reviewTemplatePublish(version,btn){const d=REVIEW_TEMPLATE_GOV.detail;if(reviewTemplateHasUnsavedChanges())return toast(`当前编辑内容与 ${version} 草稿不一致，请先点击“保存为新版本”`);const count=(REVIEW_TEMPLATE_GOV.impact||{}).blocking_count||0;if(!d||!confirm(`发布 ${d.code}@${version} 并把 stable 指向该版本？${count?`将影响 ${count} 条运行中引用。`:''}等待中的旧任务仍使用原模板快照。`))return;btn.disabled=true;const r=await apiRaw('/v1/review-templates/'+encodeURIComponent(d.code)+'/versions/'+encodeURIComponent(version)+'/publish',{method:'POST',body:JSON.stringify({set_stable:true,expected_stable:(d.aliases||{}).stable||'',confirm_impact:true})});if(!r.ok){btn.disabled=false;return toast(r.body.message||'发布失败')}toast(`${version} 已发布并成为 stable`);await loadReviewTemplatePage(d.code)}
async function reviewTemplateSetStable(version,btn){const d=REVIEW_TEMPLATE_GOV.detail;if(reviewTemplateHasUnsavedChanges())return toast(`当前编辑内容与 ${version} 不一致，请先点击“保存为新版本”或切回原内容`);const count=(REVIEW_TEMPLATE_GOV.impact||{}).blocking_count||0;if(!d||!confirm(`把 ${d.code} 的 stable 切换到 ${version}？${count?`将影响 ${count} 条运行中引用。`:''}新任务会使用该版本，等待中和历史任务不变。`))return;btn.disabled=true;const r=await apiRaw('/v1/review-templates/'+encodeURIComponent(d.code)+'/aliases/stable',{method:'PUT',body:JSON.stringify({version,expected_version:(d.aliases||{}).stable||'',confirm_impact:true})});if(!r.ok){btn.disabled=false;return toast(r.body.message||'stable 切换失败')}toast(`stable 已切换到 ${version}`);await loadReviewTemplatePage(d.code)}
async function reviewTemplateDeleteDraft(version,btn){const d=REVIEW_TEMPLATE_GOV.detail;if(!d||!confirm(`删除未发布草稿 ${d.code}@${version}？此操作不可恢复。`))return;btn.disabled=true;const r=await apiRaw('/v1/review-templates/'+encodeURIComponent(d.code)+'/versions/'+encodeURIComponent(version),{method:'DELETE'});if(!r.ok){btn.disabled=false;return toast(r.body.message||'删除草稿失败')}toast(`${version} 草稿已删除`);REVIEW_TEMPLATE_GOV.version=null;await loadReviewTemplatePage(d.code)}
async function reviewTemplateDeprecate(version,btn){const d=REVIEW_TEMPLATE_GOV.detail;if(!d||!confirm(`弃用 ${d.code}@${version}？被 stable/latest 或运行中编排引用时后端会拒绝。`))return;btn.disabled=true;const r=await apiRaw('/v1/review-templates/'+encodeURIComponent(d.code)+'/versions/'+encodeURIComponent(version)+'/deprecate',{method:'POST',body:JSON.stringify({note:'治理页弃用'})});if(!r.ok){btn.disabled=false;return toast(r.body.message||'弃用失败')}toast(`${version} 已弃用`);await loadReviewTemplatePage(d.code)}
async function reviewTemplateArchive(btn){const d=REVIEW_TEMPLATE_GOV.detail;if(!d||!confirm(`归档模板 ${d.code}？归档后不能创建或发布新版本。`))return;btn.disabled=true;const r=await apiRaw('/v1/review-templates/'+encodeURIComponent(d.code)+'/archive',{method:'POST',body:JSON.stringify({expected_revision:d.revision,note:'治理页归档'})});if(!r.ok){btn.disabled=false;return toast(r.body.message||'归档失败')}toast('模板已归档');await loadReviewTemplatePage(d.code)}
async function reviewTemplatePurge(btn){const d=REVIEW_TEMPLATE_GOV.detail;if(!d)return;const confirmation=prompt(`永久删除会移除模板及全部版本。请输入模板 code 确认：\n${d.code}`,'');if(confirmation===null)return;btn.disabled=true;const r=await apiRaw('/v1/review-templates/'+encodeURIComponent(d.code),{method:'DELETE',body:JSON.stringify({confirmation})});if(!r.ok){btn.disabled=false;return toast(r.body.message||'永久删除失败')}toast('审核模板已永久删除');REVIEW_TEMPLATE_GOV.code=null;REVIEW_TEMPLATE_GOV.detail=null;await loadReviewTemplatePage()}
async function reviewTemplateValidate(btn){const old=btn.textContent;btn.disabled=true;btn.textContent='校验中…';try{const body=reviewTemplateReadEditors(),r=await apiRaw('/v1/review-templates/preview',{method:'POST',body:JSON.stringify({layout:body.layout,data:body.sample_data})});if(!r.ok)throw new Error(r.body.message+((r.body.details||[]).length?'：'+r.body.details.join('；'):''));const missing=r.body.missing_paths||[];if(missing.length)toast(`模板结构校验通过，${missing.length} 个路径未命中：${missing.join('、')}`);else toast('模板校验通过')}catch(e){toast(e.message)}finally{btn.disabled=false;btn.textContent=old}}

/* ============ Prompt 模板治理 ============
   运行期真相在 /v1/prompts。这里改正文 → 生成新 rev；已发布版本钉住旧的 rev，
   想生效要重新发版本。所以页面必须同时回答两个问题：
   「这句改成什么样」和「改完谁会变、谁不会变」。 */
const PM = { items: [], cur: null };

function pmVarsUsed(...txts){
  const out = new Set();
  for(const t of txts){
    for(const m of String(t||'').matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g)) out.add(m[1]);
  }
  return [...out].sort();
}
const pmPath = it => `/v1/prompts/${it.agent_code || '_global'}/${it.node}/${it.name}`;

async function loadPromptPage(){
  if(MODE !== 'live'){
    $('#pmCount').textContent = '离线';
    $('#pmList').innerHTML = '<div class="empty">离线模式：没有后端模板可读</div>';
    return;
  }
  const r = await apiRaw('/v1/prompts?status=active');
  if(!r.ok){
    $('#pmCount').textContent = '—';
    $('#pmList').innerHTML = `<div class="empty">取不到模板：${esc((r.body && r.body.message) || ('http ' + r.status))}</div>`;
    return;
  }
  PM.items = r.body.items || [];
  renderPromptList();
  if(PM.cur){
    const again = PM.items.find(x => x.agent_code===PM.cur.agent_code
      && x.node===PM.cur.node && x.name===PM.cur.name);
    if(again){ PM.cur = again; renderPromptEditor(); loadPromptHistory(); }
  }
}

function renderPromptList(){
  $('#pmCount').textContent = PM.items.length + ' 份';
  if(!PM.items.length){ $('#pmList').innerHTML = '<div class="empty">库里还没有模板</div>'; return; }
  const groups = {};
  PM.items.forEach(it => { const k = it.agent_code || '_global'; (groups[k] = groups[k] || []).push(it); });
  const keys = Object.keys(groups).sort((a,b) =>
    a==='_global' ? -1 : b==='_global' ? 1 : a.localeCompare(b));
  $('#pmList').innerHTML = keys.map(k => `
    <div style="padding:9px 14px 2px;font-size:10.5px;color:#8a9099;letter-spacing:.05em">
      ${k==='_global' ? '全局默认（其余 Agent 回落这一份）' : esc(k)}</div>
    ${groups[k].map(it => {
      const on = PM.cur && PM.cur.agent_code===it.agent_code && PM.cur.node===it.node && PM.cur.name===it.name;
      return `<div class="pm-item${on?' on':''}" onclick="pmSelectById('${esc(it.agent_code)}','${esc(it.node)}','${esc(it.name)}')">
        <div class="pm-n">${esc(it.node)}<span class="pm-tag">${esc(it.name)}</span></div>
        <div class="pm-m">rev ${it.rev} · ${it.vars.length} 变量 · ${esc(it.digest.slice(0,8))}</div>
      </div>`;
    }).join('')}
  `).join('');
}

function pmSelectById(code, node, name){
  const it = PM.items.find(x => x.agent_code===code && x.node===node && x.name===name);
  if(it) pmSelect(it);
}

function pmSelect(it){
  PM.cur = it;
  renderPromptList();
  renderPromptEditor();
  loadPromptHistory();
  loadPromptUsage();
}

function renderPromptEditor(){
  const it = PM.cur; if(!it) return;
  const declared = it.vars || [];
  $('#pmDetail').innerHTML = `
  <div class="card">
    <div class="card-h">
      <div class="card-t">${esc(it.node)} · ${esc(it.name)}
        <span class="pm-tag">${it.agent_code ? esc(it.agent_code) : '全局'}</span></div>
      <div class="card-s" id="pmRev">rev ${it.rev} · ${esc(it.digest.slice(0,8))}</div>
    </div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:12px">
      <div>
        <div class="pm-lbl">系统提示词（system）</div>
        <textarea class="pm-tpl" id="pmSys" rows="5" oninput="pmOnEdit()">${esc(it.system)}</textarea>
      </div>
      <div>
        <div class="pm-lbl">用户模板（user） <span style="color:#9aa1aa">· 变量写作 {{name}}</span></div>
        <textarea class="pm-tpl" id="pmUsr" rows="5" oninput="pmOnEdit()">${esc(it.user)}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <div class="pm-lbl">模板变量（vars，逗号分隔，必须覆盖正文里出现的每个变量）</div>
          <input class="inp" id="pmVars" value="${esc(declared.join(', '))}" oninput="pmOnEdit()" style="width:100%">
        </div>
        <div>
          <div class="pm-lbl">改动说明（notes，进归档，给人看）</div>
          <input class="inp" id="pmNotes" placeholder="为什么改这句话" style="width:100%">
        </div>
      </div>
      <div id="pmChk" style="font-size:11.5px;min-height:18px"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn primary" onclick="pmSave()">保存（生成新 rev）</button>
        <button class="btn" onclick="pmPreview()">预览渲染</button>
        <span style="margin-left:auto;font-size:11px;color:#8a9099" id="pmHint"></span>
      </div>
    </div>
  </div>
  <div id="pmPreviewBox"></div>
  <div id="pmUsage"></div>
  <div id="pmHistory"></div>`;
  pmOnEdit();
  loadPromptUsage();
}

function pmOnEdit(){
  const sys = ($('#pmSys') || {}).value || '';
  const usr = ($('#pmUsr') || {}).value || '';
  const declared = (($('#pmVars') || {}).value || '').split(',').map(s => s.trim()).filter(Boolean);
  const used = pmVarsUsed(sys, usr);
  const undeclared = used.filter(v => !declared.includes(v));
  const unused = declared.filter(v => !used.includes(v));
  const el = $('#pmChk'); if(!el) return;
  const parts = [];
  if(undeclared.length) parts.push(`<span class="pm-tag bad">用到但未声明：${esc(undeclared.join(', '))}</span>`);
  if(unused.length) parts.push(`<span class="pm-tag warn">声明了但没用：${esc(unused.join(', '))}</span>`);
  if(!undeclared.length && !unused.length) parts.push(`<span class="pm-tag ok">变量一致 · ${used.length} 个</span>`);
  parts.push(`<span style="color:#8a9099">${sys.length + usr.length} 字符</span>`);
  el.innerHTML = parts.join(' ');
  const h = $('#pmHint');
  if(h && PM.cur) h.textContent = `保存后 rev → ${PM.cur.rev + 1}` + (undeclared.length ? '（有未声明变量，保存会被拒）' : '');
}

async function pmSave(){
  const it = PM.cur; if(!it) return;
  const body = {
    system: $('#pmSys').value,
    user: $('#pmUsr').value,
    vars: ($('#pmVars').value || '').split(',').map(s => s.trim()).filter(Boolean),
    notes: ($('#pmNotes').value || '').trim(),
    expected_rev: it.rev,
  };
  const r = await apiRaw(pmPath(it), { method: 'PUT', body: JSON.stringify(body) });
  if(!r.ok){
    toast((r.body && r.body.message) || ('保存失败 http ' + r.status));
    return;
  }
  const b = r.body;
  await loadPromptPage();
  const saved = PM.items.find(x => x.agent_code===it.agent_code && x.node===it.node && x.name===it.name);
  if(saved) pmSelect(saved);
  toast(`已保存 rev ${b.rev}`);
  if(b.impact && b.impact.length){
    const box = $('#pmPreviewBox');
    if(box) box.innerHTML = `<div class="card" style="border-color:#fcd34d;background:#fffdf5">
      <div class="card-b" style="font-size:12px;line-height:1.7">
        <b>改动尚未生效。</b>共有 ${b.impact.length} 个已发布/已注册版本钉着旧正文，需要重新发版本才会用上新措辞：
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          ${b.impact.map(x => `<span class="pm-tag warn">${esc(x)}</span>`).join('')}
        </div>
      </div></div>`;
  }
}

function pmPreview(){
  const it = PM.cur; if(!it) return;
  const used = pmVarsUsed($('#pmSys').value, $('#pmUsr').value);
  $('#pmPreviewBox').innerHTML = `<div class="card">
    <div class="card-h"><div class="card-t">预览</div>
      <div class="card-s">用编辑器里的当前草稿渲染（不必先保存）</div></div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:10px">
      ${used.length ? used.map((v,i) => `<div>
        <div class="pm-lbl">${esc(v)}</div>
        <input class="inp" data-pv="${esc(v)}" placeholder="填一个示例值" style="width:100%">
      </div>`).join('') : '<div style="font-size:12px;color:#8a9099">这份模板没有变量</div>'}
      <div><button class="btn primary" onclick="pmRenderPreview()">渲染</button></div>
    </div>
    <div id="pmPrevOut"></div></div>`;
}

async function pmRenderPreview(){
  const it = PM.cur; if(!it) return;
  const values = {};
  $$('#pmPreviewBox [data-pv]').forEach(el => { values[el.dataset.pv] = el.value; });
  const r = await apiRaw(pmPath(it) + '/preview', {
    method: 'POST',
    body: JSON.stringify({ values, system: $('#pmSys').value, user: $('#pmUsr').value }),
  });
  const out = $('#pmPrevOut'); if(!out) return;
  if(!r.ok){
    out.innerHTML = `<div class="card-b"><span class="pm-tag bad">${esc((r.body && r.body.code) || 'ERR')}</span>
      <span style="font-size:12px;color:#b91c1c"> ${esc((r.body && r.body.message) || '渲染失败')}</span></div>`;
    return;
  }
  const b = r.body;
  out.innerHTML = `<div class="card-b" style="display:flex;flex-direction:column;gap:10px">
    <div><div class="pm-lbl">system <span class="pm-tag">${b.chars.system} 字符</span></div>
      <div class="pm-out">${esc(b.system) || '<span style="color:#9aa1aa">（空）</span>'}</div></div>
    <div><div class="pm-lbl">user <span class="pm-tag">${b.chars.user} 字符</span>
      <span class="pm-tag ${b.draft ? 'warn' : ''}">${b.draft ? '草稿（未保存）' : '库内正文'}</span></div>
      <div class="pm-out">${esc(b.user) || '<span style="color:#9aa1aa">（空）</span>'}</div></div>
  </div>`;
}

async function loadPromptHistory(){
  const it = PM.cur; const el = $('#pmHistory'); if(!it || !el) return;
  const r = await apiRaw(pmPath(it) + '/history');
  if(!r.ok){ el.innerHTML = ''; return; }
  const rows = r.body.items || [];
  el.innerHTML = `<div class="card">
    <div class="card-h"><div class="card-t">历史归档</div>
      <div class="card-s">${rows.length} 个旧版本 · 回滚会生成新 rev，不倒退编号</div></div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:6px">
      ${rows.length ? rows.map(x => `<div class="pm-rev">
        <span class="pm-tag">rev ${x.rev}</span>
        <span class="mono" style="font-size:10.5px;color:#9aa1aa">${esc(esc(x.digest.slice(0,8)))}</span>
        <span style="flex:1;color:#4b5563;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          title="${esc(x.notes || '')}">${esc(x.notes || '—')}</span>
        <span style="color:#9aa1aa;font-size:11px">${fmtTs(x.archived_at)}</span>
        <button class="btn" style="padding:2px 8px;font-size:11px" onclick="pmLoadRev(${x.rev})">查看</button>
        <button class="btn" style="padding:2px 8px;font-size:11px" onclick="pmRollback(${x.rev})">回滚</button>
      </div>`).join('') : '<div class="empty" style="padding:14px">还没有归档：第一次保存时会把当时的正文存进来</div>'}
    </div></div>`;
}

async function pmLoadRev(rev){
  const it = PM.cur; if(!it) return;
  const r = await apiRaw(pmPath(it) + '/rev/' + rev);
  if(!r.ok){ toast('取不到 rev ' + rev); return; }
  $('#pmSys').value = r.body.system || '';
  $('#pmUsr').value = r.body.user || '';
  $('#pmVars').value = (r.body.vars || []).join(', ');
  $('#pmNotes').value = `载入 rev ${rev} 原文${r.body.notes ? '（当时说明：' + r.body.notes + '）' : ''}`;
  pmOnEdit();
  toast(`已载入 rev ${rev}，保存会生成 rev ${it.rev + 1}`);
}

async function pmRollback(rev){
  const it = PM.cur; if(!it) return;
  if(!confirm(`把 ${it.node}/${it.name} 回滚到 rev ${rev}？会用那一版正文生成新的 rev，不影响已发布版本的钉住记录。`)) return;
  const r = await apiRaw(pmPath(it) + '/rollback', { method: 'POST', body: JSON.stringify({ rev }) });
  if(!r.ok){ toast((r.body && r.body.message) || '回滚失败'); return; }
  toast(`已回滚，当前 rev ${r.body.rev}`);
  await loadPromptPage();
  const again = PM.items.find(x => x.agent_code===it.agent_code && x.node===it.node && x.name===it.name);
  if(again) pmSelect(again);
}

async function loadPromptUsage(){
  const it = PM.cur; const el = $('#pmUsage'); if(!it || !el) return;
  if(!it.agent_code){ el.innerHTML = ''; return; }
  const r = await apiRaw('/v1/prompts/usage/' + it.agent_code);
  if(!r.ok){ el.innerHTML = ''; return; }
  const ref = it.name === 'default' ? it.node : `${it.node}::${it.name}`;
  const vers = (r.body.versions || []).filter(v => v.pinned && v.pinned[ref]);
  el.innerHTML = `<div class="card">
    <div class="card-h"><div class="card-t">生效情况</div>
      <div class="card-s">${vers.length} 个版本钉住了这个节点</div></div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:6px">
      ${vers.length ? vers.map(v => {
        const pinned = v.pinned[ref];
        const lag = (v.pending || []).some(p => p.ref === ref || (p.node === it.node && p.name === it.name));
        return `<div class="pm-rev">
          <span class="pm-tag">${esc(v.version)}</span>
          <span style="font-size:11px;color:#6b7280">${esc(v.status)}</span>
          <span class="mono" style="font-size:11px">钉 ${esc(pinned)}</span>
          <span style="flex:1"></span>
          ${lag ? '<span class="pm-tag warn">有未生效改动</span>' : '<span class="pm-tag ok">已是最新</span>'}
        </div>`;
      }).join('') : '<div class="empty" style="padding:14px">这个 Agent 还没有版本钉住该节点（新版本会在发布时自动钉住）</div>'}
    </div></div>`;
}

function promptNew(){
  const nodes = ['llm'];
  const agents = [...new Set(PM.items.map(x => x.agent_code).filter(Boolean))];
  $('#pmDetail').innerHTML = `<div class="card">
    <div class="card-h"><div class="card-t">新建模板</div>
      <div class="card-s">专属模板会覆盖同节点的全局模板；正文先复制一份现成的作起点</div></div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div><div class="pm-lbl">Agent 编码（agent_code，留空 = 全局）</div>
          <input class="inp" id="npCode" list="npCodes" placeholder="_global" style="width:100%">
          <datalist id="npCodes">${agents.map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
        <div><div class="pm-lbl">节点（node）</div>
          <input class="inp" id="npNode" list="npNodes" value="llm" style="width:100%">
          <datalist id="npNodes">${nodes.map(n => `<option value="${esc(n)}">`).join('')}</datalist></div>
        <div><div class="pm-lbl">名称（name）</div>
          <input class="inp" id="npName" value="default" style="width:100%"></div>
      </div>
      <div><button class="btn primary" onclick="pmCreate()">创建并编辑</button></div>
    </div></div>`;
}

/* ============ 对话式 Agent 搭建助手 ============ */
const BUILDER = {capabilities:null,sessions:[],current:null,loading:false,created:null};

function builderNotice(kind, lines){
  const el = $('#builderNotice'); if(!el) return;
  const values = Array.isArray(lines) ? lines : (lines ? [lines] : []);
  el.innerHTML = values.length ? `<div class="vbar ${kind}" style="margin-bottom:10px"><b>${kind==='err'?'处理失败':kind==='warn'?'需要注意':'完成'}</b><div style="flex:1">${values.map(item=>`<div>${esc(item)}</div>`).join('')}</div></div>` : '';
}

function builderStateLabel(status){
  return ({READY:'可创建草稿',NEEDS_CONFIRMATION:'需要确认',MISSING_CAPABILITY:'缺少能力',INVALID:'校验未通过'})[status] || status || '未生成';
}

function builderRenderSelectors(){
  const caps = BUILDER.capabilities || {models:[],projects:[]};
  const model = $('#builderModel'), project = $('#builderProject'), sessions = $('#builderSessionSelect');
  const useModel = $('#builderUseModel'), availableModels = caps.models || [];
  if(model){
    const current = model.value || caps.default_model || '';
    model.innerHTML = `<option value="">规则规划（无模型）</option>` + availableModels.map(item =>
      `<option value="${attr(item.code)}"${item.code===current?' selected':''}>${esc(item.name)} · ${esc(item.code)}@stable</option>`).join('');
    if(current && [...model.options].some(item=>item.value===current)) model.value=current;
  }
  if(useModel){
    useModel.disabled=!availableModels.length;
    if(!availableModels.length)useModel.checked=false;
    useModel.closest('label').title=availableModels.length?'使用所选治理模型理解需求并生成 AgentSpec':'当前没有可运行的治理模型，将使用规则规划';
  }
  if(project){
    const current = project.value || '';
    project.innerHTML = `<option value="">暂不归类</option>` + (caps.projects||[]).map(item=>
      `<option value="${attr(item.code)}"${item.code===current?' selected':''}>${esc(item.name)} · ${esc(item.code)}</option>`).join('');
  }
  if(sessions){
    const current = (BUILDER.current||{}).session_id || sessions.value || '';
    sessions.innerHTML = `<option value="">选择搭建会话</option>` + BUILDER.sessions.map(item=>
      `<option value="${attr(item.session_id)}"${item.session_id===current?' selected':''}>${esc(item.title)} · ${esc(item.status)}</option>`).join('');
  }
}

function builderRenderSessions(){
  const el=$('#builderSessionList'); if(!el)return;
  if(!BUILDER.sessions.length){el.innerHTML='<div class="empty">暂无搭建会话</div>';return;}
  const selected=(BUILDER.current||{}).session_id;
  el.innerHTML=BUILDER.sessions.map(item=>`<div class="builder-session ${item.session_id===selected?'on':''}" onclick="builderSelectSession('${attr(item.session_id)}')">
    <div><div class="builder-session-title">${esc(item.title)}</div><div class="builder-session-meta">${esc(item.status)} · ${new Date((item.updated_at||0)*1000).toLocaleString()}</div></div>
    <button class="builder-session-delete" title="删除搭建会话" aria-label="删除搭建会话" onclick="builderDeleteSession(event,'${attr(item.session_id)}')">×</button></div>`).join('');
}

async function builderDeleteSession(event,id){
  if(event){event.preventDefault();event.stopPropagation();}
  const item=BUILDER.sessions.find(value=>value.session_id===id);
  if(!item)return;
  const created=item.created_agent_code?`\n\n已创建的 Agent ${item.created_agent_code} 会保留，不会随对话删除。`:'';
  if(!confirm(`确定删除搭建会话“${item.title||id}”吗？\n\n消息和历史提案将被物理删除，无法恢复。${created}`))return;
  const button=event&&event.currentTarget;if(button){button.disabled=true;button.textContent='…';}
  const r=await apiRaw('/v1/agent-builder/sessions/'+encodeURIComponent(id),{method:'DELETE'});
  if(!r.ok){if(button){button.disabled=false;button.textContent='×';}return builderNotice('err',r.body.message||'删除搭建会话失败');}
  BUILDER.sessions=BUILDER.sessions.filter(value=>value.session_id!==id);
  if((BUILDER.current||{}).session_id===id){BUILDER.current=null;BUILDER.created=null;}
  builderRender();
  const kept=r.body.preserved_agent_code?`；已创建的 Agent ${r.body.preserved_agent_code} 保持不变`:'';
  builderNotice('ok',`搭建会话已删除${kept}`);
}

function builderRenderMessages(){
  const el=$('#builderChat'); if(!el)return;
  const messages=(BUILDER.current||{}).messages||[];
  if(!messages.length){el.innerHTML='<div class="builder-empty"><b>描述一个可执行的目标</b>例如：输入用户名，让大模型生成中文欢迎语；失败时返回固定欢迎语。</div>';return;}
  el.innerHTML=messages.map(item=>`<div class="builder-message ${attr(item.role)}">${esc(item.content)}<div class="builder-message-meta">${item.metadata&&item.metadata.planning_mode?esc(item.metadata.planning_mode)+' · ':''}${new Date((item.created_at||0)*1000).toLocaleTimeString()}</div></div>`).join('');
  el.scrollTop=el.scrollHeight;
}

function builderRenderProposal(){
  const proposal=(BUILDER.current||{}).proposal, el=$('#builderProposal');
  const validateBtn=$('#builderValidateBtn'), createBtn=$('#builderCreateBtn'), note=$('#builderDraftNote');
  if(!el)return;
  if(!proposal){
    el.innerHTML='<div class="builder-empty"><b>等待生成 AgentSpec</b>这里会展示编排节点、待确认项、真实依赖和 Graph 校验结果。</div>';
    if(validateBtn)validateBtn.disabled=true;if(createBtn)createBtn.disabled=true;
    $('#builderProposalSub').textContent='尚未生成'; return;
  }
  const spec=proposal.spec||{}, validation=proposal.validation||{}, dsl=proposal.dsl||{}, agent=spec.agent||{};
  const maturity=Object.fromEntries(((BUILDER.capabilities||{}).nodes||[]).map(item=>[item.type,item.maturity]));
  const nodes=dsl.nodes||[];
  const list=(title,items,cls)=>items&&items.length?`<div class="sub-t" style="margin-top:10px">${title}</div><ul class="builder-list ${cls||''}">${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'';
  el.innerHTML=`<div class="builder-state ${attr(validation.status)}"><span class="badge ${validation.status==='READY'?'ok':validation.status==='NEEDS_CONFIRMATION'?'wait':'fail'}">${esc(builderStateLabel(validation.status))}</span><div><div style="font-size:11.5px;font-weight:600">第 ${proposal.revision} 版 · ${esc(proposal.planning_mode||'rules')} 规划</div><div class="builder-panel-sub">${nodes.length} 个节点 · ${(dsl.edges||[]).length} 条连线</div></div></div>
    <div class="builder-spec-meta"><div class="builder-spec-item"><div class="builder-spec-label">Agent</div><div class="builder-spec-value">${esc(agent.name||'—')}</div><div class="builder-panel-sub mono">${esc(agent.code||'—')}</div></div><div class="builder-spec-item"><div class="builder-spec-label">Graph</div><div class="builder-spec-value mono">${esc(dsl.id||'—')}</div><div class="builder-panel-sub">只创建 draft</div></div></div>
    <div class="sub-t">编排预览</div><div class="builder-flow">${nodes.map((node,index)=>`${index?'<span class="builder-arrow">→</span>':''}<div class="builder-node ${maturity[node.type]==='review_required'?'review':''}" title="${attr((node.config&&JSON.stringify(node.config))||'')}"><div class="builder-node-id">${esc(node.id)}</div><div class="builder-node-type">${esc(node.type)}</div></div>`).join('')}</div>
    ${list('待确认问题',validation.questions||[],'question')}${list('校验错误',validation.errors||[],'err')}${list('风险与提示',validation.warnings||[],'warn')}${list('生成假设',spec.assumptions||[],'')}
    <div class="sub-t" style="margin-top:10px">输入契约</div><pre class="builder-code">${esc(JSON.stringify(spec.input_schema||{},null,2))}</pre>
    <div class="sub-t" style="margin-top:10px">输出契约</div><pre class="builder-code">${esc(JSON.stringify(spec.output_schema||{},null,2))}</pre>
    <details style="margin-top:10px"><summary class="sub-t" style="cursor:pointer">查看 Graph DSL</summary><pre class="builder-code" style="margin-top:7px">${esc(JSON.stringify(dsl,null,2))}</pre></details>`;
  const created=(BUILDER.current||{}).status==='created'&&(BUILDER.current||{}).created_agent_code;
  if(validateBtn)validateBtn.disabled=false;
  if(createBtn){createBtn.disabled=!created&&validation.status!=='READY';createBtn.textContent=created?'进入画布调整':'创建 Agent 草稿';}
  if(note)note.textContent=created?`已创建 ${BUILDER.current.created_agent_code}，尚未发布`:validation.status==='READY'?'校验通过后只创建 draft/testing':'处理待确认项或错误后才能创建';
  $('#builderProposalSub').textContent=`revision ${proposal.revision} · ${builderStateLabel(validation.status)}`;
}

function builderRender(){
  builderRenderSelectors();builderRenderSessions();builderRenderMessages();builderRenderProposal();
  const caps=BUILDER.capabilities||{};
  const verified=((caps.policy||{}).verified_node_types||[]).length, review=((caps.policy||{}).review_required_node_types||[]).length;
  $('#builderCapabilitySummary').innerHTML=`<b>${(caps.nodes||[]).length} 类节点</b> · ${verified} 类已验证生成 · ${review} 类需人工复核<br>${(caps.skills||[]).length} 个 Skill · ${(caps.models||[]).length} 个模型 · ${(caps.knowledge_bases||[]).length} 个知识库`;
  $('#builderChatSub').textContent=BUILDER.current?`${BUILDER.current.title} · ${BUILDER.current.status}`:'先描述希望 Agent 完成什么';
}

async function loadBuilderPage(force){
  if(MODE!=='live'){builderNotice('warn','后端未连接，搭建助手需要真实能力目录和草稿存储');return;}
  if(BUILDER.loading)return;BUILDER.loading=true;
  try{
    const [caps,sessions]=await Promise.all([apiRaw('/v1/agent-builder/capabilities'),apiRaw('/v1/agent-builder/sessions')]);
    if(!caps.ok)throw new Error(caps.body.message||'能力目录读取失败');
    if(!sessions.ok)throw new Error(sessions.body.message||'会话列表读取失败');
    BUILDER.capabilities=caps.body;BUILDER.sessions=sessions.body.items||[];
    const currentId=(BUILDER.current||{}).session_id;
    if(currentId&&BUILDER.sessions.some(item=>item.session_id===currentId)){
      const detail=await apiRaw('/v1/agent-builder/sessions/'+encodeURIComponent(currentId));
      if(detail.ok)BUILDER.current=detail.body;
    }
    builderNotice('',[]);builderRender();
  }catch(e){builderNotice('err',e.message);}finally{BUILDER.loading=false;}
}

async function builderNewSession(){
  if(MODE!=='live')return builderNotice('warn','后端未连接');
  const model=$('#builderModel').value, project=$('#builderProject').value;
  const r=await apiRaw('/v1/agent-builder/sessions',{method:'POST',body:JSON.stringify({title:'新建 Agent 对话',project_code:project,model_ref:model,model_version:'stable'})});
  if(!r.ok)return builderNotice('err',r.body.message||'会话创建失败');
  BUILDER.current=r.body.session;BUILDER.created=null;await loadBuilderPage(true);$('#builderInput').focus();
}

async function builderSelectSession(id){
  if(!id){BUILDER.current=null;builderRender();return;}
  const r=await apiRaw('/v1/agent-builder/sessions/'+encodeURIComponent(id));
  if(!r.ok)return builderNotice('err',r.body.message||'会话读取失败');
  BUILDER.current=r.body;BUILDER.created=null;
  if(r.body.model_ref&&[...$('#builderModel').options].some(item=>item.value===r.body.model_ref))$('#builderModel').value=r.body.model_ref;
  if(r.body.project_code&&[...$('#builderProject').options].some(item=>item.value===r.body.project_code))$('#builderProject').value=r.body.project_code;
  builderNotice('',[]);builderRender();
}

async function builderSend(){
  const input=$('#builderInput'), message=(input.value||'').trim();if(!message)return toast('请先描述 Agent 需求');
  if(!BUILDER.current){await builderNewSession();if(!BUILDER.current)return;}
  if(BUILDER.loading)return;BUILDER.loading=true;
  const btn=$('#builderSendBtn');btn.disabled=true;btn.classList.add('loading');btn.textContent='正在生成';builderNotice('',[]);
  try{
    const r=await apiRaw('/v1/agent-builder/sessions/'+encodeURIComponent(BUILDER.current.session_id)+'/messages',{method:'POST',body:JSON.stringify({message,project_code:$('#builderProject').value,model_ref:$('#builderModel').value,model_version:'stable',use_model:$('#builderUseModel').checked})});
    if(!r.ok)throw new Error(r.body.message||'方案生成失败');
    BUILDER.current=r.body.session;input.value='';
    const idx=BUILDER.sessions.findIndex(item=>item.session_id===BUILDER.current.session_id);
    if(idx>=0)BUILDER.sessions[idx]={...BUILDER.sessions[idx],status:BUILDER.current.status,updated_at:Date.now()/1000};
    builderRender();
    if(r.body.warnings&&r.body.warnings.length)builderNotice('warn',r.body.warnings);
  }catch(e){builderNotice('err',e.message);}finally{BUILDER.loading=false;btn.disabled=false;btn.classList.remove('loading');btn.textContent='生成方案';}
}

async function builderValidate(){
  const proposal=(BUILDER.current||{}).proposal;if(!proposal)return;
  const r=await apiRaw('/v1/agent-builder/validate',{method:'POST',body:JSON.stringify({spec:proposal.spec,graph_id:(proposal.dsl||{}).id||''})});
  if(!r.ok)return builderNotice('err',r.body.message||'校验失败');
  proposal.validation={ok:r.body.ok,status:r.body.status,errors:r.body.errors||[],warnings:r.body.warnings||[],questions:r.body.questions||[]};
  proposal.dsl=r.body.dsl||proposal.dsl;builderRenderProposal();
  builderNotice(r.body.ok?'ok':'warn',r.body.ok?'提案校验通过，可以创建草稿':(r.body.errors||[]).concat(r.body.questions||[]));
}

async function builderCreateDraft(){
  if((BUILDER.current||{}).status==='created'&&(BUILDER.current||{}).created_agent_code)return builderOpenCreated();
  const proposal=(BUILDER.current||{}).proposal;if(!proposal)return;
  const btn=$('#builderCreateBtn');btn.disabled=true;btn.classList.add('loading');btn.textContent='正在创建';
  const r=await apiRaw('/v1/agent-builder/sessions/'+encodeURIComponent(BUILDER.current.session_id)+'/create-draft',{method:'POST',body:JSON.stringify({spec:proposal.spec})});
  btn.classList.remove('loading');
  if(!r.ok){btn.disabled=false;btn.textContent='创建 Agent 草稿';const details=r.body.details;return builderNotice('err',[r.body.message||'创建失败'].concat(Array.isArray(details)?details:(details&&details.errors)||[]));}
  BUILDER.created=r.body;BUILDER.current.status='created';BUILDER.current.created_agent_code=r.body.agent_code;
  builderRenderProposal();builderNotice('ok',[`已创建 ${r.body.agent_code}@${r.body.agent_version}`,`Graph ${r.body.graph_id}@${r.body.graph_version} 为草稿，未发布`]);
  await loadAgents();
}

async function builderOpenCreated(){
  const code=(BUILDER.current||{}).created_agent_code;if(!code)return;
  await loadAgents();await switchAgent(code,{silent:true});go('canvas');toast('已打开 AI 生成的草稿，请人工检查并试运行');
}

async function pmCreate(){
  const code = (($('#npCode').value || '').trim()) || '_global';
  const node = ($('#npNode').value || '').trim();
  const name = ($('#npName').value || 'default').trim();
  if(!node){ toast('要填节点名'); return; }
  const proto = PM.items.find(x => x.node===node && !x.agent_code) || PM.items.find(x => x.node===node);
  const r = await apiRaw(`/v1/prompts/${code}/${node}/${name}`, {
    method: 'PUT',
    body: JSON.stringify({
      system: proto ? proto.system : '',
      user: proto ? proto.user : '',
      vars: proto ? proto.vars : [],
      notes: '新建',
    }),
  });
  if(!r.ok){ toast((r.body && r.body.message) || '创建失败'); return; }
  await loadPromptPage();
  pmSelectById(code === '_global' ? '' : code, node, name);
  toast(`已创建 ${node}/${name}`);
}

installConfigHelp();
installJsonTools();
const _h = location.hash.replace('#', '');
if (_h && document.getElementById('view-' + _h)) go(_h);
