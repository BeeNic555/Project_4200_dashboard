document.addEventListener("DOMContentLoaded", function () {
  const genreSelect = document.getElementById("genreSelectSearch");
  const resultBox = document.getElementById("top-game-info");

  function fetchTopGame(genre) {
    fetch(`/top-game-search/?genre=${genre}`)
      .then(res => res.json())
      .then(data => {
        if (data.Name === "N/A") {
          resultBox.innerHTML = `<p>No data available for this genre.</p>`;
        } else {
          resultBox.innerHTML = `
            <p><strong>Game:</strong> ${data.Name}</p>
            <p><strong>Price:</strong> $${data.Price}</p>
            <p><strong>Reviews:</strong> ${data.Number_of_Reviews}</p>
            <p><strong>Summary:</strong> ${data.Review_Summary}</p>
            <p><strong>Release Date:</strong> ${data.Release_Date || "N/A"}</p>
          `;
        }
      });
  }

  // Displays the result of the first genre when initialized
  fetchTopGame(genreSelect.value);

  genreSelect.addEventListener("change", () => {
    fetchTopGame(genreSelect.value);
  });
});
