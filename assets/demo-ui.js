/* Preserve the original interface while making the offline boundary explicit. */
(() => {
  'use strict';
  const unavailable = /^(openWizard|builderNewSession|builderSend|builderCreateDraft|builderValidate|builderDeleteSession|govSave|govEval|govPromote|govAlias|govDelete|openAgentPurge|confirmAgentPurge|saveAgentAccess|deleteGraph|runNodeTest|approveRun|cancelLiveWait|authFeishuLogin|authLocalLogin|authLogout|knowledge(?:Upload|Create|Save|Put|Delete|Search|DocumentAction)|openKnowledge|confirmKnowledge|memoryWrite|openMemoryWrite|submitMemory|deleteMemory|manageRecallDocument|project(?:Save|Delete|Toggle|Token)|openProject|account(?:Save|Toggle|Sync)|model(?:Create|Save|Add|Test|Promote|Deprecate)|openModel|credential(?:Create|Save|Rotate|State|Delete)|openCredential|evaluation(?:Save|Delete|Start)|openEvaluation|trigger(?:Save|Set|Rotate|Test|Replay|Delete)|openTrigger|node(?:Create|Save|Set)|openNode(?:Create|Instance)|skill(?:New|Create|Install|Inspect|Run|Test|Promote|Deprecate|Start|Save|Discover)|reviewTemplate(?:Generate|Create|Publish|Save|Delete|SetStable|Deprecate|Archive|Purge|DirectPreview|Validate)|openReviewTemplate|pm(?:Save|Create|Rollback|RenderPreview)|openPrompt)/;
  const readonlyViews=new Set(['builder','trigger','skill','knowledge','prompt','model','review-template','evaluation','context','project','credential','account','node']);
  function blocked(button) {
    if(button.closest('[data-workflow-control], #wizMask, #runInputMask'))return false;
    if(/^openWizard\(/.test(button.getAttribute('onclick')||''))return /openWizard\('version'/.test(button.getAttribute('onclick')) && GOV.code==='demo.welcome';
    if(/^govEditIdentity\(/.test(button.getAttribute('onclick')||''))return true;
    const handler=button.getAttribute('onclick')||'';
    if(/^runNodeTest\(/.test(handler)&&window.SupportTeamConsole?.canTestNode())return false;
    return unavailable.test(handler.trim())||/saveGraph\(true\)/.test(handler)||/^(新建|新增|安装|上传|发布|同步|写入|创建|生成方案|轮换|保存授权)/.test(button.textContent.trim())&&button.closest('.view')?.id!=='view-canvas';
  }
  function apply() {
    document.querySelectorAll('button').forEach(button=>{
      if(!blocked(button))return;
      if(!button.disabled)button.disabled=true;
      if(!button.classList.contains('demo-unavailable'))button.classList.add('demo-unavailable');
      const reason='此功能尚未配置服务';
      if(button.title!==reason)button.title=reason;
    });
    readonlyViews.forEach(name=>{
      const view=document.getElementById('view-'+name);
      if(view&&!view.querySelector('.demo-note')){
        const note=document.createElement('div');note.className='demo-note';
        note.textContent=name==='model'?'当前客服流程使用内置规则执行，无需选择模型。外部模型服务尚未配置，模型接入需要服务地址、模型标识和服务端凭证。':'此模块尚未配置服务。已配置的任务可在「编排画布」运行。';
        view.prepend(note);
      }
    });
    const palette=document.getElementById('palette');
    if(palette) for(const option of palette.options){
      const disabled=!['start','llm','end','image_to_video','voc_tag','voc_aggregate','voc_workorders','voc_review','plm_task',...Object.keys(window.VocV2?.definitions||{}),...Object.keys(window.SupportCore?.definitions||{}),...Object.keys(window.SupportTeam?.definitions||{})].includes(option.value);
      if(option.disabled!==disabled)option.disabled=disabled;
      if(disabled)option.title='本演示支持顺序执行、条件分支、视频与VOC节点';
    }
    if(palette&&palette.selectedOptions[0]?.disabled)palette.value='llm';
  }
  document.getElementById('demoReset').addEventListener('click',()=>{
    if(confirm('重置本演示的编排、测试用例和运行记录？其他网站的数据不受影响。'))DemoConsole.reset();
  });
  // Defend against controls re-enabled by original asynchronous renderers.
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(button&&blocked(button)){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  let pending=false;
  new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;apply();});})
    .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  apply();
})();
