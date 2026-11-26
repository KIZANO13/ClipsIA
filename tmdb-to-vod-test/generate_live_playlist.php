<?php
// Noncommercial test adapter for gogetta69/TMDB-To-VOD-Playlist.
// Original CC BY-NC 4.0: https://github.com/gogetta69/TMDB-To-VOD-Playlist
require_once __DIR__ . '/config.php';

function parseLabM3u($text, $source, &$streams, &$categories, &$groups, &$usedIds) {
    $current = null;
    foreach (preg_split('/\r\n|\n|\r/', $text) as $rawLine) {
        $line = trim($rawLine);
        if ($line === '') continue;
        if (strpos($line, '#EXTINF:') === 0) {
            $attributes = [];
            if (preg_match_all('/([\w-]+)="([^"]*)"/', $line, $found, PREG_SET_ORDER)) {
                foreach ($found as $attr) $attributes[$attr[1]] = $attr[2];
            }
            $comma = strrpos($line, ',');
            $name = $comma === false ? '' : trim(substr($line, $comma + 1));
            $current = $name === '' ? null : [
                'name' => $name,
                'epg' => $attributes['tvg-id'] ?? '',
                'logo' => $attributes['tvg-logo'] ?? '',
                'group' => $attributes['group-title'] ?? 'Outros',
            ];
            continue;
        }
        if ($line[0] === '#' || $current === null) continue;
        if (!preg_match('~^https?://~i', $line)) {
            $current = null;
            continue;
        }

        $groupName = $source . ' / ' . trim($current['group']);
        if (!isset($groups[$groupName])) {
            $categoryId = 200 + count($groups);
            $groups[$groupName] = $categoryId;
            $categories[] = [
                'category_id' => (string)$categoryId,
                'category_name' => $groupName,
                'parent_id' => 0
            ];
        }
        $id = ((int)sprintf('%u', crc32($source . "|" . $current['name'] . "|" . $line))) % 1000000000;
        while (isset($usedIds[$id])) $id = ($id + 1) % 1000000000;
        $usedIds[$id] = true;
        $streams[] = [
            'num' => $id,
            'name' => $current['name'],
            'stream_type' => 'live',
            'stream_id' => $id,
            'stream_icon' => $current['logo'],
            'epg_channel_id' => $current['epg'],
            'added' => time(),
            'category_id' => $groups[$groupName],
            'custom_sid' => '',
            'tv_archive' => 0,
            'direct_source' => $line,
            'tv_archive_duration' => 0,
            'video_url' => $line
        ];
        $current = null;
    }
}

function runLivePlaylistGenerate() {
    $directory = __DIR__ . '/channels';
    $updatedFile = $directory . '/last_updated_channels.txt';
    $jsonFile = $directory . '/live_playlist.json';
    $m3uFile = $directory . '/live_playlist.m3u8';
    $categoryFile = $directory . '/get_live_categories.json';
    $statusFile = $directory . '/lab_source_status.json';

    if (is_file($jsonFile) && is_file($categoryFile) && is_file($m3uFile)
        && is_file($updatedFile) && time() - (int)@file_get_contents($updatedFile) < 21600) {
        return json_decode((string)@file_get_contents($jsonFile), true) ?: [];
    }

    $streams = [];
    $categories = [];
    $groups = [];
    $usedIds = [];
    $staticData = @file_get_contents($directory . '/m3u_formatted.dat');
    if ($staticData !== false) {
        parseLabM3u($staticData, 'TMDB original', $streams, $categories, $groups, $usedIds);
    }
    $staticCount = count($streams);

    $drewUrl = 'http://drewlive24.duckdns.org:8081/DrewLive/MergedCleanPlaylist.m3u8';
    $context = stream_context_create([
        'http' => ['timeout' => 5, 'follow_location' => 1, 'max_redirects' => 2],
        'https' => ['timeout' => 5]
    ]);
    $remote = @file_get_contents($drewUrl, false, $context);
    $remoteOk = $remote !== false && strpos($remote, '#EXTINF') !== false
                && strlen($remote) < 25000000;
    if ($remoteOk) {
        parseLabM3u($remote, 'DrewLive', $streams, $categories, $groups, $usedIds);
    }

    $base = rtrim(getenv('PUBLIC_URL') ?: 'http://localhost:10000', '/');
    $user = rawurlencode(getenv('TV_USER') ?: '');
    $pass = rawurlencode(getenv('TV_PASSWORD') ?: '');
    $m3u = "#EXTM3U\n";
    foreach ($streams as $stream) {
        $n = str_replace(["\r", "\n", '"'], '', (string)$stream['name']);
        $logo = str_replace('"', '', (string)$stream['stream_icon']);
        $group = str_replace('"', '', $categories[((int)$stream['category_id']) - 200]['category_name'] ?? 'Outros');
        $epg = str_replace('"', '', (string)$stream['epg_channel_id']);
        $m3u .= '#EXTINF:-1 tvg-id="' . $epg . '" tvg-logo="' . $logo
            . '" group-title="' . $group . '",' . $n . "\n"
            . $base . '/live/' . $user . '/' . $pass . '/' . $stream['stream_id'] . ".m3u8\n";
    }

    if (!is_dir($directory)) mkdir($directory, 0775, true);
    file_put_contents($jsonFile, json_encode($streams, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    file_put_contents($categoryFile, json_encode($categories, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    file_put_contents($m3uFile, $m3u);
    file_put_contents($statusFile, json_encode([
        'last_updated_utc' => gmdate('c'),
        'original_entries' => $staticCount,
        'drewlive_entries' => count($streams) - $staticCount,
        'drewlive_status' => $remoteOk ? 'available' : 'unavailable',
        'listed_channels_total' => count($streams),
        'verified_playable_channels' => null,
        'headlessvidx_enabled' => false,
        'note' => 'Catalog entries are unverified, not a guarantee of playback or redistribution rights.'
    ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    file_put_contents($updatedFile, (string)time());
    return $streams;
}

if (isset($_SERVER['SCRIPT_FILENAME']) &&
    realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    header('Content-Type: application/json; charset=utf-8');
    $items = runLivePlaylistGenerate();
    echo json_encode(['catalog_entries' => count($items), 'status' => 'generated']);
}
