// ============================================================================
// REGISTRE-JOURNAL DE COORDINATION — decisions d'Alain du 30/09 et du 01/10
// (points 1 a 5) — sources : R.4532-38 a R.4532-41 (bordereau, entreprises
// intervenantes, consultation, conservation 5 ans), R.4532-12 3° (ouverture
// a la signature du contrat de coordination), R.4532-39 (PV DIUO annexe).
// ============================================================================

function rjcEscXml(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function rjcCellTexte(s, bold) {
  return '<w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>' + (bold ? '<w:b/><w:bCs/>' : '')
    + '<w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">' + rjcEscXml(s) + '</w:t></w:r></w:p>';
}
function rjcTc(w, contenu) {
  var bordures = '<w:top w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:left w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>'
    + '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:right w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>';
  var mar = '<w:top w:w="55" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="55" w:type="dxa"/><w:right w:w="110" w:type="dxa"/>';
  return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/><w:tcBorders>' + bordures + '</w:tcBorders>'
    + '<w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcMar>' + mar + '</w:tcMar><w:vAlign w:val="center"/></w:tcPr>' + contenu + '</w:tc>';
}
function rjcTrouverTable(xmlStr, ancreUnique) {
  var idx1 = xmlStr.indexOf(ancreUnique);
  if (idx1 === -1) return null;
  var tblStart = xmlStr.lastIndexOf('<w:tbl>', idx1);
  var tblEnd = xmlStr.indexOf('</w:tbl>', idx1) + 8;
  return { start: tblStart, end: tblEnd, xml: xmlStr.slice(tblStart, tblEnd) };
}
function rjcLignes(tblXml) {
  var out = []; var re = /<w:tr[ >][\s\S]*?<\/w:tr>/g; var m;
  while ((m = re.exec(tblXml))) out.push({ start: m.index, end: m.index + m[0].length, xml: m[0] });
  return out;
}
function rjcCellules(trXml) {
  var out = []; var re = /<w:tc>[\s\S]*?<\/w:tc>/g; var m;
  while ((m = re.exec(trXml))) out.push({ start: m.index, end: m.index + m[0].length, xml: m[0] });
  return out;
}
function rjcCelluleAvecTexte(tcXml, texte, bold) {
  // tcXml commence deja par '<w:tc>' : on garde tout jusqu'a la fin de '</w:tcPr>'
  // (bordures/largeur d'origine) et on ne remplace que le contenu (les <w:p>).
  var fin = tcXml.indexOf('</w:tcPr>');
  var tcPr = fin === -1 ? '<w:tc>' : tcXml.slice(0, fin + 9);
  return tcPr + rjcCellTexte(texte, bold) + '</w:tc>';
}
// Remplace, dans la ligne dont la 1ere cellule commence par `label`, les cellules
// suivantes par `valeurs` (une valeur = null/undefined laisse la cellule intacte).
function rjcRemplirLigne(tblXml, label, valeurs) {
  var trs = rjcLignes(tblXml);
  for (var i = 0; i < trs.length; i++) {
    if (trs[i].xml.indexOf(label) === -1) continue;
    var tcs = rjcCellules(trs[i].xml);
    var out = '', cursor = 0;
    for (var ci = 0; ci < tcs.length; ci++) {
      out += trs[i].xml.slice(cursor, tcs[ci].start);
      var v = valeurs[ci - 1]; // cellule 0 = le libelle lui-meme, inchange
      out += (ci >= 1 && v !== undefined && v !== null) ? rjcCelluleAvecTexte(tcs[ci].xml, v) : tcs[ci].xml;
      cursor = tcs[ci].end;
    }
    out += trs[i].xml.slice(cursor);
    return tblXml.slice(0, trs[i].start) + out + tblXml.slice(trs[i].end);
  }
  return tblXml;
}

// ---------- Point 1 : bordereau (R.4532-38), sans limite de lignes ----------
function injecterRJC(zip, entries) {
  var docFile = zip.file('word/document.xml');
  if (!docFile) return zip;
  var xmlStr = docFile.asText();
  var t = rjcTrouverTable(xmlStr, 'Destinataires vis\u00e9s');
  if (!t) { zip.file('word/document.xml', xmlStr); return zip; }

  var trs = rjcLignes(t.xml);
  var entete = t.xml.slice(0, trs[0].end); // preambule <w:tbl><w:tblPr>...<w:tblGrid> + la ligne d'entete
  // La derniere ligne du modele est le rappel \u2605 PV-DIUO : on la garde telle quelle
  // tant qu'aucune entree reelle n'est le PV de transmission du DIUO (R.4532-39).
  var ligneEtoile = trs[trs.length - 1] && trs[trs.length - 1].xml.indexOf('\u2605') !== -1 ? trs[trs.length - 1].xml : '';
  var pvDiuoAuRegistre = (entries || []).some(function (e) { return e.docRef === 'PV-DIUO'; });

  var sorted = (entries || []).slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
  var newTbl = entete;
  for (var i = 0; i < sorted.length; i++) {
    var e = sorted[i];
    newTbl += '<w:tr>'
      + rjcTc(650, rjcCellTexte(String(i + 1)))
      + rjcTc(1650, rjcCellTexte(e.ref || e.docRef || '', true))
      + rjcTc(3100, rjcCellTexte(e.nature || ''))
      + rjcTc(1150, rjcCellTexte(formatDateFR(e.date)))
      + rjcTc(2740, rjcCellTexte((e.intervenants || e.objet || '')))
      + '</w:tr>';
  }
  if (!pvDiuoAuRegistre && ligneEtoile) newTbl += ligneEtoile;
  newTbl += '</w:tbl>';

  xmlStr = xmlStr.slice(0, t.start) + newTbl + xmlStr.slice(t.end);
  zip.file('word/document.xml', xmlStr);
  return zip;
}

// ---------- Point 2 : entreprises intervenantes (R.4532-38 3°) ----------
var RJC_QUALITE_LABEL = { principale: 'Titulaire / contractant', 'sous-traitant': 'Sous-traitant', prestataire: 'Prestataire' };
function injecterEntreprisesRJC(zip, entreprises) {
  var docFile = zip.file('word/document.xml');
  if (!docFile) return zip;
  var xmlStr = docFile.asText();
  var t = rjcTrouverTable(xmlStr, 'Lot / travaux confi\u00e9s');
  if (!t) { zip.file('word/document.xml', xmlStr); return zip; }

  var trs = rjcLignes(t.xml);
  var entete = t.xml.slice(0, trs[0].end); // preambule <w:tbl><w:tblPr>...<w:tblGrid> + la ligne d'entete
  var liste = (entreprises || []).filter(function (e) { return e.nom; });
  var newTbl = entete;
  if (!liste.length) {
    newTbl += '<w:tr>' + rjcTc(2200, rjcCellTexte('\u00c0 compl\u00e9ter d\u00e8s connaissance des entreprises (R.4532-38 3\u00b0)'))
      + rjcTc(1200, rjcCellTexte('')) + rjcTc(2000, rjcCellTexte('')) + rjcTc(1400, rjcCellTexte(''))
      + rjcTc(1000, rjcCellTexte('')) + rjcTc(700, rjcCellTexte('')) + rjcTc(1140, rjcCellTexte('')) + '</w:tr>';
  } else {
    liste.forEach(function (e) {
      newTbl += '<w:tr>'
        + rjcTc(2200, rjcCellTexte(e.nom || '', true))
        + rjcTc(1200, rjcCellTexte(RJC_QUALITE_LABEL[e.type] || 'Titulaire / contractant'))
        + rjcTc(2000, rjcCellTexte(e.adresse || '\u00e0 compl\u00e9ter'))
        + rjcTc(1400, rjcCellTexte(e.lot || ''))
        + rjcTc(1000, rjcCellTexte(e.dateInterv ? formatDateFR(e.dateInterv) : '\u00e0 compl\u00e9ter'))
        + rjcTc(700, rjcCellTexte(e.effectif ? String(e.effectif) : '\u00e0 compl\u00e9ter'))
        + rjcTc(1140, rjcCellTexte(e.duree || '\u00e0 compl\u00e9ter'))
        + '</w:tr>';
    });
  }
  newTbl += '</w:tbl>';
  xmlStr = xmlStr.slice(0, t.start) + newTbl + xmlStr.slice(t.end);
  zip.file('word/document.xml', xmlStr);
  return zip;
}

// ---------- Point 4 : tableau des intervenants (section 2 du registre) ----------
function injecterIntervenantsRJC(zip, data) {
  var docFile = zip.file('word/document.xml');
  if (!docFile) return zip;
  var xmlStr = docFile.asText();
  var t = rjcTrouverTable(xmlStr, 'Raison sociale / Nom');
  if (!t) { zip.file('word/document.xml', xmlStr); return zip; }

  var moa = data.moa || {}, moe = data.moe || {}, org = data.organismes || {};
  var ct = org.ct || {};
  var tbl = t.xml;
  tbl = rjcRemplirLigne(tbl, "Ma\u00eetre d'Ouvrage", [moa.nom || '\u00e0 compl\u00e9ter', moa.tel || '', moa.mail || '']);
  tbl = rjcRemplirLigne(tbl, "Ma\u00eetre d'\u0152uvre", [moe.nom || '\u00e0 compl\u00e9ter', moe.tel || '', moe.mail || '']);
  tbl = rjcRemplirLigne(tbl, 'Contr\u00f4leur technique', [ct.nom || '\u2014', ct.tel || '', ct.mail || '']);
  var dreetsNom = [(org.dreets || {}).nom, (org.dreets || {}).adresse].filter(Boolean).join(' \u2014 ');
  tbl = rjcRemplirLigne(tbl, 'DREETS', [dreetsNom || '\u00e0 compl\u00e9ter', '', '']);
  var carsatNom = [(org.carsat || {}).nom, (org.carsat || {}).adresse].filter(Boolean).join(' \u2014 ');
  tbl = rjcRemplirLigne(tbl, 'CARSAT', [carsatNom || '\u00e0 compl\u00e9ter', '', '']);
  var oppbtpNom = [(org.oppbtp || {}).nom, (org.oppbtp || {}).adresse].filter(Boolean).join(' \u2014 ');
  tbl = rjcRemplirLigne(tbl, 'OPPBTP', [oppbtpNom || '\u00e0 compl\u00e9ter', '', '']);

  xmlStr = xmlStr.slice(0, t.start) + tbl + xmlStr.slice(t.end);
  zip.file('word/document.xml', xmlStr);
  return zip;
}

// ---------- Point 5 : Word du registre dans le zip d'envoi (au lieu du .txt) ----------
// Pipeline minimal, independant de l'ecran en cours : fetch du modele, rendu des
// tags, puis les 3 injections ci-dessus. Retourne un blob .docx pret a joindre.
async function genererRJCBordereauBlob(affaire) {
  var response = await fetch('modeles/' + (DOC_FILES['RJC'] || 'CSPS17_Registre_Journal_Bordereau_v3_2.docx'));
  if (!response.ok) throw new Error('Mod\u00e8le RJC introuvable');
  var arrayBuffer = await response.arrayBuffer();
  var zip = new PizZip(arrayBuffer);
  var DocxTemplater = window.docxtemplater || window.Docxtemplater || docxtemplater;
  var doc = new DocxTemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{{', end: '}}' } });
  doc.render(buildTagData(affaire));
  var finalZip = doc.getZip();
  finalZip = injecterRJC(finalZip, affaire.rjc || []);
  finalZip = injecterEntreprisesRJC(finalZip, affaire.entreprises || []);
  finalZip = injecterIntervenantsRJC(finalZip, affaire);
  return finalZip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
