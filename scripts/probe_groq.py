"""Manual GroqCloud connectivity check for ClipsIA.

Reads GROQ_API_KEY from the process environment. Never prints the key, request
headers or raw error bodies. Does not upload video or edit account settings.
"""
from __future__ import annotations

import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-120b"


def build_request(key: str, model: str = DEFAULT_MODEL) -> Request:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Responda somente JSON válido."},
            {"role": "user", "content": 'Responda com o JSON {"ok":true}.'},
        ],
        "response_format": {"type": "json_object"},
        "reasoning_effort": "low",
        "max_completion_tokens": 384,
        "stream": False,
    }
    return Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )


def check_response(raw: bytes) -> bool:
    result = json.loads(raw)
    message = (result.get("choices") or [{}])[0].get("message") or {}
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise ValueError("Resposta da IA vazia")
    structured = json.loads(content)
    if not isinstance(structured, dict):
        raise ValueError("Resposta da IA não é um objeto JSON")
    return structured.get("ok") is True


def main() -> int:
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        print("ERRO: configure GROQ_API_KEY em Settings > Secrets and variables > Actions.")
        return 2
    model = os.getenv("GROQ_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    try:
        with urlopen(build_request(key, model), timeout=45) as response:
            ok = check_response(response.read())
    except HTTPError as error:
        reason = {
            400: "requisição rejeitada; confira o modelo",
            401: "chave inválida ou revogada",
            403: "acesso ao modelo negado",
            404: "modelo ou endpoint indisponível",
            429: "limite gratuito de uso atingido; confira sua cota",
        }.get(error.code, "requisição não concluída")
        print(f"GroqCloud retornou HTTP {error.code}: {reason}.")
        return 1
    except (URLError, TimeoutError):
        print("Falha de rede/tempo de resposta ao conectar à GroqCloud.")
        return 1
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        print("GroqCloud respondeu, mas a resposta não correspondeu ao JSON esperado.")
        return 1
    if not ok:
        print("GroqCloud respondeu, mas não confirmou o JSON de teste.")
        return 1
    print(f"OK: GroqCloud conectada, modelo {model}. Nenhuma chave ou dado de vídeo foi exibido.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
