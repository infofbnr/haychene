// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDoc,getDocs,limit, updateDoc, increment,deleteDoc, doc, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-storage.js";

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
const storage = getStorage(app);

async function submitGossip() {
  const gossipInput = document.getElementById("gossipInput").value.trim();
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!gossipInput && !file) {
    alert("Please write something or upload a file!");
    return;
  }

  let isAnnouncement = false;
  let gossipText = gossipInput;

  if (gossipInput.startsWith("/announcement")) {
    isAnnouncement = true;
    gossipText = gossipInput.replace(/^\/announcement\s*/, ""); // Remove tag from stored text
  }

  let fileURL = "";
  if (file) {
    const storageRef = ref(storage, `uploads/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(snapshot.ref);
  }

  // If this is an announcement, delete existing announcements first
  if (isAnnouncement) {
    const q = query(collection(db, "gossips"), where("isAnnouncement", "==", true));
    const querySnapshot = await getDocs(q);
    const batchDeletes = [];
    querySnapshot.forEach(docSnap => {
      batchDeletes.push(deleteDoc(doc(db, "gossips", docSnap.id)));
    });
    await Promise.all(batchDeletes);
  }

  // Add the new gossip document
  await addDoc(collection(db, "gossips"), {
    gossip: gossipText,
    fileURL,
    timestamp: new Date(),
    reports: [],
    isAnnouncement
  });

  // Clear inputs and reload
  document.getElementById("gossipInput").value = "";
  fileInput.value = "";

  alert("Great, mekhk kordsetsir. hramme Asdvadsashounchen mas m garta.");
  window.location.href = 'https://dailyverses.site';
  loadGossips();
}


// Report a gossip
async function reportGossip(id) {
  try {
  const gossipRef = doc(db, "gossips", id);
  const userID = generateUserID();

  // Get the current gossip data
  const gossipSnap = await getDoc(gossipRef);
  if (!gossipSnap.exists()) {
    alert("Gossip does not exist.");
    return;
  }

  const gossipData = gossipSnap.data();
  let reports = gossipData.reports || [];

  // Check if the user already reported
  if (reports.includes(userID)) {
    alert("You have already reported this gossip.");
    return;
  }

  reports.push(userID);

  if (reports.length >= 5) {
    await deleteDoc(gossipRef);
    alert("Gossip removed due to too many reports.");
  } else {
    await updateDoc(gossipRef, { reports });
    alert("Gossip reported. Thank you.");
  }
  }
  catch (error) {
    console.error("Error reporting gossip:", error);
    alert("An error occurred while reporting the gossip.");
  }
  loadGossips();
}


function generateUserID() {
  let userID = localStorage.getItem("userID");
  if (!userID) {
    userID = "user-" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("userID", userID);
  }
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
function getExtensionFromURL(url) {
  if (!url) return "";
  // Extract the substring after the last dot, ignoring query params or fragments
  const cleanUrl = url.split('?')[0].split('#')[0];
  const parts = cleanUrl.split('.');
  if (parts.length === 1) return "";
  return parts.pop().toLowerCase();
}

// Load all gossips from Firestore sorted newest first
async function loadGossips(showAll = false) {
  const gossipList = document.getElementById("gossipList");
  gossipList.innerHTML = "";

  // Get today's start and end timestamps
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const endOfDay = startOfDay + 86400; // 86400 seconds in a day

  // Fetch only approved gossips
  const q = query(collection(db, "gossips"));
  const querySnapshot = await getDocs(q);

  console.log("Total gossips fetched:", querySnapshot.docs.length);

  if (querySnapshot.empty) {
    gossipList.innerHTML = "<p>No gossips found.</p>";
    return;
  }

  // Convert documents to an array
  let gossips = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Sort by timestamp (newest first)
// Sort by timestamp (newest first)
gossips.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

// Find the announcement gossip (there should be only one)
const announcement = gossips.find(g => g.gossip.startsWith("/announcement"));

// Filter out the announcement from the rest
const regularGossips = gossips.filter(g => !g.gossip.startsWith("/announcement"));

// Clear list before rendering
gossipList.innerHTML = "";

// Render announcement first if exists
if (announcement) {
  const el = createGossipElement(announcement, true);
  gossipList.appendChild(el);
}

// Then render regular gossips
for (const gossipData of regularGossips) {
  const el = createGossipElement(gossipData, false);
  gossipList.appendChild(el);
}

// Then load first replies for all
if (announcement) loadFirstReply(announcement.id);
regularGossips.forEach(g => loadFirstReply(g.id));
  gossipList.appendChild(gossipElement);
  loadFirstReply(gossipData.id);
}
function createGossipElement(gossipData, isAnnouncement) {
  const gossipElement = document.createElement("div");
  gossipElement.classList.add("gossip");
  gossipElement.setAttribute("id", `gossip-${gossipData.id}`);

  // Remove announcement tag from display text if announcement
  const displayText = isAnnouncement
    ? gossipData.gossip.replace("/announcement", "").trim()
    : gossipData.gossip;

  const ext = getExtensionFromURL(gossipData.fileURL || "");
  let mediaHTML = "";
  if (["png", "jpg", "jpeg"].includes(ext)) {
    mediaHTML = `<img src="${gossipData.fileURL}" class="mt-4 rounded-md max-w-full border border-pink-600">`;
  } else if (["mp4", "webm", "mov"].includes(ext)) {
    mediaHTML = `<video controls class="mt-4 rounded-md max-w-full border border-pink-600">
                   <source src="${gossipData.fileURL}" type="video/mp4">
                   Your browser does not support the video tag.
                 </video>`;
  }

  gossipElement.innerHTML = `
    <div class="relative rounded-xl border p-5 shadow-md hover:shadow-lg transition duration-200
      ${isAnnouncement ? "bg-yellow-200 border-yellow-500 text-yellow-900" : "bg-gray-800 border-pink-500 text-gray-100"}">

      <!-- Announcement badge -->
      ${isAnnouncement ? `<div class="absolute top-3 right-3 font-bold uppercase text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded">Announcement</div>` : ""}

      <!-- Top-left buttons -->
      <div class="absolute top-3 left-3 flex gap-2">
        <button onclick="generateImage('gossip-${gossipData.id}')" class="hover:scale-110 transition" aria-label="Save Gossip Image">
          <img src="pictures/save.png" alt="Save" class="w-5 h-5 opacity-80 hover:opacity-100">
        </button>
        <button onclick="copyToClipboard('${createShareableLink(gossipData.id)}')" class="hover:scale-110 transition" aria-label="Copy Link">
          <img src="pictures/link.png" alt="Copy" class="w-5 h-5 opacity-80 hover:opacity-100">
        </button>
      </div>

      <!-- Top-right buttons -->
      <div class="absolute top-3 right-3 flex gap-2">
        <button onclick="reportGossip('${gossipData.id}')" class="hover:scale-110 transition" aria-label="Report Gossip">
          <img src="pictures/flag.png" alt="Report" class="w-5 h-5 opacity-80 hover:opacity-100">
        </button>
        ${isAdmin ? `
          <button onclick="deleteGossip('${gossipData.id}')" class="hover:scale-110 transition" aria-label="Delete Gossip">
            <img src="pictures/delete.png" alt="Delete" class="w-5 h-5 opacity-80 hover:opacity-100">
          </button>
        ` : ""}
      </div>

      <!-- Gossip Content -->
      <div class="mt-8">
        <p class="text-base font-medium leading-snug">${isAnnouncement ? "Announcement:" : "Gossip:"} ${displayText}</p>

        <p class="text-xs mt-2 italic">${gossipData.timestamp ? formatTimestamp(gossipData.timestamp.seconds * 1000) : "No timestamp"}</p>
        ${mediaHTML}
        <div class="first-reply mt-4" id="first-reply-${gossipData.id}"></div>
      </div>
    </div>
  `;

  return gossipElement;
}



window.loadGossips = loadGossips;

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
    firstReplyDiv.innerHTML = `<span class="reply-snippet" style="text-decoration: underline; user-select: none; cursor: pointer;" onclick="window.location.href='${shareableLink}'">First reply: ${snippet}</span>`;
  } else {
    // Even if there are no replies, display a clickable message that directs to the replies page.
firstReplyDiv.innerHTML = `<span class="no-reply" 
  style="text-decoration: underline; user-select: none; cursor: pointer;" 
  onclick="window.location.href='${shareableLink}'">
  Click to view gossip on its own.
</span>`;
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
  window.location.href = '/tos/';
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

const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("preview");
const errorMessage = document.getElementById("errorMessage");

// Listen for file input change event
fileInput.addEventListener("change", function(event) {
  const file = event.target.files[0];
  previewContainer.innerHTML = "";
  errorMessage.style.display = "none";

  if (!file) return;

  const allowedTypes = ["image/png", "image/jpeg", "video/mp4", "video/webm", "video/quicktime"];
  const maxSizeMB = 50;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errorMessage.innerText = "Only PNG, JPEG images and short videos are allowed!";
    errorMessage.style.display = "block";
    fileInput.value = "";
    return;
  }

  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    errorMessage.innerText = `File too large. Max size is ${maxSizeMB}MB.`;
    errorMessage.style.display = "block";
    fileInput.value = "";
    return;
  }

  // If it's an image
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "100px";
      img.style.maxHeight = "100px";
      img.style.marginTop = "10px";
      previewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  }

  // If it's a video
  if (file.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = function() {
      URL.revokeObjectURL(video.src);
      const maxDuration = 20;
      if (video.duration > maxDuration) {
        errorMessage.innerText = `Video too long. Max duration is ${maxDuration} seconds.`;
        errorMessage.style.display = "block";
        fileInput.value = "";
      } else {
        video.controls = true;
        video.style.maxWidth = "200px";
        previewContainer.appendChild(video);
      }
    };
    video.src = URL.createObjectURL(file);
  }
});


whatsappToggle.addEventListener("click", () => {
  window.location.href = "https://whatsapp.com/channel/0029VbB0Q4jFSAsyMkMqu545";
});

