"""Smoke test for the configured GroqCloud chat completion endpoint.

Runs on the private server after loading .env. Does not print credentials.
Requires: pip install httpx
"""
import os
import sys

import httpx

URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"


def main():
    key = os.getenv("LLM_API_KEY", "").strip()
    if not key or key.startswith("gsk_SUA_"):
        print("Defina LLM_API_KEY no .env privado do servidor.")
        return 2

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "Reply only with a short JSON object."},
            {"role": "user", "content": 'Return {"status":"ok"}.'},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "stream": False,
    }
    try:
        with httpx.Client(timeout=60) as client:
            response = client.post(
                URL,
                headers={"Authorization": f"Bearer {key}"},
                json=payload,
            )
        if response.status_code != 200:
            print(f"GroqCloud retornou HTTP {response.status_code}. Consulte a chave e as cotas.")
            return 1
        result = response.json()
        text = result["choices"][0]["message"]["content"]
        print(f"GroqCloud conectado. Modelo: {result.get('model', MODEL)}")
        print(f"Resposta de teste: {str(text)[:200]}")
        return 0
    except (httpx.HTTPError, KeyError, ValueError, IndexError) as exc:
        print(f"Falha no teste: {type(exc).__name__}.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
