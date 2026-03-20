from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional
import httpx
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic


class LLMAdapter(ABC):
    """Abstract base class for LLM adapters"""

    @abstractmethod
    async def stream_completion(
        self,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Stream completion tokens"""
        pass

    @abstractmethod
    async def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        pass


class OpenAIAdapter(LLMAdapter):
    """OpenAI API adapter"""

    def __init__(self, api_key: str, base_url: Optional[str] = None, model: str = "gpt-4o"):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    async def stream_completion(
        self,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=all_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        # 兼容处理：优先检查是否可直接异步迭代，再尝试 await
        if hasattr(response, '__aiter__'):
            stream = response
        else:
            stream = await response

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def count_tokens(self, text: str) -> int:
        # Approximate token count for OpenAI models
        return len(text) // 4


class AnthropicAdapter(LLMAdapter):
    """Anthropic Claude API adapter"""

    def __init__(self, api_key: str, base_url: Optional[str] = None, model: str = "claude-sonnet-4-20250514"):
        self.client = AsyncAnthropic(api_key=api_key, base_url=base_url)
        self.model = model

    async def stream_completion(
        self,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        stream = self.client.messages.stream(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt if system_prompt else None,
            messages=messages,
        )

        async with stream as event_stream:
            async for text in event_stream.text_stream:
                yield text

    async def count_tokens(self, text: str) -> int:
        # Use Anthropic's token counting
        result = await self.client.messages.count_tokens(
            model=self.model,
            messages=[{"role": "user", "content": text}]
        )
        return result.input_tokens


class CustomAdapter(LLMAdapter):
    """Custom OpenAI-compatible API adapter"""

    def __init__(self, api_key: str, base_url: str, model: str):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    async def stream_completion(
        self,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=all_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        # 兼容处理：优先检查是否可直接异步迭代，再尝试 await
        if hasattr(response, '__aiter__'):
            stream = response
        else:
            stream = await response

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def count_tokens(self, text: str) -> int:
        return len(text) // 4


def create_adapter(
    provider: str,
    api_key: str,
    base_url: Optional[str],
    model: str,
) -> LLMAdapter:
    """Factory function to create appropriate LLM adapter"""
    if provider == "openai":
        return OpenAIAdapter(api_key=api_key, base_url=base_url, model=model)
    elif provider == "anthropic":
        return AnthropicAdapter(api_key=api_key, base_url=base_url, model=model)
    else:
        if not base_url:
            raise ValueError("base_url is required for custom provider")
        return CustomAdapter(api_key=api_key, base_url=base_url, model=model)