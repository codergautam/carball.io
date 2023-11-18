import startGame from "./startGame";

let state = "home";

document.getElementById("playButton").addEventListener("click", () => {
  state = "game";
  startGame();
});
