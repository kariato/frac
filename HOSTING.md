# Build and publish

## GitHub Pages

Repository Settings → Pages → Source: GitHub Actions. The Pages workflow tests, builds, uploads dist, and deploys on main pushes or manual dispatch. It uses Node 24, a lockfile install, static assets, and relative base `./`. The expected project URL is https://kariato.github.io/frac/.

Check that index.html, JS, CSS, SVG icon, and license files load beneath `/frac/`, with no root-path requests or browser errors. Retry a suspended run after refresh. Check controls on the published page, not only localhost.

## itch.io

1. Run `npm run package` from a committed checkout. Do not upload the repository or node_modules.
2. Create/edit an itch project under the publishing account; set Kind of project to HTML.
3. Upload `release/frac-0.1.0-html5.zip` and select it as playable in the browser. index.html must be at archive root.
4. Use click-to-launch fullscreen. The game resizes to actual iframe dimensions; fullscreen API denial is supported. Disable internal scrollbars.
5. Test portrait and landscape on physical iOS and Android devices before enabling Mobile Friendly and promoting a stable release.
6. Add a source-repository link, GPL license, keyboard/touch instructions, and the matching source archive as a downloadable file.
7. Check audio starts after Play, touches do not scroll the well, focus changes pause, and import/export transfers progress to/from Pages.

itch account/project access is needed for this manual upload. No account name is inferred from the GitHub login. An itch-ready archive does not mean the game is published there.

## Releases and rollback

Tag a tested commit v0.1.0. The release workflow attaches HTML5 and source ZIPs as a prerelease. Release notes identify outstanding device testing. Promote to stable only after those checks pass. For rollback, deploy a prior known-good commit through Pages and re-upload its matching HTML5 ZIP to itch. Keep saved data versioned; do not force a schema downgrade.

## References

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://itch.io/docs/creators/html5
- https://vite.dev/guide/build
