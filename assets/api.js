/**
 * Base da API do Cuidare.
 *
 * Substitui as copias inline de `window.CUIDARE_API_URL || '<fallback>'`.
 * O contrato nao muda: `window.CUIDARE_API_URL` continua sendo respeitado e,
 * quando ausente, vale a URL de producao.
 *
 * Funciona em dois ambientes:
 *   - navegador: `window.CuidareApi`
 *   - Node (checks/): `module.exports`
 */
(function (global) {
  'use strict';

  const api = {
    base: (global && global.CUIDARE_API_URL) || 'https://cuidareapi.onrender.com',
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.CuidareApi = api;
})(typeof window !== 'undefined' ? window : null);
