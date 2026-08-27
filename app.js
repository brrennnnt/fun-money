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

if (!window.firebaseConfig) {
  console.error("firebaseConfig is missing! Check config.js.");
}

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);

// Global state for tx type (spend vs deposit)
let currentTxType = 'spend';

// DOM Elements matching your index.html
const hisBalanceEl = document.getElementById("his-balance");
const herBalanceEl = document.getElementById("her-balance");
const userSelect = document.getElementById("user-select");
const amountInput = document.getElementById("amount");
const descriptionInput = document.getElementById("description");
const txList = document.getElementById("tx-list");
const moneyForm = document.getElementById("money-form");
const btnSpend = document.getElementById("btn-spend");
const btnDeposit = document.getElementById("btn-deposit");
const submitBtn = document.getElementById("submit-btn");

// Toggle Spend / Deposit
window.setTxType = function(type) {
  currentTxType = type;
  if (type === 'spend') {
    btnSpend.className = 'type-btn active-spend';
    btnDeposit.className = 'type-btn';
    submitBtn.textContent = 'Log Expense';
    submitBtn.style.background = '#0284c7';
  } else {
    btnSpend.className = 'type-btn';
    btnDeposit.className = 'type-btn active-deposit';
    submitBtn.textContent = 'Log Income';
    submitBtn.style.background = '#16a34a';
  }
};

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
const txQuery = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(15));
onSnapshot(txQuery, (snapshot) => {
  if (!txList) return;
  txList.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const item = docSnap.data();
    const li = document.createElement("li");
    const accountClass = item.user === "his" ? "his" : "her";
    const accountName = item.user === "his" ? "Brent" : "Ryann";
    const isSpend = item.type !== 'deposit';
    const amountClass = isSpend ? "spend" : "deposit";
    const amountSign = isSpend ? "-" : "+";

    li.className = `tx-item ${accountClass}`;
    li.innerHTML = `
      <div>
        <div class="tx-desc">${item.desc}</div>
        <div class="tx-user">${accountName}</div>
      </div>
      <div class="tx-amount ${amountClass}">${amountSign}$${parseFloat(item.amount).toFixed(2)}</div>
    `;
    txList.appendChild(li);
  });
});

// 3. Form Submit Handler
if (moneyForm) {
  moneyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const selectedUser = userSelect.value;
    const rawAmount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();

    if (isNaN(rawAmount) || rawAmount <= 0 || !description) return;

    // Calculate balance change: Spend subtracts, Deposit adds
    const balanceAdjustment = currentTxType === 'spend' ? -rawAmount : rawAmount;

    try {
      // Update account balance
      await updateDoc(balancesRef, {
        [selectedUser]: increment(balanceAdjustment)
      });

      // Log transaction entry
      await addDoc(collection(db, "transactions"), {
        user: selectedUser,
        type: currentTxType,
        amount: rawAmount,
        desc: description,
        timestamp: new Date()
      });

      amountInput.value = "";
      descriptionInput.value = "";
    } catch (err) {
      console.error("Error logging transaction:", err);
      alert("Failed to save transaction: " + err.message);
    }
  });
}
