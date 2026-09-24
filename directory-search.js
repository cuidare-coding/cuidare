/**
 * Busca do diretório público de psicólogos (landing page).
 *
 * Conversa com GET /api/psychologists/directory (endpoint público) e renderiza
 * os cards de resultado. As funções puras ficam expostas em
 * `window.CuidareDirectorySearch` (e em `module.exports` para testes com Node).
 */
(function (global) {
  'use strict';

  const API_BASE = (global && global.CUIDARE_API_URL) || 'https://cuidareapi.onrender.com';
  const DIRECTORY_LIMIT = 24;
  const DEBOUNCE_MS = 350;
  const BIO_PREVIEW_LENGTH = 180;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  function initials(name) {
    return String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
  }

  function truncate(value, maxLength) {
    const text = String(value || '').trim();
    if (!text) return '';
    const limit = maxLength || BIO_PREVIEW_LENGTH;
    return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
  }

  /** Monta a query string enviada para /api/psychologists/directory. */
  function buildSearchParams(filters) {
    const source = filters || {};
    const params = new URLSearchParams();

    ['query', 'expertise', 'location'].forEach((key) => {
      const value = String(source[key] || '').trim();
      if (value) params.set(key === 'query' ? 'q' : key, value);
    });

    const maxPrice = String(source.maxPrice || '').trim();
    if (maxPrice !== '' && Number.isFinite(Number(maxPrice))) {
      params.set('max_price', String(Number(maxPrice)));
    }

    if (source.insurance === 'true' || source.insurance === 'false') {
      params.set('accepts_insurance', source.insurance);
    }

    params.set('limit', String(source.limit || DIRECTORY_LIMIT));
    return params;
  }

  /** Junta especialidades e abordagens em uma lista única para o select. */
  function mergeFacets(facets) {
    const source = facets || {};
    const values = [...(source.specialties || []), ...(source.approaches || [])];
    return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  /** Descreve os filtros ativos, para a mensagem de status. */
  function describeFilters(filters) {
    const source = filters || {};
    const labels = [];
    if (String(source.query || '').trim()) labels.push(`"${String(source.query).trim()}"`);
    if (String(source.expertise || '').trim()) labels.push(String(source.expertise).trim());
    if (String(source.location || '').trim()) labels.push(`em ${String(source.location).trim()}`);
    const price = formatPrice(source.maxPrice);
    if (price) labels.push(`até ${price}`);
    if (source.insurance === 'true') labels.push('aceita convênio');
    if (source.insurance === 'false') labels.push('não aceita convênio');
    return labels;
  }

  function renderCard(psychologist) {
    const name = escapeHtml(psychologist.name);
    const specialty = escapeHtml(psychologist.specialty || 'Psicólogo(a)');
    const crp = escapeHtml(psychologist.crp || '');
    const location = [psychologist.city, psychologist.state].filter(Boolean).map(escapeHtml).join(' – ');
    const price = formatPrice(psychologist.session_price);
    const tags = [];

    if (psychologist.approach) tags.push(escapeHtml(psychologist.approach));
    if (location) tags.push(location);
    if (psychologist.languages) tags.push(escapeHtml(psychologist.languages));
    if (psychologist.accepts_insurance === true) tags.push('Aceita convênio');
    if (psychologist.accepts_insurance === false) tags.push('Particular');

    const bio = truncate(psychologist.bio);

    return `
      <article class="directory-card">
        <div class="directory-card-head">
          <span class="directory-avatar" aria-hidden="true">${escapeHtml(initials(psychologist.name))}</span>
          <div>
            <strong>${name}</strong>
            <span class="directory-sub">${specialty}${crp ? ` · CRP ${crp}` : ''}</span>
          </div>
          <span class="directory-badge">✓ CRP</span>
        </div>
        ${tags.length ? `<div class="directory-tags">${tags.map((tag) => `<span class="directory-tag">${tag}</span>`).join('')}</div>` : ''}
        ${bio ? `<p class="directory-bio">${escapeHtml(bio)}</p>` : ''}
        <div class="directory-foot">
          <span class="directory-price">${price ? `${price}<small>por sessão</small>` : 'Valor a combinar'}</span>
          <a class="btn btn-primary directory-cta" href="login.html">Agendar consulta</a>
        </div>
      </article>`;
  }

  function renderCards(container, psychologists) {
    container.innerHTML = (psychologists || []).map(renderCard).join('');
  }

  function init(options) {
    if (typeof document === 'undefined') return null;

    const config = options || {};
    const els = {
      form: document.getElementById('directory-filters'),
      query: document.getElementById('filter-query'),
      expertise: document.getElementById('filter-expertise'),
      location: document.getElementById('filter-location'),
      maxPrice: document.getElementById('filter-max-price'),
      insurance: document.getElementById('filter-insurance'),
      clear: document.getElementById('filter-clear'),
      heroInput: document.getElementById('hero-search-input'),
      heroButton: document.getElementById('hero-search-button'),
      results: document.getElementById('directory-results'),
      status: document.getElementById('directory-status'),
      section: document.getElementById('busca'),
    };
    if (!els.form || !els.results || !els.status) return null;

    const field = (element, property) => (element ? element[property] || '' : '');
    let facetsLoaded = false;
    let requestId = 0;
    let debounceTimer = null;

    function readFilters() {
      return {
        query: field(els.query, 'value'),
        expertise: field(els.expertise, 'value'),
        location: field(els.location, 'value'),
        maxPrice: field(els.maxPrice, 'value'),
        insurance: field(els.insurance, 'value'),
        limit: config.limit || DIRECTORY_LIMIT,
      };
    }

    function setStatus(message, variant) {
      els.status.textContent = message;
      els.status.dataset.variant = variant || '';
    }

    function fillFacets(facets) {
      if (facetsLoaded || !els.expertise) return;
      const values = mergeFacets(facets);
      if (!values.length) return;
      const selected = els.expertise.value;
      els.expertise.innerHTML = ['<option value="">Todas</option>']
        .concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`))
        .join('');
      els.expertise.value = values.includes(selected) ? selected : '';
      facetsLoaded = true;
    }

    function showEmptyState(filters) {
      const active = describeFilters(filters);
      const suffix = active.length ? ` para ${active.join(' · ')}` : '';
      els.results.innerHTML = `<p class="directory-empty">Nenhum profissional verificado encontrado${escapeHtml(suffix)}. Tente outro termo ou limpe os filtros.</p>`;
    }

    async function search() {
      const filters = readFilters();
      const params = buildSearchParams(filters);
      const currentRequest = ++requestId;

      setStatus('Buscando profissionais...', 'loading');
      els.results.setAttribute('aria-busy', 'true');

      try {
        const response = await fetch(`${API_BASE}/api/psychologists/directory?${params.toString()}`);
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.ok === false) {
          throw new Error(body.error || 'Não foi possível carregar os profissionais agora.');
        }
        if (currentRequest !== requestId) return;

        fillFacets(body.facets);

        const psychologists = body.psychologists || [];
        renderCards(els.results, psychologists);

        if (!psychologists.length) {
          showEmptyState(filters);
          setStatus('Nenhum profissional encontrado com esses filtros.', 'empty');
          return;
        }

        const active = describeFilters(filters);
        const suffix = active.length ? ` para ${active.join(' · ')}` : '';
        const total = body.total || psychologists.length;
        setStatus(
          total > psychologists.length
            ? `${total} profissionais verificados encontrados${suffix} — mostrando ${psychologists.length}.`
            : `${total} ${total === 1 ? 'profissional verificado' : 'profissionais verificados'}${suffix}.`,
          'success',
        );
      } catch (error) {
        if (currentRequest !== requestId) return;
        els.results.innerHTML = '';
        setStatus(`${error.message} `, 'error');
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'directory-retry';
        retry.textContent = 'Tentar novamente';
        retry.addEventListener('click', () => search());
        els.status.appendChild(retry);
      } finally {
        if (currentRequest === requestId) els.results.setAttribute('aria-busy', 'false');
      }
    }

    function scheduleSearch() {
      global.clearTimeout(debounceTimer);
      debounceTimer = global.setTimeout(search, DEBOUNCE_MS);
    }

    function scrollToResults() {
      if (els.section && typeof els.section.scrollIntoView === 'function') {
        els.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function searchFromHero() {
      if (els.heroInput && els.query) els.query.value = els.heroInput.value;
      search();
      scrollToResults();
    }

    [els.query, els.location, els.maxPrice].forEach((input) => {
      if (input) input.addEventListener('input', scheduleSearch);
    });
    [els.expertise, els.insurance].forEach((select) => {
      if (select) select.addEventListener('change', search);
    });
    els.form.addEventListener('submit', (event) => {
      event.preventDefault();
      search();
    });

    if (els.clear) {
      els.clear.addEventListener('click', () => {
        [els.query, els.location, els.maxPrice, els.heroInput].forEach((input) => {
          if (input) input.value = '';
        });
        [els.expertise, els.insurance].forEach((select) => {
          if (select) select.value = '';
        });
        search();
      });
    }

    if (els.heroButton) els.heroButton.addEventListener('click', searchFromHero);
    if (els.heroInput) {
      els.heroInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        searchFromHero();
      });
    }

    search(); // primeira carga: mostra os profissionais verificados disponíveis

    return { search, readFilters, elements: els };
  }

  const api = {
    API_BASE,
    DIRECTORY_LIMIT,
    buildSearchParams,
    describeFilters,
    escapeHtml,
    formatPrice,
    initials,
    mergeFacets,
    renderCard,
    renderCards,
    truncate,
    init,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.CuidareDirectorySearch = api;

  if (global && global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', () => init());
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : null);
