import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore.js";
// import { getStorage } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-storage.js";
import { deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-storage.js";

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
// const storage = getStorage(app);

const userID = getOrCreateAnonID();
const isAdmin = localStorage.getItem("isAdmin") === "true";
function getOrCreateAnonID() {
  let id = localStorage.getItem("anonID");
  if (!id) {
    id = "anon-" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("anonID", id);
  }
  return id;
}

let replyingTo = null;
let mediaRecorder;
let audioChunks = [];

const recordBtn = document.getElementById("recordBtn");
const sendAudioBtn = document.getElementById("sendAudioBtn");
const audioPreview = document.getElementById("audioPreview");

recordBtn.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordBtn.textContent = "🎙️ Start Recording";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    audioChunks = [];
  } catch (err) {
    alert("Microphone access denied. Please allow microphone access and use HTTPS or localhost.");
    return;
  }

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const audioURL = URL.createObjectURL(audioBlob);
    audioPreview.src = audioURL;
    audioPreview.classList.remove("hidden");
    sendAudioBtn.classList.remove("hidden");
    sendAudioBtn.audioBlob = audioBlob;
  };

  mediaRecorder.start();
  recordBtn.textContent = "⏹️ Stop Recording";
});
const storage = getStorage(app);

sendAudioBtn.addEventListener("click", async () => {
  const blob = sendAudioBtn.audioBlob;
  const filename = `uploads/${userID}-${Date.now()}.webm`;
  const storageRef = ref(storage, filename);

  await uploadBytes(storageRef, blob);
  const downloadURL = await getDownloadURL(storageRef);

  await addDoc(collection(db, "chats"), {
    audioURL: downloadURL,
    userID,
    timestamp: new Date(),
    parentID: replyingTo
  });

  // Reset
  audioPreview.src = "";
  audioPreview.classList.add("hidden");
  sendAudioBtn.classList.add("hidden");
  replyingTo = null;
  updateReplyUI();
  loadMessages();
});

const sendBtn = document.getElementById("sendBtn"); // Make sure your send button has id="sendBtn"
const chatInput = document.getElementById("chatInput");

function getCooldownEnd() {
  return Number(localStorage.getItem("chatCooldownEnd")) || 0;
}

function setCooldownEnd(timestamp) {
  localStorage.setItem("chatCooldownEnd", timestamp.toString());
}

function startCooldown(seconds = 30) {
  const cooldownEnd = Date.now() + seconds * 1000;
  setCooldownEnd(cooldownEnd);

  sendBtn.disabled = true;
  chatInput.disabled = true;

  updateCooldownUI();
}
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const closeSidebarBtn = document.getElementById("closeSidebar");

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("hidden");
});

// Close sidebar button functionality
closeSidebarBtn.addEventListener("click", () => {
  sidebar.classList.add("hidden");
});
function updateCooldownUI() {
  const cooldownEnd = getCooldownEnd();
  const now = Date.now();
  const remaining = Math.ceil((cooldownEnd - now) / 1000);

  if (remaining > 0) {
    sendBtn.textContent = `Wait ${remaining}s`;
    sendBtn.disabled = true;
    chatInput.disabled = true;

    setTimeout(updateCooldownUI, 1000);
  } else {
    sendBtn.textContent = "Send";
    sendBtn.disabled = false;
    chatInput.disabled = false;
  }
}

async function submitMessage() {
  const text = chatInput.value.trim();

  if (!text) {
    alert("Please type a message.");
    return;
  }

  // Check cooldown before sending
  const cooldownEnd = getCooldownEnd();
  if (Date.now() < cooldownEnd) {
    alert("Please wait before sending another message.");
    return;
  }

  await addDoc(collection(db, "chats"), {
    message: text,
    userID,
    timestamp: new Date(),
    parentID: replyingTo // null or message id
  });

  chatInput.value = "";
  replyingTo = null;
  updateReplyUI();
  await loadMessages();

  startCooldown(30);
}

// On page load, check if cooldown active and update UI accordingly
window.addEventListener("load", updateCooldownUI);


window.submitMessage = submitMessage;

function updateReplyUI() {
  const replyIndicator = document.getElementById("replyIndicator");
  if (!replyIndicator) return;

  if (replyingTo) {
    replyIndicator.textContent = `Replying to message ID: ${replyingTo}`;
    replyIndicator.style.display = "block";
  } else {
    replyIndicator.style.display = "none";
  }
}
function renderMessage(msg, list, indent = 0) {
  const div = document.createElement("div");
div.className = "bg-gray-800 border border-teal-500 p-4 rounded-xl shadow-md mb-2 flex justify-between items-start";
  div.style.marginLeft = `${indent * 20}px`;

  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = `
    <p class="text-sm text-teal-400">ID: ${msg.userID}</p>
    <p class="text-base mt-1 text-white">${escapeHTML(msg.message)}</p>
    <p class="text-xs text-gray-500 mt-2 italic">${formatTimestamp(msg.timestamp)}</p>
    <button class="text-teal-400 text-sm mt-2 hover:underline reply-btn" data-id="${msg.id}">Reply</button>
  `;


  contentDiv.querySelector(".reply-btn").addEventListener("click", () => {
    replyingTo = msg.id;
    updateReplyUI();
    document.getElementById("chatInput").focus();
  });

  div.appendChild(contentDiv);
if (msg.audioURL) {
  
  const audioEl = document.createElement("audio");
  audioEl.controls = true;
  audioEl.src = msg.audioURL;
  audioEl.className = "mt-2 w-full";
  contentDiv.appendChild(audioEl);
}

  if (isAdmin) {
    const deleteBtn = document.createElement("img");
    deleteBtn.src = "pictures/delete.png";
    deleteBtn.alt = "Delete";
    deleteBtn.title = "Delete message";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.width = "20px";
    deleteBtn.style.height = "20px";
    deleteBtn.style.marginLeft = "10px";

    deleteBtn.addEventListener("click", async () => {
      await deleteMessageAndReplies(msg.id);
      alert("Gossip deleted by admin.");
      loadMessages();
    });

    div.appendChild(deleteBtn);
  }

  list.appendChild(div);

  msg.replies.forEach(reply => renderMessage(reply, list, indent + 1));
}
window.renderMessage = renderMessage;

async function loadMessages() {
  const list = document.getElementById("chatMessages");

  list.innerHTML = "";

  const q = query(collection(db, "chats"), orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);

  const messagesById = {};
  const rootMessages = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    messagesById[id] = { id, ...data, replies: [] };
  });

  for (const id in messagesById) {
    const msg = messagesById[id];
    if (msg.parentID && messagesById[msg.parentID]) {
      messagesById[msg.parentID].replies.push(msg);
    } else {
      rootMessages.push(msg);
    }
  }

  rootMessages.forEach(msg => renderMessage(msg, list));
}

async function deleteMessageAndReplies(messageId) {
  // Find all replies where parentID == messageId
  const repliesQuery = query(collection(db, "chats"), where("parentID", "==", messageId));
  const repliesSnapshot = await getDocs(repliesQuery);

  // Recursively delete replies
  for (const replyDoc of repliesSnapshot.docs) {
    await deleteMessageAndReplies(replyDoc.id);
  }

  // Delete this message itself
  await deleteDoc(doc(db, "chats", messageId));
}

window.loadMessages = loadMessages;
window.deleteMessageAndReplies = deleteMessageAndReplies;
function escapeHTML(str) {
  if (!str) return "";  // If str is null, undefined, or empty, return empty string
  return str.replace(/[&<>"']/g, function (m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m];
  });
}


function formatTimestamp(timestamp) {
  const date = new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
  return date.toLocaleString();
}
// Add this at the top of your script or wherever you manage user roles:

// Correctly get whatsappToggle button and add listener
document.getElementById("whatsappToggle").addEventListener("click", () => {
  window.location.href = "https://whatsapp.com/channel/0029VbB0Q4jFSAsyMkMqu545";
});

// Attach send button event listener (replace with your actual button or just inline onclick in HTML)
// Removed to avoid duplicate event listeners causing double message rendering

// Immediately load messages on script run
document.addEventListener("DOMContentLoaded", () => {
  loadMessages();
});

