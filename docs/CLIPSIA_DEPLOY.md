# ClipsIA: publicar no celular (GitHub Pages + servidor de IA)

## 1. Prévia gratuita no GitHub Pages

A branch `main` inclui `.github/workflows/clipia-pages.yml`, que publica apenas os arquivos estáticos de `dashboard/public/clipia`.

1. No repositório **KIZANO13/ClipsIA**, abra **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Abra **Actions → ClipsIA - GitHub Pages (prévia)** e rode **Run workflow** se não houver execução automática.
4. Quando o deploy estiver verde, abra `https://kizano13.github.io/ClipsIA/` no Android.

**Importante:** essa URL é uma **prévia da interface**. GitHub Pages não executa Python, Whisper nem FFmpeg. O botão de gerar cortes fica desabilitado na prévia; o app avisa que a IA ainda não está conectada. O manifesto PWA usa URLs relativas para funcionar em `/ClipsIA/` e `/clipia/`.

## 2. Motor de IA: serviço separado, privado

**Seleção de cortes via GroqCloud:** a implantação pessoal já usa o modelo `openai/gpt-oss-120b`. Configure `LLM_API_KEY` somente no `.env` privado do servidor, seguindo [CLIPSIA_GROQCLOUD.md](CLIPSIA_GROQCLOUD.md).

Para processar vídeos de fato, é preciso um Linux com Docker Compose, espaço em disco e capacidade para modelos de IA. CPU pode ser lenta; GPU é opcional. Recomendação inicial: **8–12+ GB de RAM** com pelo menos **2 vCPUs**, 30+ GB disponíveis para imagens/modelos/vídeos (maior é melhor). Não há garantia de throughput nessa configuração.

**Opção a avaliar:** OCI Always Free Ampere A1 permite até 2 OCPUs/12 GB RAM na franquia em certas regiões (consulte a documentação oficial, limites e disponibilidade). **Atenção:** A1 é ARM64; verifique previamente se todas as dependências binárias do OpenShorts (torch, mediapipe, etc.) suportam sua arquitetura. O upstream não foi testado por nós nessa infraestrutura. Alternativamente, use um VPS x86_64 com 8–16 GB RAM, que pode ter custo mensal.

### Subir o núcleo self-host numa máquina Linux

```bash
git clone https://github.com/KIZANO13/ClipsIA.git
cd ClipsIA
cp .env.example .env
# Edite .env NO SERVIDOR: configure GROQ_API_KEY com a chave criada em GroqCloud.
# O Docker Compose já define endpoint e modelo GPT-OSS 120B no backend.
# Nunca coloque chaves no GitHub, GitHub Pages ou em arquivos versionados.
docker compose -f deploy/clipia/docker-compose.yml up -d --build
docker compose -f deploy/clipia/docker-compose.yml ps
curl -fsS http://127.0.0.1:8080/api/config
```

A resposta esperada contém `"billingEnabled":false`. Acesse **http://127.0.0.1:8080/clipia/index.html** do próprio servidor (não exposto à internet).

Esta configuração separada publica **somente 127.0.0.1:8080**, faz proxy same-origin para `/api` e compartilha arquivos renderizados por volumes. Nenhuma porta do backend ou do renderizador é aberta no host. Não use `docker-compose.yml` da raiz em um servidor público sem revisar suas portas expostas.

### Acesso HTTPS pelo celular

Configure um domínio e um túnel reverso, por exemplo **Cloudflare Tunnel**, apontando para `http://localhost:8080`. **Antes de habilitar uma URL pública**, crie uma política **Cloudflare Access** que permita apenas seu login/e-mail, e configure validação de token no origin/túnel. Isto protege uploads e rotas de IA do modo self-host (que não exige login próprio). Consulte [a documentação Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/).

Com isso, a mesma URL HTTPS protegida do servidor abrirá a interface **e** os endpoints de IA, sem problemas de CORS. O GitHub Pages permanece apenas como vitrine/prévia. No Android, use a URL privada autenticada como aplicativo real.

## GroqCloud: configuração da IA

O ClipsIA escolhe os cortes com **GroqCloud + GPT-OSS 120B**, usando a API OpenAI-compatible existente em `llm_backend.py`. Confira o passo a passo em **[CLIPSIA_GROQ.md](CLIPSIA_GROQ.md)**.

A chave Groq deve existir exclusivamente no `.env` privado do servidor. O frontend **não recebe** essa chave. A página no GitHub Pages continua sendo apenas uma prévia sem backend.

## 3. Teste ponta a ponta

1. Confirme `GET /api/config` e `GET /health` na URL do túnel autenticado.
2. Abra `/clipia/index.html` pelo Chrome Android, envie um vídeo **seu** de 2–5 minutos e marque a permissão.
3. Gere 3 cortes, vertical 9:16, legenda automática.
4. Observe fila/processamento e se aparece pelo menos um MP4 reproduzível.
5. Baixe o MP4 e confira legendas, enquadramento e sincronização.

**Ainda não concluídos:** criação de VM, login/túnel, execução de imagens Docker, testes com vídeo real e teste físico no Android. Precisam de uma conta de infraestrutura e dos seus próprios vídeos, sem compartilhar senhas ou chaves aqui.

## Licenças

`LICENSE` / `NOTICE` são mantidos: núcleo MIT; `cloud/` usa uma licença comercial separada. Use apenas o núcleo self-host sem `BILLING_ENABLED` e verifique obrigações antes de distribuir ou operar o projeto como serviço público.
