"""Common utility functions for MAGI backend services."""


def sanitize_string_list(items: list) -> list[str]:
    """Ensure all items in a list are strings.

    Handles cases where LLM returns structured objects like dicts
    instead of plain strings.

    Args:
        items: A list that may contain strings, dicts, or other types.

    Returns:
        A list where every element is a plain string.
    """
    if not items:
        return []
    result = []
    for item in items:
        if isinstance(item, str):
            result.append(item)
        elif isinstance(item, dict):
            parts = [str(v) for v in item.values() if v]
            result.append(" — ".join(parts) if parts else str(item))
        else:
            result.append(str(item))
    return result