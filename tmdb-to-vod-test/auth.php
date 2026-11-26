<?php
// Applied to HTTP PHP endpoints only. No secrets are committed in this repository.
if (PHP_SAPI === 'cli') return;

if (strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https') {
    $_SERVER['HTTPS'] = 'on';
    $_SERVER['SERVER_PORT'] = 443;
}

$script = basename((string)($_SERVER['SCRIPT_FILENAME'] ?? ''));
if (in_array($script, ['index.php', 'health.php'], true)) return;

$expectedUser = (string)(getenv('TV_USER') ?: '');
$expectedPass = (string)(getenv('TV_PASSWORD') ?: '');
$user = (string)($_GET['username'] ?? '');
$pass = (string)($_GET['password'] ?? '');

if ($expectedUser === '' || $expectedPass === '' ||
    !hash_equals($expectedUser, $user) || !hash_equals($expectedPass, $pass)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['user_info' => ['auth' => 0, 'status' => 'Disabled'], 'error' => 'Invalid IPTV credentials']);
    exit;
}

if ($script === 'player_api.php' && !isset($_GET['action'])) {
    $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
    $host = preg_replace('/[^A-Za-z0-9.:\-]/', '', $host);
    $hostOnly = explode(':', $host)[0];
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $port = $https ? 443 : (int)($_SERVER['SERVER_PORT'] ?? 80);
    header('Content-Type: application/json');
    echo json_encode([
        'user_info' => [
            'username' => $user, 'password' => $pass, 'message' => 'TMDB-To-VOD noncommercial test',
            'auth' => 1, 'status' => 'Active', 'exp_date' => '4095101905',
            'is_trial' => '0', 'active_cons' => '0',
            'created_at' => (string)time(), 'max_connections' => '2',
            'allowed_output_formats' => ['m3u8', 'ts']
        ],
        'server_info' => [
            'url' => $hostOnly, 'port' => (string)$port,
            'https_port' => $https ? '443' : '',
            'server_protocol' => $https ? 'https' : 'http',
            'rtmp_port' => '', 'timezone' => 'America/Sao_Paulo',
            'timestamp_now' => time(), 'time_now' => date('Y-m-d H:i:s')
        ]
    ]);
    exit;
}
