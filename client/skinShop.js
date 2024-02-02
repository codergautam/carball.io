import cosmetics from '../shared/cosmetics.json';

function getCardHTML(skin) {
  return `<div class="card">
  <div class="card_image"><center><img src="/${skin.bodyImage}" width="135" height="240"></center></div>
  <div class="card_content">
    <h2 class="card_title">${skin.name}</h2>
    <b><p class="card_text">${skin.description}</p></b>
    <p class="card_text">Cost: ${skin.cost} goals</p>
    ${skin.cost > Number(document.getElementById("goals").innerHTML) ? `` : `
    <button class="btn card_btn" data-skin="${skin.id}">${window.equippedSkin == skin.id ? "Equipped" : "Equip"}</button>
    `}
  </div>
</div>`;
}

function updateSkinsDisplay() {
  document.getElementById("cards").innerHTML = Object.values(cosmetics).map(skin => getCardHTML(skin)).join("");
  document.querySelectorAll('.btn.card_btn').forEach(button => {
    button.addEventListener('click', function() {
      window.equippedSkin = parseInt(this.getAttribute('data-skin'));
      localStorage.setItem('equippedSkin', window.equippedSkin.toString());
      updateSkinsDisplay(); // Refresh the display to show the "Equipped" state correctly
    });
  });
}

export function initSkinShop() {
  // Initialize the modal, button, and span elements
  var modal = document.getElementById("skinsModal");
  var btn = document.getElementById("skinsButton");
  var span = document.getElementsByClassName("close")[0];

  // Try to load the equippedSkin from localStorage, default to 1 if not found or in case of error
  window.equippedSkin = 1;
  try {
    if(localStorage.getItem("equippedSkin")) {
      window.equippedSkin = parseInt(localStorage.getItem("equippedSkin"));
    }
  } catch(e) {
    console.error("Error reading from localStorage", e);
  }

  // When the skins button is clicked, show the modal and update the skins display
  btn.onclick = function() {
    modal.style.display = "block";
    updateSkinsDisplay();
  }

  // Close the modal when the user clicks on <span> (x)
  span.onclick = function() {
    modal.style.display = "none";
  }

  // Close the modal when the user clicks anywhere outside of it
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }
}