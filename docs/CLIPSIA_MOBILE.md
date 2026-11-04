# ClipsIA Mobile 0.1

Interface em português, mobile-first, construída sobre o **núcleo self-hosted do OpenShorts**. Adiciona um painel estático independente, sem substituir as telas existentes.

## Onde está o código?

- `dashboard/public/clipia/index.html` — entrada principal do painel
- `dashboard/public/clipia/style.css` — tema escuro e layout responsivo
- `dashboard/public/clipia/app.js` — cliente da API existente
- `dashboard/public/clipia/manifest.webmanifest` e `icon.svg` — identidade para atalho na tela inicial
- `tests/clipia-smoke.test.cjs` — verificações básicas de integridade, sem dependências externas

### O que faz

1. Aceita URL pública de vídeo ou arquivo local escolhido no navegador móvel.
2. Oferece meta de 3 a 15 cortes, saída 9:16 / 1:1 / 16:9, legendas e hook automático.
3. Envia a tarefa ao backend via `POST /api/process`.
4. Mostra fila/processamento consultando `GET /api/status/{job_id}`.
5. Exibe cortes produzidos, suas pontuações e links de MP4 e ZIP.
6. Retoma um trabalho recente no mesmo navegador quando o servidor ainda o mantém.

O motor de IA e o renderizador continuam sendo os componentes originais do OpenShorts: este projeto **não processa vídeo dentro do Android**.

## Como testar localmente

**Requisitos:** Docker + Compose, capacidade de CPU/RAM para Whisper/FFmpeg e uma chave Gemini ou LLM OpenAI-compatível para o selecionador de cortes. Para o fluxo padrão, o OpenShorts permite fornecer a chave Gemini no próprio formulário (apenas em um servidor seu, sob HTTPS) ou configurar o provedor de IA conforme o README upstream.

```bash
git clone https://github.com/KIZANO13/ClipsIA.git
cd ClipsIA
cp .env.example .env
# Configure .env conforme o upstream (modo local, sem BILLING_ENABLED)
docker compose up -d --build
```

Acesse **`http://localhost:5175/clipia/index.html`** no computador que executa o Docker. No celular na mesma rede, use o IP local do computador e a porta 5175, **somente em uma rede privada confiável**. Para usar pela internet, configure primeiro HTTPS e autenticação no proxy reverso; **não abra as portas 8000, 3100 ou 5175 diretamente para a internet**. O projeto não fornece essas proteções automaticamente.

Em Android, abra a URL HTTPS no Chrome e escolha *Adicionar à tela inicial* (se disponível). O manifesto permite o atalho; **o processamento depende sempre do servidor online**. O comportamento de instalação do PWA varia por navegador.

### Testes locais

```bash
node --check dashboard/public/clipia/app.js
node --test tests/clipia-smoke.test.cjs
```

## Limitações da v0.1

- Não inclui editor avançado, publicação em redes sociais nem visualização de progresso do upload em percentuais.
- Os limites de vídeo, desempenho, idioma e qualidade seguem o backend e a infraestrutura usados.
- O upload funciona via `multipart/form-data`, inclusive em Android, mas vídeos grandes exigem conexão estável.
- Se o vídeo for curto demais, inadequado ou o serviço de IA estiver sem chave/cota, o backend recusará a tarefa.
- Os cortes e os jobs podem ser apagados conforme a política de retenção do servidor. A retomada é tentativa, não armazenamento permanente.
- **Ainda faltam testes ponta a ponta com backend real e num Android físico.** Os smoke tests só verificam a estrutura e as rotas esperadas.

## Licenças e uso comercial

Preserve os avisos `LICENSE` e `NOTICE`. O **núcleo do OpenShorts é MIT**, mas o diretório **`cloud/` tem licença comercial própria**, que proíbe oferecer seu código como um serviço hospedado/concorrente sem acordo específico. Esta interface se destina ao **núcleo sem `BILLING_ENABLED`** e não usa as rotas de cobrança do diretório comercial. Antes de disponibilizar o serviço publicamente, revise também as licenças de outros componentes e os termos dos provedores utilizados.

## Segurança

- **Nunca** coloque chaves de API no repositório, no HTML ou em GitHub Actions em texto puro.
- A chave opcional digitada no painel é mantida em memória durante a sessão e enviada somente ao endpoint do servidor que você abrir. Use **HTTPS** fora de `localhost`.
- O backend self-hosted sem login não deve ser publicado sem proteção de acesso, rate limiting, limites de upload e firewall/reverse proxy.
- Faça testes com vídeos próprios ou que você tenha autorização de processar.

## Créditos

Base e motor: [OpenShorts](https://github.com/mutonby/openshorts). Painel independente ClipsIA Mobile 0.1. Licenças originais e atribuições preservadas no fork.
