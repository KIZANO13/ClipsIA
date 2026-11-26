# TCL IPTV Starter
Servidor leve Node.js para conectar à TCL pelo APL TV ou outro player Xtream/M3U.

**Conteúdo de teste:** TV Brasil, TV Cultura, TV Câmara, Canal Gov, Big Buck Bunny e Elephants Dream. As fontes são externas, podem estar indisponíveis e o serviço não fornece canais comerciais.

## Render Free
Implantação na branch \`deploy/tcl-iptv-starter\`, subpasta \`tcl-iptv-starter/\`.
Build: \`cd tcl-iptv-starter && npm install --omit=dev\`
Start: \`cd tcl-iptv-starter && npm start\`
Environment: \`IPTV_USERNAME\` e \`IPTV_PASSWORD\` devem ser configurados no Render. Não armazenar senhas no GitHub.

Verificação: \`https://SERVICO.onrender.com/health\`

APL TV (Xtream):
Servidor \`https://SERVICO.onrender.com\`
Usuário e senha conforme Render.

O Render Free suspende o serviço após períodos sem tráfego. O servidor não armazena nem redistribui vídeos, apenas redireciona às fontes públicas.
