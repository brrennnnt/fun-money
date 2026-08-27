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

// Initialize Firebase using global config loaded from config.js
const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const hisBalanceEl = document.getElementById("his-balance");
const herBalanceEl = document.getElementById("her-balance");
const transactionForm = document.getElementById("transaction-form");
const accountSelect = document.getElementById("account-select");
const amountInput = document.getElementById("amount-input");
const descriptionInput = document.getElementById("description-input");
const recentActivityEl = document.getElementById("recent-activity");
const typeSpendBtn = document.getElementById("type-spend");
const typeDepositBtn = document.getElementById("type-deposit");

let currentType = "spend"; // Default transaction type

// Toggle Spend / Deposit Buttons
if (typeSpendBtn && typeDepositBtn) {
  typeSpendBtn.addEventListener("click", () => {
    currentType = "spend";
    typeSpendBtn.classList.add("active");
    typeDepositBtn.classList.remove("active");
  });

  typeDepositBtn.addEventListener("click", () => {
    currentType = "deposit";
    typeDepositBtn.classList.add("active");
    typeSpendBtn.classList.remove("active");
  });
}

// 1. Real-Time Balances Listener
const balancesDocRef = doc(db, "accounts", "balances");
onSnapshot(balancesDocRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (hisBalanceEl) hisBalanceEl.textContent = `$${(data.his || 0).toFixed(2)}`;
    if (herBalanceEl) herBalanceEl.textContent = `$${(data.her || 0).toFixed(2)}`;
  }
});

// 2. Real-Time Recent Activity Listener
const transactionsQuery = query(
  collection(db, "transactions"),
  orderBy("timestamp", "desc"),
  limit(10)
);

onSnapshot(transactionsQuery, (snapshot) => {
  if (!recentActivityEl) return;
  recentActivityEl.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const item = docSnap.data();
    const isHis = item.user === "his";
    const accountLabel = isHis ? "BRENT'S ACCOUNT" : "RYANN'S ACCOUNT";
    const accentClass = isHis ? "border-his" : "border-her";
    
    const isDeposit = item.type === "deposit";
    const amountPrefix = isDeposit ? "+" : "-";
    const amountClass = isDeposit ? "text-green" : "text-white";

    const card = document.createElement("div");
    card.className = `activity-card ${accentClass}`;
    card.innerHTML = `
      <div class="activity-info">
        <div class="activity-title">${item.desc || "Transaction"}</div>
        <div class="activity-account">${accountLabel}</div>
      </div>
      <div class="activity-amount ${amountClass}">
        ${amountPrefix}$${parseFloat(item.amount).toFixed(2)}
      </div>
    `;
    recentActivityEl.appendChild(card);
  });
});

// 3. Handle Form Submission
if (transactionForm) {
  transactionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const selectedAccount = accountSelect.value; // 'his' or 'her'
    const rawAmount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();

    if (isNaN(rawAmount) || rawAmount <= 0 || !description) return;

    // Calculate balance change (+ for deposit, - for spend)
    const balanceChange = currentType === "deposit" ? rawAmount : -rawAmount;

    try {
      // Update balance atomically
      await updateDoc(balancesDocRef, {
        [selectedAccount]: increment(balanceChange)
      });

      // Add to transaction log
      await addDoc(collection(db, "transactions"), {
        user: selectedAccount,
        type: currentType,
        amount: rawAmount,
        desc: description,
        timestamp: new Date()
      });

      // Reset Form Inputs
      amountInput.value = "";
      descriptionInput.value = "";
    } catch (err) {
      console.error("Error submitting transaction:", err);
    }
  });
}
