// histogram.js

// Load Altair-generated JSON and render with Vega-Embed
document.addEventListener("DOMContentLoaded", () => {
  const slider = document.getElementById("topNSlider");
  const topNText = document.getElementById("topNValue");
  const chartDiv = document.getElementById("altair-histogram");

  function fetchAndRender(topN) {
    fetch(`/histogram/?top_n=${topN}`)
      .then(res => res.json())
      .then(spec => {
        vegaEmbed("#altair-histogram", spec, { actions: false });
      });
  }

  // Initialize the load default chart
  fetchAndRender(slider.value);

  // Monitor
  slider.addEventListener("input", () => {
    const topN = slider.value;
    topNText.textContent = topN;
    fetchAndRender(topN);
  });
});



