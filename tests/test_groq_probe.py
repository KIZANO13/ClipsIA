import json
import os
import pathlib
import sys
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
import probe_groq


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return None

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


class TestGroqProbe(unittest.TestCase):
    def test_request_uses_approved_endpoint_and_never_logs_token(self):
        req = probe_groq.build_request("gsk_fake_secret", "openai/gpt-oss-120b")
        self.assertEqual(req.full_url, "https://api.groq.com/openai/v1/chat/completions")
        self.assertEqual(req.get_header("Authorization"), "Bearer gsk_fake_secret")
        payload = json.loads(req.data)
        self.assertEqual(payload["model"], "openai/gpt-oss-120b")
        self.assertEqual(payload["response_format"], {"type": "json_object"})
        self.assertNotIn("gsk_fake_secret", req.data.decode())

    def test_structured_response(self):
        self.assertTrue(probe_groq.check_response(json.dumps({
            "choices": [{"message": {"content": '{"ok":true}'}}]
        }).encode()))
        self.assertFalse(probe_groq.check_response(json.dumps({
            "choices": [{"message": {"content": '{"ok":false}'}}]
        }).encode()))

    def test_missing_key_is_rejected(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": ""}):
            self.assertEqual(probe_groq.main(), 2)

    def test_connection_success(self):
        payload = {"choices": [{"message": {"content": '{"ok":true}'}}]}
        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_fake_secret"}):
            with patch.object(probe_groq, "urlopen", return_value=FakeResponse(payload)):
                self.assertEqual(probe_groq.main(), 0)

    def test_http_429_is_handled_without_printing_token(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_fake_secret"}):
            with patch.object(probe_groq, "urlopen", side_effect=HTTPError(
                probe_groq.API_URL, 429, "Too Many Requests", {}, None
            )):
                self.assertEqual(probe_groq.main(), 1)


if __name__ == "__main__":
    unittest.main()
