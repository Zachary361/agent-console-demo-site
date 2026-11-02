/* Shared, deterministic VOC demo rules and contracts. No model or image inference. */
(() => {
  'use strict';
  const str=(max=120,extra={})=>({type:'string',maxLength:max,...extra});
  const obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
  const arr=(items,maxItems=50)=>({type:'array',items,maxItems});
  const num=(minimum,maximum)=>({type:'number',minimum,maximum});
  const nullable=(minimum,maximum)=>({type:['number','null'],minimum,maximum});
  const rules=[
    ['面料','起球',2,/起球|pilling|pills? after/i,'核对面料抗起球表现，补充洗后测试'],
    ['面料','扎肤',2,/扎肤|扎人|刺痒|itchy|scratchy/i,'核对纤维与整理工艺，评估贴肤感'],
    ['面料','闷热',1,/闷热|不透气|not breathable|too hot/i,'评估透气性及适用季节'],
    ['面料','太薄',1,/太薄|过薄|透肉|see.through|too thin/i,'评估克重、遮透性及里料方案'],
    ['面料','缩水',3,/缩水|shrunk|shrinkage|shrinks/i,'核查洗后尺寸变化与预缩工艺'],
    ['尺码','偏大',2,/偏大|尺码大|size.{0,8}too large|runs? (?:too )?large/i,'复核尺码表与实测围度，评估尺码建议'],
    ['尺码','偏小',2,/偏小|尺码小|runs? (?:too )?small|size.{0,8}too small/i,'复核尺码表与实测围度，评估放码'],
    ['尺码','尺码不准',2,/尺码不准|尺码表不符|inaccurate size/i,'核查尺码标识、实测与页面说明的一致性'],
    ['版型','肩部不合',2,/肩.{0,3}(?:窄|宽|紧)|shoulders? too (?:tight|wide|narrow)/i,'核对肩宽与袖窿，安排试穿验证'],
    ['版型','腰部不合',2,/腰.{0,3}(?:紧|松|大|小)|waist too (?:tight|loose)/i,'核查腰围及腰部结构，安排试穿验证'],
    ['版型','袖长不合',1,/袖.{0,3}(?:太长|太短|过长|过短)|sleeves? too (?:long|short)/i,'核对袖长规格及目标体型覆盖'],
    ['版型','衣长不合',1,/衣长.{0,3}(?:长|短|不合)|下摆太短|top too (?:long|short)/i,'复核衣长和穿着比例'],
    ['版型','裤长不合',1,/裤.{0,3}(?:太长|太短|过长|过短)|pants? too (?:long|short)/i,'核对裤长与内长规格'],
    ['质量','开线',3,/开线|脱线|seam.{0,15}(?:split|open|unravel)/i,'核查缝制牢度、针距和受力部位'],
    ['质量','破损',3,/破洞|破损|有洞|arrived torn|hole in/i,'核查面料疵点与成品检验'],
    ['质量','拉链故障',3,/拉链.{0,5}(?:坏|卡|断)|zipper.{0,12}(?:broken|stuck|broke)/i,'复核拉链辅料及安装工艺'],
    ['质量','褪色',2,/褪色|掉色|faded|color bleeds/i,'核对色牢度与洗护说明'],
    ['其他问题','异味',2,/异味|臭味|bad smell|strong odor/i,'核对整理、包装与存储环节'],
    ['其他问题','色差',1,/色差|颜色不符|wrong colou?r/i,'核查实物与图片颜色表达'],
    ['其他问题','包装问题',1,/包装破|包装差|damaged packaging/i,'核查包装保护与交付环节'],
    ['其他问题','发错货',2,/发错|错发|wrong item/i,'核查商品标识和履约差错'],
    ['其他问题','价格偏高',1,/太贵|价格偏高|too expensive|overpriced/i,'由企划复核价格与价值表达']
  ];
  const taxonomy=Object.fromEntries(['面料','尺码','版型','质量','其他问题'].map(p=>[p,rules.filter(r=>r[0]===p).map(r=>r[1])]));
  const imageSchema=str(2000,{description:'评论图片链接；演示只保留引用，不分析图片，不从图片推断个人属性'});
  const selfSchema=obj({height_cm:num(50,250),weight_kg:num(10,350),ethnicity:str(60,{description:'仅限用户主动自述，缺失即未知，不作推断'}),budget_yuan:num(0,100000)},[]);
  const reviewSchema=obj({review_id:str(64,{minLength:1}),review_text:str(4000,{minLength:1}),rating:{type:'integer',minimum:1,maximum:5},helpful_count:{type:'integer',minimum:0,maximum:1000000},images:arr(imageSchema,5),user_name:str(80),user_address:str(200,{description:'建议仅填国家/城市；不用于推断人种或消费能力'}),self_reported:selfSchema},['review_id','review_text','rating','helpful_count','images','user_name','user_address']);
  const inputSchema=obj({style_code:str(80,{minLength:1,description:'款号；一批只分析一个款式'}),reviews:{...arr(reviewSchema),minItems:1}});
  const issueSchema=obj({primary_label:str(10,{enum:Object.keys(taxonomy)}),secondary_label:str(12,{enum:rules.map(r=>r[1])}),evidence:str(200,{minLength:1}),severity:{type:'integer',minimum:1,maximum:3}});
  const profileSchema=obj({height_cm:nullable(50,250),weight_kg:nullable(10,350),body_evidence:str(200),ethnicity:str(60),ethnicity_source:str(30,{enum:['user_self_reported','unknown']}),price_tag:str(20,{enum:['未知','预算明确','价格敏感','可接受溢价']}),budget_yuan:nullable(0,100000),price_evidence:str(200)});
  const taggedSchema=obj({review_id:str(64,{minLength:1}),review_text:str(4000,{minLength:1}),rating:{type:'integer',minimum:1,maximum:5},helpful_count:{type:'integer',minimum:0,maximum:1000000},images:arr(imageSchema,5),issue_tags:arr(issueSchema,30),usage_scenarios:arr(str(16),10),outfit_tags:arr(str(16),10),profile:profileSchema,needs_review:{type:'boolean'},notes:arr(str(200),10)});
  const outputSchema=obj({style_code:str(80,{minLength:1}),taxonomy_version:str(20),mode:str(30),tagged_reviews:{...arr(taggedSchema),minItems:1},limitations:arr(str(200),10)});
  const analysisInput=JSON.parse(JSON.stringify(outputSchema));
  const analysisOutput=obj({style_code:str(80),plan_id:str(80),status:str(40),tasks:arr(obj({task_id:str(80),work_order_id:str(80),title:str(160),priority:str(5),status:str(30)}),30),message:str(300)});
  const sample={style_code:'DEMO-TS-001',reviews:[
    {review_id:'R001',review_text:'穿去通勤，搭配牛仔裤。身高168cm，体重60kg。洗一次就起球，袖子太长，这个价格太贵。',rating:2,helpful_count:12,images:[],user_name:'演示用户A',user_address:'示例城市'},
    {review_id:'R002',review_text:'周末休闲穿，搭配短裙。面料起球，尺码偏小，肩部紧。',rating:1,helpful_count:8,images:[],user_name:'演示用户B',user_address:'示例地区'},
    {review_id:'R003',review_text:'运动时穿着，穿两次就开线。',rating:2,helpful_count:3,images:[],user_name:'演示用户C',user_address:'示例城市',self_reported:{height_cm:172,weight_kg:65}},
    {review_id:'R004',review_text:'通勤搭配西装外套很方便，面料柔软，没有起球，也不掉色。',rating:5,helpful_count:2,images:[],user_name:'演示用户D',user_address:'示例城市'}
  ]};
  function tagReviews(input){
    const invalid=globalThis.WorkflowCore?.validateValue(input,inputSchema)||[];if(invalid.length)throw Error('VOC 输入无效：'+invalid.join('；'));
    const ids=new Set();
    const tagged_reviews=input.reviews.map(r=>{
      if(ids.has(r.review_id))throw Error('评论 ID 重复：'+r.review_id);ids.add(r.review_id);
      if(!r.review_text.trim()||!r.review_id.trim())throw Error('评论与评论 ID 不能为空白');
      for(const url of r.images)if(!/^https?:\/\//i.test(url))throw Error('评论图片仅接受 http/https 链接');
      const text=r.review_text,clauses=text.split(/[。！？!?.\n；;]/).filter(Boolean);
      const issue_tags=[];
      for(const [primary,secondary,severity,pattern] of rules){
        const evidence=clauses.find(part=>{
          const cleaned=part.replace(/(?:没有|并无|不会|未见|未|不)(?:出现|发生|会|再)?(?:起球|掉色|褪色|缩水|开线|破损|异味)/g,'').replace(/(?:no|not|without)\s+(?:any\s+)?(?:pilling|shrinkage|fading|holes?)/ig,'');
          return pattern.test(cleaned);
        });
        if(evidence)issue_tags.push({primary_label:primary,secondary_label:secondary,evidence:evidence.trim().slice(0,200),severity});
      }
      const uses=[['通勤',/通勤|办公室|office|workwear/i],['休闲',/休闲|周末|casual|weekend/i],['运动',/运动|跑步|gym|workout/i],['旅行',/旅行|旅游|travel/i],['聚会',/聚会|约会|party|date night/i],['居家',/居家|睡觉|lounge/i]].filter(x=>x[1].test(text)).map(x=>x[0]);
      const outfits=[['牛仔裤',/牛仔裤|jeans/i],['短裙',/短裙|miniskirt/i],['长裙',/长裙|maxi skirt/i],['西装外套',/西装外套|blazer/i],['运动鞋',/运动鞋|sneakers/i],['靴子',/靴子|boots/i],['短裤',/短裤|shorts/i]].filter(x=>x[1].test(text)).map(x=>x[0]);
      const own=r.self_reported||{},h=text.match(/(?:身高\s*)?(\d{3}(?:\.\d+)?)\s*(?:cm|厘米)/i),w=text.match(/(?:体重\s*)?(\d{2,3}(?:\.\d+)?)\s*(kg|公斤|千克|斤)/i);
      const height=own.height_cm??(h?Number(h[1]):null),weight=own.weight_kg??(w?Number(w[1])/(w[2]==='斤'?2:1):null);
      const price=clauses.find(p=>/太贵|价格偏高|预算|too expensive|overpriced|budget|愿意多花|接受溢价/i.test(p))||'';
      const profile={height_cm:height>=50&&height<=250?height:null,weight_kg:weight>=10&&weight<=350?weight:null,body_evidence:(own.height_cm||own.weight_kg?'用户自述字段':[h?.[0],w?.[0]].filter(Boolean).join('；')).slice(0,200),ethnicity:own.ethnicity?.trim()||'未知',ethnicity_source:own.ethnicity?.trim()?'user_self_reported':'unknown',price_tag:own.budget_yuan!==undefined?'预算明确':/太贵|价格偏高|too expensive|overpriced/i.test(price)?'价格敏感':/愿意多花|接受溢价/.test(price)?'可接受溢价':'未知',budget_yuan:own.budget_yuan??null,price_evidence:(own.budget_yuan!==undefined?'用户主动填写预算':price).slice(0,200)};
      const notes=['规则匹配结果，需人工核对语境'];if(r.images.length)notes.push('图片仅保留引用，未进行多模态识别');if(!issue_tags.length)notes.push('未匹配问题标签，不代表确定没有问题');
      return {review_id:r.review_id,review_text:text,rating:r.rating,helpful_count:r.helpful_count,images:r.images,issue_tags,usage_scenarios:uses,outfit_tags:outfits,profile,needs_review:true,notes};
    });
    return {style_code:input.style_code,taxonomy_version:'voc-demo-v1',mode:'rules-demo',tagged_reviews,limitations:['未接真实模型；标签为关键词规则演示','图片未分析；未知属性不推断','价格表达不等于实际消费能力']};
  }
  const defaultWeights={frequency:40,low_rating:30,severity:25,helpful:5};
  function aggregate(input,config={}){
    const invalid=globalThis.WorkflowCore?.validateValue(input,analysisInput)||[];if(invalid.length)throw Error('VOC 打标数据无效：'+invalid.join('；'));
    const weights=config.weights||defaultWeights,cutoff=config.low_rating_max??2;
    const unique=new Map();
    for(const row of input.tagged_reviews){if(unique.has(row.review_id)&&JSON.stringify(unique.get(row.review_id))!==JSON.stringify(row))throw Error('同一评论 ID 的内容不一致：'+row.review_id);unique.set(row.review_id,row);}
    const rows=[...unique.values()],groups=new Map();
    for(const r of rows){const seen=new Set();for(const tag of r.issue_tags){
      const rule=rules.find(x=>x[0]===tag.primary_label&&x[1]===tag.secondary_label);if(!rule)throw Error('一级和二级标签组合无效');
      if(!r.review_text.includes(tag.evidence))throw Error('标签证据必须来自原声：'+r.review_id);
      const key=rule[0]+'/'+rule[1];if(seen.has(key))continue;seen.add(key);
      if(!groups.has(key))groups.set(key,{key,primary_label:rule[0],secondary_label:rule[1],severity:rule[2],count:0,low_count:0,helpful_count:0,evidence:[],suggestion:rule[4]});
      const g=groups.get(key);g.count++;g.low_count+=r.rating<=cutoff?1:0;g.helpful_count+=r.helpful_count;g.evidence.push({review_id:r.review_id,quote:tag.evidence,rating:r.rating});
    }}
    const issues=[...groups.values()].map(g=>{const factors={frequency:g.count/rows.length,low_rating:g.low_count/g.count,severity:g.severity/3,helpful:Math.min(g.helpful_count/20,1)},parts=Object.fromEntries(Object.keys(defaultWeights).map(k=>[k,Math.round(factors[k]*weights[k]*100)/100]));const score=Math.round(Object.values(parts).reduce((a,b)=>a+b,0)*100)/100;return {...g,score,priority:score>=70?'P1':score>=40?'P2':'P3',score_parts:parts,sample_size:rows.length};}).sort((a,b)=>b.score-a.score||b.count-a.count||a.key.localeCompare(b.key));
    return {style_code:input.style_code,sample_size:rows.length,duplicates_removed:input.tagged_reviews.length-rows.length,issues,scoring:{weights,low_rating_max:cutoff,helpful_cap:20},mode:'rules-demo',note:'基于当前样本的问题优先级建议；不等于总体缺陷率，需设计师与企划确认'};
  }
  function graph(id,name,kind,owner=''){
    const specs=kind==='voc_tag'?[
      ['tag','voc_tag',{input_path:'input',output_path:'variables.tags'}],
    ]:[
      ['summarize','voc_aggregate',{input_path:'input',output_path:'variables.summary',weights:{...defaultWeights},low_rating_max:2}],
      ['orders','voc_workorders',{input_path:'variables.summary',output_path:'variables.plan'}],
      ['review','voc_review',{input_path:'variables.plan',output_path:'variables.approved'}],
      ['plm','plm_task',{input_path:'variables.approved',output_path:'variables.delivery',mode:'demo'}]
    ];
    const nodes=[{id:'start',type:'start',x:80,y:150,config:{copy_input:false,load_context:false}},...specs.map(([id,type,config],i)=>({id,type,x:360+i*280,y:150,config})),{id:'end',type:'end',x:360+specs.length*280,y:150,config:{source_path:kind==='voc_tag'?'variables.tags':'variables.delivery'}}];
    return {id,name,version:'v1',status:'draft',entry:'start',owner_agent_code:owner,nodes,edges:nodes.slice(1).map((n,i)=>({from:nodes[i].id,to:n.id}))};
  }
  globalThis.VocCore=Object.freeze({taxonomy,rules,inputSchema,outputSchema,analysisInput,analysisOutput,sample,defaultWeights,tagReviews,aggregate,graph});
})();
