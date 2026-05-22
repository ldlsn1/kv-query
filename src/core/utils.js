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

  // 无论成功与否，务必移除临时 textarea
  document.body.removeChild(ta);

  if (ok) return;

  // 降级尝试 Clipboard API
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
