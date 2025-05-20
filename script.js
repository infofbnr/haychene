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
    reports: [],
    approved: false
  });

  document.getElementById("gossipInput").value = "";
  alert("You wrote a gossip! Please wait 5-10 minutes to have it accepted. If you don't see it within 30 minutes, then it has been rejected.")
  alert("Great, mekhk kordsetsir. hramme Asdvadsashounchen mas m garta.");
  window.location.href = 'https://dailyverses.site';
  fileInput.value = ""; 
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
async function loadGossips(showAll = false) {
  const gossipList = document.getElementById("gossipList");
  gossipList.innerHTML = "";

  // Get today's start and end timestamps
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const endOfDay = startOfDay + 86400; // 86400 seconds in a day

  // Fetch only approved gossips
  const q = query(collection(db, "gossips"), where("approved", "==", true));
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

  // Filter manually if showAll is false
  if (!showAll) {
    gossips = gossips.filter(gossip => {
      const gossipTimestamp = gossip.timestamp ? gossip.timestamp.seconds : 0;
      return gossipTimestamp >= startOfDay && gossipTimestamp < endOfDay;
    });
  }

  // Sort by timestamp (newest first)
  gossips.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

  for (const gossipData of gossips) {
    const gossipElement = document.createElement("div");
    gossipElement.classList.add("gossip");
    gossipElement.setAttribute("id", `gossip-${gossipData.id}`);

    // Create a shareable link
    const shareableLink = createShareableLink(gossipData.id);
    gossipElement.innerHTML = `
      <div id="gossip-${gossipData.id}" class="relative bg-gray-800 rounded-xl border border-pink-500 p-5 shadow-md hover:shadow-lg transition duration-200">

        <!-- Top-left buttons -->
        <div class="absolute top-3 left-3 flex gap-2">
          <button onclick="generateImage('gossip-${gossipData.id}')" class="hover:scale-110 transition" aria-label="Save Gossip Image">
            <img src="pictures/save.png" alt="Save" class="w-5 h-5 opacity-80 hover:opacity-100">
          </button>
          <button onclick="copyToClipboard('${shareableLink}')" class="hover:scale-110 transition" aria-label="Copy Link">
            <img src="pictures/link.png" alt="Copy" class="w-5 h-5 opacity-80 hover:opacity-100">
          </button>
        </div>

        <!-- Top-right buttons -->
        <div class="absolute top-3 right-3 flex gap-2">
          <button onclick="reportGossip('${gossipData.id}', ${JSON.stringify(gossipData.reports || [])})" class="hover:scale-110 transition" aria-label="Report Gossip">
            <img src="pictures/flag.png" alt="Report" class="w-5 h-5 opacity-80 hover:opacity-100">
          </button>
          ${isAdmin ? `
            <button onclick="deleteGossip('${gossipData.id}')" class="hover:scale-110 transition" aria-label="Delete Gossip">
              <img src="pictures/delete.png" alt="Delete" class="w-5 h-5 opacity-80 hover:opacity-100">
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



    gossipList.appendChild(gossipElement);
    loadFirstReply(gossipData.id);
  }
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
    firstReplyDiv.innerHTML = `<span class="reply-snippet" onclick="window.location.href='${shareableLink}'">First reply: ${snippet}</span>`;
  } else {
    // Even if there are no replies, display a clickable message that directs to the replies page.
    firstReplyDiv.innerHTML = `<span class="no-reply" onclick="window.location.href='${shareableLink}'">Click to view gossip on its own.</span>`;
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

  // Clear any previous previews and error messages
  previewContainer.innerHTML = "";
  errorMessage.style.display = "none"; // Hide error message

  // If a file is selected
  if (!file) return;

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg"];
  if (!allowedTypes.includes(file.type)) {
    errorMessage.style.display = "block"; // Show error message
    errorMessage.innerText = "Only PNG and JPEG images are allowed!";
    fileInput.value = ""; // Clear invalid file selection
    return; // Exit if the file is invalid
  }

  // Preview the image
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = document.createElement("img");
    img.src = e.target.result;
    img.style.maxWidth = "100px"; // Limit preview size
    img.style.maxHeight = "100px";
    img.style.marginTop = "10px";
    previewContainer.appendChild(img);
  };

  // Read the file as a data URL
  reader.readAsDataURL(file);
});
