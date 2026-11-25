# Deployment

1. Review the licence and artwork rights before publication. Create an empty public GitHub repository named Tarikh (do not initialise with README).
2. In the extracted repository directory, run:

```sh
git init -b main
git add .
git commit -m "Tarikh v1.0.0 hosted beta"
git remote add origin https://github.com/USERNAME/Tarikh.git
git push -u origin main
```

Replace USERNAME with your account. Authenticate through GitHub's supported authentication flow (not your account password for Git HTTPS).
3. Settings > Pages > Deploy from a branch > main > /docs > Save. Once deployment succeeds, use the exact URL shown there. Keep HTTPS enabled.
4. Install on a separate test iPad, test offline, backup and restore with dummy data, then share the link.

## Updates

Keep the origin and repository path stable. Update the release version consistently in docs/version.json, docs/update-panel.js and docs/sw.js (worker version reply, cache suffix and cleanup cutoff). Update docs/cache-assets.js whenever files are added or removed. Use a new unique cache suffix for every published release. Commit and push all changes together. After Pages deployment, testers can check and install updates in Settings. Save and verify an external encrypted backup first. Never publish a rollback with a lower version number; publish fixes as a new version.

## Local server

The original server is retained in installation/serve.py for reference. It expects a sibling web/ directory and tls/server.pem and tls/server-key.pem. To use it, copy docs/ into web/ next to a copy of serve.py in a separate local directory, configure your own trusted TLS certificates and run python3 serve.py MAC_LAN_IP. Never commit TLS keys. The existing local installation is unaffected by the hosted build.
