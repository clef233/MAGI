from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional
import httpx
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
import inspect
import logging

# 独立的文件 handler，避免被其他模块干扰
logger = logging.getLogger('magi.llm_adapter')
logger.setLevel(logging.DEBUG)
# 清除已有的 handlers
logger.handlers = []
# 添加文件 handler
file_handler = logging.FileHandler('magi_debug.log', encoding='utf-8')
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)
# 阻止传播到 root logger
logger.propagate = False


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
        logger.info(f"OpenAIAdapter.stream_completion START, model={self.model}")

        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        logger.info("Calling chat.completions.create with stream=True...")
        response = self.client.chat.completions.create(
            model=self.model,
            messages=all_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        logger.info(f"Response type: {type(response).__name__}, has __aiter__: {hasattr(response, '__aiter__')}, is coroutine: {inspect.iscoroutine(response)}")

        # ✅ 最安全的判断顺序：先看能否直接异步迭代，再考虑 await
        if hasattr(response, '__aiter__'):
            # AsyncStream / async_generator / 任何 async iterable → 直接迭代
            logger.info("Response has __aiter__, using directly")
            stream = response
        elif hasattr(response, '__await__') or inspect.iscoroutine(response):
            # coroutine 或 awaitable → await 后再迭代
            logger.info("Response is awaitable, awaiting...")
            stream = await response
            logger.info(f"After await, stream type: {type(stream).__name__}")
        else:
            # 不应该到这里
            raise TypeError(f"Unexpected response type: {type(response)}")

        logger.info("Starting async iteration...")
        try:
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            logger.info("Async iteration completed")
        except Exception as e:
            logger.error(f"OpenAIAdapter stream error: {e}", exc_info=True)
            raise

    async def count_tokens(self, text: str) -> int:
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
        logger.info(f"AnthropicAdapter.stream_completion START, model={self.model}")

        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        stream = self.client.messages.stream(**kwargs)

        async with stream as event_stream:
            async for text in event_stream.text_stream:
                yield text

    async def count_tokens(self, text: str) -> int:
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
        logger.info(f"CustomAdapter.stream_completion START, model={self.model}, base_url={self.client.base_url}")

        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        logger.info("Calling chat.completions.create with stream=True...")
        response = self.client.chat.completions.create(
            model=self.model,
            messages=all_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        logger.info(f"Response type: {type(response).__name__}, has __aiter__: {hasattr(response, '__aiter__')}, is coroutine: {inspect.iscoroutine(response)}, is async gen: {inspect.isasyncgen(response)}")

        # ✅ 最安全的判断顺序：先看能否直接异步迭代，再考虑 await
        if hasattr(response, '__aiter__'):
            # AsyncStream / async_generator / 任何 async iterable → 直接迭代
            logger.info("Response has __aiter__, using directly")
            stream = response
        elif hasattr(response, '__await__') or inspect.iscoroutine(response):
            # coroutine 或 awaitable → await 后再迭代
            logger.info("Response is awaitable, awaiting...")
            stream = await response
            logger.info(f"After await, stream type: {type(stream).__name__}")
        else:
            # 不应该到这里
            raise TypeError(f"Unexpected response type: {type(response)}")

        logger.info("Starting async iteration...")
        try:
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            logger.info("Async iteration completed")
        except Exception as e:
            logger.error(f"CustomAdapter stream error: {e}", exc_info=True)
            raise

    async def count_tokens(self, text: str) -> int:
        return len(text) // 4


def create_adapter(
    provider: str,
    api_key: str,
    base_url: Optional[str],
    model: str,
) -> LLMAdapter:
    """Factory function to create appropriate LLM adapter"""
    logger.info(f"create_adapter called: provider={provider}, model={model}, base_url={base_url}")
    if provider == "openai":
        return OpenAIAdapter(api_key=api_key, base_url=base_url, model=model)
    elif provider == "anthropic":
        return AnthropicAdapter(api_key=api_key, base_url=base_url, model=model)
    else:
        if not base_url:
            raise ValueError("base_url is required for custom provider")
        return CustomAdapter(api_key=api_key, base_url=base_url, model=model)