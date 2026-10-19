# Instagram Video Downloader — Railway-ready project

Simple responsive frontend plus Node/Express backend. The backend uses `yt-dlp` and `ffmpeg` inside Docker; Instagram access may change and some public URLs will fail. This project does not bypass private-content restrictions and does not implement MP3 conversion or watermark removal.

## Deploy to Railway
1. Push the contents of this folder to your GitHub repository (the `Dockerfile` must be at the repository root).
2. In Railway, deploy that repository and use the Dockerfile builder.
3. Once deployed, set `BASE_URL` to the full public website URL, e.g. `https://your-app.up.railway.app`.
4. Redeploy. Test `/health`, then test a public Reel you have permission to download and an invalid URL.
5. If using a custom domain later, update `BASE_URL` and ensure the canonical URL in `public/index.html` matches that domain.

## Current limitations and truthful behavior
- Retrieval uses yt-dlp, not an official Instagram API. Instagram may block retrieval or require changes to the dependency.
- Post identifier is checked against the requested URL; that is not a guarantee that all source metadata is authentic. Download re-fetches and checks the identifier again.
- Private/restricted posts are not supported. No Instagram password or cookies are requested.
- MP3 conversion, watermark removal, Stories, historical IGTV links, APK/app downloads, and guaranteed 1080p/4K are not implemented.
- Download route re-fetches the validated Instagram URL rather than trusting a browser-provided media URL. Temporary files are removed after the response.
- Before public production use, configure a real contact address, confirm compliance with applicable terms/laws, and test actual URLs in the deployed environment.

## Keyword verification
The original 45 exact phrases are reproduced in `public/keyword-guide.html`. Run `node scripts/verify-keywords.js` to verify that all 45 appear exactly in that page. This verifies phrase presence only, not SEO rankings or feature availability.
