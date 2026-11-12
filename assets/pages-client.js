/* Static Pages uses the same workflow services in a shared browser worker. */
(() => {
  if (window.VIDEO_EXECUTION_MODE !== 'browser') return;
  const workerURL = new URL('./pages-worker.js?v=20261112-1', document.currentScript.src);
  let worker, port, sequence = 0;
  const waiting = new Map();
  function rejectAll(message) {
    for (const {reject, timer} of waiting.values()) { clearTimeout(timer); reject(new Error(message)); }
    waiting.clear();
  }
  function start() {
    if (port) return;
    if (!window.SharedWorker) throw new Error('当前浏览器不支持共享运行工作区，请使用新版 Chrome 或 Edge 打开。');
    worker = new SharedWorker(workerURL, {name:'agent-console-pages-v1'});
    port = worker.port;
    port.onmessage = ({data}) => {
      const pending = waiting.get(data.id); if (!pending) return;
      waiting.delete(data.id); clearTimeout(pending.timer);
      if (data.error) pending.reject(Object.assign(new Error(data.error.message), data.error));
      else pending.resolve(data.result);
    };
    port.onmessageerror = () => rejectAll('工作区消息读取失败，请刷新重试。');
    worker.onerror = () => { rejectAll('浏览器运行服务加载失败，请刷新页面后重试。'); port?.close(); port=null; };
    port.start();
  }
  window.PagesAPI = Object.freeze({request(route,method='GET',data,asBlob=false) {
    if (asBlob) return Promise.reject(new Error('视频生成需要连接视频服务；VOC 与客服可直接在本页运行。'));
    return new Promise((resolve,reject) => {
      try { start(); } catch(e) { reject(e); return; }
      const id=++sequence;
      const timer=setTimeout(()=>{waiting.delete(id);reject(new Error('工作区响应超时，请刷新后查看运行记录。'));},45000);
      waiting.set(id,{resolve,reject,timer});
      port.postMessage({id,route,method,data});
    });
  }});
})();
