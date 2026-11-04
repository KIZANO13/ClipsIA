# ClipsIA — GroqCloud como IA principal

O ClipsIA usa o **GroqCloud GPT-OSS 120B** para ler a **transcrição** do vídeo e selecionar os trechos mais interessantes, com pontuação, título e tempos de corte. O motor OpenShorts já possui um cliente de API OpenAI-compatible em `llm_backend.py`: não é necessário escrever outro motor de IA.

**Isso não significa processamento de vídeo na Groq:** a análise textual acontece na GroqCloud, enquanto o download, Whisper, FFmpeg, enquadramento, legendagem e renderização continuam no servidor que hospeda o ClipsIA.

## Criar a chave grátis

1. Abra https://console.groq.com/keys no navegador Android.
2. Crie uma conta/projeto na GroqCloud e clique em **Create API Key**.
3. Guarde a chave em um gerenciador de senhas; ela pode aparecer apenas uma vez.
4. **Não envie a chave por mensagem, não cole no GitHub e não coloque no painel público!**

O nível gratuito está sujeito a limites de tokens/requisições, que variam por modelo e organização. Consulte https://console.groq.com/docs/rate-limits e a página **Limits** da sua conta. Se atingir 429, reduza o número/tamanho de vídeos e tente após a janela de cota; não tente contornar limites com múltiplas contas.

## Testar sua chave no GitHub Actions (antes de contratar um servidor)

Se você **já criou a chave** e está usando somente o Android:

1. Abra [Settings → Secrets and variables → Actions](https://github.com/KIZANO13/ClipsIA/settings/secrets/actions) no repositório **KIZANO13/ClipsIA**. Em telas pequenas, use **Site para computador** no navegador, se necessário.
2. Selecione **New repository secret**.
3. Em **Name**, escreva exatamente **`GROQ_API_KEY`**.
4. Em **Secret**, cole a chave diretamente no formulário **privado do GitHub** e salve. **Nunca coloque a chave em README, conversa, .env.example ou comentário de PR.**
5. Abra [Actions → ClipsIA - Testar GroqCloud](https://github.com/KIZANO13/ClipsIA/actions/workflows/clipia-groq-check.yml), clique em **Run workflow**, escolha **main** e confirme.
6. Aguarde a execução: **verde** significa que a Groq respondeu ao teste de JSON, **vermelho** indica falta de chave, erro de rede, credenciais, modelo ou cota.

### Se o teste retornar HTTP 403

A Groq informa que **modelos bloqueados pela organização ou pelo projeto** podem retornar HTTP 403. Confira as permissões do modelo `openai/gpt-oss-120b` no [painel de limites da organização](https://console.groq.com/settings/limits) e nas [permissões do projeto](https://console.groq.com/settings/project/limits). Ative-o somente se você tiver permissão para isso. Veja [Model Permissions](https://console.groq.com/docs/model-permissions).

Se não conseguir habilitar o GPT-OSS 120B, execute novamente **ClipsIA - Testar GroqCloud**, escolhendo `openai/gpt-oss-20b` no campo **model** antes de clicar em Run workflow. Se o modelo de 20B passar, ajuste `GROQ_MODEL=openai/gpt-oss-20b` no `.env` **privado do servidor** quando formos configurá-lo. O teste não muda automaticamente o modelo do servidor.

O diagnóstico distingue alguns códigos de bloqueio fornecidos pela Groq sem imprimir respostas brutas ou credenciais. **403 genérico não prova, sozinho, qual configuração está bloqueando o acesso.**

O teste realiza **uma pequena chamada de texto à Groq**; ele **não envia vídeo** e **não cria cortes MP4**. A chamada consome uma parte da cota gratuita. A chave é injetada somente durante a execução manual do workflow; o código não imprime cabeçalhos nem a resposta bruta. Apenas pessoas com permissão de escrita no repositório devem poder alterar workflows que usam segredos.

**Importante:** configurar o segredo no GitHub Actions **não configura o Docker** automaticamente. Quando tivermos um servidor, será necessário preencher `GROQ_API_KEY` também no `.env` privado **do servidor**, ou usar um mecanismo seguro de injeção de segredos. A chave nunca deve ser colocada em código público.

## Configurar no servidor Linux privado

Abra a pasta do repositório no servidor:

```bash
git clone https://github.com/KIZANO13/ClipsIA.git
cd ClipsIA
cp .env.example .env
```

Edite o arquivo **`.env` local no servidor**, preenchendo somente sua chave:

```dotenv
GROQ_API_KEY=COLOQUE_AQUI_SUA_CHAVE_SECRETA
GROQ_MODEL=openai/gpt-oss-120b
```

**Não** altere o `.env.example` com a chave. O `.env` está no `.gitignore`, e o Compose se recusa a iniciar sem `GROQ_API_KEY` preenchido. Não exponha a porta ou a API sem autenticação HTTPS.

O arquivo `deploy/clipia/docker-compose.yml` já define automaticamente no **backend**:

```dotenv
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
LLM_API_KEY=(lida de GROQ_API_KEY no .env privado)
LLM_SCORE_BATCH=3
```

A última linha exibida acima é **explicativa**, não uma variável para copiar literalmente. Nenhuma dessas configurações envia a chave ao navegador.

Inicie após concluir a configuração de hospedagem e HTTPS/autenticação documentada em [CLIPSIA_DEPLOY.md](CLIPSIA_DEPLOY.md):

```bash
docker compose -f deploy/clipia/docker-compose.yml up -d --build
curl -fsS http://127.0.0.1:8080/api/config
```

Em `/api/config`, confirme `billingEnabled: false` e `localLlm.model: "openai/gpt-oss-120b"`. Esse endpoint confirma a **configuração**, não autentica a chave nem prova que a GroqCloud respondeu.

## Teste real pelo Android

Com a URL privada **HTTPS e protegida por login**, abra `/clipia/index.html`, envie um vídeo seu de 2–5 minutos com fala, peça 3 cortes e veja se os MP4s aparecem. Vídeos sem fala dependem de análise visual não coberta pela seleção textual via Groq.

## Problemas comuns

- **401 Unauthorized no log:** chave incorreta/revogada ou configuração ausente. Crie uma nova chave e atualize somente o `.env` privado do servidor.
- **429 Too Many Requests:** quota gratuita ou limite de velocidade. Consulte o painel **Limits** no GroqCloud; use vídeo curto ou aguarde a liberação da cota.
- **Servidor indisponível:** o motor Python/FFmpeg ainda precisa estar em uma VM Linux com Docker, mesmo utilizando GroqCloud.
- **Sem cortes em vídeos silenciosos:** a Groq analisa texto. O OpenShorts pode precisar de Gemini para tarefas baseadas em imagem, como reconhecimento de conteúdo visual e vídeos sem voz.
- **Falha no JSON de resposta:** a API e o OpenShorts fazem validação de esquema e tentam formatos de resposta alternativos, mas isso não elimina todos os erros. Confira os logs.

O projeto não tem acesso à sua conta GroqCloud e não realiza chamadas reais sem a chave configurada no servidor. Não existe cobrança da API OpenAI no fluxo GroqCloud; a Groq pode exigir pagamento caso você opte por upgrade do plano.
