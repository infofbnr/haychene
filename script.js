import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHYnW3qaNo7oGKMPs9DFALdWXIeYv6ixY",
  authDomain: "gossip-38bf8.firebaseapp.com",
  projectId: "gossip-38bf8",
  storageBucket: "gossip-38bf8.firebasestorage.app",
  messagingSenderId: "224975261462",
  appId: "1:224975261462:web:f08fd243ec4a5c1a4a4a37",
  measurementId: "G-N7S9894R3N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let isAdmin = false; // Default: User is NOT an admin

// Function to format the timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
  const day = ('0' + date.getDate()).slice(-2);
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear().toString().slice(-2);
  return `${formattedHours}:${formattedMinutes} ${ampm} ${day}/${month}/${year}`;
}

// Function to submit gossip (with delay)
async function submitGossip() {
  const gossipText = document.getElementById("gossipInput").value;

  if (gossipText) {
    // Check for special character to enable admin mode
    if (gossipText.includes("MANOmanoMANO")) {
      isAdmin = true;
      alert("Admin mode activated!");
    }

    setTimeout(async () => {  // Delay before submitting
      try {
        await addDoc(collection(db, "gossips"), {
          gossip: gossipText,
          timestamp: new Date(),
          reports: 0 // Track reports
        });
        document.getElementById("gossipInput").value = "";
        loadGossips();
      } catch (e) {
        console.error("Error adding gossip: ", e);
      }
    }, 2000);
  } else {
    alert("Please write something to gossip about!");
  }
}

window.submitGossip = submitGossip;

// Function to report gossip
async function reportGossip(id, reports) {
  const gossipRef = doc(db, "gossips", id);
  const newReports = reports + 1;

  if (newReports >= 3) {
    await deleteDoc(gossipRef);
    alert("Gossip removed due to too many reports.");
  } else {
    await updateDoc(gossipRef, { reports: newReports });
  }

  loadGossips();
}
window.reportGossip = reportGossip;
// Function to delete gossip (admin only)
async function deleteGossip(id) {
  if (!isAdmin) {
    alert("You are not an admin!");
    return;
  }

  await deleteDoc(doc(db, "gossips", id));
  alert("Gossip deleted by admin.");
  loadGossips();
}
window.deleteGossip = deleteGossip;
// Function to load gossips
async function loadGossips() {
  const gossipList = document.getElementById("gossipList");
  gossipList.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "gossips"));
  querySnapshot.forEach((doc) => {
    const gossipData = doc.data();
    const gossipElement = document.createElement("div");
    gossipElement.classList.add("gossip");

    gossipElement.innerHTML = `
      <p><strong>Gossip:</strong> ${gossipData.gossip}</p>
      <p class="timestamp"><em>${formatTimestamp(gossipData.timestamp.seconds * 1000)}</em></p>
      <button class="report-btn" onclick="reportGossip('${doc.id}', ${gossipData.reports})">Report</button>
      ${isAdmin ? `<button class="delete-btn" onclick="deleteGossip('${doc.id}')">Delete</button>` : ""}
    `;

    gossipList.appendChild(gossipElement);
  });
}

// Load gossips on page load
loadGossips();
