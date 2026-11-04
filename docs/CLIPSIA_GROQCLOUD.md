# ClipsIA + GroqCloud (seleção de cortes)

O ClipsIA usa o **GroqCloud** para analisar transcrições e selecionar trechos. O modelo padrão é `openai/gpt-oss-120b` por meio da API compatível com OpenAI. Não é necessário contratar a API paga da OpenAI para esse estágio.

## Configurar no servidor privado

1. Crie uma conta em https://console.groq.com/ e gere uma chave em https://console.groq.com/keys.
2. No servidor Linux, copie `.env.example` para `.env`.
3. Acrescente **somente ao arquivo privado `.env`**, nunca ao GitHub:

```dotenv
LLM_API_KEY=gsk_SUA_CHAVE_GROQ_AQUI
```

4. A configuração `deploy/clipia/docker-compose.yml` já define:

```dotenv
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
```

5. Inicie:

```bash
docker compose -f deploy/clipia/docker-compose.yml up -d --build
```

**Segurança:** a chave é lida apenas no backend, por meio de `env_file`. Não a cole no código, GitHub Issues, mensagens de chat, interface pública ou no GitHub Pages. O arquivo `.env` deve permanecer ignorado pelo Git.

## O que o GroqCloud faz (e não faz)

- **Faz:** analisa a transcrição do vídeo, classifica momentos e produz os dados estruturados usados para escolher cortes.
- **Não faz:** hospedagem do app, download de vídeo, renderização MP4 ou aplicação de legendas.
- O projeto continua usando **Whisper local + FFmpeg + renderizador** no servidor.
- Etapas visuais que dependem de Gemini podem ter funcionalidade reduzida sem chave Gemini. O caminho de seleção por transcrição é o alvo inicial.

## Cotas e testes

O GroqCloud possui plano gratuito sujeito a limites por organização, modelo, requisições e tokens. Consulte os limites reais da sua conta em https://console.groq.com/settings/limits e a documentação https://console.groq.com/docs/rate-limits.

Comece com vídeo falado de 2–5 minutos e 3 cortes. Transcrições longas podem atingir limites de tokens e retornar HTTP 429. Não é garantido que todo vídeo funcione gratuitamente.

## Teste isolado de API (no servidor)

```bash
set -a
. ./.env
set +a
python3 scripts/test_groq.py
```

Esse teste usa o mesmo endpoint e modelo do ClipsIA, não faz upload de vídeo e não imprime a chave. Requer `httpx` instalado no Python utilizado. Se falhar por 401, revise a chave; se falhar por 429, verifique os limites gratuitos. **Não execute o teste em ambiente compartilhado com a chave exposta.**

## Status

Integração configurada no repositório; **ainda falta fornecer a chave privada no servidor, subir o Docker e testar um vídeo real**. A assinatura ChatGPT Plus não é utilizada nem necessária para essa API.
