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

let isAdmin = localStorage.getItem("isAdmin") === "true"; // Load admin status from storage

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
function createShareableLink(gossipId) {
  const baseUrl = window.location.origin; // Gets the current website domain
  return `${baseUrl}/?gossip=${gossipId}`;
}
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("Link copied to clipboard!");
  }).catch(err => {
    console.error("Failed to copy: ", err);
    alert("Failed to copy the link.");
  });
}
window.copyToClipboard = copyToClipboard;
// Function to submit gossip
async function submitGossip() {
    let gossipText = document.getElementById("gossipInput").value.trim();
    let postButton = document.querySelector("button");
  
    if (!gossipText) {
      alert("Please write something to gossip about!");
      return;
    }
  
    // Disable button to prevent spam
    postButton.disabled = true;
    postButton.textContent = "Posting...";
  
    try {
      await addDoc(collection(db, "gossips"), {
        gossip: gossipText,
        timestamp: new Date(),
        reports: []
      });
      document.getElementById("gossipInput").value = "";
      loadGossips();
    } catch (e) {
      console.error("Error adding gossip: ", e);
      alert("Failed to post gossip. Try again.");
    }
  
    // Re-enable button after completion
    postButton.disabled = false;
    postButton.textContent = "Post";
  }
  
// Function to report gossip
async function reportGossip(id, reports = []) {
  const gossipRef = doc(db, "gossips", id);
  const userID = localStorage.getItem("userID") || generateUserID();

  if (!Array.isArray(reports)) reports = [];

  if (reports.includes(userID)) {
    alert("You have already reported this gossip.");
    return;
  }

  reports.push(userID);
  if (reports.length >= 3) {
    await deleteDoc(gossipRef);
    alert("Gossip removed due to too many reports.");
  } else {
    await updateDoc(gossipRef, { reports });
  }

  loadGossips();
}

// Generate a unique user ID
function generateUserID() {
  const userID = "user-" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("userID", userID);
  return userID;
}

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

// Function to load gossips
async function loadGossips() {
  const gossipList = document.getElementById("gossipList");
  gossipList.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "gossips"));
  querySnapshot.forEach((doc) => {
    const gossipData = doc.data();
    const gossipElement = document.createElement("div");
    gossipElement.classList.add("gossip");
    gossipElement.setAttribute("id", `gossip-${doc.id}`);

    // Generate shareable link
    const shareableLink = createShareableLink(doc.id);

    gossipElement.innerHTML = `
    <p><strong>Gossip:</strong> ${gossipData.gossip}</p>
    <p class="timestamp"><em>${formatTimestamp(gossipData.timestamp.seconds * 1000)}</em></p>
    <button class="save-image-btn" onclick="generateImage('gossip-${doc.id}')">
      <img src="pictures/save.png" alt="Save">
    </button>
    <button class="copy-btn" onclick="copyToClipboard('${shareableLink}')">
      <img src="pictures/link.png" alt="Copy">
    </button>
    <button class="report-btn" onclick="reportGossip('${doc.id}', ${JSON.stringify(gossipData.reports || [])})">
      <img src="pictures/flag.png" alt="Report">
    </button>
    ${isAdmin ? `<button class="delete-btn" onclick="deleteGossip('${doc.id}')">
      <img src="pictures/delete.png" alt="Delete">
    </button>` : ""}
  `;
  

    gossipList.appendChild(gossipElement);
  });
}


function generateImage(gossipId) {
  const gossipDiv = document.getElementById(gossipId);

  if (!gossipDiv) {
    alert("Gossip not found!");
    return;
  }

  html2canvas(gossipDiv, { backgroundColor: "#fff", scale: 2 }).then(canvas => {
    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgData;
    link.download = "gossip.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }).catch(err => {
    console.error("Error saving image:", err);
    alert("Failed to save the image.");
  });
}
window.generateImage = generateImage;
// Ensure the functions are globally accessible
window.submitGossip = submitGossip;
window.deleteGossip = deleteGossip;
window.reportGossip = reportGossip;

// Load gossips on page load

document.addEventListener("DOMContentLoaded", () => {
  isAdmin = localStorage.getItem("isAdmin") === "true"; 
  loadGossips();
});