/**
 * Guard de autenticacao das paginas internas do Cuidare.
 *
 * Substitui o bloco repetido no `<head>` das paginas autenticadas. O
 * comportamento e o mesmo: esconde o `body` via a classe `auth-checking`
 * (aplicada por um script inline, antes deste arquivo), chama o endpoint de
 * verificacao de sessao e redireciona para o login quando o token nao serve.
 *
 * Depende de `assets/api.js` (window.CuidareApi), carregado antes.
 */
(function (global) {
  'use strict';
  if (!global) return;

  // Default: sessao de psicologo/admin. As paginas de cliente sobrescrevem
  // com `verifyUrl: '/api/client/auth/session'`.
  const DEFAULT_VERIFY_URL = '/api/auth/verify';

  /**
   * @param {object} options
   * @param {string} options.tokenKey       chave do token no sessionStorage
   * @param {string} options.redirect       pagina de login para onde cair
   * @param {string} options.accountType    'psychologist', 'admin' ou 'client'
   * @param {string} options.invalidMessage texto do erro lancado (descartado no catch)
   * @param {string} [options.verifyUrl]    endpoint que valida o token. Padrao: DEFAULT_VERIFY_URL
   */
  function guard({ tokenKey, redirect, accountType, invalidMessage, verifyUrl }) {
    const url = verifyUrl || DEFAULT_VERIFY_URL;

    (async () => {
      const token = sessionStorage.getItem(tokenKey);
      if (!token) {
        global.location.replace(redirect);
        return;
      }

      try {
        const response = await fetch(`${global.CuidareApi.base}${url}`, {
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

  global.CuidareAuth = { guard, DEFAULT_VERIFY_URL };
})(typeof window !== 'undefined' ? window : null);
