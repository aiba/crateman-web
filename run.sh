#!/bin/bash
# Launch Crate Man (Director 6 projector) in ScummVM.
# ScummVM's FileIO reads the score file as UTF-8 but writes it as Windows-1252,
# and the game's UNCIPHER then hangs in numToChar(). Re-encode before each launch.
SKR="$HOME/Documents/ScummVM Savegames/director-Crateman.skr.txt"
if [ -f "$SKR" ] && ! iconv -f UTF-8 -t UTF-8 "$SKR" >/dev/null 2>&1; then
  iconv -f CP1252 -t UTF-8 "$SKR" > "$SKR.tmp" && mv "$SKR.tmp" "$SKR"
fi
exec /Applications/ScummVM.app/Contents/MacOS/scummvm --path="$(dirname "$0")/game" --no-fullscreen director:director
