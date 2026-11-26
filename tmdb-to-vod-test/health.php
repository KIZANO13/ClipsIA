<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$status = @file_get_contents(__DIR__ . '/channels/lab_source_status.json');
$result = $status !== false ? json_decode($status, true) : null;
echo json_encode([
    'service' => 'TMDB-To-VOD isolated PHP lab',
    'status' => $result ? 'catalog_ready' : 'catalog_initializing',
    'upstream' => 'gogetta69/TMDB-To-VOD-Playlist',
    'catalog' => $result,
    'copyright_note' => 'Entries are not evidence of licenses or successful playback.'
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
