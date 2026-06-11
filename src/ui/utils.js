/**
 * 复制文本到剪贴板，优先 execCommand，降级至 Clipboard API，
 * 失败则弹出 alert 提示手动复制。
 */
export function copyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch { /* ignore */ }

  // 无论成功与否，务必移除临时 textarea，避免焦点问题
  document.body.removeChild(ta);

  if (ok) return;

  // 降级尝试 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => {
      alert('copy failed, please copy manually.');
    });
    return;
  }

  alert('copy failed, please copy manually.');
}

/**
 * 弹出文件选择框，读取用户选择的文本文件内容
 * @returns {Promise<string>} 文件文本内容
 */
export function pickTextFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve("");
      reader.readAsText(file, 'UTF-8');
    };
    // 点击取消或关闭对话框时，不会触发 onchange，所以用 focus 兜底，避免内存泄漏
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files.length) resolve("");
      }, 300);
      window.removeEventListener('focus', onFocus);
    };
    window.addEventListener('focus', onFocus);
    input.click();
  });
}

/**
 * 触发浏览器下载文本文件
 * @param {string} text 文件内容
 * @param {string} filename 下载文件名
 */
export function downloadText(text, filename = 'data.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
