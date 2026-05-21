/**
 * 复制文本到剪贴板，优先 execCommand，降级至 Clipboard API，
 * 失败则弹出 alert 提示手动复制。
 */
export function copyText(text) {
  // 尝试 execCommand（兼容性最好）
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    const ok = document.execCommand('copy');
    if (ok) return; // 成功
  } catch { }
  document.body.removeChild(ta);

  // 降级尝试 Clipboard API（某些现代浏览器）
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => {
      alert('Copy failed, please copy manually.');
    });
    return;
  }

  alert('Copy failed, please copy manually.');
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
