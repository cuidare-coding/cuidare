/**
 * Utilitarios de formatacao compartilhados pelas paginas do Cuidare.
 *
 * `escapeHtml` e `initials` eram reimplementados em cada pagina. Aqui ficam
 * uma unica vez, mantendo exatamente o comportamento anterior.
 *
 * Funciona em dois ambientes:
 *   - navegador: `window.CuidareFormat`
 *   - Node (checks/): `module.exports`
 */
(function (global, factory) {
  'use strict';

  const utils = factory();

  if (typeof module !== 'undefined' && module.exports) module.exports = utils;
  if (global) global.CuidareFormat = utils;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  /**
   * Escapa os cinco caracteres com significado em HTML.
   * `null` e `undefined` viram string vazia, como antes.
   */
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  /**
   * Iniciais (no maximo duas) do primeiro nome. Entrada vazia devolve vazio.
   */
  function initials(name) {
    return String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  return { escapeHtml, initials };
});
