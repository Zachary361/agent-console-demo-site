/* Node contracts and examples shared by the canvas and regression checks. */
(() => {
  'use strict';
  const S=globalThis.SupportTeam,V=globalThis.VocV2,C=globalThis.WorkflowCore,cp=S.copy;
  const obj=properties=>({type:'object',properties}),str=description=>({type:'string',description}),arr=(items,description)=>({type:'array',items,description});
  const team=obj({job_id:str('服务端协作任务编号，后续节点据此读取同一会话'),quality_passed:{type:'boolean',description:'最近一次答复质检是否通过'},intents:S.outputSchema.properties.intents,facts:S.outputSchema.properties.facts,state:S.outputSchema.properties.state,child_run_ids:S.outputSchema.properties.child_run_ids});
  const support=obj({job_id:str('本批客服任务编号'),conversations:arr(obj({conversation_id:str('独立会话编号'),language:str('回复语言'),reply_mode:str('答复方式'),intents:arr(SupportCore.intentSchema,'问题列表'),replies:arr(SupportCore.replySchema,'已投递消息'),state:str('业务处理状态')}),'各客户独立处理结果'),has_fast:{type:'boolean'},quality_passed:{type:'boolean'},needs_handoff:{type:'boolean'}});
  const stageNotes={
    'understanding.language':['读取客户语言偏好和原声，确定回复语言并标记暂不支持的语言。','明确 locale 优先；auto 根据本批原声识别。附件仅保留引用。','不支持的语言标记 unsupported，后续转人工。'],
    'understanding.group':['按 message_id 去重，保留客户消息顺序、原声和订单关联。','同一会话的多条消息放在 conversation.messages；不要把多个客户混在一个会话。','同 ID 不同内容由接入校验拒绝；去重不代表问题已解决。'],
    'understanding.intents':['将碎片消息归并为可追溯的问题，一条消息可以对应多个意图。','同一订单的重复问法合并；不同订单分别处理；message_ids 关联原声。','无法判断的意图保留为 unknown；业务操作或人工请求交给后续路由。'],
    'knowledge.scope':['锁定政策适用的市场、渠道和业务日期，避免直接使用最新政策。','检查 conversation.market、channel、policy_date，日期应代表此次业务适用时间。','缺少必填字段应在运行参数校验时补齐。'],
    'knowledge.retrieve':['为每个知识类意图召回政策与 FAQ 候选，保留版本及有效期。','本阶段返回候选 candidates；尚不能直接用于答复客户。','缺失、过期或冲突候选由下一步 evidence 排除。'],
    'knowledge.evidence':['检查日期与冲突，产出带来源和完整条件的核验事实。','读取 candidates；accepted/rejected 和 reason 记录取舍依据。','无适用证据或条款矛盾时返回 handoff_pending，不编造结论。'],
    'order.authorize':['先核对订单号是否属于当前客户，决定是否允许查询。','同时读取 customer_id、意图 order_ref；不要用客户端传入的事实代替核验。','缺订单号需要澄清；归属不明时不返回订单详情。'],
    'order.lookup':['只读查询已授权订单，记录每个意图的查询状态。','等待预算与重试次数在总控的并行核验节点配置。当前查询虚构订单。','暂态失败有限重试；持续超时记录 tool_error，由下一步转人工。'],
    'order.normalize':['把订单查询状态转换为统一 facts，供答案组织与质检使用。','verified 才能带订单证据；其他状态保留缺失或失败原因。','缺订单号用 needs_clarification；权限或工具异常用 handoff_pending。'],
    'writer.coverage':['逐个检查待答意图是否有对应事实，补全缺证据的处理状态。','用 intent_id 对齐 intents 与 facts，避免遗漏用户的问题。','没有证据时补人工处理状态，不补造订单或政策。'],
    'writer.draft':['按目标语言组织逐意图草稿，保留证据、条件与例外。','读取 facts，产生 result.drafts；草稿必须经过质检才能投递。','无法核实则澄清或转人工；当前采用规则模板，自由 Prompt 暂不驱动模型。'],
    'style.tone':['判断回复语言与客户是否催问，设置自然亲切或简洁直接的语气。','tone 控制风格；empathy 仅在催问订单时加一句回应。输入来自答案组织 Agent。','不假装真人、不添加亲昵称呼、不承诺已退款或已联系快递。'],
    'style.rewrite':['逐条把草稿改成自然对话，保留原声关联和润色前后对比。','只修改 text；意图、来源、claim_id、条件和回复类别保持不变。','上游草稿与事实不一致时标记 blocked_input，保留给独立质检处理。'],
    'style.preserve':['核对润色是否保留事实、例外条件和不确定性，再返回结果。','result.drafts 给质检；result.changes 展示 before / after；guard_passed 是自检结果。','自检通过不能跳过独立质检；无凭证时执行受控语言模板。'],
    'quality.claims':['逐意图对照草稿、核验事实和来源，检查语言、覆盖与条件。','检查 drafts 与 facts 的 intent_id、claim_id、source_ids 和 conditions。','来源错误、漏条件、漏问题或新增承诺都会记录失败原因。'],
    'quality.verdict':['汇总逐项检查，给出通过或需要修复的结论。','result.passed 返回总控，更新 quality_passed 后由条件分支路由。','任何检查失败则 passed=false；不跳过质检直接投递。'],
    'handoff.unresolved':['整理仍需人工处理的问题，保留已答问题状态。','仅筛选 handoff_pending；等待客户补充与待人工接管分别处理。','没有待人工问题时返回空列表，仍可正常结束。'],
    'handoff.handoff':['产出人工接管摘要、原因、未结问题和恢复入口。','总控保存交接包并创建待接管单；坐席在协作运行中接管。','生成交接包不等于已接单或已解决；恢复入口为 parallel。']
  };
  const notes={
    start:['校验 Agent 本次输入，建立流程上下文。','运行参数填写业务数据；copy_input 开启时复制 input 到 variables，关闭时 variables 从空对象开始。','必填字段、类型或格式错误时先修正参数再运行。'],
    end:['从指定路径读取最终结果，按 Agent 输出契约校验并结束。','source_path 应指向最后业务节点写入的结果对象。','路径不存在或输出不符合契约时运行失败；查看上游实际输出。'],
    branch:['读取一个布尔判断值，仅执行 true 或 false 对应的连线。','value_path 选择上游布尔字段；两条连线分别设置 true 与 false。','本节点不写业务数据；错误路径或非布尔值不能代替条件。'],
    llm:['将模板中的输入变量替换为本次运行值，生成 JSON 结果。','编辑 mock_output，例如 greeting 中引用 {{input.name}}；output_path 供结束节点读取。','当前为模板输出，未连接大模型。'],
    image_to_video:['读取图片并按时长、画幅和镜头配置生成 MP4。','运行参数处上传图片；image_path 和 prompt_path 指向相应输入字段。','未连接生成式视频模型；镜头效果由 motion 决定。'],
    ma_intake:['建立独立客服任务，校验会话、消息去重并启动等待提醒计时。','输入完整请求；首响阈值 < 进度阈值 < 查询预算。','同请求 ID 异内容拒绝；同会话有任务运行时返回冲突，不自动排入续聊。'],
    ma_plan:['按意图分配知识核验、订单核验、澄清或人工处理责任。','只读问题可自动核验；退款、改址等需要人工的操作不能由规则直接执行。','计划保存在 job_id 对应的服务端任务中，不是变量里的 plan 字段。'],
    ma_parallel:['同一会话中按需并行执行知识与订单 Agent，允许已核实问题先答。','配置两个 Agent、查询尝试次数和重试退避；最大尝试次数包含第一次。','部分失败保留成功结果；此处是单会话内部并行，不是跨客户优先级调度。'],
    ma_reconcile:['汇合各子任务事实，保留成功结果，补齐未结意图状态。','下游统一读取 facts，不必分别判断知识与订单返回格式。','工具失败、证据不足分别保留原因，不能覆盖已核实事实。'],
    ma_repair:['仅对质检未通过的草稿修复一次，并再次检查。','由质量分支 false 进入；保留事实与完整例外条件。','再次不合格时降级为人工处理文案，不无限重试。'],
    ma_dispatch:['对已核验的答案或保守回退文案做幂等模拟投递。','根据 reply_mode 汇总或逐意图组织；已快捷回复的问题不重复发。','投递成功不等于业务已解决；未对接真实客服渠道。'],
    ma_report:['返回完整会话结果、证据、回复序列、子运行与等待指标。','输出 variables.result；结束节点应读取相同路径。','首响可能只是安抚；实质答复和业务解决需要分别检查。'],
    ma_child_output:['从累计上下文的 result 提取专职 Agent 的最终结果。','input_path 读取最后阶段上下文；这里只返回 result，不返回整个上下文。','最终角色结构在子图结束时校验；缺 result 时检查阶段顺序。'],
    voc_workorders:['将产品改善候选创建为待确认工单，并保存原始排序与证据。','输出 plan_id；详细工单存于服务端，人工审核节点按编号读取。','无有效方案不可伪造工单；人工仍可调整优先级。'],
    voc_review:['暂停运行，等待设计师与企划确认同一版工单。','通过工单页分别确认；两方均确认后返回 plan_id 与 revision。','退回时修改并重新提交；修改后旧确认失效。'],
    voc_plm_guard:['检查双方确认是否仍对应当前工单修订。','读取 plan_id 与 revision；一致后原样交给 PLM 节点。','版本不一致则停止，必须重新确认。'],
    plm_task:['根据双方确认的工单创建任务，重复请求复用已有任务。','读取已确认修订；输出 work_orders、approvals、tasks。','当前任务在本系统展示，未连接企业 PLM。'],
    voc_tag_review:['暂停流程，由人核对图片、低分及冲突标签并修正。','在标签复核页逐条接受、修正或排除，再恢复原运行。','未确认不能跳过复核；不从图片、姓名、地址推断族裔或财富。'],
    voc_report:['汇总全量问题、排序依据、人工确认和已创建任务。','主输入读取 analysis；delivery_path 读取 PLM 输出。无产品候选时允许没有任务。','待观察、运营转交与产品工单分别保留，空任务不自动算失败。']
  };
  const fieldNotes={job_id:'服务端任务索引',batch_id:'本批编号',rows:'逐条评论及阶段处理上下文',batch:'已验收的打标结果',context:'本次分析规则',issues:'聚合问题及证据、评分、方案',has_images:'有图片时走人工图片检查分支',needs_review:'存在待复核评论',has_product_actions:'是否进入产品工单分支',plan_id:'已保存工单方案的编号',revision:'两方确认的工单修订号',language:'回复语言',unsupported:'语言不支持时保守转人工',result:'当前角色最终结果，由返回节点提取',scope:'市场、渠道与政策适用日期',candidates:'尚待核验的候选证据',authorized:'逐意图订单归属判断',order_results:'逐意图订单查询状态',checks:'逐意图质检结果',unresolved:'仍待人工处理的问题',facts:'已核验事实或明确缺失原因',intents:'归并问题及原声关联',conversation:'当前客户会话与原声',request_id:'本次幂等请求编号',simulation:'测试故障开关',drafts:'尚未投递的多语言回复草稿'};
  function infer(value,key=''){
    if(value===null)return {type:'null',description:fieldNotes[key]||'样例为空，真实结构以正式契约为准'};
    if(Array.isArray(value))return {...arr(value.length?infer(value[0]):{},fieldNotes[key]),description:fieldNotes[key]||'列表（字段由样例推导）'};
    if(typeof value==='object')return {...obj(Object.fromEntries(Object.entries(value).map(([k,v])=>[k,infer(v,k)]))),description:fieldNotes[key]||'字段结构参考'};
    return {type:typeof value==='number'?(Number.isInteger(value)?'integer':'number'):typeof value,description:fieldNotes[key]||'样例字段，含义见节点说明'};
  }
  let vocCache;
  function vocExamples(){
    if(vocCache)return vocCache;vocCache={};let x=cp(V.sample);x.reviews=x.reviews.slice(0,4);
    for(const type of ['voc_intake','voc_normalize','voc_route','voc_image_check','voc_taxonomy','voc_extract','voc_profile','voc_quality','voc_finalize']){const input=cp(x);x=V.execute(type,x,{});vocCache[type]={input,output:cp(x)};}
    x={tagged_batch:x,analysis_context:{analysis_id:'GUIDE-ANALYSIS'}};
    for(const type of ['voc_accept','voc_cohort','voc_cluster','voc_score','voc_disposition','voc_propose','voc_proposal_check']){const input=cp(x);x=V.execute(type,x,{});vocCache[type]={input,output:cp(x)};}
    return vocCache;
  }
  function childExample(role,stage){let x=S.sampleForRole(role,role==='handoff'?'refund':role==='knowledge'?'historical':'mixed','guide');for(const [s]of S.roleInfo[role].stages){const input=cp(x);x=S.runStep(role,s,x);if(s===stage)return {input,output:x};}return {};}
  function describe(node,graph,contract={},meta={}){
    const c=node.config||{},type=node.type,defs={...SupportCore.definitions,...V.definitions,...S.definitions};
    let note=notes[type]||[defs[type]?.[1]||meta.desc||'按当前配置处理上游数据。','先确认输入路径，再配置本步骤参数；输出路径必须与下游读取一致。','在试运行中查看异常；未完成的人工确认不会自动跳过。'];
    let inputSchema={},outputSchema={},example={},schemaKind='字段结构参考',changed=[];
    if(type==='ma_step'&&S.roleInfo[c.role]?.stages.some(s=>s[0]===c.stage)){const sc=S.stageContract(c.role,c.stage);note=stageNotes[c.role+'.'+c.stage];inputSchema=sc.input;outputSchema=sc.output;changed=sc.changed;example=childExample(c.role,c.stage);schemaKind='阶段契约';}
    else if(type.startsWith('ma_')){
      inputSchema=type==='ma_intake'?S.inputSchema:team;outputSchema=type==='ma_report'?S.outputSchema:team;schemaKind='运行时结构';
      if(type==='ma_call')note=[`调用${S.roleInfo[c.role]?.name||c.role}，执行该 Agent 已保存的画布。`,`${S.roleInfo[c.role]?.purpose||''}。通过 job_id 读取当前任务并组装子 Agent 输入；内部草稿、计划与交接包保存在任务中。`,'修改子图后先保存；每次总控运行固定子图快照，当前运行不会被中途编辑改变。'];
      if(type==='ma_child_output'){const last=S.roleInfo[c.role]?.stages.at(-1)?.[0];inputSchema=last?S.stageContract(c.role,last).output:{};outputSchema=S.childOutputs[c.role]||{};if(last){const ex=childExample(c.role,last);example={input:ex.output,output:ex.output.result};}}
    }else if(type.startsWith('cs_')){inputSchema=type==='cs_intake'?SupportCore.inputSchema:support;outputSchema=type==='cs_report'?SupportCore.outputSchema:support;schemaKind='运行时结构';note=[defs[type][1], '读取同一批次的 job_id；服务端按 conversation_id 隔离每个客户。原始消息、草稿和查询状态保存在任务中。','在协作结果检查每个会话的状态；规则模板不等于通用模型理解。'];}
    else if(vocExamples()[type]){example=cp(vocExamples()[type]);inputSchema=infer(example.input);outputSchema=infer(example.output);if(type==='voc_intake')inputSchema=V.inputSchema;if(type==='voc_finalize')outputSchema=V.outputSchema;if(type==='voc_accept')inputSchema=V.analysisInput;}
    else if(['voc_workorders','voc_review','voc_plm_guard','plm_task','voc_report','voc_tag_review'].includes(type)){
      const plan=obj({plan_id:str('工单方案编号')}),approved=obj({...plan.properties,revision:{type:'integer',description:'已确认修订'}});
      inputSchema=type==='voc_workorders'||type==='voc_report'?infer(vocExamples().voc_proposal_check.output):type==='voc_review'?plan:type==='voc_tag_review'?infer(vocExamples().voc_quality.output):approved;
      outputSchema=type==='voc_workorders'?plan:type==='voc_review'||type==='voc_plm_guard'?approved:type==='voc_report'?V.analysisOutput:type==='voc_tag_review'?inputSchema:obj({plan_id:plan.properties.plan_id,work_orders:V.analysisOutput.properties.work_orders,approvals:V.analysisOutput.properties.approvals,tasks:V.analysisOutput.properties.tasks});
    }else if(type==='voc_tag'){inputSchema=VocCore.inputSchema;outputSchema=VocCore.outputSchema;}
    else if(type==='voc_aggregate'){inputSchema=VocCore.outputSchema;const input=VocCore.tagReviews(VocCore.sample),output=VocCore.aggregate(input,c);outputSchema=infer(output);example={input,output};}
    else if(type==='image_to_video'){inputSchema=C.inputSchema;outputSchema=C.outputSchema;}
    else if(type==='llm'){inputSchema=contract.input_schema||C.welcomeInput;outputSchema=c.output_schema||infer(c.mock_output||{});example={input:{name:'小林'},output:c.mock_output};}
    else if(type==='start'){inputSchema=contract.input_schema||{};outputSchema=c.copy_input===false?obj({}):inputSchema;schemaKind='Agent 输入契约';}
    else if(type==='end'){inputSchema=contract.output_schema||{};outputSchema=inputSchema;schemaKind='Agent 输出契约';}
    else if(type==='branch'){inputSchema={type:'boolean',description:'true 或 false'};outputSchema=null;}
    const read=type==='start'?'input':type==='branch'?c.value_path:type==='end'?c.source_path:c.input_path||(type==='llm'?'input':type==='image_to_video'?`${c.image_path} + ${c.prompt_path}`:'按配置');
    const write=type==='start'?'variables':type==='end'?'Agent 最终输出':type==='branch'?'只选择连线，不写变量':c.output_path||'按配置';
    const previous=graph.nodes.filter(n=>graph.edges.some(e=>e.to===node.id&&e.from===n.id)),next=graph.nodes.filter(n=>graph.edges.some(e=>e.from===node.id&&e.to===n.id));
    const ancestors=new Set(),walk=id=>{for(const e of graph.edges.filter(e=>e.to===id))if(!ancestors.has(e.from)){ancestors.add(e.from);walk(e.from);}};walk(node.id);
    const producers=graph.nodes.filter(n=>ancestors.has(n.id)&&(n.config?.output_path&&read&&(read===n.config.output_path||read.startsWith(n.config.output_path+'.'))||n.type==='start'&&n.config?.copy_input!==false&&String(read).startsWith('variables.')));
    const warning=String(read).startsWith('variables.')&&!producers.length?'该读取路径未找到上游写入节点，请检查路径或连线。':'';
    return {purpose:note[0],how:note[1],exception:note[2],read,write,inputSchema:inputSchema||{},outputSchema,schemaKind,example,changed,previous,next,producers,warning};
  }
  globalThis.NodeGuidance=Object.freeze({describe,childExample,infer,stageNotes});
})();
