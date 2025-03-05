// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore.js";

// Your Firebase configuration
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

let isAdmin = localStorage.getItem("isAdmin") === "true"; // Admin status

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

// Generate shareable link for a gossip (URL format: /replies?id=...)
function createShareableLink(gossipId) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/replies?gossip=${gossipId}`;
}

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("Link copied to clipboard!");
  }).catch(err => {
    console.error("Failed to copy: ", err);
    alert("Failed to copy the link.");
  });
}
window.copyToClipboard = copyToClipboard;

// Submit a new gossip
async function submitGossip() {
  let gossipText = document.getElementById("gossipInput").value.trim();
  let postButton = document.querySelector("button");
  
  if (!gossipText) {
    alert("Please write something to gossip about!");
    return;
  }
  
  // Prevent spam
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
  
  postButton.disabled = false;
  postButton.textContent = "Post";
}

// Report a gossip
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

// Generate unique user ID
function generateUserID() {
  const userID = "user-" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("userID", userID);
  return userID;
}

// Delete gossip (admin only)
async function deleteGossip(id) {
  if (!isAdmin) {
    alert("You are not an admin!");
    return;
  }
  await deleteDoc(doc(db, "gossips", id));
  alert("Gossip deleted by admin.");
  loadGossips();
}

// Load all gossips from Firestore sorted newest first
async function loadGossips() {
  const gossipList = document.getElementById("gossipList");
  gossipList.innerHTML = "";

  const q = query(collection(db, "gossips"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  
  // Use for...of to allow awaiting for the first reply query per gossip
  for (const docSnapshot of querySnapshot.docs) {
    const gossipData = docSnapshot.data();
    const gossipElement = document.createElement("div");
    gossipElement.classList.add("gossip");
    gossipElement.setAttribute("id", `gossip-${docSnapshot.id}`);

    // Generate shareable link
    const shareableLink = createShareableLink(docSnapshot.id);

    // Build gossip element inner HTML
    gossipElement.innerHTML = `
      <p><strong>Gossip:</strong> ${gossipData.gossip}</p>
      <p class="timestamp"><em>${formatTimestamp(gossipData.timestamp.seconds * 1000)}</em></p>
      <button class="save-image-btn" onclick="generateImage('gossip-${docSnapshot.id}')">
        <img src="pictures/save.png" alt="Save">
      </button>
      <button class="copy-btn" onclick="copyToClipboard('${shareableLink}')">
        <img src="pictures/link.png" alt="Copy">
      </button>
      <button class="report-btn" onclick="reportGossip('${docSnapshot.id}', ${JSON.stringify(gossipData.reports || [])})">
        <img src="pictures/flag.png" alt="Report">
      </button>
      ${isAdmin ? `<button class="delete-btn" onclick="deleteGossip('${docSnapshot.id}')">
        <img src="pictures/delete.png" alt="Delete">
      </button>` : ""}
      <div class="first-reply" id="first-reply-${docSnapshot.id}"></div>
    `;

    gossipList.appendChild(gossipElement);
    // Load the first reply snippet for this gossip
    loadFirstReply(docSnapshot.id);
  }
}

// Load the first reply (oldest) for a given gossip and display as clickable snippet
async function loadFirstReply(gossipId) {
  const firstReplyDiv = document.getElementById(`first-reply-${gossipId}`);
  const q = query(
    collection(db, "gossips", gossipId, "replies"),
    orderBy("timestamp", "asc"),
    limit(1)
  );
  const replySnapshot = await getDocs(q);
  if (!replySnapshot.empty) {
    const replyDoc = replySnapshot.docs[0];
    const replyData = replyDoc.data();
    // Limit snippet to 60 characters
    const snippet = replyData.reply.length > 60 
      ? replyData.reply.substring(0, 60) + "..."
      : replyData.reply;
    // Show a label to indicate these are replies and make it clickable
    firstReplyDiv.innerHTML = `<span class="reply-snippet" onclick="window.location.href='${createShareableLink(gossipId)}'">First reply: ${snippet}</span>`;
  } else {
    firstReplyDiv.innerHTML = `<span class="no-reply">No replies yet</span>`;
  }
}


// Generate an image of a gossip element
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

// Ensure functions are globally accessible
window.submitGossip = submitGossip;
window.deleteGossip = deleteGossip;
window.reportGossip = reportGossip;

document.addEventListener("DOMContentLoaded", () => {
  isAdmin = localStorage.getItem("isAdmin") === "true"; 
  loadGossips();
});
