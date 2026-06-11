import { addFreq, getFreqMap } from '../core/data.ts';
import { escapeHTML } from '../core/kvFormat.ts';
import { copyText } from '../core/utils.js';

export function renderPanel(app, container) {
  container.innerHTML = '';

  // 显示日志
  const logs = app.state.logs;
  if (logs.length) {
    for (const line of logs) {
      const div = document.createElement('div');
      div.className = line.startsWith('>') ? 'cmd' : (line.startsWith('error:') ? 'err' : 'info');
      div.textContent = line;
      container.appendChild(div);
    }
  }

  // 显示结果列表（如果有）
  const results = app.state.results;
  if (results && results.length) {
    const freqMap = getFreqMap();
    const sorted = [...results].sort((a, b) =>
      (freqMap[b.k] || 0) - (freqMap[a.k] || 0)
    );

    for (const e of sorted) {
      const div = document.createElement('div');
      div.className = 'entry'; // 专属 class
      div.innerHTML = `<span class="key">${escapeHTML(e.k)}</span>  ${escapeHTML(e.v)}`;
    
      // 复制 + 加频率 + 闪烁效果
      div.addEventListener('click', () => {
        copyText(e.v);
        addFreq(e.k);
        div.style.opacity = '0.55';
        setTimeout(() => { div.style.opacity = ''; }, 200);
      });
    
      container.appendChild(div);
    }    
  } else if (!logs.length) {
    container.innerHTML = '<div class="info">type `help` to get started.</div>';
  }

  container.scrollTop = container.scrollHeight;
}
