<?php
$health = @json_decode(@file_get_contents(__DIR__ . '/channels/lab_source_status.json') ?: '{}', true) ?: [];
$host = htmlspecialchars($_SERVER['HTTP_HOST'] ?? '', ENT_QUOTES, 'UTF-8');
$count = (int)($health['listed_channels_total'] ?? 0);
$original = (int)($health['original_entries'] ?? 0);
$remote = (int)($health['drewlive_entries'] ?? 0);
$drew = htmlspecialchars($health['drewlive_status'] ?? 'loading', ENT_QUOTES, 'UTF-8');
?>
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KizanoTV — TMDB-To-VOD (teste)</title>
<style>
body{font:16px system-ui,-apple-system,sans-serif;max-width:780px;margin:40px auto;padding:0 18px;color:#eee;background:#111827;line-height:1.5}
main{background:#1f2937;padding:26px;border-radius:14px}
h1{font-size:26px}strong{color:#6ee7b7}a{color:#93c5fd}
small{color:#cbd5e1}code{overflow-wrap:anywhere;color:#f9d88a}
</style></head><body><main>
<h1>KizanoTV — TMDB-To-VOD</h1>
<p>Laboratório técnico, isolado do servidor IPTV principal.</p>
<p><strong><?php echo $count; ?></strong> entradas no catálogo (<?php echo $original; ?> originais + <?php echo $remote; ?> DrewLive).</p>
<p>Estado DrewLive: <strong><?php echo $drew; ?></strong></p>
<p>Configure no seu reprodutor Xtream com o endereço <code>https://<?php echo $host; ?></code> e as credenciais privadas do serviço.</p>
<p><a href="/health.php">Consultar o diagnóstico JSON</a></p>
<p><small>Uma entrada na lista não garante que o sinal funcione, tenha áudio PT-BR ou esteja licenciado para retransmissão. Sem HeadlessVidX nesta instalação leve.</small></p>
<p><small>Projeto original: <a href="https://github.com/gogetta69/TMDB-To-VOD-Playlist">gogetta69/TMDB-To-VOD-Playlist</a>, licença CC BY-NC 4.0. Adaptação não comercial para teste.</small></p>
</main></body></html>
