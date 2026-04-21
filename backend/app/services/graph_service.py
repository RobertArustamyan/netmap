"""
Business logic: BFS path-finding for second-degree connection discovery.
"""
from __future__ import annotations

import uuid
from collections import deque


def bfs_all_shortest_paths(
    adj: dict[uuid.UUID, list[tuple[uuid.UUID, uuid.UUID]]],
    from_id: uuid.UUID,
    to_id: uuid.UUID,
    max_depth: int,
) -> list[list[tuple[uuid.UUID, uuid.UUID | None]]]:
    """
    BFS that finds all shortest paths from `from_id` to `to_id`.

    adj: dict[contact_id -> list[(neighbor_id, edge_id)]]
    Returns up to 5 paths, each a list of (contact_id, edge_id_used_to_arrive | None).
    The first element always has edge_id=None (starting node).
    """
    if from_id == to_id:
        return [[(from_id, None)]]

    # Each item in the queue is a path: list of (contact_id, edge_id | None)
    queue: deque[list[tuple[uuid.UUID, uuid.UUID | None]]] = deque(
        [[(from_id, None)]]
    )
    # Track the minimum depth at which each node was first visited
    visited_at_level: dict[uuid.UUID, int] = {from_id: 0}
    shortest_depth: int | None = None
    results: list[list[tuple[uuid.UUID, uuid.UUID | None]]] = []

    while queue:
        path = queue.popleft()
        current_id, _ = path[-1]
        depth = len(path) - 1

        # Prune: once we found the shortest depth, don't go deeper
        if shortest_depth is not None and depth >= shortest_depth:
            continue
        if depth >= max_depth:
            continue

        for neighbor_id, edge_id in adj.get(current_id, []):
            # Allow revisiting a node only if we're arriving at the same or earlier level
            if (
                neighbor_id in visited_at_level
                and visited_at_level[neighbor_id] < depth + 1
            ):
                continue
            visited_at_level[neighbor_id] = depth + 1
            new_path = path + [(neighbor_id, edge_id)]
            if neighbor_id == to_id:
                shortest_depth = depth + 1
                results.append(new_path)
                if len(results) >= 5:
                    return results
            else:
                queue.append(new_path)

    return results
