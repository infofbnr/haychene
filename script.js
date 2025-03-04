// Function to format the timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;  // Convert 24-hour time to 12-hour format
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes; // Add leading zero for minutes
    const day = ('0' + date.getDate()).slice(-2);  // Ensure two digits for the day
    const month = ('0' + (date.getMonth() + 1)).slice(-2);  // Ensure two digits for the month
    const year = date.getFullYear().toString().slice(-2);  // Last two digits of the year
  
    return `${formattedHours}:${formattedMinutes} ${ampm} ${day}/${month}/${year}`;
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.9.3/firebase-firestore.js";

// Firebase configuration object
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

// Function to submit gossip
async function submitGossip() {
  const gossipText = document.getElementById("gossipInput").value;
  
  if (gossipText) {
    try {
      await addDoc(collection(db, "gossips"), {
        gossip: gossipText,
        timestamp: new Date(),
      });
      document.getElementById("gossipInput").value = ""; // Clear input field
      loadGossips(); // Reload gossips
    } catch (e) {
      console.error("Error adding gossip: ", e);
    }
  } else {
    alert("Please write something to gossip about!");
  }
}

// Make the submitGossip function accessible globally
window.submitGossip = submitGossip;

// Function to load gossips
async function loadGossips() {
  const gossipList = document.getElementById("gossipList");
  gossipList.innerHTML = ""; // Clear the current list

  const querySnapshot = await getDocs(collection(db, "gossips"));
  querySnapshot.forEach((doc) => {
    const gossipData = doc.data();
    const gossipElement = document.createElement("div");
    gossipElement.classList.add("gossip");
    // Check if timestamp is a Firestore Timestamp object
    const timestamp = gossipData.timestamp ? gossipData.timestamp.seconds * 1000 : new Date();
    gossipElement.innerHTML = `
      <p><strong>Gossip:</strong> ${gossipData.gossip}</p>
      <p class="timestamp"><em>${formatTimestamp(timestamp)}</em></p>
    `;
    gossipList.appendChild(gossipElement);
  });
}

// Call the function to load gossips on page load
loadGossips();
