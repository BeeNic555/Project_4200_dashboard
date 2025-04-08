document.addEventListener("DOMContentLoaded", () => {
  const slider = document.getElementById("topNSlider-bar");
  const valueDisplay = document.getElementById("topNValue-bar");
  const chartContainer = document.getElementById("altair-bar-chart");

  function fetchChart(topN) {
    fetch(`/bar-chart/?top_n=${topN}`)
      .then((res) => res.json())
      .then((spec) => {
        chartContainer.innerHTML = ""; // Clear previous chart
        vegaEmbed("#altair-bar-chart", spec, { actions: false });
      });
  }

  // Load the default chart for the first time
  fetchChart(slider.value);

  // Monitor slider changes
  slider.addEventListener("input", () => {
    const topN = slider.value;
    valueDisplay.textContent = topN;
    fetchChart(topN);
  });
});

