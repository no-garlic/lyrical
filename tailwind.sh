#!/bin/sh

# Create the bin directory if it doesn't exist
mkdir -p bin

# Check if the binary already exists
if [ ! -f bin/tailwindcss ]; then
  echo "Downloading tailwindcss..."
  curl -sLo bin/tailwindcss https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-macos-arm64
  chmod +x bin/tailwindcss
fi

# Stop any instance of tailwindcss that is already running
pkill -f "tailwindcss"

# Run tailwindcss in watch mode
bin/tailwindcss -i lyrical/static/lyrical/style/styles.css -o lyrical/static/lyrical/style/twstyles.css --watch
