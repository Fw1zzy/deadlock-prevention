import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  Cpu,
  GitBranch,
  Layers3,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  TriangleAlert,
} from "lucide-react";

const scenarios = {
  safe: {
    label: "Safe sequence",
    status: "SAFE STATE",
    accent: "green",
    available: [3, 3, 2],
    processes: [
      { id: "P0", alloc: [0, 1, 0], max: [7, 5, 3], color: "mint" },
      { id: "P1", alloc: [2, 0, 0], max: [3, 2, 2], color: "blue" },
      { id: "P2", alloc: [3, 0, 2], max: [9, 0, 2], color: "violet" },
      { id: "P3", alloc: [2, 1, 1], max: [2, 2, 2], color: "amber" },
      { id: "P4", alloc: [0, 0, 2], max: [4, 3, 3], color: "rose" },
    ],
    sequence: ["P1", "P3", "P4", "P0", "P2"],
  },
  unsafe: {
    label: "Unsafe state",
    status: "UNSAFE STATE",
    accent: "red",
    available: [0, 0, 0],
    processes: [
      { id: "P0", alloc: [0, 1, 0], max: [7, 5, 3], color: "mint" },
      { id: "P1", alloc: [2, 0, 0], max: [3, 2, 2], color: "blue" },
      { id: "P2", alloc: [3, 0, 2], max: [9, 0, 2], color: "violet" },
      { id: "P3", alloc: [2, 1, 1], max: [2, 2, 2], color: "amber" },
      { id: "P4", alloc: [0, 0, 2], max: [4, 3, 3], color: "rose" },
    ],
    sequence: [],
  },
};
const initialResources = ["CPU", "MEM", "I/O"];
const teamMembers = [
  { name: "Allysa Basbas", x: 13, y: 22 },
  { name: "Arar Arman Ravila", x: 50, y: 12 },
  { name: "Ariel Dave Milo", x: 87, y: 22 },
  { name: "Darmie Sison", x: 13, y: 72 },
  { name: "Donato Ureta Jr.", x: 50, y: 88 },
  { name: "Emmanuel Pascua", x: 87, y: 78 },
  { name: "Kurt Nievera", x: 50, y: 50, role: "GROUP LEADER" },
  { name: "Mark Anthony Gali", x: 13, y: 91, role: "OS ADVISER" },
];

function findDirectedCycle(nodes, edges) {
  const graph = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => graph.get(edge.from)?.push(edge.to));
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const visit = (node) => {
    if (visiting.has(node))
      return stack.slice(stack.indexOf(node)).concat(node);
    if (visited.has(node)) return null;
    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  };
  for (const node of nodes) {
    const cycle = visit(node.id);
    if (cycle) return cycle;
  }
  return null;
}

function safetyCheck(processes, available) {
  if (
    processes.some((process) =>
      process.max.some((value, index) => value < process.alloc[index]),
    )
  )
    return { safe: false, sequence: [] };
  const work = [...available];
  const finish = processes.map(() => false);
  const sequence = [];
  let moved = true;
  while (moved) {
    moved = false;
    processes.forEach((process, index) => {
      const need = process.max.map(
        (value, resource) => value - process.alloc[resource],
      );
      if (
        !finish[index] &&
        need.every((value, resource) => value <= work[resource])
      ) {
        process.alloc.forEach((value, resource) => {
          work[resource] += value;
        });
        finish[index] = true;
        sequence.push(process.id);
        moved = true;
      }
    });
  }
  return { safe: finish.every(Boolean), sequence };
}

function App() {
  const [scenario, setScenario] = useState("safe");
  const [activeView, setActiveView] = useState("simulator");
  const [resources, setResources] = useState(initialResources);
  const [available, setAvailable] = useState(scenarios.safe.available);
  const [processes, setProcesses] = useState(scenarios.safe.processes);
  const [running, setRunning] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [graphProcesses, setGraphProcesses] = useState([
    { id: "P0" },
    { id: "P1" },
    { id: "P2" },
  ]);
  const [graphResources, setGraphResources] = useState([
    { id: "R0", instances: 1 },
    { id: "R1", instances: 1 },
    { id: "R2", instances: 1 },
  ]);
  const [graphEdges, setGraphEdges] = useState([
    { from: "P0", to: "R0" },
    { from: "R0", to: "P1" },
    { from: "P1", to: "R1" },
    { from: "R1", to: "P2" },
    { from: "P2", to: "R2" },
    { from: "R2", to: "P0" },
  ]);
  const [edgeFrom, setEdgeFrom] = useState("P0");
  const [edgeTo, setEdgeTo] = useState("R0");
  const [graphCheck, setGraphCheck] = useState(null);
  const [graphFullScreen, setGraphFullScreen] = useState(false);
  const [graphPositions, setGraphPositions] = useState({});
  const [edgeDrag, setEdgeDrag] = useState(null);
  const dragRef = useRef(null);
  const graphCanvasRef = useRef(null);
  useEffect(() => {
    if (!graphFullScreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [graphFullScreen]);
  const result = useMemo(
    () => safetyCheck(processes, available),
    [processes, available],
  );
  const sequence = result.sequence;
  const graphNodes = [...graphProcesses, ...graphResources];
  const cycle = useMemo(
    () => findDirectedCycle(graphNodes, graphEdges),
    [graphProcesses, graphResources, graphEdges],
  );
  const nodePosition = (id) => {
    const stored = graphPositions[id];
    if (stored) return stored;
    const processIndex = graphProcesses.findIndex((node) => node.id === id);
    if (processIndex >= 0)
      return {
        x: 20.3,
        y:
          ((49 + (processIndex + 1) * (190 / (graphProcesses.length + 1))) /
            288) *
          100,
      };
    const resourceIndex = graphResources.findIndex((node) => node.id === id);
    return {
      x: 79.4,
      y:
        ((49 + (resourceIndex + 1) * (190 / (graphResources.length + 1))) /
          288) *
        100,
    };
  };
  const startNodeDrag = (event, id) => {
    if (event.target.closest("button,input,label")) return;
    const rect = graphCanvasRef.current.getBoundingClientRect();
    const position = nodePosition(id);
    dragRef.current = {
      type: "node",
      id,
      offsetX: ((event.clientX - rect.left) / rect.width) * 100 - position.x,
      offsetY: ((event.clientY - rect.top) / rect.height) * 100 - position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const startEdgeDrag = (event, id) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { type: "edge", id };
    setEdgeDrag({ from: id, x: 0, y: 0 });
  };
  const moveGraphPointer = (event) => {
    const active = dragRef.current;
    if (!active || !graphCanvasRef.current) return;
    const rect = graphCanvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (active.type === "node") {
      setGraphPositions((current) => ({
        ...current,
        [active.id]: {
          x: Math.max(5, Math.min(95, x * 100 - active.offsetX)),
          y: Math.max(12, Math.min(88, y * 100 - active.offsetY)),
        },
      }));
    } else {
      setEdgeDrag((current) =>
        current ? { ...current, x: x * 620, y: y * 288 } : current,
      );
    }
  };
  const endGraphPointer = (event) => {
    const active = dragRef.current;
    if (active?.type === "edge") {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-node-id]");
      const targetId = target?.dataset.nodeId;
      if (targetId && targetId !== active.id) {
        setGraphEdges((current) => [
          ...current,
          { from: active.id, to: targetId },
        ]);
        setGraphCheck(null);
      }
    }
    dragRef.current = null;
    setEdgeDrag(null);
  };
  const nextGraphId = (prefix, list) => {
    let index = 0;
    while (list.some((node) => node.id === `${prefix}${index}`)) index += 1;
    return `${prefix}${index}`;
  };
  const addGraphProcess = () => {
    const node = { id: nextGraphId("P", graphProcesses) };
    setGraphProcesses((current) => [...current, node]);
    if (!graphNodes.some((item) => item.id === edgeFrom)) setEdgeFrom(node.id);
    setGraphCheck(null);
  };
  const addGraphResource = () => {
    const node = { id: nextGraphId("R", graphResources), instances: 1 };
    setGraphResources((current) => [...current, node]);
    if (!graphNodes.some((item) => item.id === edgeTo)) setEdgeTo(node.id);
    setGraphCheck(null);
  };
  const addGraphEdge = () => {
    setGraphEdges((current) => [...current, { from: edgeFrom, to: edgeTo }]);
    setGraphCheck(null);
  };
  const removeGraphEdge = (index) => {
    setGraphEdges((current) =>
      current.filter((_, edgeIndex) => edgeIndex !== index),
    );
    setGraphCheck(null);
  };
  const clearGraphArrows = () => {
    setGraphEdges([]);
    setGraphCheck(null);
  };
  const clearGraph = () => {
    setGraphProcesses([]);
    setGraphResources([]);
    setGraphEdges([]);
    setGraphPositions({});
    setEdgeFrom("");
    setEdgeTo("");
    setGraphCheck(null);
  };
  const createRandomSafeGraph = () => {
    const nextProcesses = [{ id: "P0" }, { id: "P1" }, { id: "P2" }];
    const nextResources = [
      { id: "R0", instances: 2 },
      { id: "R1", instances: 1 },
      { id: "R2", instances: 1 },
    ];
    const order = ["P0", "R0", "P1", "R1", "P2", "R2"];
    const edges = [
      { from: "P0", to: "R0" },
      { from: "R0", to: "P1" },
    ];
    for (let fromIndex = 0; fromIndex < order.length; fromIndex += 1) {
      for (let toIndex = fromIndex + 1; toIndex < order.length; toIndex += 1) {
        const from = order[fromIndex];
        const to = order[toIndex];
        const fromProcess = from.startsWith("P");
        const toProcess = to.startsWith("P");
        if (
          fromProcess === toProcess ||
          edges.some((edge) => edge.from === from && edge.to === to) ||
          Math.random() > 0.36
        )
          continue;
        const resource = nextResources.find((item) => item.id === from);
        if (
          resource &&
          edges.filter((edge) => edge.from === from && edge.to.startsWith("P"))
            .length >= resource.instances
        )
          continue;
        edges.push({ from, to });
      }
    }
    setGraphProcesses(nextProcesses);
    setGraphResources(nextResources);
    setGraphEdges(edges);
    setGraphPositions({});
    setEdgeFrom("P0");
    setEdgeTo("R0");
    setGraphCheck({
      valid: true,
      deadlock: false,
      title: "Random safe graph created",
      message:
        "This graph was generated without a directed cycle. Its request and allocation arrows follow the Resource Allocation Graph rules, so it contains no deadlock cycle.",
    });
  };
  const removeGraphNode = (id) => {
    const remainingProcesses = graphProcesses.filter((node) => node.id !== id);
    const remainingResources = graphResources.filter((node) => node.id !== id);
    setGraphProcesses(remainingProcesses);
    setGraphResources(remainingResources);
    setGraphEdges((current) =>
      current.filter((edge) => edge.from !== id && edge.to !== id),
    );
    setGraphPositions((current) => {
      const positions = { ...current };
      delete positions[id];
      return positions;
    });
    if (edgeFrom === id)
      setEdgeFrom(remainingProcesses[0]?.id ?? remainingResources[0]?.id ?? "");
    if (edgeTo === id)
      setEdgeTo(remainingResources[0]?.id ?? remainingProcesses[0]?.id ?? "");
    setGraphCheck(null);
  };
  const checkGraph = () => {
    const nodeIds = new Set(graphNodes.map((node) => node.id));
    const invalidEdge = graphEdges.find((edge) => {
      const fromProcess = graphProcesses.some((node) => node.id === edge.from);
      const toProcess = graphProcesses.some((node) => node.id === edge.to);
      const fromResource = graphResources.some((node) => node.id === edge.from);
      const toResource = graphResources.some((node) => node.id === edge.to);
      const allocationExceedsInstances =
        fromResource &&
        toProcess &&
        graphEdges.filter(
          (item) =>
            item.from === edge.from &&
            graphProcesses.some((process) => process.id === item.to),
        ).length >
          (graphResources.find((resource) => resource.id === edge.from)
            ?.instances ?? 0);
      return (
        !nodeIds.has(edge.from) ||
        !nodeIds.has(edge.to) ||
        edge.from === edge.to ||
        fromProcess === toProcess ||
        fromResource === toResource ||
        allocationExceedsInstances
      );
    });
    const duplicate = graphEdges.find(
      (edge, index) =>
        graphEdges.findIndex(
          (item) => item.from === edge.from && item.to === edge.to,
        ) !== index,
    );
    if (!graphProcesses.length || !graphResources.length) {
      setGraphCheck({
        valid: false,
        title: "Add both process and resource nodes",
        message:
          "A resource-allocation graph needs at least one process and one resource.",
      });
    } else if (invalidEdge) {
      setGraphCheck({
        valid: false,
        title: "This graph has an invalid arrow",
        message:
          "Every arrow must connect one process and one resource. Process → resource means a request; resource → process means an allocated instance. A resource cannot allocate more instances than it contains.",
      });
    } else if (duplicate) {
      setGraphCheck({
        valid: false,
        title: "Duplicate arrow found",
        message: `Remove the repeated ${duplicate.from} → ${duplicate.to} edge. Each relationship should appear once in the graph.`,
      });
    } else if (cycle) {
      const cycleResources = [
        ...new Set(
          cycle.filter((id) => graphResources.some((node) => node.id === id)),
        ),
      ].map((id) => graphResources.find((node) => node.id === id));
      const singleInstance = cycleResources.every(
        (resource) => resource.instances === 1,
      );
      setGraphCheck({
        valid: true,
        deadlock: singleInstance,
        title: singleInstance
          ? "Correct graph: deadlock detected"
          : "Correct graph: cycle detected",
        message: singleInstance
          ? `The cycle ${cycle.join(" → ")} returns to its starting point. Each resource in the cycle has one instance, so every process is waiting for a resource held by the next process: this is a deadlock.`
          : `The cycle ${cycle.join(" → ")} is valid, but at least one resource in it has multiple instances. A cycle alone does not prove deadlock when resource types have multiple instances.`,
      });
    } else {
      setGraphCheck({
        valid: true,
        deadlock: false,
        title: "Correct graph: no deadlock cycle",
        message:
          "All arrows follow the process/resource rules, and there is no directed cycle. The current graph does not show a deadlock.",
      });
    }
  };

  const updateCell = (processId, kind, index, value) => {
    const number = Math.max(0, Number(value) || 0);
    setProcesses((current) =>
      current.map((process) =>
        process.id === processId
          ? {
              ...process,
              [kind]: process[kind].map((cell, cellIndex) =>
                cellIndex === index ? number : cell,
              ),
            }
          : process,
      ),
    );
    setScenario("custom");
    setRunning(false);
  };
  const updateProcessName = (processId, name) => {
    if (
      processes.some(
        (process) => process.id === name && process.id !== processId,
      )
    )
      return;
    setProcesses((current) =>
      current.map((process) =>
        process.id === processId ? { ...process, id: name } : process,
      ),
    );
    setScenario("custom");
    setRunning(false);
  };
  const updateResourceName = (index, name) => {
    setResources((current) =>
      current.map((resource, i) => (i === index ? name : resource)),
    );
    setScenario("custom");
    setRunning(false);
  };
  const addProcess = () => {
    let nextId = 0;
    while (processes.some((process) => process.id === `P${nextId}`))
      nextId += 1;
    const id = `P${nextId}`;
    setProcesses((current) => [
      ...current,
      {
        id,
        alloc: resources.map(() => 0),
        max: resources.map(() => 1),
        color: ["mint", "blue", "violet", "amber", "rose"][current.length % 5],
      },
    ]);
    setScenario("custom");
    setRunning(false);
  };
  const removeProcess = (id) => {
    setProcesses((current) => current.filter((process) => process.id !== id));
    setScenario("custom");
    setRunning(false);
  };
  const addResource = () => {
    const next = resources.length + 1;
    setResources((current) => [...current, `R${next}`]);
    setAvailable((current) => [...current, 1]);
    setProcesses((current) =>
      current.map((process) => ({
        ...process,
        alloc: [...process.alloc, 0],
        max: [...process.max, 1],
      })),
    );
    setScenario("custom");
    setRunning(false);
  };
  const removeResource = (index) => {
    if (resources.length <= 1) return;
    setResources((current) => current.filter((_, i) => i !== index));
    setAvailable((current) => current.filter((_, i) => i !== index));
    setProcesses((current) =>
      current.map((process) => ({
        ...process,
        alloc: process.alloc.filter((_, i) => i !== index),
        max: process.max.filter((_, i) => i !== index),
      })),
    );
    setScenario("custom");
    setRunning(false);
  };
  const loadScenario = (name) => {
    const next = scenarios[name];
    setResources(initialResources);
    setAvailable(next.available);
    setProcesses(next.processes);
    setScenario(name);
    setRunning(false);
  };
  const reset = () => loadScenario("safe");
  const run = () => {
    setRunning(false);
    requestAnimationFrame(() => setRunning(true));
  };

  return (
    <main className="shell">
      <section className="main-area" id="top">
        <header className="topbar">
          <div className="breadcrumbs">
            OPERATING SYSTEMS <span>/</span> <b>DEADLOCK LAB</b>
          </div>
          <nav className="top-nav" aria-label="Main sections">
            <button
              className={activeView === "simulator" ? "active" : ""}
              onClick={() => {
                setActiveView("simulator");
                setGraphFullScreen(false);
              }}
            >
              Simulator
            </button>
            <button
              className={activeView === "prevention" ? "active" : ""}
              onClick={() => {
                setActiveView("prevention");
                setGraphFullScreen(false);
              }}
            >
              Prevention
            </button>
            <button
              className={activeView === "team" ? "active" : ""}
              onClick={() => {
                setActiveView("team");
                setGraphFullScreen(false);
              }}
            >
              Team members <span>7</span>
            </button>
          </nav>
          <div className="top-actions">
            <span className="live-tag">
              <i /> LIVE SIMULATION
            </span>
            <button
              className="icon-button"
              aria-label="Toggle explanation"
              onClick={() => setShowInfo(!showInfo)}
            >
              <CircleHelp size={18} />
            </button>
          </div>
        </header>
        <div className="content">
          <div className="simulator-view" hidden={activeView !== "simulator"}>
            <section className="intro">
              <div className="eyebrow">
                <span className="eyebrow-line" /> VISUAL LEARNING MODULE
              </div>
              <div className="title-row">
                <div>
                  <h1>
                    Deadlock <em>lab.</em>
                  </h1>
                  <p className="subtitle">
                    See how processes compete for resources — and learn how to
                    keep the system moving.
                  </p>
                </div>
                <div className="intro-symbol">
                  <GitBranch size={28} />
                </div>
              </div>
            </section>

            {showInfo && (
              <div className="info-banner">
                <Sparkles size={17} />
                <p>
                  <strong>Deadlock</strong> happens when processes are stuck
                  waiting on resources held by one another. Banker’s Algorithm
                  checks whether granting a request keeps the system in a safe
                  state.
                </p>
                <button
                  onClick={() => setShowInfo(false)}
                  aria-label="Dismiss explanation"
                >
                  ×
                </button>
              </div>
            )}

            <section className="metrics" aria-label="System overview">
              <div className="metric-card">
                <div className="metric-top">
                  <span>PLAYGROUND PROCESSES</span>
                  <Cpu size={16} />
                </div>
                <div className="metric-value">
                  {String(graphProcesses.length).padStart(2, "0")}{" "}
                  <small>processes</small>
                </div>
                <div className="metric-foot">
                  <span className="metric-bars">
                    {graphProcesses.map((process, index) => (
                      <i
                        key={process.id}
                        style={{ opacity: index < 5 ? 0.8 : 0.35 }}
                      />
                    ))}
                  </span>
                  Nodes in current graph
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-top">
                  <span>PLAYGROUND RESOURCES</span>
                  <Layers3 size={16} />
                </div>
                <div className="metric-value">
                  {String(graphResources.length).padStart(2, "0")}{" "}
                  <small>classes</small>
                </div>
                <div className="resource-chips">
                  {graphResources.slice(0, 5).map((resource, i) => (
                    <span
                      className={`resource-chip rc-${i % 3}`}
                      key={resource.id}
                    >
                      {resource.id}
                    </span>
                  ))}
                </div>
              </div>
              <div
                className={`metric-card status-metric ${result.safe ? "is-safe" : "is-unsafe"}`}
              >
                <div className="metric-top">
                  <span>SAFETY CHECK</span>
                  {result.safe ? (
                    <ShieldCheck size={16} />
                  ) : (
                    <TriangleAlert size={16} />
                  )}
                </div>
                <div className="metric-value status-value">
                  {result.safe ? "SAFE" : "UNSAFE"}
                </div>
                <div className="metric-foot">
                  <span className="status-light" />
                  {result.safe
                    ? "All processes can finish"
                    : "No safe sequence found"}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-top">
                  <span>ALGORITHM</span>
                  <ArrowUpRight size={16} />
                </div>
                <div className="metric-value algo-value">BANKER’S</div>
                <div className="metric-foot">
                  <span className="algo-dot" />
                  Deadlock avoidance
                </div>
              </div>
            </section>

            <section className="simulation-grid" id="simulation">
              <article
                className={`panel graph-panel ${graphFullScreen ? "is-fullscreen" : ""}`}
              >
                <div className="panel-heading">
                  <div>
                    <div className="panel-kicker">
                      <span className="pulse" /> INTERACTIVE PLAYGROUND
                    </div>
                    <h2>Resource allocation graph</h2>
                  </div>
                  <div className="graph-heading-actions">
                    <button
                      className="text-button"
                      onClick={() => setShowInfo(!showInfo)}
                    >
                      How to read it <ArrowUpRight size={14} />
                    </button>
                    <button
                      className="fullscreen-button"
                      onClick={() => setGraphFullScreen(!graphFullScreen)}
                    >
                      {graphFullScreen ? (
                        <>
                          <Minimize2 size={14} /> Exit playground
                        </>
                      ) : (
                        <>
                          <Maximize2 size={14} /> Open playground
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div
                  className="graph-canvas playground-canvas"
                  ref={graphCanvasRef}
                  onPointerMove={moveGraphPointer}
                  onPointerUp={endGraphPointer}
                  onPointerCancel={endGraphPointer}
                >
                  <div className="graph-grid" />
                  <svg
                    className="edges"
                    viewBox="0 0 620 288"
                    preserveAspectRatio="none"
                    aria-label="Interactive resource allocation graph"
                  >
                    <defs>
                      <marker
                        id="arrowMint"
                        markerWidth="8"
                        markerHeight="8"
                        refX="7"
                        refY="4"
                        orient="auto"
                      >
                        <path d="M0,0 L8,4 L0,8 z" fill="#81e1c0" />
                      </marker>
                      <marker
                        id="arrowOrange"
                        markerWidth="8"
                        markerHeight="8"
                        refX="7"
                        refY="4"
                        orient="auto"
                      >
                        <path d="M0,0 L8,4 L0,8 z" fill="#f4a96f" />
                      </marker>
                    </defs>
                    {graphEdges.map((edge, index) => {
                      const from = nodePosition(edge.from);
                      const to = nodePosition(edge.to);
                      const x1 = (from.x / 100) * 620;
                      const y1 = (from.y / 100) * 288;
                      const x2 = (to.x / 100) * 620;
                      const y2 = (to.y / 100) * 288;
                      const dx = x2 - x1;
                      const dy = y2 - y1;
                      const distance = Math.max(1, Math.hypot(dx, dy));
                      const fromRadius = graphProcesses.some(
                        (node) => node.id === edge.from,
                      )
                        ? 27
                        : 35;
                      const toRadius = graphProcesses.some(
                        (node) => node.id === edge.to,
                      )
                        ? 27
                        : 35;
                      const startX = x1 + (dx / distance) * fromRadius;
                      const startY = y1 + (dy / distance) * fromRadius;
                      const endX = x2 - (dx / distance) * toRadius;
                      const endY = y2 - (dy / distance) * toRadius;
                      const bend = index % 2 ? 13 : -13;
                      const controlX =
                        (startX + endX) / 2 - (dy / distance) * bend;
                      const controlY =
                        (startY + endY) / 2 + (dx / distance) * bend;
                      const allocated = graphResources.some(
                        (node) => node.id === edge.from,
                      );
                      return (
                        <path
                          key={index}
                          d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                          className={`edge edge-removable ${allocated ? "assigned" : "requested"}`}
                          markerEnd={`url(#${allocated ? "arrowMint" : "arrowOrange"})`}
                          onClick={() => removeGraphEdge(index)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ")
                              removeGraphEdge(index);
                          }}
                          role="button"
                          tabIndex="0"
                          aria-label={`Remove arrow ${edge.from} to ${edge.to}`}
                        >
                          <title>Click to remove this arrow</title>
                        </path>
                      );
                    })}
                    {edgeDrag &&
                      (() => {
                        const point = nodePosition(edgeDrag.from);
                        return (
                          <path
                            d={`M ${(point.x / 100) * 620} ${(point.y / 100) * 288} L ${edgeDrag.x} ${edgeDrag.y}`}
                            className="edge requested drag-preview"
                            markerEnd="url(#arrowOrange)"
                          />
                        );
                      })()}
                  </svg>
                  {graphProcesses.map((node) => {
                    const position = nodePosition(node.id);
                    return (
                      <div
                        key={node.id}
                        data-node-id={node.id}
                        onPointerDown={(event) => startNodeDrag(event, node.id)}
                        className="graph-node process-node playground-node"
                        style={{
                          left: `${position.x}%`,
                          top: `${position.y}%`,
                        }}
                      >
                        <span className="node-label">PROCESS</span>
                        <b>{node.id}</b>
                        <button
                          className="node-remove"
                          onClick={() => removeGraphNode(node.id)}
                          aria-label={`Remove ${node.id}`}
                        >
                          ×
                        </button>
                        <button
                          className="edge-handle"
                          onPointerDown={(event) =>
                            startEdgeDrag(event, node.id)
                          }
                          aria-label={`Drag arrow from ${node.id}`}
                          title="Drag to another node to create an arrow"
                        />
                      </div>
                    );
                  })}
                  {graphResources.map((node) => {
                    const position = nodePosition(node.id);
                    return (
                      <div
                        key={node.id}
                        data-node-id={node.id}
                        onPointerDown={(event) => startNodeDrag(event, node.id)}
                        className="graph-node resource-node playground-node"
                        style={{
                          left: `${position.x}%`,
                          top: `${position.y}%`,
                        }}
                      >
                        <span className="node-label">RESOURCE</span>
                        <b>{node.id}</b>
                        <label>
                          <input
                            aria-label={`${node.id} instances`}
                            type="number"
                            min="1"
                            value={node.instances}
                            onChange={(event) => {
                              setGraphResources((current) =>
                                current.map((item) =>
                                  item.id === node.id
                                    ? {
                                        ...item,
                                        instances: Math.max(
                                          1,
                                          Number(event.target.value) || 1,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                              setGraphCheck(null);
                            }}
                          />{" "}
                          instances
                        </label>
                        <button
                          className="node-remove"
                          onClick={() => removeGraphNode(node.id)}
                          aria-label={`Remove ${node.id}`}
                        >
                          ×
                        </button>
                        <button
                          className="edge-handle"
                          onPointerDown={(event) =>
                            startEdgeDrag(event, node.id)
                          }
                          aria-label={`Drag arrow from ${node.id}`}
                          title="Drag to another node to create an arrow"
                        />
                      </div>
                    );
                  })}
                  <div className="graph-side-label process-side">PROCESSES</div>
                  <div className="graph-side-label resource-side">
                    RESOURCES
                  </div>
                  <div className="graph-legend">
                    <span>
                      <i className="legend-dot mint" />
                      Allocated
                    </span>
                    <span>
                      <i className="legend-dot orange" />
                      Requesting
                    </span>
                  </div>
                </div>
                <div className="graph-caption">
                  <span className="caption-index">RAG / PLAYGROUND</span>
                  <p>
                    Drag nodes to arrange, drag connector dots to draw, or click
                    an arrow to remove it.
                  </p>
                  <span className="caption-status">
                    <i /> {graphNodes.length} NODES · {graphEdges.length} EDGES
                  </span>
                </div>
                <div className="graph-controls">
                  <div className="graph-action-row">
                    <div className="graph-node-actions">
                      <button className="add-button" onClick={addGraphProcess}>
                        <Plus size={13} /> Process
                      </button>
                      <button className="add-button" onClick={addGraphResource}>
                        <Plus size={13} /> Resource
                      </button>
                    </div>
                    <div className="graph-management-actions">
                      <button
                        className="random-graph-button"
                        onClick={createRandomSafeGraph}
                      >
                        <Sparkles size={13} /> Random safe graph
                      </button>
                      <button
                        className="clear-action"
                        onClick={clearGraphArrows}
                        disabled={!graphEdges.length}
                      >
                        Clear arrows
                      </button>
                      <button
                        className="clear-action"
                        onClick={clearGraph}
                        disabled={!graphNodes.length}
                      >
                        Clear graph
                      </button>
                    </div>
                  </div>
                  <div className="edge-builder">
                    <label>
                      FROM
                      <select
                        value={edgeFrom}
                        onChange={(event) => setEdgeFrom(event.target.value)}
                      >
                        {graphNodes.map((node) => (
                          <option key={node.id} value={node.id}>
                            {node.id} ·{" "}
                            {graphProcesses.some(
                              (process) => process.id === node.id,
                            )
                              ? "process"
                              : "resource"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <ArrowRight size={14} />
                    <label>
                      TO
                      <select
                        value={edgeTo}
                        onChange={(event) => setEdgeTo(event.target.value)}
                      >
                        {graphNodes.map((node) => (
                          <option key={node.id} value={node.id}>
                            {node.id} ·{" "}
                            {graphProcesses.some(
                              (process) => process.id === node.id,
                            )
                              ? "process"
                              : "resource"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="add-edge-button"
                      onClick={addGraphEdge}
                      disabled={
                        !graphNodes.some((node) => node.id === edgeFrom) ||
                        !graphNodes.some((node) => node.id === edgeTo)
                      }
                    >
                      <Plus size={13} /> Add arrow
                    </button>
                  </div>
                </div>
                <div className="edge-list">
                  {graphEdges.map((edge, index) => (
                    <div className="edge-chip" key={index}>
                      <span
                        className={
                          graphProcesses.some((node) => node.id === edge.from)
                            ? "request-edge"
                            : "allocated-edge"
                        }
                      >
                        {edge.from} <ArrowRight size={12} /> {edge.to}
                      </span>
                      <small>
                        {graphProcesses.some((node) => node.id === edge.from)
                          ? "REQUEST"
                          : "ALLOCATION"}
                      </small>
                      <button
                        onClick={() => removeGraphEdge(index)}
                        aria-label={`Remove edge ${edge.from} to ${edge.to}`}
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button className="check-graph-button" onClick={checkGraph}>
                  <Activity size={15} /> CHECK GRAPH <ArrowRight size={15} />
                </button>
                {graphCheck && (
                  <div
                    className={`graph-feedback ${graphCheck.valid ? (graphCheck.deadlock ? "feedback-danger" : "feedback-good") : "feedback-invalid"}`}
                  >
                    <div className="feedback-symbol">
                      {graphCheck.valid
                        ? graphCheck.deadlock
                          ? "!"
                          : "✓"
                        : "×"}
                    </div>
                    <div>
                      <strong>{graphCheck.title}</strong>
                      <p>{graphCheck.message}</p>
                    </div>
                  </div>
                )}
              </article>

              <article className="panel algorithm-panel" id="algorithm">
                <div className="panel-heading">
                  <div>
                    <div className="panel-kicker">
                      <span className="algorithm-icon">
                        <Terminal size={13} />
                      </span>{" "}
                      ALGORITHM WALKTHROUGH
                    </div>
                    <h2>Banker’s algorithm</h2>
                  </div>
                  <button
                    className="more-button"
                    aria-label="More algorithm details"
                  >
                    ···
                  </button>
                </div>
                <div className="algorithm-copy">
                  <p>
                    A request is granted only if the system stays in a{" "}
                    <strong>safe state.</strong>
                  </p>
                  <div className="formula">
                    <span>NEED</span>
                    <b>=</b>
                    <span>MAX</span>
                    <b>−</b>
                    <span>ALLOC</span>
                  </div>
                </div>
                <div className="algorithm-steps">
                  <div className="step complete">
                    <span className="step-number">01</span>
                    <div>
                      <strong>Calculate need</strong>
                      <small>Need = Max − Allocation</small>
                    </div>
                    <span className="step-check">✓</span>
                  </div>
                  <div className="step complete">
                    <span className="step-number">02</span>
                    <div>
                      <strong>Find a process</strong>
                      <small>Need ≤ Available resources</small>
                    </div>
                    <span className="step-check">✓</span>
                  </div>
                  <div
                    className={`step ${result.safe ? "complete" : "blocked"}`}
                  >
                    <span className="step-number">03</span>
                    <div>
                      <strong>Simulate completion</strong>
                      <small>Release its resources back</small>
                    </div>
                    <span className="step-check">
                      {result.safe ? "✓" : "!"}
                    </span>
                  </div>
                  <div
                    className={`step ${result.safe ? "complete" : "blocked"}`}
                  >
                    <span className="step-number">04</span>
                    <div>
                      <strong>Check all processes</strong>
                      <small>
                        {result.safe
                          ? "Safe sequence exists"
                          : "System cannot proceed"}
                      </small>
                    </div>
                    <span className="step-check">
                      {result.safe ? "✓" : "!"}
                    </span>
                  </div>
                </div>
                <button className="run-button" onClick={run}>
                  <Play size={15} fill="currentColor" />{" "}
                  {running ? "SIMULATION COMPLETE" : "RUN SAFETY CHECK"}{" "}
                  <ArrowRight size={16} />
                </button>
              </article>
            </section>

            <section className="panel table-panel">
              <div className="table-heading">
                <div>
                  <div className="panel-kicker">
                    SYSTEM SNAPSHOT <span className="table-dot" />
                  </div>
                  <h2>Process allocation matrix</h2>
                </div>
                <div className="table-controls">
                  <div
                    className="scenario-switch"
                    role="group"
                    aria-label="Choose scenario"
                  >
                    <button
                      className={scenario === "safe" ? "selected" : ""}
                      onClick={() => loadScenario("safe")}
                    >
                      Safe example
                    </button>
                    <button
                      className={scenario === "unsafe" ? "selected" : ""}
                      onClick={() => loadScenario("unsafe")}
                    >
                      Unsafe example
                    </button>
                  </div>
                  <button className="reset-button" onClick={reset}>
                    <RotateCcw size={14} /> Reset
                  </button>
                </div>
              </div>
              <div className="matrix-actions">
                <span>
                  Edit values directly in the matrix. Need is calculated
                  automatically.
                </span>
                <div>
                  <button className="add-button" onClick={addProcess}>
                    <Plus size={13} /> Add process
                  </button>
                  <button className="add-button" onClick={addResource}>
                    <Plus size={13} /> Add resource
                  </button>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="process-col">PROCESS</th>
                      <th colSpan={resources.length}>ALLOCATION</th>
                      <th colSpan={resources.length}>MAXIMUM</th>
                      <th colSpan={resources.length}>NEED</th>
                      <th className="state-col">STATE</th>
                      <th></th>
                    </tr>
                    <tr className="subhead">
                      <th>NAME</th>
                      {[...resources, ...resources, ...resources].map(
                        (r, i) => (
                          <th key={i} className={`rhead-${i % 3}`}>
                            {i < resources.length ? (
                              <input
                                className="resource-name"
                                aria-label={`Resource name ${i + 1}`}
                                value={resources[i]}
                                onChange={(event) =>
                                  updateResourceName(i, event.target.value)
                                }
                              />
                            ) : (
                              resources[i % resources.length]
                            )}
                          </th>
                        ),
                      )}
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map((p, processIndex) => {
                      const need = p.max.map((v, i) =>
                        Math.max(0, v - p.alloc[i]),
                      );
                      const valid = p.max.every((v, i) => v >= p.alloc[i]);
                      const canFinish =
                        valid && need.every((v, i) => v <= available[i]);
                      return (
                        <tr
                          key={processIndex}
                          className={
                            running && sequence.includes(p.id)
                              ? "row-flash"
                              : ""
                          }
                        >
                          <td>
                            <span className={`process-id ${p.color}`}>
                              <i />
                              <input
                                className="process-name"
                                aria-label="Process name"
                                value={p.id}
                                onChange={(event) =>
                                  updateProcessName(p.id, event.target.value)
                                }
                              />
                            </span>
                          </td>
                          {p.alloc.map((n, i) => (
                            <td key={`a${i}`} className="mono">
                              <input
                                className="matrix-input"
                                aria-label={`${p.id} ${resources[i]} allocated`}
                                type="number"
                                min="0"
                                value={n}
                                onChange={(event) =>
                                  updateCell(
                                    p.id,
                                    "alloc",
                                    i,
                                    event.target.value,
                                  )
                                }
                              />
                            </td>
                          ))}
                          {p.max.map((n, i) => (
                            <td key={`m${i}`} className="mono">
                              <input
                                className="matrix-input"
                                aria-label={`${p.id} ${resources[i]} maximum`}
                                type="number"
                                min="0"
                                value={n}
                                onChange={(event) =>
                                  updateCell(p.id, "max", i, event.target.value)
                                }
                              />
                            </td>
                          ))}
                          {need.map((n, i) => (
                            <td key={`n${i}`} className="mono need-cell">
                              {n}
                            </td>
                          ))}
                          <td>
                            <span
                              className={`row-state ${canFinish ? "ready" : "waiting"}`}
                            >
                              <i />
                              {valid
                                ? canFinish
                                  ? "READY"
                                  : "WAITING"
                                : "INVALID"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="remove-button"
                              onClick={() => removeProcess(p.id)}
                              aria-label={`Remove ${p.id}`}
                              disabled={processes.length <= 1}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>
                        <strong>AVAILABLE</strong>
                      </td>
                      {available.map((n, i) => (
                        <td key={`av${i}`} className="mono available-cell">
                          <input
                            className="matrix-input available-input"
                            aria-label={`${resources[i]} available`}
                            type="number"
                            min="0"
                            value={n}
                            onChange={(event) => {
                              setAvailable((current) =>
                                current.map((value, index) =>
                                  index === i
                                    ? Math.max(
                                        0,
                                        Number(event.target.value) || 0,
                                      )
                                    : value,
                                ),
                              );
                              setScenario("custom");
                              setRunning(false);
                            }}
                          />
                        </td>
                      ))}
                      <td
                        colSpan={Math.max(1, resources.length * 2)}
                        className="available-note"
                      >
                        Resources currently free to allocate
                      </td>
                      <td colSpan="2" className="resource-removers">
                        {resources.map((resource, index) => (
                          <button
                            key={`${resource}-${index}`}
                            className="remove-resource"
                            onClick={() => removeResource(index)}
                            disabled={resources.length <= 1}
                            aria-label={`Remove ${resource}`}
                            title={`Remove ${resource}`}
                          >
                            ×
                          </button>
                        ))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div
                className={`result-strip ${result.safe ? "result-safe" : "result-unsafe"}`}
              >
                <div className="result-icon">
                  {result.safe ? (
                    <ShieldCheck size={17} />
                  ) : (
                    <TriangleAlert size={17} />
                  )}
                </div>
                <div className="result-copy">
                  <strong>
                    {result.safe
                      ? "Safe sequence found"
                      : "No safe sequence exists"}
                  </strong>
                  <span>
                    {result.safe
                      ? "The system can complete all processes without entering deadlock."
                      : "At least one process cannot complete with the current available resources."}
                  </span>
                </div>
                <div className="sequence">
                  <span>SEQUENCE</span>
                  {sequence.length ? (
                    sequence.map((p, i) => (
                      <Fragment key={p}>
                        <b>{p}</b>
                        {i < sequence.length - 1 && <ArrowRight size={12} />}
                      </Fragment>
                    ))
                  ) : (
                    <b className="no-sequence">— — —</b>
                  )}
                </div>
              </div>
            </section>
            <footer className="footer">
              <span>
                DESIGNED FOR THE CURIOUS <span className="footer-star">✳</span>
              </span>
              <span>
                DEADLOCK LAB <i /> OS CONCEPTS
              </span>
              <span>© 2026 Emmanuel Pascua</span>
            </footer>
          </div>
          <section className="team-view" hidden={activeView !== "team"}>
            <div className="team-intro">
              <div className="eyebrow">
                <span className="eyebrow-line" /> OUR PROJECT GROUP
              </div>
              <h1>
                Meet the <em>team.</em>
              </h1>
              <p>The people behind this deadlock handling demonstration.</p>
            </div>
            <article className="team-panel team-network-panel">
              <div className="team-panel-heading">
                <div>
                  <div className="panel-kicker">PROJECT COLLABORATORS</div>
                  <h2>Group network</h2>
                </div>
                <span className="team-count">08 MEMBERS</span>
              </div>
              <div className="team-network">
                <svg
                  viewBox="0 0 1000 520"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {teamMembers
                    .filter((member) => !member.role)
                    .map((member) => (
                      <g key={member.name}>
                        <path
                          d={`M 500 260 Q ${(500 + member.x * 10) / 2} ${(260 + member.y * 5.2) / 2 - 12} ${member.x * 10} ${member.y * 5.2}`}
                        />
                        <circle cx={member.x * 10} cy={member.y * 5.2} r="3" />
                      </g>
                    ))}
                </svg>
                {teamMembers.map((member, index) => (
                  <div
                    className={`team-network-node ${member.role === "GROUP LEADER" ? "leader-node" : member.role === "OS ADVISER" ? "adviser-node" : ""}`}
                    key={member.name}
                    style={{ left: `${member.x}%`, top: `${member.y}%` }}
                  >
                    <span className="team-node-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="team-person">
                      <strong>{member.name}</strong>
                      <span>{member.role || "PROJECT MEMBER"}</span>
                    </div>
                    {member.role && (
                      <GitBranch className="leader-mark" size={16} />
                    )}
                  </div>
                ))}
              </div>
              <div className="team-network-footer">
                <span>
                  <i /> CONNECTED AS ONE TEAM
                </span>
                <span>DEADLOCK HANDLING PROJECT</span>
              </div>
            </article>
          </section>
          <section
            className="prevention-view"
            hidden={activeView !== "prevention"}
          >
            <div className="learning-hero">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-line" /> OPERATING SYSTEMS /
                  CONCURRENCY
                </div>
                <h1>
                  Handling <em>deadlocks.</em>
                </h1>
                <p>
                  Understand the strategies that prevent, avoid, detect, and
                  recover from processes stuck waiting on one another.
                </p>
              </div>
              <div className="hero-stamp">
                <GitBranch size={25} />
              </div>
            </div>
            <div className="definition-callout">
              <span className="definition-icon">
                <TriangleAlert size={18} />
              </span>
              <p>
                <strong>Deadlock</strong> is a state where a set of processes
                wait indefinitely for resources held by other processes in the
                same set, so none of them can proceed.
              </p>
            </div>
            <div className="handling-grid">
              <article className="handling-card prevention-card">
                <span className="handling-number">01 / DESIGN TIME</span>
                <ShieldCheck size={20} />
                <h2>Prevention</h2>
                <p>
                  Design resource rules so at least one necessary deadlock
                  condition can never hold.
                </p>
                <span className="handling-tag">STRUCTURAL GUARANTEE</span>
              </article>
              <article className="handling-card avoidance-card">
                <span className="handling-number">02 / EACH REQUEST</span>
                <Activity size={20} />
                <h2>Avoidance</h2>
                <p>
                  Evaluate requests at runtime and grant one only when the
                  resulting state remains safe.
                </p>
                <span className="handling-tag">BANKER’S ALGORITHM</span>
              </article>
              <article className="handling-card detect-card">
                <span className="handling-number">03 / AFTER ALLOCATION</span>
                <Search size={20} />
                <h2>Detection &amp; recovery</h2>
                <p>
                  Allow deadlocks to occur, detect cycles or blocked sets, then
                  recover by terminating, preempting, or rolling back work.
                </p>
                <span className="handling-tag">DETECT THEN RECOVER</span>
              </article>
            </div>
            <div className="algorithm-note-grid">
              <article className="learning-panel">
                <div className="panel-kicker">
                  AVOIDANCE / MULTIPLE RESOURCE INSTANCES
                </div>
                <h2>Banker’s Algorithm</h2>
                <p>
                  Before granting a request, pretend to allocate the resources
                  and run a safety check. Grant only if the system can still
                  find an order in which every process can finish.
                </p>
                <div className="learning-formula">
                  <span>NEED</span>
                  <b>=</b>
                  <span>MAX CLAIM</span>
                  <b>−</b>
                  <span>ALLOCATION</span>
                </div>
                <small>
                  It avoids unsafe allocations; it is not a deadlock detection
                  algorithm.
                </small>
              </article>
              <article className="learning-panel">
                <div className="panel-kicker">
                  GRAPH-BASED AVOIDANCE / SINGLE INSTANCES
                </div>
                <h2>Resource Allocation Graph method</h2>
                <p>
                  Use request, assignment, and (when declared in advance) claim
                  edges to model resource use. For single-instance resource
                  types, deny a request if granting it would create a cycle.
                </p>
                <div className="graph-key">
                  <span>
                    <i className="key-request" /> Request: process → resource
                  </span>
                  <span>
                    <i className="key-assigned" /> Allocation: resource →
                    process
                  </span>
                </div>
              </article>
            </div>
            <section className="learning-panel conditions-panel">
              <div className="learning-heading">
                <div>
                  <div className="panel-kicker">
                    THE FOUR NECESSARY CONDITIONS
                  </div>
                  <h2>Break one link in the chain.</h2>
                </div>
                <span className="conditions-note">
                  All four must hold at once for deadlock.
                </span>
              </div>
              <div className="condition-list">
                <article className="condition-row">
                  <span className="condition-index">01</span>
                  <div>
                    <h3>Mutual exclusion</h3>
                    <p>A resource can be used by only one process at a time.</p>
                  </div>
                  <div className="break-method">
                    <b>Reduce exclusivity</b>
                    <span>
                      Make resources shareable where possible, such as using
                      spooling for a printer.
                    </span>
                  </div>
                </article>
                <article className="condition-row">
                  <span className="condition-index">02</span>
                  <div>
                    <h3>Hold and wait</h3>
                    <p>
                      A process holds resources while waiting for additional
                      ones.
                    </p>
                  </div>
                  <div className="break-method">
                    <b>Request together</b>
                    <span>
                      Require a process to request its resources up front, or
                      release held resources before requesting more.
                    </span>
                  </div>
                </article>
                <article className="condition-row">
                  <span className="condition-index">03</span>
                  <div>
                    <h3>No preemption</h3>
                    <p>Resources cannot be forcibly taken from a process.</p>
                  </div>
                  <div className="break-method">
                    <b>Allow preemption</b>
                    <span>
                      If a request cannot be met, reclaim resources where safe
                      and restart the process later.
                    </span>
                  </div>
                </article>
                <article className="condition-row">
                  <span className="condition-index">04</span>
                  <div>
                    <h3>Circular wait</h3>
                    <p>
                      Processes form a cycle, each waiting for a resource held
                      by the next.
                    </p>
                  </div>
                  <div className="break-method">
                    <b>Order resources</b>
                    <span>
                      Give resource types a global order and require processes
                      to acquire them only in ascending order.
                    </span>
                  </div>
                </article>
              </div>
            </section>
            <div className="learning-bottom-grid">
              <article className="learning-panel ostrich-panel">
                <div className="panel-kicker">A PRAGMATIC ALTERNATIVE</div>
                <h2>The Ostrich approach</h2>
                <p>
                  Ignore the possibility of deadlock when it is sufficiently
                  rare and the cost of prevention or detection outweighs the
                  cost of recovery. This is a trade-off, not a guarantee that
                  deadlocks cannot occur.
                </p>
                <div className="ostrich-note">
                  <CircleHelp size={15} />
                  <span>
                    Choose deliberately: a deadlock may still require a restart
                    or manual recovery.
                  </span>
                </div>
              </article>
              <article className="learning-panel rag-panel">
                <div className="panel-kicker">GRAPH MODEL</div>
                <h2>Resource Allocation Graph</h2>
                <p>
                  A directed graph models processes, resource types, requests,
                  and allocations. A cycle with single-instance resource types
                  implies deadlock; with multiple instances, a cycle alone is
                  not conclusive.
                </p>
                <button
                  className="learn-link"
                  onClick={() => {
                    setActiveView("simulator");
                    setGraphFullScreen(true);
                  }}
                >
                  Try the graph playground <ArrowUpRight size={14} />
                </button>
              </article>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default App;
