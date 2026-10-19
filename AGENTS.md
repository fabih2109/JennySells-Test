# JennySells: Versionen und Updates

- Jede abgeschlossene, vom Nutzer beauftragte App-Update-Schleife erhaelt eine
  neue sichtbare Version. Eine vom Nutzer genannte Versionsnummer hat Vorrang;
  andernfalls die Patch-Version erhoehen (z. B. 0.12.0 auf 0.12.1).
- Die gemeinsame App-Version steht ausschliesslich in
  `window.JennySellsVersion` im Kopf von `index.html`. Versionsanzeigen und
  Export-Metadaten lesen diesen Wert; keine weiteren festen Versionswerte
  fuer die laufende App einfuehren.
- Unter **Mehr -> Ueber JennySells** muss die aktuelle Version sichtbar sein.
  Vor der Veroeffentlichung im Browser pruefen, dass sie auch nach den
  verzoegerten Start-Routinen und einem Offline-Neustart korrekt bleibt.
- Bei jedem App-Update den Cache-Namen in `sw.js` erhoehen, geaenderte
  Script-/Stylesheet-URLs aktualisieren und die zugehoerigen Eintraege in
  `ASSETS` passend halten. Dynamisch geladene Scripts ebenfalls beachten.
- App-Version, IndexedDB-Schemaversion und Backup-Formatversion sind getrennt.
  Eine neue App-Version erfordert keine Aenderung vorhandener Artikeldaten,
  gespeicherter Bilder oder Datenformate.

## Offizielle Nutzung ab V0.13.0

- Neue Installationen starten ohne Artikel und ohne erfundene Verkaufswerte.
  Keine Demo-Datensaetze, Beispielbilder oder Reset-auf-Demo-Funktionen in die
  App aufnehmen. Standard-Kategorien, Kanaele und neutrale Platzhalter bleiben
  normale Bedienhilfen.
- Vorhandene lokale Artikel und Bilddateien bei Updates erhalten; auch frueher
  gespeicherte Beispielartikel nicht automatisch loeschen. Bereinigungen des
  Datenbestands brauchen einen ausdruecklichen Nutzerauftrag.
- Bei Aenderungen an Start, Speicherung oder Backup einen ZIP-Export mit
  anschliessender Wiederherstellung einschliesslich Bilddateien pruefen.
  Kompatibilitaet vorhandener Backups beibehalten.
- Fuer V0.13.1 wurde die einmalige Bereinigung gespeicherter Artikel mit den
  urspruenglichen Demo-IDs `demo0` bis `demo19` ausdruecklich beauftragt. Vor dem
  Entfernen muss eine vollstaendige ZIP-Sicherung zusammen mit der Loeschung
  atomar gespeichert werden. Eigene Artikel und alle Bilddateien erhalten.
  Die Sicherung muss unter Export / Backup herunterladbar bleiben. Manuell
  wiederhergestellte Bestaende nicht erneut automatisch bereinigen.
- Regressionstest fuer diese Bereinigung: `python3 tests/demo_cleanup_smoke.py`
  (Python Playwright und Chromium). Testdaten werden nur in isolierten
  Browser-Profilen angelegt und gehoeren nicht zum App-Datenbestand.
