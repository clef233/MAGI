"""
Task Manager for debate sessions.

Manages running debate tasks and event queues for SSE streaming.
"""

import asyncio
import logging
from typing import Dict, Optional
from dataclasses import dataclass

logger = logging.getLogger('magi.task_manager')


@dataclass
class DebateTask:
    """Represents a running debate task"""
    session_id: str
    task: asyncio.Task
    event_queue: asyncio.Queue
    cancelled: bool = False


class TaskManager:
    """
    Manages running debate tasks.

    - Ensures each session only runs once
    - Provides event queues for SSE streaming
    - Supports task cancellation
    """

    def __init__(self):
        self._tasks: Dict[str, DebateTask] = {}
        self._lock = asyncio.Lock()

    async def start_task(
        self,
        session_id: str,
        coro_factory
    ) -> tuple[bool, asyncio.Queue]:
        """
        Start a new debate task.

        Args:
            session_id: The session ID
            coro_factory: A callable that takes an asyncio.Queue and returns a coroutine

        Returns:
            (success, event_queue) - success=False if already running
        """
        async with self._lock:
            if session_id in self._tasks:
                existing = self._tasks[session_id]
                if not existing.task.done():
                    logger.warning(f"Session {session_id} is already running")
                    return False, existing.event_queue

            event_queue = asyncio.Queue()

            async def wrapped_coro():
                try:
                    # Call the factory with the queue to get the actual coroutine
                    await coro_factory(event_queue)
                except asyncio.CancelledError:
                    logger.info(f"Task for session {session_id} was cancelled")
                    await event_queue.put({"event": "cancelled", "data": {}})
                except Exception as e:
                    logger.error(f"Task for session {session_id} failed: {e}")
                    await event_queue.put({"event": "debate_error", "data": {"message": str(e)}})
                finally:
                    async with self._lock:
                        if session_id in self._tasks:
                            del self._tasks[session_id]

            task = asyncio.create_task(wrapped_coro())
            self._tasks[session_id] = DebateTask(
                session_id=session_id,
                task=task,
                event_queue=event_queue,
            )

            logger.info(f"Started task for session {session_id}")
            return True, event_queue

    def get_event_queue(self, session_id: str) -> Optional[asyncio.Queue]:
        """Get the event queue for a running session."""
        task_info = self._tasks.get(session_id)
        if task_info:
            return task_info.event_queue
        return None

    def is_running(self, session_id: str) -> bool:
        """Check if a session is currently running."""
        task_info = self._tasks.get(session_id)
        return task_info is not None and not task_info.task.done()

    async def cancel_task(self, session_id: str) -> bool:
        """
        Cancel a running task.

        Returns True if task was cancelled, False if not running.
        """
        async with self._lock:
            task_info = self._tasks.get(session_id)
            if task_info and not task_info.task.done():
                task_info.cancelled = True
                task_info.task.cancel()
                logger.info(f"Cancelled task for session {session_id}")
                return True
            return False

    def get_cancelled_flag(self, session_id: str) -> bool:
        """Check if a session was marked as cancelled."""
        task_info = self._tasks.get(session_id)
        return task_info.cancelled if task_info else False

    async def _check_db_stopped(self, db, session_id: str) -> bool:
        """Check if session is stopped in database."""
        from app.models.database import DebateSession, SessionStatus
        from sqlalchemy import select

        result = await db.execute(
            select(DebateSession.status).where(DebateSession.id == session_id)
        )
        status = result.scalar_one_or_none()
        return status == SessionStatus.STOPPED


# Global task manager instance
task_manager = TaskManager()