/**
 * Guard de autenticacao das paginas internas do Cuidare.
 *
 * Substitui o bloco repetido no `<head>` das 7 paginas autenticadas. O
 * comportamento e o mesmo: esconde o `body` via a classe `auth-checking`
 * (aplicada por um script inline, antes deste arquivo), chama
 * `POST /api/auth/verify` e redireciona para o login quando o token nao serve.
 *
 * Depende de `assets/api.js` (window.CuidareApi), carregado antes.
 */
(function (global) {
  'use strict';
  if (!global) return;

  /**
   * @param {object} options
   * @param {string} options.tokenKey       chave do token no sessionStorage
   * @param {string} options.redirect       pagina de login para onde cair
   * @param {string} options.accountType    'psychologist' ou 'admin'
   * @param {string} options.invalidMessage texto do erro lancado (descartado no catch)
   */
  function guard({ tokenKey, redirect, accountType, invalidMessage }) {
    (async () => {
      const token = sessionStorage.getItem(tokenKey);
      if (!token) {
        global.location.replace(redirect);
        return;
      }

      try {
        const response = await fetch(`${global.CuidareApi.base}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token })
        });
        const result = await response.json();
        if (!response.ok || result.user?.account_type !== accountType) {
          throw new Error(invalidMessage);
        }
        document.documentElement.classList.remove('auth-checking');
      } catch (_error) {
        sessionStorage.removeItem(tokenKey);
        global.location.replace(redirect);
      }
    })();
  }

  global.CuidareAuth = { guard };
})(typeof window !== 'undefined' ? window : null);
