// ===== CSPS17 sans serveur : les anciens appels /api/* sont traites dans l'appareil =====
// Fichiers du registre (RJC) : IndexedDB "csps17-fichiers". Aucune donnee ne sort de l'appareil.
(function(){
  var DBN = 'csps17-fichiers', ST = 'fichiers', dbp = null;
  function base(){
    if (dbp) return dbp;
    dbp = new Promise(function(ok, ko){
      var r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore(ST); };
      r.onsuccess = function(){ ok(r.result); }; r.onerror = function(){ ko(r.error); };
    });
    return dbp;
  }
  function op(mode, fn){
    return base().then(function(d){ return new Promise(function(ok, ko){
      var t = d.transaction(ST, mode), s = t.objectStore(ST), res;
      var q = fn(s); if (q) q.onsuccess = function(){ res = q.result; };
      t.oncomplete = function(){ ok(res); }; t.onerror = function(){ ko(t.error); };
    }); });
  }
  window.FichiersLocaux = {
    lire: function(p){ return op('readonly', function(s){ return s.get(p); }); },
    ecrire: function(p, v){ return op('readwrite', function(s){ return s.put(v, p); }); },
    effacer: function(p){ return op('readwrite', function(s){ return s.delete(p); }); },
    cles: function(){ return op('readonly', function(s){ return s.getAllKeys(); }); }
  };
  function json(o, st){ return new Response(JSON.stringify(o), { status: st || 200, headers: { 'Content-Type': 'application/json' } }); }
  function dataUrlVersBlob(d){
    var m = /^data:([^;,]*)(;base64)?,(.*)$/.exec(d || ''); if (!m) return new Blob([]);
    var bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: m[1] || 'application/octet-stream' });
  }
  window.dataUrlVersBlob = dataUrlVersBlob;
  var _f = window.fetch.bind(window);
  window.fetch = async function(u, o){
    if (typeof u !== 'string' || u.indexOf('/api/') !== 0) return _f(u, o);
    o = o || {};
    var corps = {}; try { corps = o.body ? JSON.parse(o.body) : {}; } catch (e) {}
    var chemin = u.split('?')[0], qs = new URLSearchParams(u.split('?')[1] || '');
    try {
      if (chemin === '/api/affaires') return json(o.method === 'POST' ? { ok: true } : []);
      if (chemin === '/api/rjc-upload') {
        var p = 'local/' + (corps.affaireId || 'x') + '/' + Date.now() + '-' + String(corps.filename || 'fichier').replace(/[\\/]/g, '_');
        await FichiersLocaux.ecrire(p, corps.fileData || '');
        return json({ ok: true, path: p });
      }
      if (chemin === '/api/rjc-file') {
        var d = await FichiersLocaux.lire(qs.get('path'));
        if (!d) return json({ error: 'Fichier absent de cet appareil (ancien stockage en ligne ou autre appareil)' }, 404);
        return new Response(dataUrlVersBlob(d), { status: 200 });
      }
      if (chemin === '/api/rjc-delete-file') { await FichiersLocaux.effacer(corps.path); return json({ ok: true }); }
      if (chemin === '/api/entreprise') {
        return _f('https://recherche-entreprises.api.gouv.fr/search?page=1&per_page=5&q=' + encodeURIComponent(qs.get('q') || ''));
      }
      if (chemin === '/api/claude' || chemin === '/api/ocr-images')
        return json({ error: "Fonction d'intelligence artificielle retirée de CSPS17 : saisie manuelle." }, 503);
      return json({ error: 'Fonction indisponible sans serveur : ' + chemin }, 404);
    } catch (e) { return json({ error: e.message }, 500); }
  };
})();
