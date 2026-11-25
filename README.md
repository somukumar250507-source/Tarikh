# TARIKH | तारीख़

### An offline-first legal case management application

**Version 1.0.0 | Public Beta | Free | Offline-First**

Tarikh is a legal case management application designed for advocates, law students, legal interns and chambers. It provides a unified workspace for managing cases, court proceedings, hearings, meetings, documents, notes and professional records.

Designed primarily for iPad, Tarikh operates as a Progressive Web App (PWA), without requiring an App Store installation, subscription, external database or dedicated server.

## Access Tarikh

**[Launch Tarikh v1.0.0](https://somukumar250507-source.github.io/Tarikh/)**

No registration, payment or account creation is required.

## Features

- Multiple independent legal workspaces.
- Case management and case particulars.
- Hearing schedules and court proceedings.
- Calendar and court holidays.
- Meetings and appointments.
- Notes, tasks and follow-up actions.
- Integrated PDF, DOCX and image previews.
- Full-screen document workspace.
- Legal case dossier generation.
- A4 formatting with mirrored binding margins.
- PDF export and native printing.
- AES-256-GCM password-encrypted backups.
- Automatic local backups and recovery history.
- Pre-restoration recovery snapshots.
- Database health checks and backup verification.
- Offline functionality.
- Integrated software updates.
- Liquid Glass interface with light and dark themes.

## Installation

### iPad — Recommended

1. Open [Tarikh](https://somukumar250507-source.github.io/Tarikh/) in Safari.
2. Tap the Share button.
3. Select **Add to Home Screen**.
4. Enable **Open as Web App**, if displayed.
5. Tap **Add**.
6. Launch Tarikh using its Home Screen icon while connected to the internet.
7. Allow the initial offline installation to complete.

Once installed, Tarikh can operate without an internet connection.

Always use the same Home Screen icon to access your existing workspace.

### Browser Access

Tarikh may also be used directly through a compatible web browser without installation.

However, Home Screen installation is strongly recommended for regular iPad usage because browser storage is subject to additional retention, eviction and website-data management policies.

Data created in Safari may not automatically transfer to a subsequently installed Home Screen application. Use Tarikh's encrypted backup and restoration functionality to transfer records between installations.

Other platforms, including macOS, Windows, iPhone and Android, may support browser access but have not undergone comprehensive compatibility testing.

## Privacy and Data Storage

Tarikh follows a local-first architecture.

Case records, documents, settings and other workspace information are stored locally on the user's device using IndexedDB and the Origin Private File System (OPFS).

GitHub Pages hosts the application files, not the user's legal records.

- No Tarikh account is required.
- No central user database is maintained.
- Case records are not uploaded to a remote server by Tarikh.
- Automatic cloud synchronisation is not implemented.
- Local workspace data is not encrypted at the application level.
- Exported backups are mandatorily password-encrypted.

Users are responsible for securing their devices and maintaining independent backups of important records.

## Backup and Recovery

Tarikh supports both manual encrypted backups and automatic local recovery points.

### Manual Backups

Users can generate, verify and export password-encrypted `.tarikh` backup files through Settings. These files may be stored independently in the Files application, iCloud Drive, external storage or another secure location.

### Automatic Backups

Automatic backups are generated approximately every 24 hours while Tarikh is open and running.

The application retains the two most recent successful automatic backups and normally one pre-restoration recovery snapshot.

Automatic backups are stored within Tarikh's private application storage and are not independently accessible through the Files application unless exported.

### Encryption

Backups use:

- AES-256-GCM authenticated encryption.
- PBKDF2-HMAC-SHA256 password-based key derivation.
- 600,000 key derivation iterations.
- Chunked encryption and decryption.
- SHA-256 attachment integrity verification.
- ZIP-based internal archive architecture.

Automatic backup functionality retains non-extractable cryptographic key material locally after password configuration.

Forgotten backup passwords cannot be recovered.

**Local automatic backups do not protect against complete device loss, deletion of application storage or a factory reset. Regularly export and verify encrypted backups outside Tarikh.**

## Software Updates

Software updates are distributed through the hosted application.

To check for updates:

1. Connect your device to the internet.
2. Open Tarikh.
3. Navigate to Settings.
4. Select Check for Updates.
5. Follow the installation instructions.

Save and verify an independent encrypted backup before installing updates.

## Public Beta Testing

Tarikh v1.0.0 is currently available for public beta testing.

Testers are encouraged to explore the application's functionality, identify bugs and report usability or compatibility issues.

**Use fictitious case records and dummy documents during beta testing. Do not use confidential client information or sensitive legal records.**

### Report a Bug

Submit bug reports through [GitHub Issues](https://github.com/somukumar250507-source/Tarikh/issues).

Please include:

- Device model.
- Operating system and version.
- Browser or Home Screen installation.
- Tarikh version.
- Description of the issue.
- Steps to reproduce the issue.
- Expected and actual behaviour.
- Screenshots, where appropriate.

Do not include passwords, confidential documents, personal information, actual case records or backup files in public issues.

Security vulnerabilities should be reported in accordance with [SECURITY.md](SECURITY.md).

## Current Limitations

| Component | Limitation |
|---|---|
| Backup archive | Just under 4 GiB |
| Individual attachment | 250 MiB |
| Legal dossier | 200 pages or 80 MiB |
| Automatic backups | Require the application to be running |
| Automatic cloud backups | Not supported |
| Live multi-device synchronisation | Not supported |
| Native calendar integration | Not supported |
| Application-level database encryption | Not implemented |
| Forgotten backup passwords | Cannot be recovered |

Actual storage capacity and performance depend on the device, operating system and browser.

Multi-gigabyte stress testing and an independent professional security audit remain outstanding.

## Technology

Tarikh is built using:

- HTML, CSS and JavaScript.
- Progressive Web App architecture.
- Service Workers and Cache Storage.
- IndexedDB.
- Origin Private File System.
- Web Crypto API.
- PDF.js.
- JSZip.
- DOCX Preview.

The hosted application requires no dedicated backend or server-side database.

## Self-Hosting and Deployment

Tarikh may be hosted using GitHub Pages or another compatible static HTTPS hosting service.

The hosted application is contained in the `docs/` directory.

For GitHub Pages deployment:

- Deployment source: Deploy from a branch.
- Branch: `main`.
- Publishing directory: `/docs`.
- HTTPS: Enabled.

Local installation utilities are provided in the `installation/` directory.

See [DEPLOYMENT.md](DEPLOYMENT.md) for further instructions.

## Development Status

The initial development cycle of Tarikh concluded on 26 November 2026 with the release of version 1.0.0.

The application has entered its public beta and maintenance phase, with future development primarily focused on stability, security, compatibility, performance and bug fixes.

## Open Source

Tarikh is intended to be a free and open-source project.

Bundled third-party components remain governed by their respective licences.


## Disclaimer

Tarikh is an independent software project and is not affiliated with any court, judicial authority, government institution or Bar Council.

The application is provided without warranty. Users are responsible for maintaining independent backups, protecting confidential information and verifying the accuracy of their records and generated documents.

Tarikh is a case management utility and does not provide legal advice.

---

**TARIKH | तारीख़**

Legal case management. Local-first. Offline-first.

Free to use. Built for the legal profession.
