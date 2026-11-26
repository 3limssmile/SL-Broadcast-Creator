# SL Admin Tools

Tools for SCP: Secret Laboratory server admins, live at https://sl.elimssmile.dev/

- **Broadcast Creator**: gradient and rich-text broadcasts.
- **Keycard Creator**: builds `ckeycard` commands for custom keycards, with a live 3D preview of the card.
- **CASSIE**: writes CASSIE announcements with custom subtitles, plays them with the real voice lines and exports WAV.
- **Ranks & Badges**: builds `config_remoteadmin.txt` with ranks, badges, permissions, staff members and ban templates, with an in-game preview of the badge.

## Development

```
npm install
npm run dev
```

`npm run build` outputs the site to `dist/`. Pushing to `main` deploys it to GitHub Pages (`.github/workflows/deploy.yml`).

## Licence

Code: MIT (see `LICENSE`).

Content from SCP: Secret Laboratory by Northwood Studios is licensed under CC BY-SA 3.0:
- keycard models and textures in `src/assets/keycard/` (see `src/assets/keycard/LICENSE.md`),
- CASSIE voice lines in `public/audio/cassie/`.