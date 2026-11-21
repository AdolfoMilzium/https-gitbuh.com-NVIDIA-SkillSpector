/** Lector mínimo de robots.txt (grupos User-agent, Allow/Disallow con * y $; gana la regla más larga). */
export function parsearRobots(texto) {
  const grupos = []; let actual = null;
  for (const bruta of texto.split(/\r?\n/)) {
    const l = bruta.replace(/#.*$/, '').trim(); if (!l) continue;
    const i = l.indexOf(':'); if (i < 0) continue;
    const k = l.slice(0, i).trim().toLowerCase(), v = l.slice(i + 1).trim();
    if (k === 'user-agent') { if (!actual || actual.reglas.length) { actual = { agentes: [], reglas: [] }; grupos.push(actual); } actual.agentes.push(v.toLowerCase()); }
    else if (actual && (k === 'allow' || k === 'disallow')) actual.reglas.push({ permite: k === 'allow', ruta: v });
  }
  return grupos;
}
const aRegex = (r) => new RegExp('^' + r.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + (r.endsWith('$') ? '' : ''));
export function permitido(grupos, agente, ruta) {
  const ag = agente.toLowerCase();
  const propio = grupos.filter((g) => g.agentes.some((a) => a !== '*' && ag.includes(a)));
  const usar = propio.length ? propio : grupos.filter((g) => g.agentes.includes('*'));
  let mejor = null;
  for (const g of usar) for (const r of g.reglas) {
    if (!r.ruta) continue;
    if (aRegex(r.ruta).test(ruta) && (!mejor || r.ruta.length > mejor.ruta.length || (r.ruta.length === mejor.ruta.length && r.permite))) mejor = r;
  }
  return mejor ? mejor.permite : true;
}
