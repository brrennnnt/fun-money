import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  collection, 
  addDoc, 
  updateDoc, 
  increment, 
  query, 
  orderBy, 
  limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Ensure config exists before initializing
if (!window.firebaseConfig) {
  console.error("firebaseConfig is missing! Check config.js loading.");
}

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);

// DOM Elements matching your exact HTML IDs
const hisBalanceEl = document.getElementById("his-balance");
const herBalanceEl = document.getElementById("her-balance");
const userSelect = document.getElementById("user-select");
const amountInput = document.getElementById("amount");
const descriptionInput = document.getElementById("description");
const txList = document.getElementById("tx-list");
const form = document.querySelector("form");

// 1. Balance Listener
const balancesRef = doc(db, "accounts", "balances");
onSnapshot(balancesRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (hisBalanceEl) hisBalanceEl.textContent = `$${(data.his || 0).toFixed(2)}`;
    if (herBalanceEl) herBalanceEl.textContent = `$${(data.her || 0).toFixed(2)}`;
  }
});

// 2. Transactions Listener
const txQuery = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(10));
onSnapshot(txQuery, (snapshot) => {
  if (!txList) return;
  txList.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const item = docSnap.data();
    const li = document.createElement("li");
    const accountName = item.user === "his" ? "Brent" : "Ryann";
    li.textContent = `${accountName}: ${item.desc} - $${parseFloat(item.amount).toFixed(2)}`;
    txList.appendChild(li);
  });
});

// 3. Form Submit Listener
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const selectedUser = userSelect.value;
    const rawAmount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();

    if (isNaN(rawAmount) || rawAmount <= 0 || !description) return;

    try {
      // Deduct expense from chosen user
      await updateDoc(balancesRef, {
        [selectedUser]: increment(-rawAmount)
      });

      await addDoc(collection(db, "transactions"), {
        user: selectedUser,
        amount: rawAmount,
        desc: description,
        timestamp: new Date()
      });

      amountInput.value = "";
      descriptionInput.value = "";
    } catch (err) {
      console.error("Error logging transaction:", err);
    }
  });
}
