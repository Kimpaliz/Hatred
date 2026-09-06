@echo off
rem [Aufgabe: Werkzeug] Doppelklick-Start unter Windows.
rem Warum eine eigene Datei: Der Auftraggeber programmiert nicht und
rem soll keine Schale oeffnen muessen, um sein eigenes Spiel zu sehen.
cd /d "%~dp0"
start "" http://127.0.0.1:8145/
node werkzeuge\vorschau.mjs
pause
