/**
 * 应用实例创建、状态管理、全局控制
 */

import { load, getEntries, getFreqMap, addFreq } from '../core/data.js';
import { runCommand } from '../cli/commands.js';
import { renderPanel, parseText, escapeKey, formatEntry } from './panelView.js';

export function createApp(root) {
  // ---------- 状态 ----------
  const state = {
    entries: [],
    freqMap: {},
    logs: [],
    results: [],       // 当前搜索结果
    showEditor: null,  // 编辑器回调，为 null 时显示普通面板
  };

  // ---------- app 实例 ----------
  const app = {
    state,

    log(msg) {
      state.logs.push(msg);
      if (state.logs.length > 500) state.logs.shift();
      // 若当前正在显示日志面板，自动刷新（render 时会检查）
      this.render();
    },

    setResults(entries) {
      state.results = entries;
    },

    /** 弹出全屏编辑器
     *  @param {string} text 初始内容
     *  @param {(newText:string)=>void} onSave 保存回调
     */
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
      // 如果有编辑器打开，不覆盖面板内容（编辑器独立层）
      // 普通内容渲染
      renderPanel(app, panel);
    },
  };

  // 初始化
  load();
  state.entries = getEntries();
  state.freqMap = getFreqMap();
  state.results = state.entries; // 默认显示全部
  state.logs = [];

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
