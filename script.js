// Firebase Configuration
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
  firebase.initializeApp(firebaseConfig);
  
  // Initialize Firestore
  const db = firebase.firestore();
  
  // Function to retrieve gossips
  const getGossips = async () => {
    try {
      const gossipRef = db.collection('gossips');
      const snapshot = await gossipRef.get();
      if (snapshot.empty) {
        console.log('No gossips found!');
        return;
      }
      snapshot.forEach((doc) => {
        const gossip = doc.data().text;
        console.log(`Gossip: ${gossip}`);
        
        // Append gossip to the list
        const gossipList = document.getElementById('gossipList');
        const gossipItem = document.createElement('div');
        gossipItem.textContent = gossip;
        gossipList.appendChild(gossipItem);
      });
    } catch (error) {
      console.error('Error retrieving gossips:', error);
    }
  };
  
  // Function to submit a new gossip
  const submitGossip = async () => {
    const gossipInput = document.getElementById('gossipInput');
    const gossipText = gossipInput.value.trim();
  
    if (gossipText === '') {
      alert('Please enter some gossip!');
      return;
    }
  
    try {
      // Add gossip to Firestore
      await db.collection('gossips').add({
        text: gossipText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Gossip posted successfully!');
  
      // Clear the input field
      gossipInput.value = '';
  
      // Reload the gossips to display new one
      getGossips();
    } catch (error) {
      console.error('Error posting gossip:', error);
    }
  };
  
  // Get gossips when the page loads
  window.onload = () => {
    getGossips();
  };
  