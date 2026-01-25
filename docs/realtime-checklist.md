# Realtime Feature Development Checklist

> Use this checklist before adding any realtime feature or server state.

---

## Before Adding a Realtime Feature

- [ ] Is this server state?
- [ ] Does TanStack Query own it?
- [ ] Does UI render directly from `useQuery`?
- [ ] Does WebSocket only patch cache?
- [ ] Is deduplication enforced?
- [ ] Does it work without refresh?

---

## Server State Ownership

### Questions to Ask:

1. **Does this data come from the backend?**
   - Yes → It's server state
   - No → It can be local state

2. **Can this data change without direct user interaction?**
   - Yes → Must use TanStack Query
   - No → Can use local state

3. **Will WebSocket events update this data?**
   - Yes → Must use TanStack Query with cache patches
   - No → Can use local state

---

## Implementation Checklist

### TanStack Query Setup

- [ ] Using `useQuery` with proper `queryKey`
- [ ] Using `useMutation` for writes
- [ ] Optimistic updates in `onMutate`
- [ ] Error rollback in `onError`
- [ ] Cache invalidation in `onSuccess` (if needed)

### WebSocket Integration

- [ ] WebSocket handler ONLY calls `queryClient.setQueryData`
- [ ] Deduplication by ID is implemented
- [ ] No direct state updates
- [ ] No UI manipulation from WebSocket

### Component Implementation

- [ ] Component uses `useQuery` directly
- [ ] No local `useState` for server data
- [ ] No props passing for server data
- [ ] No `useEffect` syncing from parent

---

## Testing Checklist

- [ ] Data appears immediately after action
- [ ] No refresh required
- [ ] Works with WebSocket disabled (basic fetch)
- [ ] Works with WebSocket enabled (realtime)
- [ ] No duplicate entries
- [ ] Navigation doesn't reset state
