function renderScatter(topN = 500, genre = "All") {
  fetch(`/scatter-data/?top_n=${topN}&genre=${genre}`)
    .then((response) => response.json())
    .then((spec) => {
      vegaEmbed("#altair-scatter", spec, { actions: false });
    });
}

document.addEventListener("DOMContentLoaded", function () {
  const slider = document.getElementById("scatterSlider");
  const label = document.getElementById("scatterTopN");
  const genreSelect = document.getElementById("genreSelect");

  function updateChart() {
    const topN = +slider.value;
    const genre = genreSelect.value;
    label.textContent = topN;
    renderScatter(topN, genre);
  }

  // Initial rendering
  updateChart();

  // monitor
  slider.addEventListener("input", updateChart);
  genreSelect.addEventListener("change", updateChart);
});

