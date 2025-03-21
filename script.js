// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs,limit, updateDoc, deleteDoc, doc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-storage.js";

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
const storage = getStorage(app);

// Submit a new gossip
async function submitGossip() {
  let gossipText = document.getElementById("gossipInput").value.trim();
  let fileInput = document.getElementById("fileInput");
  let file = fileInput.files[0]; 

  if (!gossipText && !file) {
    alert("Please write something or upload a file!");
    return;
  }

  let fileURL = "";
  if (file) {
    const storageRef = ref(storage, `uploads/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(snapshot.ref);
  }

  await addDoc(collection(db, "gossips"), {
    gossip: gossipText,
    fileURL: fileURL, 
    timestamp: new Date(),
    reports: [] 
  });

  document.getElementById("gossipInput").value = "";
  fileInput.value = ""; 
  loadGossips();
  let postButton = document.querySelector("button");

  // Prevent spam
  postButton.disabled = true;
  postButton.textContent = "Posting...";

  let mediaUrl = null;

  // Check for media upload
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storage = getStorage();
    const mediaRef = ref(storage, 'media/' + file.name);
    
    // Upload media to Firebase storage
    try {
      await uploadBytes(mediaRef, file);
      mediaUrl = await getDownloadURL(mediaRef);
    } catch (e) {
      console.error("Error uploading media: ", e);
      alert("Failed to upload media. Try again.");
      return;
    }
  }

  try {
    // Clear input fields
    document.getElementById("gossipInput").value = "";
    fileInput.value = "";
    
    loadGossips();  // Reload the gossip list
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
      ${gossipData.fileURL ? `<img src="${gossipData.fileURL}" style="max-width: 100%;">` : ""}
      ${isAdmin ? `<button class="delete-btn" onclick="deleteGossip('${doc.id}')">Delete</button>` : ""}

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
  const shareableLink = createShareableLink(gossipId);
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
    // Display clickable snippet with a label indicating it's the first reply
    firstReplyDiv.innerHTML = `<span class="reply-snippet" onclick="window.location.href='${shareableLink}'">First reply: ${snippet}</span>`;
  } else {
    // Even if there are no replies, display a clickable message that directs to the replies page.
    firstReplyDiv.innerHTML = `<span class="no-reply" onclick="window.location.href='${shareableLink}'">No replies yet. Click to reply.</span>`;
  }
}
window.loadFirstReply = loadFirstReply;


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
function checkTOS() {
  // Check if TOS has not been accepted or is stored as 'false'
  if (localStorage.getItem("tosAccepted") !== "true") {
      document.getElementById("tosModal").style.display = "flex"; // Show the modal
      openTOS();  // Ensure the modal is opened
  }
}


function acceptTOS() {
  // Store the acceptance in localStorage and close the modal
  localStorage.setItem("tosAccepted", "true");
  document.getElementById("tosModal").style.display = "none";
}

// Attach function to window so the button can access it
window.acceptTOS = acceptTOS;

// Run check on page load
window.onload = checkTOS;

// Sidebar toggle functionality
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const tosLink = document.getElementById("tosLink");
const closeSidebarBtn = document.getElementById("closeSidebar");

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("hidden");
});

// Close sidebar button functionality
closeSidebarBtn.addEventListener("click", () => {
  sidebar.classList.add("hidden");
});

// Ensure TOS functions are globally accessible
window.openTOS = function openTOS() {
  document.getElementById("tosModal").style.display = "flex"; // Open the modal
};
window.closeTOS = function closeTOS() {
  document.getElementById("tosModal").style.display = "none"; // Close the modal
};
// Get file input and preview container elements
const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("preview");

// Listen for file input change event
fileInput.addEventListener("change", function(event) {
  const file = event.target.files[0];
  
  // Clear any previous previews
  previewContainer.innerHTML = "";

  // If a file is selected
  if (file) {
    const reader = new FileReader();

    // When the file is read successfully
    reader.onload = function(e) {
      const fileType = file.type.split("/")[0]; // Get file type (image/video)
      const fileURL = e.target.result;

      // If it's an image
      if (fileType === "image") {
        const img = document.createElement("img");
        img.src = fileURL;
        previewContainer.appendChild(img);
      }

      // If it's a video
      else if (fileType === "video") {
        const video = document.createElement("video");
        video.src = fileURL;
        video.controls = true; // Allow playback controls for video
        previewContainer.appendChild(video);
      }
    };

    // Read the file as a data URL
    reader.readAsDataURL(file);
  }
});

const darkModeToggle = document.getElementById("darkModeToggle");
const body = document.body;
const h1 = document.h1;
const h2 = document.h2;
const h3 = document.h3;
// Listen for the dark mode button click event
darkModeToggle.addEventListener("click", function() {
  // Toggle the 'dark-mode' class on the body element
  body.classList.toggle("dark-mode");
  h1.classList.toggle("dark-mode");
  h2.classList.toggle("dark-mode");
  h3.classList.toggle("dark-mode");
});