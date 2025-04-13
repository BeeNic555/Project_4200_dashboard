// Sankey
fetch('/sankey-data/')
  .then(response => response.json())
  .then(data => {
    const width = 960;
    const nodeCount = data.nodes.length;
    const height = Math.max(500, nodeCount * 12);

    const reviewOrder = [
      "Overwhelmingly Negative", "Mostly Negative", "Negative",
      "Mixed",
      "Mostly Positive", "Positive", "Very Positive", "Overwhelmingly Positive"
    ];

    // 创建渐变色比例尺
    const colorScale = d3.scaleSequential()
      .domain([0, reviewOrder.length - 1])
      .interpolator(d3.interpolateGreens); // 可换成 interpolateBlues 等

    const svg = d3.select("#sankey").append("svg")
      .attr("width", width)
      .attr("height", height);

    const sankey = d3.sankey()
      .nodeWidth(20)
      .nodePadding(15)
      .extent([[1, 20], [width - 1, height - 20]])
      .nodeSort((a, b) => {
        const aIsReview = reviewOrder.includes(a.name);
        const bIsReview = reviewOrder.includes(b.name);
        if (aIsReview && bIsReview) {
          return reviewOrder.indexOf(a.name) - reviewOrder.indexOf(b.name);
        }
        return aIsReview ? 1 : -1;
      });

    const graph = sankey({
      nodes: data.nodes.map(d => Object.assign({}, d)),
      links: data.links.map(d => Object.assign({}, d))
    });

    // Tooltip
    const tooltip2 = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("padding", "6px 10px")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "13px")
      .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)");

    // Links (Flow lines)
    svg.append("g")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", "#aaa")
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("stroke-opacity", 0.4)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke", "#f66").attr("stroke-opacity", 0.8);
        tooltip2.transition().duration(200).style("opacity", 1);
        tooltip2.html(
            `<strong>${d.source.name}</strong> → <strong>${d.target.name}</strong><br>
            Count: <strong>${d.value}</strong><br>
            Share in Genre: <strong>${(d.percentage * 100).toFixed(1)}%</strong>`
        )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function(event) {
        tooltip2
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke", "#aaa").attr("stroke-opacity", 0.4);
        tooltip2.transition().duration(300).style("opacity", 0);
      });

    // Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(graph.nodes)
      .join("g");

    node.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => {
        const index = reviewOrder.indexOf(d.name);
        return index !== -1 ? colorScale(index) : "#96c0ce";
      })
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "#ffcc00");
        tooltip2.transition().duration(200).style("opacity", 1);
        tooltip2.html(`Category: <strong>${d.name}</strong>`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function(event) {
        tooltip2
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", d => {
          const index = reviewOrder.indexOf(d.name);
          return index !== -1 ? colorScale(index) : "#96c0ce";
        });
        tooltip2.transition().duration(300).style("opacity", 0);
      });

    node.append("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => d.name);
  });
