# Shortest path finder

An interactive breadth-first search (BFS) visualizer built with HTML, Tailwind CSS (Play CDN) and vanilla JavaScript.

## Run it
Open `index.html` in a browser. You need an internet connection because Tailwind and the fonts load from CDNs.

## Use it
- Drag across the grid to draw or erase walls. Drag **S** or **E** to move them.
- **Find path** runs BFS and animates it. Use the timeline to scrub backwards and forwards.
- Keys: Enter find path · Space play/pause · ← → step · W random walls · C clear walls

## How it works
- `bfs()` is pure logic. It runs the whole search at once and records, for every cell, the step it joined the queue (`enq`) and the step it left (`deq`).
- To draw any moment `t`, each cell compares its times with `t`: settled if `deq ≤ t`, in the queue (frontier) if `enq ≤ t < deq`. That's how the timeline can go backwards without storing snapshots.
- The path comes from walking `prev[]` back from E to S.
- BFS gives the shortest path because the queue only ever holds cells at distance d or d + 1. Cells leave in order of distance, so the first time E leaves the queue is the shortest route.

## Files
- `index.html`: layout and Tailwind config (custom colours and fonts)
- `app.js`: grid state, BFS, rendering, playback and input handling
