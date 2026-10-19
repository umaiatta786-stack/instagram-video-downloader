# Instagram Video Downloader — no API key

This preserves the existing designed UI and SEO content while replacing the external-provider/API-key placeholder with a real server-side `yt-dlp` attempt for publicly accessible Instagram posts.

## Requirements
- Node.js 20+
- `yt-dlp` installed on the server and available on PATH (or set `YT_DLP_BIN`)
- Hosting that allows child processes, outbound HTTPS, and writable temporary storage

## Run locally
1. Install Python and yt-dlp using a trusted package method, e.g. `python -m pip install -U yt-dlp`.
2. Run `npm install`.
3. Run `npm start` and open `http://localhost:3000`.

## Privacy and access limits
No API key, login, cookies, browser profile, proxy, or anti-bot bypass is configured. The server only attempts to retrieve media Instagram makes publicly accessible. Instagram may block automated requests or require sign-in; when that happens, the site displays an error rather than claiming success.

The backend validates links, attempts one public video download, verifies the file is non-empty and has an MP4/WebM signature, serves preview and attachment routes from the same server, limits requests per IP, and removes temporary files after 20 minutes. It rejects non-Instagram URLs and returns clear error messages for unavailable posts, rate limits, timeouts, and missing server dependencies.

## Deployment and testing
Deploy on a Node host that permits `yt-dlp` subprocesses and temporary disk storage. Static-only hosting and many shared PHP hosts cannot run this backend. Install/update yt-dlp as part of server setup. `npm run check` validates JavaScript syntax. A live Instagram download must still be tested on the actual deployed host with a public Reel/post URL; Instagram's access rules and automated-request blocking can change, so successful retrieval cannot be guaranteed for every public link.
