const SHEET_URL = "https://script.google.com/macros/s/AKfycbxsXBQHv47IkvYcwVJo_ftOCKtnTfr4nZscLn4EYnvkDWoZyyBMw2bNYr8SQzdxgSou8A/exec"; // Replace with your Apps Script Web App URL

// Fetch gossip posts from Google Sheets
async function loadGossip() {
    const response = await fetch(SHEET_URL);
    const data = await response.json();

    const gossipList = document.getElementById("gossipList");
    gossipList.innerHTML = "";

    data.reverse().forEach(item => {
        let div = document.createElement("div");
        div.classList.add("gossip-card");

        let p = document.createElement("p");
        p.textContent = item.gossip;

        let timestamp = document.createElement("div");
        timestamp.classList.add("timestamp");
        timestamp.textContent = `Posted on ${new Date(item.timestamp).toLocaleString()}`;

        div.appendChild(p);
        div.appendChild(timestamp);
        gossipList.appendChild(div);
    });
}

// Submit gossip post
async function submitGossip() {
    const gossipInput = document.getElementById("gossipInput");
    const gossipText = gossipInput.value.trim();
    
    if (gossipText === "") {
        alert("Please write something!");
        return;
    }

    await fetch(SHEET_URL, {
        method: "POST",
        body: JSON.stringify({ gossip: gossipText }),
        headers: { "Content-Type": "application/json" }
    });

    gossipInput.value = "";
    loadGossip();
}

// Load gossip when the page loads
window.onload = loadGossip;
