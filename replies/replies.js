// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { 
  getFirestore, doc, getDoc, collection, addDoc, getDocs, query, orderBy, updateDoc, deleteDoc, limit 
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

// Get gossip ID from URL parameters (changed parameter name to "id")
const params = new URLSearchParams(window.location.search);
const gossipId = params.get("gossip");

if (!gossipId) {
  alert("No gossip specified.");
  window.location.href = "/";
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
      <div id="gossip-${gossipData.id}" class="relative bg-gray-800 rounded-xl border border-pink-500 p-5 shadow-md hover:shadow-lg transition duration-200">

        <!-- Top-left buttons -->
        <div class="absolute top-3 left-3 flex gap-2">
          <button onclick="generateImage('gossip-${gossipData.id}')" class="hover:scale-110 transition" aria-label="Save Gossip Image">
            <img src="../pictures/save.png" alt="Save" class="w-5 h-5 opacity-80 hover:opacity-100">
          </button>
          <button onclick="copyToClipboard('${shareableLink}')" class="hover:scale-110 transition" aria-label="Copy Link">
            <img src="../pictures/link.png" alt="Copy" class="w-5 h-5 opacity-80 hover:opacity-100">
          </button>
        </div>

        <!-- Top-right buttons -->
        <div class="absolute top-3 right-3 flex gap-2">
          <button onclick="reportGossip('${gossipData.id}', ${JSON.stringify(gossipData.reports || [])})" class="hover:scale-110 transition" aria-label="Report Gossip">
            <img src="../pictures/flag.png" alt="Report" class="w-5 h-5 opacity-80 hover:opacity-100">
          </button>
          ${isAdmin ? `
            <button onclick="deleteGossip('${gossipData.id}')" class="hover:scale-110 transition" aria-label="Delete Gossip">
              <img src="../pictures/delete.png" alt="Delete" class="w-5 h-5 opacity-80 hover:opacity-100">
            </button>
          ` : ""}
        </div>

        <!-- Gossip Content -->
        <div class="mt-8 text-gray-100">
          <p class="text-base font-medium leading-snug">${gossipData.gossip}</p>
          <p class="text-xs text-pink-400 mt-2 italic">
            ${gossipData.timestamp ? formatTimestamp(gossipData.timestamp.seconds * 1000) : "No timestamp"}
          </p>
          ${gossipData.fileURL ? `<img src="${gossipData.fileURL}" class="mt-4 rounded-md max-w-full border border-pink-600">` : ""}
          <div class="first-reply mt-4" id="first-reply-${gossipData.id}"></div>
        </div>
      </div>
    `;
  loadReplies();
}

// Load top-level replies (sorted newest first)
async function loadReplies() {
  const repliesContainer = document.getElementById("repliesContainer");
  repliesContainer.innerHTML = "";
  const q = query(collection(db, "gossips", gossipId, "replies"), orderBy("timestamp", "desc"));
  const repliesSnapshot = await getDocs(q);
  repliesSnapshot.forEach((replyDoc) => {
    const replyData = replyDoc.data();
    const replyElement = document.createElement("div");
    replyElement.classList.add("reply");
    replyElement.setAttribute("gossip", `reply-${replyDoc.id}`);
    replyElement.innerHTML = `
      <p>${replyData.reply}</p>
      <p class="timestamp"><em>${formatTimestamp(replyData.timestamp.seconds * 1000)}</em></p>
      <button class="nested-reply-btn" onclick="toggleNestedReplyForm('${replyDoc.id}')">Reply</button>
      <div class="nested-replies" id="nested-replies-${replyDoc.id}"></div>
      <div class="nested-reply-form" id="nested-reply-form-${replyDoc.id}" style="display:none;">
        <textarea id="nested-reply-input-${replyDoc.id}" placeholder="Write a reply to this reply..."></textarea>
        <button onclick="submitNestedReply('${replyDoc.id}')">Submit</button>
      </div>
    `;
    repliesContainer.appendChild(replyElement);
    loadNestedReplies(replyDoc.id);
  });
}

// Toggle nested reply form for a given reply
function toggleNestedReplyForm(replyId) {
  const formDiv = document.getElementById(`nested-reply-form-${replyId}`);
  formDiv.style.display = formDiv.style.display === "none" ? "block" : "none";
}

// Submit a nested reply (reply to a reply)
async function submitNestedReply(parentReplyId) {
  const input = document.getElementById(`nested-reply-input-${parentReplyId}`);
  const replyText = input.value.trim();
  if (!replyText) {
    alert("Please write something to reply!");
    return;
  }
  try {
    await addDoc(collection(db, "gossips", gossipId, "replies", parentReplyId, "replies"), {
      reply: replyText,
      timestamp: new Date()
    });
    input.value = "";
    loadNestedReplies(parentReplyId);
  } catch (e) {
    console.error("Error adding nested reply: ", e);
    alert("Failed to post nested reply. Try again.");
  }
}

// Load nested replies for a given parent reply
async function loadNestedReplies(parentReplyId) {
  const nestedContainer = document.getElementById(`nested-replies-${parentReplyId}`);
  nestedContainer.innerHTML = "";
  const q = query(collection(db, "gossips", gossipId, "replies", parentReplyId, "replies"), orderBy("timestamp", "asc"));
  const nestedSnapshot = await getDocs(q);
  nestedSnapshot.forEach((nestedDoc) => {
    const nestedData = nestedDoc.data();
    const nestedElement = document.createElement("div");
    nestedElement.classList.add("nested-reply");
    nestedElement.innerHTML = `
      <p>${nestedData.reply}</p>
      <p class="timestamp"><em>${formatTimestamp(nestedData.timestamp.seconds * 1000)}</em></p>
    `;
    nestedContainer.appendChild(nestedElement);
  });
}

// Submit a top-level reply to the gossip
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
  window.location.href = "/";
}

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

// Ensure functions are globally accessible
window.submitReply = submitReply;
window.deleteGossip = deleteGossip;
window.reportGossip = reportGossip;
window.submitNestedReply = submitNestedReply;
window.toggleNestedReplyForm = toggleNestedReplyForm;

document.addEventListener("DOMContentLoaded", loadGossip);

function goBack() {
  window.location.href = "https://hayshor.blog";
}
window.goBack = goBack;

// Check localStorage for theme preference on page load
window.addEventListener('load', () => {
  const theme = localStorage.getItem('theme');
  const body = document.body;
  // If the theme is dark, apply dark mode, otherwise light mode
  if (theme === 'dark') {
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
  }
});