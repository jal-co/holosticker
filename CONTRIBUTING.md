# Contributing to Holosticker

Thanks for helping make stickers shinier.

## Setup

```sh
git clone https://github.com/jal-co/holosticker.git
cd holosticker
npm install
npm run dev
```

## Making changes

1. Branch from `main`.
2. Make your change. Keep it scoped; match the existing code style
   (Tailwind utilities, shadcn/ui primitives, oklch colors).
3. Verify: `npx tsc -b` and `npm run build` must pass. For renderer or
   shader work, check the result visually in the dev server.
4. **Add a changeset** - this is required for anything user-facing:

   ```sh
   npx changeset
   ```

   Pick `minor` for features, `patch` for fixes, and write the summary as
   it should appear in the changelog (users read it in the app's
   "What's new" dialog).

5. Commit using [Conventional Commits](https://www.conventionalcommits.org)
   (`feat: ...`, `fix: ...`) and open a PR against `main`.

## Releases

Releases are automated with [changesets](https://github.com/changesets/changesets):

- Merging PRs with changesets onto `main` makes the release workflow open
  (or update) a **"Version Packages"** PR.
- Merging that PR bumps `package.json`, rewrites `CHANGELOG.md`, and the
  in-app changelog picks it up on the next deploy.
- Vercel deploys `main` automatically.

Never edit `package.json`'s version or `CHANGELOG.md` manually.

## What doesn't need a changeset

Internal refactors, docs, CI, and test-only changes can skip the changeset
(use an empty changeset `npx changeset --empty` if CI asks for one).
