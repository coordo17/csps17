// CR de reunion de coordination v3 : balises et tableaux (decisions d'Alain 30/09)
function lignesRCO(txt) { return String(txt || '').split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean); }
function tagsRCO(data) {
  var r = (typeof terrainAffaire !== 'undefined' && terrainAffaire && terrainAffaire._rco) || {};
  var aff = affaires.find(function(a){ return a.id === ((typeof terrainAffaire !== 'undefined' && terrainAffaire && terrainAffaire.id) || data.id); }) || data;
  var n = 1; try { n = rjcEntriesForDoc(aff, 'RCO').length + 1; } catch (e) {}
  return {
    rco_ref: 'CSPS17/RCO-' + (data.num || '') + '-' + String(r.no || n).padStart(2, '0'),
    rco_date: r.date ? r.date.split('-').reverse().join('/') : '',
    rco_no: String(r.no || ''), rco_heure_txt: r.heure ? 'Heure : ' + r.heure : '', rco_lieu: r.lieu || '',
    rco_points: r.points || '', rco_prochaine: r.prochaine || '', rco_odj: r.odj || ''
  };
}
function injecterRCO(zip, data) {
  var r = (typeof terrainAffaire !== 'undefined' && terrainAffaire && terrainAffaire._rco); if (!r) return zip;
  var O = GenVisite.outils, xml = zip.file('word/document.xml').asText();
  // Participants : on garde l'en-tete et la ligne du coordonnateur
  var parts = lignesRCO(r.participants);
  if (parts.length) {
    var i = xml.indexOf('Excus\u00e9</w:t>');
    if (i !== -1) {
      var tS = xml.lastIndexOf('<w:tbl>', i), tE = xml.indexOf('</w:tbl>', i) + 8, tbl = xml.slice(tS, tE);
      var fin1 = tbl.indexOf('</w:tr>') + 7, fin2 = tbl.indexOf('</w:tr>', fin1) + 7;
      var lignes = parts.map(function(l){
        var excuse = /\(excus[\u00e9e]\)\s*$/i.test(l); l = l.replace(/\(excus[\u00e9e]\)\s*$/i, '').trim();
        var p = l.split(/\s+-\s+/); var nom = p[0] || '', rest = p.slice(1).join(' \u2014 ');
        return '<w:tr>' + O.tc(3200, O.para(nom, 18)) + O.tc(3200, O.para(rest, 18)) + O.tc(1600, O.para(excuse ? '' : '\u2713', 18, false, true)) + O.tc(1640, O.para(excuse ? '\u2713' : '', 18, false, true)) + '</w:tr>';
      });
      xml = xml.slice(0, tS) + tbl.slice(0, fin2) + lignes.join('') + '</w:tbl>' + xml.slice(tE);
    }
  }
  // Suivi des observations en cours (partage avec le CR de visite)
  var aff = affaires.find(function(a){ return a.id === ((typeof terrainAffaire !== 'undefined' && terrainAffaire && terrainAffaire.id) || data.id); }) || data;
  var prec = (aff.derniereVisite && aff.derniereVisite.observations) || [];
  if (prec.length) xml = O.remplacerCorps(xml, 'Suite donn\u00e9e', prec.map(function(o, k){
    return '<w:tr>' + O.tc(500, O.para(String(k + 1), 16, true, true)) + O.tc(1600, O.para(aff.derniereVisite.origine || 'CR pr\u00e9c\u00e9dent', 15)) + O.tc(3400, O.para((o.description || '') + (o.responsable ? ' \u2014 ' + o.responsable : ''), 16)) + O.tc(2340, O.para('', 16)) + O.tc(1800, O.para('\u2610 Lev\u00e9e \u2610 Non lev\u00e9e', 15)) + '</w:tr>';
  }));
  // Nouvelles observations : « description ; responsable ; delai »
  var nouv = lignesRCO(r.decisions).map(function(l){ var p = l.split(';'); return { description: (p[0] || '').trim(), responsable: (p[1] || '').trim(), delai: (p[2] || '').trim() }; });
  if (nouv.length) xml = O.remplacerCorps(xml, 'Responsable</w:t>', nouv.map(function(o, k){
    return '<w:tr>' + O.tc(500, O.para(String(k + 1), 16, true, true)) + O.tc(2000, O.para('\u2611 Obs. \u2610 Notif. \u2610 DGI', 15)) + O.tc(3540, O.para(o.description, 16)) + O.tc(1800, O.para(o.delai, 16)) + O.tc(1800, O.para(o.responsable, 16)) + '</w:tr>';
  }));
  var vus = {}, noms = []; nouv.forEach(function(o){ var k = o.responsable.toLowerCase(); if (o.responsable && !vus[k]) { vus[k] = 1; noms.push(o.responsable); } });
  xml = O.visas(xml, noms);
  // memorise pour le suivi du prochain CR (visite ou reunion)
  aff.derniereVisite = { date: r.date || '', origine: 'R\u00e9union n\u00b0' + (r.no || ''), observations: nouv.filter(function(o){ return o.description; }) };
  aff.savedAt = new Date().toISOString();
  try { localStorage.setItem('csps17_affaires', JSON.stringify(affaires)); } catch (e) {}
  zip.file('word/document.xml', xml);
  return zip;
}

