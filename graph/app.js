/* ShamCash API — multi-engine graph explorer (D3 v7)
 * One hierarchy (domain > service > endpoint  + a "Data Models" spoke) + a service->model overlay,
 * rendered by 5 pluggable engines that each answer a different question:
 *   radial   — Hierarchical Edge Bundling : structure + relationship flows (Holten 2006)
 *   tree     — linear dendrogram          : readable browsing of the hierarchy
 *   force    — clustered force layout      : dynamic exploration, association "gravity"
 *   treemap  — space-filling rectangles    : proportion / composition (Shneiderman 1991)
 *   pack     — nested circles              : intuitive containment / grouping
 * A single interaction core (select / highlight / detail / search / filter) operates on the
 * hierarchy, so it works identically across every engine.
 */
(function () {
  "use strict";
  // ---------- helpers ----------
  const leaf = p => p.substring(p.indexOf("/") + 1);
  const domColor = d => (DOMAINS[d] ? DOMAINS[d].color : "#8b949e");
  const HOSTMAP = { api: "api.shamcash.sy", bank: "bank.shamcash.sy", payment: "payment.shamcash.sy" };
  const fullUrl = (host, path) => `https://${HOSTMAP[host] || HOSTMAP.api}/v4/api/${path}`;
  const MODEL_COL = "#e0a54a";
  const mLabel = id => { const m = MODELS.find(x => x.id === id); return m ? m.label : id; };
  const colorOf = d => (d.data.kind === "model" ? MODEL_COL : domColor(d.data.domain));
  const rNode = d => (d.data.kind === "model" ? 5 : d.data.kind === "domain" ? 4.5 : d.data.kind === "service" ? 3 : 2.6);
  const norm = a => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };

  const epByPath = {}; ENDPOINTS.forEach(e => (epByPath[e[0]] = e));
  const svcEndpoints = {};
  ENDPOINTS.forEach(([p]) => { const s = p.split("/")[0]; (svcEndpoints[s] = svcEndpoints[s] || []).push(p); });
  const DOMAIN_ORDER = ["auth", "accounts", "money", "telecom", "services", "platform"];

  function buildRoot(active) {
    const groups = [];
    for (const d of DOMAIN_ORDER) {
      if (active.has(d)) {
        const svcs = Object.keys(SERVICES).filter(n => SERVICES[n].domain === d);
        groups.push({ id: "dom_" + d, kind: "domain", domain: d, name: DOMAINS[d].label,
          children: svcs.map(s => ({
            id: "svc_" + s, kind: "service", domain: d, name: s, host: SERVICES[s].host,
            desc: SERVICES[s].desc, models: SERVICES[s].models,
            children: (svcEndpoints[s] || []).map(p => {
              const [path, method, auth, desc] = epByPath[p];
              return { id: "ep_" + p, kind: "endpoint", domain: d, service: s, name: leaf(p), path, method, auth, desc };
            }),
          })) });
      }
      if (d === "services")
        groups.push({ id: "grp_models", kind: "modelgroup", domain: "models", name: "Data Models",
          children: MODELS.map(m => ({ id: m.id, kind: "model", domain: "models", name: m.label, desc: m.desc })) });
    }
    return { id: "root", kind: "root", name: "ShamCash", children: groups };
  }

  // ---------- SVG / zoom ----------
  const container = document.getElementById("cy");
  const svg = d3.select(container).append("svg").attr("width", "100%").attr("height", "100%");
  const g = svg.append("g");
  const stage = g.append("g");                    // engine content (cleared per render)
  const zoom = d3.zoom().scaleExtent([0.08, 8]).filter(e => !e.shiftKey && !e.button)
    .on("zoom", e => { g.attr("transform", e.transform); g.classed("lod", e.transform.k > 1.7); });
  svg.call(zoom).on("dblclick.zoom", null).on("click", () => deselect());

  function zoomFit(x0, y0, x1, y1, animate) {
    const rect = container.getBoundingClientRect();
    const w = (x1 - x0) || 1, h = (y1 - y0) || 1;
    const k = Math.max(0.15, Math.min(rect.width / w, rect.height / h, 4)) * 0.94;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const t = d3.zoomIdentity.translate(rect.width / 2 - cx * k, rect.height / 2 - cy * k).scale(k);
    (animate ? svg.transition().duration(650) : svg).call(zoom.transform, t);
  }

  // ---------- shared state ----------
  const active = new Set(DOMAIN_ORDER);
  let engine = "radial", rotation = 0, showModels = true, beta = 0.82, R = 300;
  let root, byId, assoc, selectedId = null, hovered = null, forceSim = null;

  function prep() {
    root = d3.hierarchy(buildRoot(active));
    byId = new Map(root.descendants().map(n => [n.data.id, n]));
    assoc = [];
    Object.keys(SERVICES).forEach(s => SERVICES[s].models.forEach(m => {
      const a = byId.get("svc_" + s), b = byId.get(m);
      if (a && b) assoc.push({ id: s + "|" + m, source: a, target: b, svc: s, model: m });
    }));
  }

  // ---------- interaction core (engine-agnostic) ----------
  function relatedSet(node) {
    const nodeSet = new Set(node.ancestors()); node.descendants().forEach(n => nodeSet.add(n));
    const svcScope = new Set();
    if (node.data.kind === "model") assoc.forEach(a => { if (a.target === node) svcScope.add(a.source); });
    else node.descendants().concat(node.data.kind === "endpoint" ? [node.parent] : [])
      .forEach(n => { if (n.data.kind === "service") svcScope.add(n); });
    const links = new Set();
    assoc.forEach(a => {
      const hit = node.data.kind === "model" ? a.target === node : svcScope.has(a.source);
      if (hit) { links.add(a); nodeSet.add(a.source); nodeSet.add(a.target);
        a.source.ancestors().forEach(x => nodeSet.add(x)); a.target.ancestors().forEach(x => nodeSet.add(x)); }
    });
    return { nodeSet, links };
  }
  function applyHighlight(node) {
    const { nodeSet, links } = relatedSet(node);
    stage.classed("focused", true);
    stage.selectAll(".node,.cell").classed("dim", d => !nodeSet.has(d)).classed("hot", d => d === node);
    stage.selectAll(".lbl").classed("dim", d => !nodeSet.has(d)).classed("show", d => nodeSet.has(d));
    stage.selectAll(".tlink").classed("dim", d => !(nodeSet.has(d.source) && nodeSet.has(d.target)))
      .classed("hot", d => nodeSet.has(d.source) && nodeSet.has(d.target));
    stage.selectAll(".mlink").classed("dim", d => !links.has(d)).classed("hot", d => links.has(d));
  }
  function clearHighlight() {
    stage.classed("focused", false);
    stage.selectAll(".node,.cell,.lbl,.tlink,.mlink").classed("dim", false).classed("hot", false).classed("show", false);
  }
  function hover(node) {
    hovered = node;
    if (node) applyHighlight(node);                                  // always preview on hover
    else if (selectedId && byId.get(selectedId)) applyHighlight(byId.get(selectedId)); // fall back to the pinned node
    else clearHighlight();
  }
  function selectNode(node) { selectedId = node.data.id; applyHighlight(node); showDetail(node); } // click = pin (persists)
  function deselect() { selectedId = null; clearHighlight(); hideDetail(); }
  function bindEvents(sel) {
    sel.style("cursor", "pointer")
      .on("mouseover", (e, d) => hover(d)).on("mouseout", () => hover(null))
      .on("click", (e, d) => { e.stopPropagation(); selectNode(d); });
  }

  // ---------- detail panel ----------
  const detail = document.getElementById("detail"), dContent = document.getElementById("detailContent");
  const pill = (id, label) => `<span class="link-pill" data-goto="${id}">${label}</span>`;
  function showDetail(node) {
    const d = node.data; let html = "";
    if (d.kind === "endpoint") {
      html = `<div class="kind">Endpoint · ${DOMAINS[d.domain].label}</div><div class="title">${d.path}</div>
        <div class="path">${d.method} ${fullUrl(SERVICES[d.service].host, d.path)}</div>
        <div class="row"><span class="k">Method</span><span class="chip ${d.method.toLowerCase()}">${d.method}</span>
          <span class="chip ${d.auth === "public" ? "public" : "authc"}">${d.auth === "public" ? "Pre-auth / public" : "Bearer auth"}</span></div>
        <div class="row"><span class="k">Service</span>${pill("svc_" + d.service, d.service)}</div>
        <div class="row"><span class="k">Models</span><span>${SERVICES[d.service].models.map(id => pill(id, mLabel(id))).join(" ")}</span></div>
        <div class="desc">${d.desc}</div>`;
    } else if (d.kind === "service") {
      const eps = node.children || [];
      html = `<div class="kind">Service · ${DOMAINS[d.domain].label}</div><div class="title">${d.name}</div>
        <div class="row"><span class="k">Host</span><span class="chip authc">${HOSTMAP[d.host]}</span>
          <span class="k" style="width:auto">${eps.length} endpoints</span></div>
        <div class="row"><span class="k">Models</span><span>${d.models.map(id => pill(id, mLabel(id))).join(" ")}</span></div>
        <div class="desc">${d.desc}</div>
        <div class="links"><div class="kind" style="margin-top:12px">Endpoints</div>${eps.map(c => pill(c.data.id, c.data.name)).join("")}</div>`;
    } else if (d.kind === "model") {
      const svcs = assoc.filter(a => a.target === node).map(a => a.source);
      html = `<div class="kind">Data model</div><div class="title">${d.name}</div><div class="desc">${d.desc}</div>
        <div class="links"><div class="kind" style="margin-top:12px">Touched by ${svcs.length} services</div>${svcs.map(s => pill(s.data.id, s.data.name)).join("")}</div>`;
    } else if (d.kind === "domain" || d.kind === "modelgroup") {
      const ch = node.children || [];
      html = `<div class="kind">${d.kind === "domain" ? "Domain" : "Group"}</div><div class="title">${d.name}</div>
        <div class="row"><span class="k">${d.kind === "domain" ? "Services" : "Models"}</span><span class="k" style="width:auto">${ch.length}</span></div>
        <div class="links">${ch.map(s => pill(s.data.id, s.data.name)).join("")}</div>`;
    }
    dContent.innerHTML = html; detail.classList.add("show");
  }
  function hideDetail() { detail.classList.remove("show"); }
  document.getElementById("detailClose").onclick = () => deselect();
  dContent.addEventListener("click", e => { const id = e.target.getAttribute("data-goto"); if (id && byId.get(id)) selectNode(byId.get(id)); });

  // ================= ENGINES =================
  const ENGINES = {};

  // ---- shared node-link tree renderer (radial + linear) ----
  function drawNodeLink(cfg) {
    cfg.layout();
    const gT = stage.append("g"), gB = stage.append("g"), gN = stage.append("g"), gL = stage.append("g"), gH = stage.append("g");
    gT.selectAll("path").data(root.links().filter(l => l.source.depth > 0)).join("path").attr("class", "tlink")
      .attr("fill", "none").attr("stroke", d => domColor(d.target.data.domain)).attr("stroke-opacity", 0.22)
      .attr("stroke-width", d => (d.target.data.kind === "endpoint" ? 0.8 : 1.4)).attr("d", cfg.treePath);
    gB.selectAll("path").data(assoc).join("path").attr("class", "mlink").attr("fill", "none").attr("stroke", MODEL_COL)
      .attr("stroke-width", 1.1).attr("stroke-opacity", showModels ? cfg.mOpacity : 0).attr("d", d => cfg.bundlePath(d));
    const nodes = root.descendants().filter(d => !["root", "modelgroup"].includes(d.data.kind));
    const nSel = gN.selectAll("g.node").data(nodes).join(en => {
      const gg = en.append("g").attr("class", "node");
      gg.append("circle").attr("class", "hit").attr("r", 8); gg.append("circle").attr("class", "dot"); return gg; });
    nSel.attr("transform", d => { const [x, y] = cfg.pos(d); return `translate(${x},${y})`; })
      .each(function (d) { d3.select(this).select("circle.dot").attr("r", rNode(d)).attr("fill", colorOf(d))
        .attr("stroke", d.data.kind === "model" ? "#3a2b12" : "#0e1117").attr("stroke-width", d.data.auth === "public" ? 2 : 1); });
    bindEvents(nSel);
    cfg.drawLabels(gL, gH, nodes);
    gN.append("g").attr("class", "rootnode").attr("transform", () => { const [x, y] = cfg.pos(root); return `translate(${x},${y})`; })
      .call(s => { s.append("circle").attr("r", 6).attr("fill", "#e6edf3");
        if (cfg.rootLabel) s.append("text").attr("class", "root-lbl").attr("dy", "-1em").attr("text-anchor", "middle").text("ShamCash API"); });
  }

  // ---- RADIAL (HEB) ----
  ENGINES.radial = { rotate: true, beta: true, models: true, render(animate) {
    const rect = container.getBoundingClientRect();
    R = Math.max(180, Math.min(rect.width, rect.height) / 2 - 96);
    const proj = d => { const a = d.x - Math.PI / 2; return [Math.cos(a) * d.y, Math.sin(a) * d.y]; };
    const treeGen = d3.linkRadial().angle(d => d.x).radius(d => d.y);
    const bGen = d3.lineRadial().curve(d3.curveBundle.beta(beta)).radius(d => d.y).angle(d => d.x);
    drawNodeLink({ mOpacity: 0.16, rootLabel: true, pos: proj,
      layout: () => d3.cluster().size([2 * Math.PI, R]).separation((a, b) =>
        (a.data.kind === "model" || b.data.kind === "model") ? 4 : (a.parent === b.parent ? 1 : 2.2))(root),
      treePath: treeGen, bundlePath: d => bGen(d.source.path(d.target)),
      drawLabels: (gL, gH, nodes) => {
        gL.selectAll("text").data(nodes.filter(d => d.data.kind === "endpoint" || d.data.kind === "model")).join("text")
          .attr("class", d => "rim-lbl lbl " + d.data.kind).attr("dy", "0.31em").text(d => d.data.name)
          .attr("fill", d => d.data.kind === "model" ? "#f0c886" : "#cdd6e0").call(placeRimLabel);
        gH.selectAll("text").data(root.descendants().filter(d => d.data.kind === "domain" || d.data.kind === "modelgroup")).join("text")
          .attr("class", "rim-head").attr("dy", "0.31em").text(d => d.data.name.toUpperCase()).call(placeRimHead);
      } });
    applyRotation();
    const cR = R + 190; zoomFit(-cR, -cR, cR, cR, animate);
  } };
  function placeRimLabel(sel) {
    sel.attr("text-anchor", d => norm(d.x + rotation) >= Math.PI ? "end" : "start").attr("transform", d => {
      const deg = d.x * 180 / Math.PI - 90, flip = norm(d.x + rotation) >= Math.PI, gap = d.data.kind === "model" ? 11 : 7;
      return `rotate(${deg}) translate(${d.y + gap},0)${flip ? " rotate(180)" : ""}`;
    });
  }
  function placeRimHead(sel) {
    sel.attr("text-anchor", d => norm(d.x + rotation) >= Math.PI ? "end" : "start")
      .attr("fill", d => d.data.kind === "modelgroup" ? MODEL_COL : domColor(d.data.domain)).attr("transform", d => {
        const deg = d.x * 180 / Math.PI - 90, flip = norm(d.x + rotation) >= Math.PI;
        return `rotate(${deg}) translate(${R + 60},0)${flip ? " rotate(180)" : ""}`;
      });
  }
  function applyRotation() {
    if (engine !== "radial") { stage.attr("transform", null); return; }
    stage.attr("transform", `rotate(${rotation * 180 / Math.PI})`);
    stage.selectAll("text.rim-lbl").call(placeRimLabel);
    stage.selectAll("text.rim-head").call(placeRimHead);
  }

  // ---- LINEAR DENDROGRAM ----
  ENGINES.tree = { rotate: false, beta: true, models: true, render(animate) {
    // a tall readable outline: root-left → endpoints-right, every label shown; fit WIDTH & scroll vertically
    const leaves = root.leaves().length, H = Math.max(400, leaves * 14), W = 700;
    const bGen = d3.line().curve(d3.curveBundle.beta(beta)).x(d => d.y).y(d => d.x);
    drawNodeLink({ mOpacity: 0.10, rootLabel: false, pos: d => [d.y, d.x],
      layout: () => d3.cluster().size([H, W]).separation((a, b) => (a.parent === b.parent ? 1 : 1.6))(root),
      treePath: d3.linkHorizontal().x(d => d.y).y(d => d.x), bundlePath: d => bGen(d.source.path(d.target)),
      drawLabels: (gL, gH, nodes) => {
        gL.selectAll("text").data(nodes).join("text").attr("class", d => "tree-lbl lbl always " + d.data.kind)
          .attr("dy", "0.31em").text(d => d.data.name)
          .attr("fill", d => d.data.kind === "model" ? "#f0c886" : d.data.kind === "endpoint" ? "#aeb8c4" : "#e6edf3")
          .each(function (d) {
            const rightSide = !d.children;
            d3.select(this).attr("x", rightSide ? d.y + 8 : d.y - 8).attr("y", d.x)
              .attr("text-anchor", rightSide ? "start" : "end")
              .style("font-size", d.data.kind === "domain" ? "12px" : d.data.kind === "service" ? "10px" : "8.5px")
              .style("font-weight", d.data.kind === "domain" || d.data.kind === "service" ? 600 : 400);
          });
      } });
    const rect = container.getBoundingClientRect();
    const k = Math.min(rect.width / (W + 400), 0.95);
    const t = d3.zoomIdentity.translate(rect.width / 2 - (W / 2) * k, 28).scale(k);
    (animate ? svg.transition().duration(650) : svg).call(zoom.transform, t);
  } };

  // ---- FORCE (clustered) ----
  ENGINES.force = { rotate: false, beta: false, models: true, render(animate) {
    const rect = container.getBoundingClientRect();
    const nodes = root.descendants(), tlinks = root.links();
    const groups = root.children, n = groups.length, Rc = Math.min(rect.width, rect.height) * 0.34;
    const anchor = new Map(); groups.forEach((gp, i) => { const a = 2 * Math.PI * i / n - Math.PI / 2; anchor.set(gp, [Math.cos(a) * Rc, Math.sin(a) * Rc]); });
    const gAnchor = d => { let a = d; while (a.depth > 1) a = a.parent; return a.depth === 1 ? anchor.get(a) : [0, 0]; };
    nodes.forEach(d => { const [ax, ay] = gAnchor(d); d.x = ax + (d.depth * 7); d.y = ay + (d.data.kind.length); });
    const gT = stage.append("g"), gB = stage.append("g"), gN = stage.append("g"), gL = stage.append("g");
    const tSel = gT.selectAll("line").data(tlinks).join("line").attr("class", "tlink")
      .attr("stroke", d => domColor(d.target.data.domain)).attr("stroke-opacity", 0.25).attr("stroke-width", 1);
    const bSel = gB.selectAll("line").data(assoc).join("line").attr("class", "mlink")
      .attr("stroke", MODEL_COL).attr("stroke-opacity", showModels ? 0.22 : 0).attr("stroke-width", 1);
    const vis = nodes.filter(d => d.data.kind !== "root" && d.data.kind !== "modelgroup");
    const nSel = gN.selectAll("g.node").data(vis).join(en => {
      const gg = en.append("g").attr("class", "node");
      gg.append("circle").attr("class", "hit").attr("r", 9); gg.append("circle").attr("class", "dot"); return gg; });
    nSel.each(function (d) { d3.select(this).select("circle.dot").attr("r", rNode(d)).attr("fill", colorOf(d))
      .attr("stroke", d.data.kind === "model" ? "#3a2b12" : "#0e1117").attr("stroke-width", d.data.auth === "public" ? 2 : 1); });
    bindEvents(nSel);
    const lSel = gL.selectAll("text").data(vis).join("text").attr("class", "lbl force-lbl")
      .attr("dy", "-0.7em").attr("text-anchor", "middle").text(d => d.data.name).attr("fill", "#e6edf3");
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(tlinks).distance(d => d.target.data.kind === "endpoint" ? 14 : d.target.data.kind === "service" ? 34 : 74).strength(0.75))
      .force("charge", d3.forceManyBody().strength(-32))
      .force("x", d3.forceX(d => gAnchor(d)[0]).strength(0.055)).force("y", d3.forceY(d => gAnchor(d)[1]).strength(0.055))
      .force("collide", d3.forceCollide(d => rNode(d) + 2.2)).on("tick", ticked);
    forceSim = sim;
    nSel.call(d3.drag()
      .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
    function ticked() {
      tSel.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      bSel.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      nSel.attr("transform", d => `translate(${d.x},${d.y})`);
      lSel.attr("transform", d => `translate(${d.x},${d.y})`);
    }
    sim.tick(80); ticked();
    const xs = vis.map(d => d.x), ys = vis.map(d => d.y);
    zoomFit(Math.min(...xs) - 40, Math.min(...ys) - 40, Math.max(...xs) + 40, Math.max(...ys) + 40, animate);
  } };

  // ---- TREEMAP ----
  ENGINES.treemap = { rotate: false, beta: false, models: false, render(animate) {
    const rect = container.getBoundingClientRect();
    const W = Math.max(700, rect.width * 1.3), H = Math.max(460, rect.height * 1.3);
    root.sum(d => (d.children ? 0 : 1)).sort((a, b) => b.value - a.value);
    d3.treemap().size([W, H]).paddingOuter(3).paddingInner(2).round(true)
      .paddingTop(d => d.depth === 1 ? 20 : d.depth === 2 ? 14 : 0)(root);
    drawEnclosure(root.descendants().filter(d => d.data.kind !== "root"), "rect", W, H, animate);
  } };

  // ---- CIRCLE PACK ----
  ENGINES.pack = { rotate: false, beta: false, models: false, render(animate) {
    const rect = container.getBoundingClientRect();
    const S = Math.max(560, Math.min(rect.width, rect.height) * 1.25);
    root.sum(d => (d.children ? 0 : 1)).sort((a, b) => b.value - a.value);
    d3.pack().size([S, S]).padding(d => d.depth === 0 ? 6 : 3)(root);
    drawEnclosure(root.descendants().filter(d => d.data.kind !== "root"), "circle", S, S, animate);
  } };

  function cellFill(d) {
    if (d.data.kind === "endpoint") return domColor(d.data.domain);
    if (d.data.kind === "model") return MODEL_COL;
    if (d.data.kind === "modelgroup") return MODEL_COL;
    return domColor(d.data.domain);
  }
  function cellOpacity(d) {
    return d.data.kind === "endpoint" || d.data.kind === "model" ? 0.9
      : d.data.kind === "service" ? 0.2 : 0.1;
  }
  function drawEnclosure(nodes, shape, W, H, animate) {
    const gC = stage.append("g");
    const cells = gC.selectAll("g.cell").data(nodes).join(en => {
      const gg = en.append("g").attr("class", "cell");
      gg.append(shape); gg.append("text").attr("class", "cell-lbl"); return gg;
    });
    cells.each(function (d) {
      const sel = d3.select(this), isLeaf = d.data.kind === "endpoint" || d.data.kind === "model";
      if (shape === "rect") {
        const w = d.x1 - d.x0, h = d.y1 - d.y0;
        sel.attr("transform", `translate(${d.x0},${d.y0})`);
        sel.select("rect").attr("width", Math.max(0, w)).attr("height", Math.max(0, h)).attr("rx", 3)
          .attr("fill", cellFill(d)).attr("fill-opacity", cellOpacity(d))
          .attr("stroke", isLeaf ? "#0e1117" : cellFill(d)).attr("stroke-opacity", isLeaf ? 1 : 0.55).attr("stroke-width", 1);
        const t = sel.select("text");
        if (!isLeaf) t.attr("x", 5).attr("y", d.depth === 1 ? 14 : 11).attr("text-anchor", "start")
          .attr("class", "cell-lbl faint").style("font-size", (d.depth === 1 ? 12 : 9) + "px").style("font-weight", 700)
          .text(w > 44 ? d.data.name : "");
        else t.attr("x", w / 2).attr("y", h / 2).attr("dy", "0.31em").attr("text-anchor", "middle")
          .attr("class", "cell-lbl").style("font-size", "8px").text(w > 34 && h > 12 ? d.data.name : "");
      } else {
        sel.attr("transform", `translate(${d.x},${d.y})`);
        sel.select("circle").attr("r", d.r).attr("fill", cellFill(d)).attr("fill-opacity", cellOpacity(d))
          .attr("stroke", isLeaf ? "#0e1117" : cellFill(d)).attr("stroke-opacity", isLeaf ? 1 : 0.6).attr("stroke-width", 1);
        const t = sel.select("text");
        if (!isLeaf) t.attr("x", 0).attr("y", -d.r + (d.depth === 1 ? 13 : 10)).attr("text-anchor", "middle")
          .attr("class", "cell-lbl faint").style("font-size", (d.depth === 1 ? 12 : 9) + "px").style("font-weight", 700)
          .text(d.r > 26 ? d.data.name : "");
        else t.attr("x", 0).attr("y", 0).attr("dy", "0.31em").attr("text-anchor", "middle")
          .attr("class", "cell-lbl").style("font-size", "8px").text(d.r > 11 ? d.data.name : "");
      }
    });
    bindEvents(cells);
    zoomFit(0, 0, W, H, animate);
  }

  // ================= render dispatch =================
  function render(animate) {
    if (forceSim) { forceSim.stop(); forceSim = null; }
    prep();
    stage.selectAll("*").remove(); stage.attr("transform", null);
    ENGINES[engine].render(animate);
    if (selectedId && byId.get(selectedId)) applyHighlight(byId.get(selectedId));
    else if (selectedId) { selectedId = null; hideDetail(); }
  }
  function updateControls() {
    const e = ENGINES[engine];
    document.getElementById("ctl-models").style.display = e.models ? "flex" : "none";
    document.getElementById("ctl-beta").style.display = e.beta ? "flex" : "none";
    document.getElementById("ctl-rotate").style.display = e.rotate ? "flex" : "none";
    document.querySelectorAll("#engineBar .btn").forEach(b => b.classList.toggle("active", b.dataset.engine === engine));
  }

  // ================= controls =================
  document.querySelectorAll("#engineBar .btn").forEach(b => b.onclick = () => { engine = b.dataset.engine; updateControls(); render(true); });

  const legend = document.getElementById("legend");
  DOMAIN_ORDER.forEach(k => {
    const d = DOMAINS[k], el = document.createElement("div");
    el.className = "legend-item"; el.innerHTML = `<span class="dot" style="background:${d.color}"></span>${d.label}`;
    el.onclick = () => { el.classList.toggle("off"); active.has(k) ? active.delete(k) : active.add(k);
      if (!active.size) { active.add(k); el.classList.remove("off"); return; } render(true); };
    legend.appendChild(el);
  });

  document.getElementById("toggleModels").onchange = e => {
    showModels = e.target.checked;
    stage.selectAll(".mlink").transition().duration(250).attr("stroke-opacity", showModels ? (engine === "tree" ? 0.10 : engine === "force" ? 0.22 : 0.16) : 0);
    if (selectedId && byId.get(selectedId)) applyHighlight(byId.get(selectedId));
  };

  const betaSlider = document.getElementById("beta"), betaVal = document.getElementById("betaVal");
  betaSlider.oninput = () => {
    beta = +betaSlider.value; betaVal.textContent = beta.toFixed(2);
    const bl = engine === "radial"
      ? d3.lineRadial().curve(d3.curveBundle.beta(beta)).radius(d => d.y).angle(d => d.x)
      : d3.line().curve(d3.curveBundle.beta(beta)).x(d => d.y).y(d => d.x);
    stage.selectAll(".mlink").attr("d", d => bl(d.source.path(d.target)));
  };

  const rotSlider = document.getElementById("rotate"), rotVal = document.getElementById("rotateVal");
  rotSlider.oninput = () => { rotation = (+rotSlider.value) * Math.PI / 180; rotVal.textContent = rotSlider.value + "°"; applyRotation(); };

  // shift-drag to rotate (radial)
  let rotStart = 0;
  const rotDrag = d3.drag().filter(e => e.shiftKey).container(container)
    .on("start", e => { const rect = container.getBoundingClientRect(); rotStart = Math.atan2(e.y - rect.height / 2, e.x - rect.width / 2) - rotation; })
    .on("drag", e => { if (engine !== "radial") return; const rect = container.getBoundingClientRect();
      rotation = Math.atan2(e.y - rect.height / 2, e.x - rect.width / 2) - rotStart; applyRotation();
      rotSlider.value = Math.round(norm(rotation) * 180 / Math.PI); rotVal.textContent = rotSlider.value + "°"; });
  svg.call(rotDrag);

  document.getElementById("resetBtn").onclick = () => {
    document.getElementById("search").value = ""; selectedId = null; hovered = null;
    DOMAIN_ORDER.forEach(k => active.add(k)); document.querySelectorAll(".legend-item").forEach(x => x.classList.remove("off"));
    document.getElementById("toggleModels").checked = true; showModels = true;
    rotation = 0; rotSlider.value = 0; rotVal.textContent = "0°";
    render(true); hideDetail();
  };

  const search = document.getElementById("search");
  search.oninput = () => {
    const q = search.value.trim().toLowerCase();
    stage.selectAll(".node,.cell").classed("search-hit", false);
    if (!q) { if (!selectedId && !hovered) clearHighlight(); return; }
    const hits = root.descendants().filter(n => {
      const d = n.data;
      if (d.kind === "endpoint") return d.path.toLowerCase().includes(q) || (d.desc || "").toLowerCase().includes(q);
      return ["service", "model", "domain"].includes(d.kind) && d.name.toLowerCase().includes(q);
    });
    const set = new Set(); hits.forEach(h => { set.add(h); h.ancestors().forEach(a => set.add(a)); });
    stage.classed("focused", true);
    stage.selectAll(".node,.cell").classed("dim", d => !set.has(d)).classed("search-hit", d => hits.includes(d));
    stage.selectAll(".lbl").classed("dim", d => !set.has(d)).classed("show", d => hits.includes(d));
    stage.selectAll(".tlink").classed("dim", d => !(set.has(d.source) && set.has(d.target)));
    stage.selectAll(".mlink").classed("dim", true);
  };

  document.getElementById("stat-ep").textContent = ENDPOINTS.length;
  document.getElementById("stat-svc").textContent = Object.keys(SERVICES).length;

  // ---------- init ----------
  updateControls(); render(false);
  const fparam = new URLSearchParams(location.search);
  if (fparam.get("engine") && ENGINES[fparam.get("engine")]) { engine = fparam.get("engine"); updateControls(); render(false); }
  if (fparam.get("rot")) { rotation = (+fparam.get("rot")) * Math.PI / 180; rotSlider.value = fparam.get("rot"); rotVal.textContent = fparam.get("rot") + "°"; applyRotation(); }
  if (fparam.get("focus") && byId.get(fparam.get("focus"))) selectNode(byId.get(fparam.get("focus")));
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => render(false), 200); });
})();
