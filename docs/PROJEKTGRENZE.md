# Projektgrenze zur Dashboard-Games-Plattform

## Beschluss und nachprüfbarer Bestand

Am 06.09.2026 wurde Janniks eigene Dashboard-Games-Plattform als mögliche
Anbindung festgehalten. Sein Wortlaut zur Vorlage war: „vorlage nur weg wenn
sie keinen mehrwert hat.“ Diese Absicht bleibt erhalten.

Die frühere Fassung dieses Dokuments stellte Plattformverzeichnisse als
Bestandteil dieses Repositorys dar. Inventur am 08.09.2026 auf Basis 38479d0:
src/server/, packages/dashboard-games-sdk/, contracts/, .dashboard/
und GAME_PROJECT_CONTEXT.md sind in diesem Checkout nicht enthalten.
Die lokale AGENTS.md beschreibt Hatreds Agentenarbeit und ist kein
Plattformvertrag. Aus dieser Dokumentation darf kein Agent fehlenden
Plattformcode, Zugangsdaten oder einen laufenden Plattformdienst ableiten.

## Verantwortung im Spielprojekt

| Bereich | Verantwortung |
| --- | --- |
| spiel/ | Deterministische Regeln und Inhalte; kennt keine Plattform |
| runtime/ | Darstellung und Bedienung im Browser |
| netz/sitzung.mjs | Aktionen ordnen und Summen prüfen; Sendefunktionen werden gereicht |
| netz/verbindung.mjs, lobbycode.mjs | Direkte Verbindung und Einladungscode |
| netz/vermittler.mjs, broker.mjs | Vermittlung über einen optional selbst betriebenen Node-Dienst |
| werkzeuge/, tests/, docs/ | Entwicklung, Prüfung und Orientierung |

Die direkte Leitung und die optionale Vermittlung sind in [NETZ.md](NETZ.md)
beschrieben. Die Kernregel lautet weiterhin: Das Netz transportiert Aktionen,
und alle Teilnehmer berechnen den Spielzustand selbst.

## Vertrag für eine spätere Plattformanbindung

Vor einer beauftragten Anbindung das tatsächliche Plattformrepository,
seine Version, Regeln und Schnittstellen lesen. Erst dann einen eigenen
Adapterauftrag mit Abnahme für Lobby, Verbindungsabbruch und Gleichlauf schneiden.

- Die Verbindung wird an der Netzgrenze angeschlossen. spiel/ erhält keine
  Plattformimporte, Serveruhr, Sitzungscookies oder dienstabhängigen Zufall.
- netz/sitzung.mjs bleibt von der konkreten Leitung unabhängig. Kein zweiter
  Schiedsrichter mit einer Kopie der Spielregeln.
- Ein SDK würde als ausdrücklich gewählte, versionierte Abhängigkeit geführt;
  Quelltext nicht aus einer Vorlage zusammenkopieren.
- Geheimnisse bleiben außerhalb des Repositorys. Ein technischer Zugang ist
  keine Erlaubnis zur Veröffentlichung oder zu Kontoänderungen.

Die Strukturaufteilung selbst beauftragt keine Plattformintegration.
