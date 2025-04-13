document.addEventListener("DOMContentLoaded", function () {
  const container = d3.select("#linechart-container");
  const tooltip = d3.select("body").append("div")
    .attr("class", "line-tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("padding", "6px")
    .style("font-size", "12px")
    .style("border-radius", "4px");

  let allData = [];

  fetch("/line-data/")
    .then(res => res.json())
    .then(data => {
      const validData = data.filter(d => d.Year !== undefined && d.Year !== null);
      allData = validData;

      const years = [...new Set(validData.map(d => d.Year))].sort();
      const checkboxContainer = document.getElementById("yearSelectLine");

      // Populate the checkbox button group
      checkboxContainer.innerHTML = "";
      years.forEach(year => {
        const label = document.createElement("label");
        label.style.marginRight = "12px";
        label.style.cursor = "pointer";
        label.style.display = "inline-flex";
        label.style.alignItems = "center";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = year;
        // The last year is selected by default
        checkbox.checked = year === years[years.length - 1];
        checkbox.style.marginRight = "4px";

        checkbox.addEventListener("change", () => {
          const selected = Array.from(
            checkboxContainer.querySelectorAll("input:checked")
          ).map(cb => +cb.value);
          drawChart(selected);
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(year));
        checkboxContainer.appendChild(label);
      });

      // Default painting last year
      drawChart([years[years.length - 1]]);
    });

  function drawChart(selectedYears) {
    const margin = { top: 40, right: 80, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const filtered = allData.filter(d => selectedYears.includes(d.Year));
    const grouped = d3.groups(filtered, d => d.Year);

    container.selectAll("*").remove();

    const svg = container.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);

    const x = d3.scaleLinear().domain([1, 12]).range([0, width]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(filtered, d => d.Number_of_Reviews) || 1])
      .nice()
      .range([height, 0]);

    const color = d3.scaleOrdinal()
      .domain(selectedYears)
      .range(d3.schemeTableau10);

    const line = d3.line()
      .x(d => x(d.Month))
      .y(d => y(d.Number_of_Reviews))
      .curve(d3.curveMonotoneX);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(12).tickFormat(m => d3.timeFormat("%b")(new Date(2025, m - 1))));

    svg.append("g").call(d3.axisLeft(y));

    // X-axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "13px")
      .text("Month");

    // Y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "13px")
      .text("Number of Reviews");

    grouped.forEach(([year, data]) => {
      const monthMap = Object.fromEntries(data.map(d => [d.Month, d.Number_of_Reviews]));
      const filled = allMonths.map(m => ({
        Month: m,
        Number_of_Reviews: monthMap[m] || 0
      }));

      svg.append("path")
        .datum(filled)
        .attr("fill", "none")
        .attr("stroke", color(year))
        .attr("stroke-width", 2)
        .attr("d", line);

      svg.selectAll(`.dot-${year}`)
        .data(filled)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.Month))
        .attr("cy", d => y(d.Number_of_Reviews))
        .attr("r", 4)
        .attr("fill", color(year))
        .on("mouseover", (event, d) => {
          tooltip
            .style("opacity", 1)
            .html(`
                <strong>${d3.timeFormat("%B")(new Date(2025, d.Month - 1))} ${year}</strong><br>
                Reviews: ${d.Number_of_Reviews}<br>
                Top Game: <em>${d.Top_Game || "N/A"}</em>
                `)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mousemove", event => {
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
    });

    const legend = svg.append("g")
      .attr("transform", `translate(${width + 10}, 10)`);

    selectedYears.forEach((year, i) => {
      const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
      g.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", color(year));
      g.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .text(year)
        .attr("font-size", "12px");
    });
  }
});
