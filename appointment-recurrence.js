(function (window) {
  const RECURRENCE_LABELS = Object.freeze({
    daily: 'Todos os dias',
    weekly: 'Toda semana',
    biweekly: 'A cada 2 semanas',
    monthly: 'Todo mês',
  });
  const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

  function recurrenceLabel(value) {
    return RECURRENCE_LABELS[String(value || '').trim().toLowerCase()] || 'Não repete';
  }

  function isRecurring(value) {
    return Object.prototype.hasOwnProperty.call(
      RECURRENCE_LABELS,
      String(value || '').trim().toLowerCase(),
    );
  }

  function calendarDayValue(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
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
    if (recurrence === 'weekly') result.setDate(result.getDate() + (index * 7));
    if (recurrence === 'biweekly') result.setDate(result.getDate() + (index * 14));
    if (recurrence === 'monthly') return addMonthsFromAnchor(anchor, index);
    return result;
  }

  function firstIndexOnOrAfter(anchor, recurrence, rangeStart) {
    if (anchor >= rangeStart) return 0;

    let index = 0;
    if (recurrence === 'monthly') {
      index = Math.max(
        0,
        (rangeStart.getFullYear() - anchor.getFullYear()) * 12
          + rangeStart.getMonth() - anchor.getMonth(),
      );
    } else {
      const step = recurrence === 'daily' ? 1 : recurrence === 'weekly' ? 7 : 14;
      const dayDifference = Math.floor(
        (calendarDayValue(rangeStart) - calendarDayValue(anchor)) / DAY_IN_MILLISECONDS,
      );
      index = Math.max(0, Math.floor(dayDifference / step));
    }

    let occurrence = occurrenceForIndex(anchor, recurrence, index);
    while (occurrence < rangeStart) {
      index += 1;
      occurrence = occurrenceForIndex(anchor, recurrence, index);
    }
    return index;
  }

  function expand(appointment, rangeStart, rangeEnd) {
    const anchor = new Date(appointment.starts_at);
    const from = new Date(rangeStart);
    const to = new Date(rangeEnd);
    if (Number.isNaN(anchor.getTime()) || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return [];
    }

    const recurrence = String(appointment.currence || '').trim().toLowerCase();
    if (!isRecurring(recurrence)) {
      return anchor >= from && anchor <= to
        ? [{ ...appointment, starts_at: anchor.toISOString() }]
        : [];
    }

    const occurrences = [];
    let index = firstIndexOnOrAfter(anchor, recurrence, from);
    while (true) {
      const occurrence = occurrenceForIndex(anchor, recurrence, index);
      if (occurrence > to) break;
      if (occurrence >= from) occurrences.push({ ...appointment, starts_at: occurrence.toISOString() });
      index += 1;
    }
    return occurrences;
  }

  window.CuidareRecurrence = { expand, isRecurring, recurrenceLabel };
})(window);
