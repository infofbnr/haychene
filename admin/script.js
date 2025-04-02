// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { 
  getFirestore, collection, getDocs, updateDoc, deleteDoc, doc, query, where
} from "https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHYnW3qaNo7oGKMPs9DFALdWXIeYv6ixY",
  authDomain: "gossip-38bf8.firebaseapp.com",
  projectId: "gossip-38bf8",
  storageBucket: "gossip-38bf8.appspot.com",
  messagingSenderId: "224975261462",
  appId: "1:224975261462:web:f08fd243ec4a5c1a4a4a37",
  measurementId: "G-N7S9894R3N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function: Format timestamp (expects milliseconds)
function formatTimestamp(milliseconds) {
  const date = new Date(milliseconds);
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

// Load pending (unapproved) gossips and manually sort by timestamp (descending)
async function loadUnapprovedGossips() {
  const adminList = document.getElementById("adminGossipList");
  adminList.innerHTML = "<p>Loading pending gossips...</p>";

  // Query for pending gossips (approved == false)
  const q = query(collection(db, "gossips"), where("approved", "==", false));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    adminList.innerHTML = "<p>No pending gossips.</p>";
    return;
  }

  // Map documents to objects, adding the document ID
  let gossips = querySnapshot.docs.map(docSnapshot => ({
    id: docSnapshot.id,
    ...docSnapshot.data()
  }));

  // Sort by timestamp descending (most recent first)
  gossips.sort((a, b) => {
    const aTime = a.timestamp ? a.timestamp.seconds : 0;
    const bTime = b.timestamp ? b.timestamp.seconds : 0;
    return bTime - aTime;
  });

  // Build HTML for each gossip
  let gossipListHTML = "";
  gossips.forEach(gossipData => {
    gossipListHTML += `
      <div class="gossip" id="gossip-${gossipData.id}">
        <p><strong>Gossip:</strong> ${gossipData.gossip}</p>
        <p class="timestamp"><em>${gossipData.timestamp ? formatTimestamp(gossipData.timestamp.seconds * 1000) : "No timestamp"}</em></p>
        ${gossipData.fileURL ? `<img src="${gossipData.fileURL}" style="max-width: 100%;">` : ""}
        <button class="approve-btn" onclick="approveGossip('${gossipData.id}')">✅ Approve</button>
        <button class="delete-btn" onclick="deleteGossip('${gossipData.id}')">🗑 Delete</button>
      </div>
    `;
  });
  adminList.innerHTML = gossipListHTML;
}

// Approve a gossip: set approved to true
async function approveGossip(gossipId) {
  const gossipRef = doc(db, "gossips", gossipId);
  await updateDoc(gossipRef, { approved: true });
  alert("Gossip approved!");
  loadUnapprovedGossips();
}
window.approveGossip = approveGossip;

// Delete (reject) a gossip
async function deleteGossip(gossipId) {
  await deleteDoc(doc(db, "gossips", gossipId));
  alert("Gossip rejected and deleted!");
  loadUnapprovedGossips();
}
window.deleteGossip = deleteGossip;

// Load pending gossips on page load
document.addEventListener("DOMContentLoaded", loadUnapprovedGossips);
// Secret key that only you should know
const SECRET_KEY = "mySuperSecretKey"; // Change this to your own secret key

// Check if already logged in
if (localStorage.getItem("adminAccess") === SECRET_KEY) {
  showAdminPanel();
}

function login() {
  const inputKey = document.getElementById("adminKey").value;

  if (inputKey === SECRET_KEY) {
    localStorage.setItem("adminAccess", SECRET_KEY);
    alert("Access Granted!");
    showAdminPanel();
  } else {
    alert("Wrong Key! Access Denied.");
  }
}

function showAdminPanel() {
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("adminContent").classList.remove("hidden");
  loadUnapprovedGossips(); // Call your function to load admin content
}

window.login = login;
