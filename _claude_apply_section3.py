import sys, io

PATH = sys.argv[1]
with io.open(PATH, encoding='utf-8') as f:
    s = f.read()

def rep1(old, new, label):
    n = s.count(old)
    if n != 1:
        raise SystemExit('ANCHOR NOT UNIQUE (%d occurrences): %s' % (n, label))
    return s.replace(old, new, 1)

# ---------------------------------------------------------------------------
# 1) HTML : nouvelle carte "Mise en commun des moyens" apres la carte
#    "Entreprises intervenantes", dans l'onglet intervenants.
# ---------------------------------------------------------------------------
MEC_MOYENS_HTML = [
    ('echafaudage', 'Échafaudage'),
    ('grue', 'Grue à tour ou équivalent'),
    ('levageVertical', 'Levage vertical (hors grue)'),
    ('manutentionHorizontale', 'Manutention horizontale'),
    ('installationElectrique', 'Installation électrique provisoire (TGBT)'),
    ('eclairage', 'Éclairage de chantier'),
    ('espaceConfine', 'Espaces confinés — ventilation'),
    ('eau', 'Alimentation en eau'),
]
rows = []
for key, label in MEC_MOYENS_HTML:
    rows.append(
        '              <tr style="border-bottom:1px solid var(--border);">\n'
        '                <td style="padding:4px 6px;">%s</td>\n'
        '                <td style="padding:4px 6px;"><select id="mec-%s-statut" style="width:100%%;padding:4px;border:1px solid var(--border);border-radius:4px;font-size:12px;">\n'
        '                  <option value="">Non renseigné</option>\n'
        '                  <option value="commun">Mis en commun</option>\n'
        '                  <option value="propre">Propre à chaque entreprise</option>\n'
        '                  <option value="sansobjet">Sans objet</option>\n'
        '                  <option value="adefinir">À définir</option>\n'
        '                </select></td>\n'
        '                <td style="padding:4px 6px;"><input type="text" id="mec-%s-mettant" style="width:100%%;padding:4px;border:1px solid var(--border);border-radius:4px;font-size:12px;" placeholder="Ex : Lot Gros Œuvre"></td>\n'
        '                <td style="padding:4px 6px;"><input type="text" id="mec-%s-benef" style="width:100%%;padding:4px;border:1px solid var(--border);border-radius:4px;font-size:12px;" placeholder="Ex : Tous les lots"></td>\n'
        '              </tr>\n' % (label, key, key, key)
    )
mec_card = (
    '        <div class="form-card">\n'
    '          <div class="form-card-header">&#128230; Mise en commun des moyens (PGC &sect;3 b)</div>\n'
    '          <div class="form-card-body">\n'
    '            <div class="organismes-note">Pour chaque moyen, indiquez le statut retenu pour ce chantier (decision prise en reunion de preparation, ou a votre connaissance). Laissez sur "Non renseigne" si la decision n\'est pas encore prise : le moyen n\'apparaitra alors pas dans le PGC genere, plutot que d\'inventer une reponse.</div>\n'
    '            <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px;">\n'
    '              <thead><tr style="text-align:left;color:var(--text-light);">\n'
    '                <th style="padding:4px 6px;width:22%;">Moyen</th>\n'
    '                <th style="padding:4px 6px;width:22%;">Statut</th>\n'
    '                <th style="padding:4px 6px;width:28%;">Entreprise mettant en &oelig;uvre</th>\n'
    '                <th style="padding:4px 6px;width:28%;">Entreprise(s) beneficiant</th>\n'
    '              </tr></thead>\n'
    '              <tbody>\n'
    + ''.join(rows) +
    '              </tbody>\n'
    '            </table>\n'
    '          </div>\n'
    '        </div>\n'
)

anchor_html = (
    '''            <p style="font-size:11px;color:var(--text-light);margin-top:4px;">Import entreprise (mail/pièce .pdf, .docx, .txt, .eml) : repère nom, lot, contact, effectif, tél., mail et SIRET par motifs de texte (aucune IA) et ouvre une nouvelle carte à vérifier. Le SIRET repéré permet ensuite de remplir raison sociale/adresse officielles via « Vérifier au registre officiel ».</p>
          </div>
        </div>
      </div>

      <div class="tab-content" id="tab-organismes">'''
)
new_html = (
    '''            <p style="font-size:11px;color:var(--text-light);margin-top:4px;">Import entreprise (mail/pièce .pdf, .docx, .txt, .eml) : repère nom, lot, contact, effectif, tél., mail et SIRET par motifs de texte (aucune IA) et ouvre une nouvelle carte à vérifier. Le SIRET repéré permet ensuite de remplir raison sociale/adresse officielles via « Vérifier au registre officiel ».</p>
          </div>
        </div>

''' + mec_card + '''      </div>

      <div class="tab-content" id="tab-organismes">'''
)
s = rep1(anchor_html, new_html, 'carte mise en commun (HTML)')

with io.open(PATH, 'w', encoding='utf-8', newline='\n') as f:
    f.write(s)
print('OK HTML card inserted, new length =', len(s))
