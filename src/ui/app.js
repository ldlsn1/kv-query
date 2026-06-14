import { load } from '../core/data.ts';
import { runCommand } from '../cli/commands.ts';
import { renderPanel } from './panelView.js';

export function createApp(root) {
  const state = {
    logs: [],
    results: [], // 当前搜索结果
  };

  const app = {
    state,

    // 输出日志
    log(msg) {
      state.logs.push(msg);
      if (state.logs.length > 500) state.logs.shift();
    },

    // 用于显示带有点击复制功能的条目列表
    setResults(entries) {
        state.results = entries;
    },

    // 弹出全屏编辑器
    showEditor(text, onSave) {
      const overlay = document.createElement('div');
      overlay.className = 'edit-overlay';
      const box = document.createElement('div');
      box.className = 'edit-box';

      const ta = document.createElement('textarea');
      ta.value = text;

      const actions = document.createElement('div');
      actions.className = 'edit-actions';

      const btnSave = document.createElement('button');
      btnSave.className = 'btn-save';
      btnSave.textContent = 'Save';
      const btnCancel = document.createElement('button');
      btnCancel.className = 'btn-cancel';
      btnCancel.textContent = 'Cancel';

      actions.append(btnSave, btnCancel);
      box.append(ta, actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      ta.focus();

      btnSave.onclick = () => {
        onSave(ta.value);
        overlay.remove();
        app.render();
      };
      btnCancel.onclick = () => {
        overlay.remove();
        app.render();
      };
    },

    render() {
      const panel = document.getElementById('panel');
      if (!panel) return;
      renderPanel(app, panel);
    },
  };

  // 初始化
  load();

  // 绑定 CLI 表单
  const form = root.querySelector('#cliForm');
  const input = root.querySelector('#cliInput');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const line = input.value.trim();
    if (!line) return;
    input.value = '';
    await runCommand(app, line);
    input.focus();
  });

  // 首次渲染
  app.render();
  return app;
}
