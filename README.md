# Tarikh iPad

An offline-first legal case management PWA. Version 1.0.0, hosted beta distribution.

## Install on iPad

Open the published GitHub Pages address in Safari (normally `https://USERNAME.github.io/Tarikh/`). Use Share > Add to Home Screen, enable Open as Web App if shown, then Add. Open the Home Screen icon while online and allow offline installation to finish. Test in airplane mode before relying on it. Use the same icon thereafter.

Features include workspaces, cases, hearings, meetings, notes, tasks, document previews, legal case dossiers, password-encrypted backups and automatic local recovery points.

**Beta testers: use fictitious records only.** Report reproducible bugs through Issues, without client information, passwords, real documents or backups.

## Publish

Create an empty public repository named Tarikh. Commit the contents of this directory (including hidden files). In Settings > Pages, choose Deploy from a branch, main, /docs, and Save. Check the deployment status and open the URL GitHub displays. Keep HTTPS enabled. No build or external backend is required. See DEPLOYMENT.md for commands and updates.

## Storage and recovery

Data is local to the browser origin, not the GitHub repository. Do not delete the Home Screen installation or clear website data without first saving and verifying an encrypted backup outside the app. Local automatic backups cannot protect against device loss. Local records are not application-encrypted. Passwords for exported backups cannot be recovered. Automatic backups run while the app is open. Archive limit just under 4 GiB; individual attachments up to 250 MiB; actual device capacity may be lower. Dossiers are limited to 200 pages or 80 MiB. No native calendar or automatic cloud sync.

See PRIVACY.md, SECURITY.md and THIRD-PARTY-NOTICES.md. The proposed MIT licence for original project code requires the maintainer to confirm ownership and adoption before public release. Third-party components retain their own terms.
