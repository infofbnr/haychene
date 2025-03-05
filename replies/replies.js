// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { 
  getFirestore, doc, getDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore.js";

// Firebase configuration (same as before)
const firebaseConfig = {
  apiKey: "AIzaSyCHYnW3qaNo7oGKMPs9DFALdWXIeYv6ixY",
  authDomain: "gossip-38bf8.firebaseapp.com",
  projectId: "gossip-38bf8",
  storageBucket: "gossip-38bf8.firebasestorage.app",
  messagingSenderId: "224975261462",
  appId: "1:224975261462:web:f08fd243ec4a5c1a4a4a37",
  measurementId: "G-N7S9894R3N"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let isAdmin = localStorage.getItem("isAdmin") === "true";

// Format timestamp function
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

// Get gossip ID from URL parameters
const params = new URLSearchParams(window.location.search);
const gossipId = params.get("gossip");

if (!gossipId) {
  alert("No gossip specified.");
  window.location.href = "index.html";
}

// Load the specific gossip
async function loadGossip() {
  const gossipContainer = document.getElementById("gossipContainer");
  const docRef = doc(db, "gossips", gossipId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    gossipContainer.innerHTML = "<p>Gossip not found or removed.</p>";
    return;
  }
  
  const gossipData = docSnap.data();
  const shareableLink = window.location.origin + "/replies?gossip=" + gossipId;
  
  gossipContainer.innerHTML = `
    <div class="gossip" id="gossip-${gossipId}">
      <p><strong>Gossip:</strong> ${gossipData.gossip}</p>
      <p class="timestamp"><em>${formatTimestamp(gossipData.timestamp.seconds * 1000)}</em></p>
      <button class="save-image-btn" onclick="generateImage('gossip-${gossipId}')">
        <img src="../pictures/save.png" alt="Save">
      </button>
      <button class="copy-btn" onclick="copyToClipboard('${shareableLink}')">
        <img src="../pictures/link.png" alt="Copy">
      </button>
      <button class="report-btn" onclick="reportGossip('${gossipId}', ${JSON.stringify(gossipData.reports || [])})">
        <img src="../pictures/flag.png" alt="Report">
      </button>
      ${isAdmin ? `<button class="delete-btn" onclick="deleteGossip('${gossipId}')">
        <img src="../pictures/delete.png" alt="Delete">
      </button>` : ""}
    </div>
  `;
  loadReplies();
}

// Load replies for the current gossip sorted newest first
async function loadReplies() {
  const repliesContainer = document.getElementById("repliesContainer");
  repliesContainer.innerHTML = "";
  // Query ordering replies by timestamp descending
  const q = query(collection(db, "gossips", gossipId, "replies"), orderBy("timestamp", "desc"));
  const repliesSnapshot = await getDocs(q);
  repliesSnapshot.forEach((replyDoc) => {
    const replyData = replyDoc.data();
    const replyElement = document.createElement("div");
    replyElement.classList.add("reply");
    replyElement.innerHTML = `
      <p>${replyData.reply}</p>
      <p class="timestamp"><em>${formatTimestamp(replyData.timestamp.seconds * 1000)}</em></p>
    `;
    repliesContainer.appendChild(replyElement);
  });
}

// Submit a reply for the current gossip
async function submitReply() {
  const replyInput = document.getElementById("replyInput");
  const replyText = replyInput.value.trim();
  if (!replyText) {
    alert("Please write something to reply!");
    return;
  }
  try {
    await addDoc(collection(db, "gossips", gossipId, "replies"), {
      reply: replyText,
      timestamp: new Date()
    });
    replyInput.value = "";
    loadReplies();
  } catch (e) {
    console.error("Error adding reply: ", e);
    alert("Failed to post reply. Try again.");
  }
}
window.submitReply = submitReply;
// Copy text to clipboard (same function as before)
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("Link copied to clipboard!");
  }).catch(err => {
    console.error("Failed to copy: ", err);
    alert("Failed to copy the link.");
  });
}
window.copyToClipboard = copyToClipboard;

// Report gossip (reused function)
async function reportGossip(id, reports = []) {
  const docRef = doc(db, "gossips", id);
  const userID = localStorage.getItem("userID") || generateUserID();

  if (!Array.isArray(reports)) reports = [];
  if (reports.includes(userID)) {
    alert("You have already reported this gossip.");
    return;
  }
  reports.push(userID);
  if (reports.length >= 3) {
    await deleteDoc(docRef);
    alert("Gossip removed due to too many reports.");
  } else {
    await updateDoc(docRef, { reports });
  }
  loadGossip();
}
window.reportGossip = reportGossip;
// Generate unique user ID (reused)
function generateUserID() {
  const userID = "user-" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("userID", userID);
  return userID;
}

// Delete gossip (admin only, reused)
async function deleteGossip(id) {
  if (!isAdmin) {
    alert("You are not an admin!");
    return;
  }
  await deleteDoc(doc(db, "gossips", id));
  alert("Gossip deleted by admin.");
  window.location.href = "index.html";
}
window.deleteGossip = deleteGossip;
// Generate image for the gossip element
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

// Initialize page
document.addEventListener("DOMContentLoaded", loadGossip);
