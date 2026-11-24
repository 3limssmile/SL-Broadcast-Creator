# SL Admin Tools

Remote Admin helpers for SCP: Secret Laboratory, live at https://sl.elimssmile.dev/

- **Broadcast Creator** - gradient and rich-text broadcasts.
- **Keycard Creator** - builds `ckeycard` commands for custom keycards, with a live 3D preview of the card.

## Development

```
npm install
npm run dev
```

`npm run build` outputs the site to `dist/`. Pushing to `main` deploys it to GitHub Pages (`.github/workflows/deploy.yml`).

## Licence

Code: MIT (see `LICENSE`).
Keycard models and textures in `src/assets/keycard/` are derived from SCP: Secret Laboratory by Northwood Studios and are licensed under CC BY-SA 3.0 - see `src/assets/keycard/LICENSE.md`.