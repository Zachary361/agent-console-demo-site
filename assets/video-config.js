// GitHub Pages serves static files. Other hosts use their same-origin backend.
window.VIDEO_API_BASE = location.hostname.endsWith('github.io') ? 'https://structure-maria-lead-hansen.trycloudflare.com' : '';
