# Holosticker

<p>
  <a href="https://holosticker.dev"><img alt="Website" src="https://shieldcn.dev/badge/holosticker.dev-live-8b5cf6.svg?size=xs&variant=secondary&logo=vercel" /></a>
  <a href="https://github.com/jal-co/holosticker/stargazers"><img alt="GitHub stars" src="https://shieldcn.dev/github/stars/jal-co/holosticker.svg?size=xs&variant=secondary" /></a>
  <a href="https://github.com/jal-co/holosticker/blob/main/LICENSE"><img alt="License" src="https://shieldcn.dev/github/license/jal-co/holosticker.svg?size=xs&variant=secondary" /></a>
  <a href="https://github.com/jal-co/holosticker/commits/main"><img alt="Last commit" src="https://shieldcn.dev/github/last-commit/jal-co/holosticker.svg?size=xs&variant=secondary" /></a>
  <a href="https://github.com/sponsors/jal-co"><img alt="Sponsor" src="https://shieldcn.dev/badge/sponsor-%E2%9D%A4-ec4899.svg?size=xs&variant=secondary&logo=githubsponsors" /></a>
</p>

Holographic sticker studio. Upload an SVG or PNG, tune the foil, tilt it around, and export a realistic holofoil sticker as a transparent PNG.

**Live at [holosticker.dev](https://holosticker.dev)**

## Features

- Real-time three.js render: PBR holofoil with view-dependent diffraction bands, thin-film iridescence, metallic flakes, and studio env reflections
- Pointer tilt: rainbow bands sweep across the foil like a real holo card
- Die-cut border from an exact euclidean distance transform (smooth arcs on square corners)
- 3D peel: graded hinge bend with conical curl and a glossy foil liner backside
- Sidebar props: size, border, pattern, intensity, band frequency, hue shift, grain, light, peel direction/amount/curl, shadow, background
- Export at 1024 / 2048 / 4096 px with transparency

## Run

```sh
npm install
npm run dev
```

## Stack

Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui, three.js. Deployed on Vercel.

## Support

If Holosticker is useful to you, consider [sponsoring jal-co on GitHub](https://github.com/sponsors/jal-co).

<a href="https://github.com/sponsors/jal-co"><img alt="Sponsors" src="https://shieldcn.dev/sponsors/jal-co.svg?bg=transparent" /></a>
