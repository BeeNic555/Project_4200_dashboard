document.addEventListener("DOMContentLoaded", function () {
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "treemap-tooltip");

  const slider = document.getElementById("topNSlider-treemap");
  const sliderValue = document.getElementById("treemap-slider-value");

  function loadTreemap(topN = 500) {
    fetch(`/treemap-data/?top_n=${topN}`)
      .then(response => response.json())
      .then(data => renderTreemap(data));
  }

  slider.addEventListener("input", function () {
    const val = +this.value;
    sliderValue.textContent = val;
    loadTreemap(val);
  });

  function renderTreemap(data) {
    const width = 960;
    const height = 500;

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const treemapLayout = d3.treemap()
      .size([width, height])
      .paddingInner(3);

    const root = d3.hierarchy(data).sum(d => d.value);
    treemapLayout(root);

    d3.select("#treemap-container").selectAll("*").remove();

    const svg = d3.select("#treemap-container")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const nodes = svg.selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    nodes.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => color(d.data.name))
      .on("mouseover", function (event, d) {
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.data.name}</strong><br>Count: ${d.data.value}`);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });

    nodes.append("text")
      .attr("x", 4)
      .attr("y", 16)
      .attr("fill", "#fff")
      .style("font-size", "13px")
      .text(d => d.data.name);
  }

  loadTreemap(500);
});
