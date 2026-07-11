export function stableClone(value) {
  return JSON.parse(JSON.stringify(value, (_key, val) => {
    if (typeof val === 'number' && Number.isFinite(val)) return Number(val.toFixed(6));
    if (val instanceof Date) return val.toISOString();
    return val;
  }));
}

export function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, sortObject(value[key])])
  );
}

export function normalizeBaseline(value) {
  return sortObject(stableClone(value));
}

export function normalizeBehavior(value) {
  const normalized = stableClone(value);
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    delete obj.app_fingerprint;
    delete obj.decisionTrace;
    delete obj.trace_summary;
    for (const key of Object.keys(obj)) walk(obj[key]);
  }
  walk(normalized);
  return normalizeBaseline(normalized);
}

export function omitVolatile(value) {
  const normalized = stableClone(value);
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (/timestamp|created_at|savedAt|dateGenerated/i.test(key)) {
        delete obj[key];
      } else {
        walk(obj[key]);
      }
    }
  }
  walk(normalized);
  return normalizeBaseline(normalized);
}
