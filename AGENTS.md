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
