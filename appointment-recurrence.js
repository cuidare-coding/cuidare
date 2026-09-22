(function (window) {
  const RECURRENCE_LABELS = Object.freeze({
    daily: 'Todos os dias',
    weekly: 'Toda semana',
    biweekly: 'A cada 2 semanas',
    monthly: 'Todo mês',
  });

  // Espelha RECURRENCE_HORIZON_DAYS de api/routes/appointments.py. O backend
  // grava uma linha por ocorrência da série, então o horizonte define quantas
  // sessões uma série gera de uma só vez (o valor aqui é usado apenas na
  // pré-visualização mostrada antes de salvar).
  const RECURRENCE_HORIZON_DAYS = Object.freeze({
    daily: 90,
    weekly: 730,
    biweekly: 730,
    monthly: 730,
  });

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function recurrenceLabel(value) {
    return RECURRENCE_LABELS[normalize(value)] || 'Não repete';
  }

  function isRecurring(value) {
    return Object.prototype.hasOwnProperty.call(RECURRENCE_LABELS, normalize(value));
  }

  function addMonthsFromAnchor(anchor, monthOffset) {
    const monthIndex = anchor.getFullYear() * 12 + anchor.getMonth() + monthOffset;
    const year = Math.floor(monthIndex / 12);
    const month = ((monthIndex % 12) + 12) % 12;
    const day = Math.min(anchor.getDate(), new Date(year, month + 1, 0).getDate());
    const result = new Date(anchor);
    result.setDate(1);
    result.setFullYear(year, month, day);
    return result;
  }

  function occurrenceForIndex(anchor, recurrence, index) {
    const result = new Date(anchor);
    if (recurrence === 'daily') result.setDate(result.getDate() + index);
    else if (recurrence === 'weekly') result.setDate(result.getDate() + (index * 7));
    else if (recurrence === 'biweekly') result.setDate(result.getDate() + (index * 14));
    else if (recurrence === 'monthly') return addMonthsFromAnchor(anchor, index);
    return result;
  }

  function seriesEnd(anchor, recurrence) {
    const days = RECURRENCE_HORIZON_DAYS[normalize(recurrence)] || 0;
    const result = new Date(anchor);
    result.setDate(result.getDate() + days);
    return result;
  }

  function occurrences(value, recurrence) {
    const anchor = new Date(value);
    const rule = normalize(recurrence);
    if (Number.isNaN(anchor.getTime())) return [];
    if (!isRecurring(rule)) return [anchor];

    const end = seriesEnd(anchor, rule);
    const result = [];
    let index = 0;
    while (true) {
      const occurrence = occurrenceForIndex(anchor, rule, index);
      if (occurrence > end) break;
      result.push(occurrence);
      index += 1;
    }
    return result;
  }

  window.CuidareRecurrence = {
    occurrences,
    recurrenceLabel,
    isRecurring,
    normalize,
  };
})(window);
