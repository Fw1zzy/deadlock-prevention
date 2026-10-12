# Deadlock Lab

Deadlock Lab is an interactive learning app for operating systems concepts. It demonstrates deadlock prevention and avoidance, Banker’s Algorithm, and Resource Allocation Graphs (RAGs) through editable examples and visual feedback.

## Features

- **Banker’s Algorithm simulator:** edit processes, resource types, allocations, maximum claims, and available resources. The app calculates Need and reports whether a safe sequence exists.
- **Resource Allocation Graph playground:** add and remove processes, resources, and directed edges; adjust resource instance counts; drag nodes and draw arrows directly on the graph; inspect cycles and invalid allocations.
- **Graph utilities:** clear arrows, clear the graph, or generate a random cycle-free graph.
- **Learning section:** review deadlock handling strategies, the four necessary conditions, prevention techniques, the Ostrich approach, Banker’s Algorithm, and graph-based avoidance.
- **Team section:** view the project team, group leader, and OS adviser.
- Responsive interface for desktop and mobile screens.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Vite prints the local URL in the terminal, normally `http://localhost:5173`.

## Production build

```sh
npm run build
npm run preview
```

The production site is generated in `dist/`.

## Deploy to Vercel

The repository includes `vercel.json` with the production build command, `dist` output directory, and an SPA fallback rewrite. Import the repository into Vercel and deploy using these settings:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install` (Vercel can also detect this automatically)

## Technical notes

- Built with React and Vite; icons use Lucide React.
- The app is client-side only. Simulator and playground edits are held in browser memory and reset when the page reloads.
- Banker’s Algorithm is used for safety checking and deadlock avoidance, not deadlock detection.
- In a Resource Allocation Graph with single-instance resource types, a cycle implies deadlock. With multiple instances, a cycle by itself is not enough to prove deadlock.
