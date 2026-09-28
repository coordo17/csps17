// ===== Generation du CR de visite (Word) — partage navigateur / test Node =====
// Reprend les injecteurs de CSPS17 qui fonctionnaient sur ce modele, corriges :
// photos en JPEG declarees comme telles, danger grave "imminent", aucune IA.
(function (racine) {
  function escXml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function dateFR(iso) { if (!iso) return ''; var p = String(iso).split('-'); return p.length === 3 ? p[2]+'/'+p[1]+'/'+p[0] : iso; }
  function b64ToBytes(b64) {
    if (typeof atob === 'function') { var bin = atob(b64), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return arr; }
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  var BORD = '<w:top w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:left w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:right w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>';
  var MAR = '<w:top w:w="55" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="55" w:type="dxa"/><w:right w:w="110" w:type="dxa"/>';
  function tc(w, content) {
    return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/><w:tcBorders>' + BORD + '</w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/><w:tcMar>' + MAR + '</w:tcMar><w:vAlign w:val="center"/></w:tcPr>' + content + '</w:tc>';
  }
  function para(s, sz, bold, center) {
    var lignes = String(s == null ? '' : s).split('\n');
    return lignes.map(function (l) {
      return '<w:p>' + (center ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : '') + '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>' + (bold ? '<w:b/><w:bCs/>' : '')
        + '<w:sz w:val="' + (sz || 18) + '"/><w:szCs w:val="' + (sz || 18) + '"/></w:rPr><w:t xml:space="preserve">' + escXml(l) + '</w:t></w:r></w:p>';
    }).join('');
  }
  // Remplace les lignes du tableau reperé par "ancre" : on garde l'en-tete
  // (lignes avant la derniere, ou seulement la premiere si garderUne), et on
  // ajoute les lignes construites.
  function remplacerLignes(xml, ancre, lignes, garderPremiereSeulement) {
    var idx = xml.indexOf(ancre); if (idx === -1) return xml;
    var tStart = xml.lastIndexOf('<w:tbl>', idx), tEnd = xml.indexOf('</w:tbl>', idx) + 8;
    var tbl = xml.slice(tStart, tEnd), base;
    if (garderPremiereSeulement) { base = tbl.slice(0, tbl.indexOf('</w:tr>') + 7); }
    else { base = tbl.slice(0, tbl.lastIndexOf('<w:tr ')); }
    return xml.slice(0, tStart) + base + lignes.join('') + '</w:tbl>' + xml.slice(tEnd);
  }

  function participants(xml, liste) {
    if (!liste || !liste.length) return xml;
    return remplacerLignes(xml, 'Participant</w:t>', liste.map(function (p) {
      return '<w:tr>' + tc(3200, para(p.nom, 18)) + tc(3200, para(p.qualite, 18)) + tc(3240, para(p.present ? '✓' : '', 18, false, true)) + '</w:tr>';
    }), true);
  }
  function entreprises(xml, liste) {
    if (!liste || !liste.length) return xml;
    return remplacerLignes(xml, 'Entreprise présente sur chantier', liste.map(function (e) {
      var label = (e.nom || '') + ' — ' + (e.type === 'EE' ? '☑' : '☐') + ' EE ' + (e.type === 'ST' ? '☑' : '☐') + ' ST ' + (e.type === 'Prestataire' ? '☑' : '☐') + ' Prestataire';
      return '<w:tr>' + tc(3200, para(label, 15)) + tc(3200, para(e.lot, 18)) + tc(3240, para(e.effectif ? String(e.effectif) : '', 18)) + '</w:tr>';
    }), false);
  }
  var TYPES = { obs: ['☑','☐','☐'], notif: ['☐','☑','☐'], dgi: ['☐','☐','☑'] };
  function observations(xml, liste) {
    var ancre = '☐ Observation ☐ Notification ☐ Danger grave imminent';
    if (xml.indexOf(ancre) === -1) return xml;
    var lignes;
    if (!liste || !liste.length) {
      lignes = ['<w:tr>' + tc(500, para('—', 16, false, true)) + tc(2200, para('', 15)) + tc(3940, para('Aucune observation relevée lors de cette visite.', 18)) + tc(1400, para('', 18)) + tc(1600, para('', 18)) + '</w:tr>'];
    } else {
      lignes = liste.map(function (o, i) {
        var t = TYPES[o.type] || TYPES.obs;
        var nature = para(t[0] + ' Observation ' + t[1] + ' Notification', 15) + para(t[2] + ' Danger grave imminent', 15);
        return '<w:tr>' + tc(500, para(String(i + 1), 16, true, true)) + tc(2200, nature) + tc(3940, para(o.description, 18)) + tc(1400, para(o.delai, 18)) + tc(1600, para(o.responsable, 18)) + '</w:tr>';
      });
    }
    // le tableau des observations : en-tete = premiere ligne uniquement
    var idx = xml.indexOf(ancre);
    var tStart = xml.lastIndexOf('<w:tbl>', idx), tEnd = xml.indexOf('</w:tbl>', idx) + 8;
    var tbl = xml.slice(tStart, tEnd);
    var entete = tbl.slice(0, tbl.indexOf('</w:tr>') + 7);
    return xml.slice(0, tStart) + entete + lignes.join('') + '</w:tbl>' + xml.slice(tEnd);
  }
  function cocherCategorie(xml, cat) {
    cat = parseInt(cat, 10); if (!cat) return xml;
    return xml.split('☐ Cat. 1 ☐ Cat. 2 ☐ Cat. 3').join((cat===1?'☑':'☐')+' Cat. 1 '+(cat===2?'☑':'☐')+' Cat. 2 '+(cat===3?'☑':'☐')+' Cat. 3');
  }
  function supprimerLignesVides(xml, labels) {
    labels.forEach(function (lab) {
      var pos = xml.indexOf(lab); if (pos === -1) return;
      var trS = xml.lastIndexOf('<w:tr ', pos), trE = xml.indexOf('</w:tr>', pos) + 7;
      var c1 = xml.indexOf('</w:tc>', trS), c2 = xml.indexOf('<w:tc>', c1), c2e = xml.indexOf('</w:tc>', c2);
      if (c2 === -1 || c2 > trE) return;
      if (!/<w:t[^>]*>[^<]+<\/w:t>/.test(xml.slice(c2, c2e))) xml = xml.slice(0, trS) + xml.slice(trE);
    });
    return xml;
  }
  function imageXml(rid, nom, cx, cy) {
    return '<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">'
      + '<wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="' + rid + '" name="' + nom + '"/>'
      + '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
      + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
      + '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + rid + '" name="' + nom + '"/><pic:cNvPicPr/></pic:nvPicPr>'
      + '<pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
      + '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
      + '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  // Ajoute une image (dataURL jpeg ou png) au paquet Word, renvoie l'id de relation
  function ajouterImage(ctx, dataUrl, rid, nom) {
    var m = /^data:image\/(png|jpe?g);base64,(.*)$/.exec(dataUrl || ''); if (!m) return false;
    var ext = m[1] === 'png' ? 'png' : 'jpeg';
    ctx.zip.file('word/media/' + nom + '.' + ext, b64ToBytes(m[2]));
    ctx.rels = ctx.rels.replace('</Relationships>', '<Relationship Id="rId' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + nom + '.' + ext + '"/></Relationships>');
    if (ctx.ct.indexOf('Extension="' + ext + '"') === -1) ctx.ct = ctx.ct.replace('</Types>', '<Default Extension="' + ext + '" ContentType="image/' + ext + '"/></Types>');
    return true;
  }
  // Taille de l'image dans le document en conservant ses proportions
  function taille(photo, largeurEmu, hauteurMaxEmu) {
    var w = photo.w || 4, h = photo.h || 3, cx = largeurEmu, cy = Math.round(cx * h / w);
    if (cy > hauteurMaxEmu) { cy = hauteurMaxEmu; cx = Math.round(cy * w / h); }
    return [cx, cy];
  }
  function photos(ctx, xml, liste) {
    if (!liste || !liste.length) return xml;
    var ancre = xml.indexOf('Photo 1</w:t>');
    if (ancre !== -1) {
      var tS = xml.lastIndexOf('<w:tbl>', ancre), tE = xml.indexOf('</w:tbl>', ancre) + 8, tbl = xml.slice(tS, tE);
      var trs = [], from = 0;
      while (true) { var a = tbl.indexOf('<w:tr ', from); if (a === -1) break; var b = tbl.indexOf('</w:tr>', a) + 7; trs.push([a, b]); from = b; }
      var groupes = [[1, [0, 1]], [4, [2, 3]]];
      for (var g = groupes.length - 1; g >= 0; g--) {
        var trI = groupes[g][0]; if (trI >= trs.length) continue;
        var tr = tbl.slice(trs[trI][0], trs[trI][1]);
        for (var k = 1; k >= 0; k--) {
          var pi = groupes[g][1][k]; if (pi >= liste.length) continue;
          var rid = 300 + pi; if (!ajouterImage(ctx, liste[pi].url, rid, 'photo' + rid)) continue;
          var c1s = tr.indexOf('<w:tc>'), c1e = tr.indexOf('</w:tc>') + 7;
          var cs = k === 0 ? c1s : tr.indexOf('<w:tc>', c1e), ce = tr.indexOf('</w:tc>', cs);
          var m = /<w:p\b[^>]*\/>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/.exec(tr.slice(cs, ce)); if (!m) continue;
          var ps = cs + m.index, pe = ps + m[0].length, dim = taille(liste[pi], 2880000, 2160000);
          var contenu = '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>' + imageXml(rid, 'photo' + rid, dim[0], dim[1]) + '</w:p>';
          tr = tr.slice(0, ps) + contenu + tr.slice(pe);
        }
        // ligne suivante = legendes des deux photos
        var trL = trI + 1, trLeg = trL < trs.length ? tbl.slice(trs[trL][0], trs[trL][1]) : null;
        if (trLeg) {
          var rechercheDe = 0;
          for (var kk = 0; kk <= 1; kk++) {
            var pj = groupes[g][1][kk], mark = 'Légende / localisation :</w:t>';
            var pos = trLeg.indexOf(mark, rechercheDe); if (pos === -1) break;
            rechercheDe = pos + mark.length;
            if (pj < liste.length && liste[pj].legende) {
              var fin = trLeg.indexOf('</w:r>', pos) + 6;
              var ajout = '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve"> ' + escXml(liste[pj].legende) + '</w:t></w:r>';
              trLeg = trLeg.slice(0, fin) + ajout + trLeg.slice(fin);
              rechercheDe = fin + ajout.length;
            }
          }
        }
        tbl = tbl.slice(0, trs[trI][0]) + tr + tbl.slice(trs[trI][1], trs[trI][1]) + tbl.slice(trs[trI][1]);
        if (trLeg) { var a0 = trs[trL][0] + (tr.length - (trs[trI][1] - trs[trI][0])); tbl = tbl.slice(0, a0) + trLeg + tbl.slice(a0 + (trs[trL][1] - trs[trL][0])); }
      }
      xml = xml.slice(0, tS) + tbl + xml.slice(tE);
    }
    if (liste.length > 4) {
      var extra = para('Photos complémentaires', 20, true, true);
      for (var p = 4; p < liste.length; p += 2) {
        var cells = '';
        for (var q = p; q < p + 2; q++) {
          if (q < liste.length && ajouterImage(ctx, liste[q].url, 300 + q, 'photo' + (300 + q))) {
            var d2 = taille(liste[q], 2700000, 2025000);
            cells += '<w:tc><w:tcPr><w:tcW w:w="4819" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr>' + imageXml(300 + q, 'photo' + (300 + q), d2[0], d2[1]) + '</w:p>' + para(liste[q].legende || ('Photo ' + (q + 1)), 16, false, true) + '</w:tc>';
          } else cells += '<w:tc><w:tcPr><w:tcW w:w="4819" w:type="dxa"/></w:tcPr><w:p/></w:tc>';
        }
        extra += '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="AAAAAA"/><w:left w:val="single" w:sz="4" w:color="AAAAAA"/><w:bottom w:val="single" w:sz="4" w:color="AAAAAA"/><w:right w:val="single" w:sz="4" w:color="AAAAAA"/><w:insideV w:val="single" w:sz="4" w:color="AAAAAA"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4819"/><w:gridCol w:w="4819"/></w:tblGrid><w:tr>' + cells + '</w:tr></w:tbl>';
      }
      var sig = xml.indexOf('5. DIFFUSION ET SIGNATURES'), pS = -1;
      if (sig !== -1) {
        var tO = xml.lastIndexOf('<w:tbl>', sig), tC = xml.lastIndexOf('</w:tbl>', sig);
        pS = (tO > tC) ? tO : Math.max(xml.lastIndexOf('<w:p ', sig), xml.lastIndexOf('<w:p>', sig));
      }
      xml = pS !== -1 ? xml.slice(0, pS) + extra + xml.slice(pS) : xml.replace('<w:sectPr', extra + '<w:sectPr');
    }
    return xml;
  }
  function signature(ctx, xml, dataUrl) {
    if (!dataUrl) return xml;
    var cible = 'Signature :</w:t></w:r>', pos = xml.indexOf(cible); if (pos === -1) return xml;
    if (!ajouterImage(ctx, dataUrl, 290, 'sig290')) return xml;
    return xml.slice(0, pos + cible.length) + imageXml(290, 'sig290', 1800000, 500000) + xml.slice(pos + cible.length);
  }

  // chantier = {nom, adresse, nature, moa, cat, refPgc}
  // cr = {date, heure, no, ref, meteo, phase, avancement, prochaine, entreprises[], observations[], photos[], signatureCsps}
  function genererCRVisite(modele, chantier, cr, PizZip, Docxtemplater) {
    var zip = new PizZip(modele);
    var doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{{', end: '}}' } });
    doc.render({
      moa_nom: chantier.moa || '', chantier_nom: chantier.nom || '', chantier_adresse: chantier.adresse || '',
      chantier_nature: chantier.nature || '', ref_pgc: chantier.refPgc || '—', ref_vis: cr.ref || '',
      date_visite: dateFR(cr.date), no_visite: String(cr.no || ''), heure_visite: cr.heure || '',
      meteo_visite: cr.meteo || '', phase: cr.phase || '', avancement: cr.avancement || '', prochaine: cr.prochaine || ''
    });
    zip = doc.getZip();
    var ctx = { zip: zip, rels: zip.file('word/_rels/document.xml.rels').asText(), ct: zip.file('[Content_Types].xml').asText() };
    var xml = zip.file('word/document.xml').asText();
    xml = cocherCategorie(xml, chantier.cat);
    var ents = (cr.entreprises || []).filter(function (e) { return e && e.nom; });
    var part = [{ nom: 'Alain SUZANNE — CSPS17', qualite: 'Coordonnateur SPS', present: true }].concat(ents.filter(function (e) { return e.contact; }).map(function (e) {
      return { nom: e.contact, qualite: e.nom + (e.lot ? ' — ' + e.lot : ''), present: true };
    }));
    xml = participants(xml, part);
    xml = entreprises(xml, ents);
    xml = observations(xml, (cr.observations || []).filter(function (o) { return o && o.description; }));
    var toutes = [];
    (cr.observations || []).forEach(function (o) { (o.photos || []).forEach(function (p) { toutes.push({ url: p.url, w: p.w, h: p.h, legende: p.legende || String(o.description || '').slice(0, 80) }); }); });
    xml = photos(ctx, xml, toutes);
    xml = signature(ctx, xml, cr.signatureCsps);
    xml = supprimerLignesVides(xml, ['Prochaine intervention prévue', 'Conditions météo']);
    zip.file('word/document.xml', xml);
    zip.file('word/_rels/document.xml.rels', ctx.rels);
    zip.file('[Content_Types].xml', ctx.ct);
    return zip;
  }
  var api = { genererCRVisite: genererCRVisite, dateFR: dateFR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  racine.GenVisite = api;
})(typeof window !== 'undefined' ? window : globalThis);
