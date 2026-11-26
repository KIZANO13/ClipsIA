# TMDB-To-VOD — laboratório de implantação

Test deployment of the original PHP TMDB-To-VOD-Playlist on a separate Render service, pinned to upstream commit c2e6065cf45418e302405e827192db3a8ba984c1.

Original work by gogetta69: https://github.com/gogetta69/TMDB-To-VOD-Playlist. Original license: CC BY-NC 4.0, noncommercial use only, with required attribution. This adaptation is intended for private technical testing, not commercial or sublicensed TV distribution.

Changes:
- Apache PHP on Render Docker with the original Xtream API.
- All 502 entries in the original channels/m3u_formatted.dat.
- Optional DrewLive merge, only if reachable; no guarantee of 7,000 working channels.
- Status at /health.php; refresh limited to every six hours.
- TV_USER and TV_PASSWORD required for PHP playback and API routes.
- No HeadlessVidX/Playwright on the constrained free instance. Some streams won't work.
- No DRM bypass or rights to third-party retransmissions.
- No TMDB API key or premium credentials bundled.

New Docker service: dockerfilePath=tmdb-to-vod-test/Dockerfile, dockerContext=tmdb-to-vod-test, plan=free, region=virginia. Runtime environment: TV_USER, TV_PASSWORD, PUBLIC_URL. Configure secrets only in Render, not in GitHub. M3U endpoint: player_api.php?username=...&password=...&action=get_live_streams&type=m3u8

This test remains isolated from tcl-iptv-starter.
