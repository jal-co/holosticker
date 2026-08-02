# Holostick Studio

A holographic sticker studio. Upload an SVG or PNG, tune the foil, and export a realistic holographic sticker as a transparent PNG.

## Features

- WebGL2 shader renders silvery holo foil with pastel iridescent washes, diffraction rays, grain, and sparkle
- Automatic die-cut border generated from the artwork's alpha
- Peel effect: a corner folds back over the sticker showing the foil backside, with adjustable direction, amount, curl radius, and shadow
- Sidebar props: sticker size, border width, holo pattern (linear / radial / patches), intensity, band frequency, hue shift, grain, light position, background
- Export at 1024 / 2048 / 4096 px with transparency

## Run

```sh
npm install
npm run dev
```

## Stack

Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui, raw WebGL2.
