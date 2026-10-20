/* 一隅 v4.5.2：公开网页只保存后端地址，不包含任何 API 密钥。 */
(function () {
  const host = location.hostname;
  window.YIYU_API_BASE = host.endsWith('.vercel.app')
    ? location.origin
    : host === 'yaoyuping.github.io'
      ? 'https://yiyu-plants-api.vercel.app'
      : '';
})();
