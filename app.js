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
  limit,
  getDocs,
  startAfter 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Ensure config exists before initializing
if (!window.firebaseConfig) {
  console.error("firebaseConfig is missing! Check config.js loading.");
}

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);

// Global state for transaction type (spend vs deposit)
let currentTxType = 'spend';
let lastVisibleDoc = null;

// DOM Elements matching index.html
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
const loadMoreBtn = document.getElementById("load-more-btn");

// Toggle Spend / Deposit Mode
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

// Helper: Build individual transaction list element
function createTxItem(item) {
  const li = document.createElement("li");
  const accountClass = item.user === "his" ? "his" : "her";
  const accountName = item.user === "his" ? "Brent" : "Ryann";
  const isSpend = item.type !== 'deposit';
  const amountClass = isSpend ? "spend" : "deposit";
  const amountSign = isSpend ? "-" : "+";

  let timeStr = "";
  if (item.timestamp) {
    const dateObj = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
    timeStr = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  li.className = `tx-item ${accountClass}`;
  li.innerHTML = `
    <div>
      <div class="tx-desc">${item.desc}</div>
      <div class="tx-user">${accountName}${timeStr ? ' • ' + timeStr : ''}</div>
    </div>
    <div class="tx-amount ${amountClass}">${amountSign}$${parseFloat(item.amount).toFixed(2)}</div>
  `;
  return li;
}

// 1. Real-time Account Balances Listener
const balancesRef = doc(db, "accounts", "balances");
onSnapshot(balancesRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (hisBalanceEl) hisBalanceEl.textContent = `$${(data.his || 0).toFixed(2)}`;
    if (herBalanceEl) herBalanceEl.textContent = `$${(data.her || 0).toFixed(2)}`;
  }
});

// 2. Real-time Transactions Listener (Initial 15)
const txQuery = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(15));
onSnapshot(txQuery, (snapshot) => {
  if (!txList) return;
  txList.innerHTML = "";

  if (!snapshot.empty) {
    lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
    if (loadMoreBtn) {
      loadMoreBtn.style.display = snapshot.docs.length === 2 ? "block" : "none";
    }
  } else if (loadMoreBtn) {
    loadMoreBtn.style.display = "none";
  }

  snapshot.forEach((docSnap) => {
    txList.appendChild(createTxItem(docSnap.data()));
  });
});

// 3. Load More History Pagination Handler
if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", async () => {
    if (!lastVisibleDoc) return;

    const nextQuery = query(
      collection(db, "transactions"),
      orderBy("timestamp", "desc"),
      startAfter(lastVisibleDoc),
      limit(15)
    );

    try {
      const snapshot = await getDocs(nextQuery);
      if (!snapshot.empty) {
        lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        snapshot.forEach((docSnap) => {
          txList.appendChild(createTxItem(docSnap.data()));
        });

        if (snapshot.docs.length < 15) {
          loadMoreBtn.style.display = "none";
        }
      } else {
        loadMoreBtn.style.display = "none";
      }
    } catch (err) {
      console.error("Error loading extra transactions:", err);
    }
  });
}

// 4. Form Submit Listener
if (moneyForm) {
  moneyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const selectedUser = userSelect.value;
    const rawAmount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();

    if (isNaN(rawAmount) || rawAmount <= 0 || !description) return;

    const balanceAdjustment = currentTxType === 'spend' ? -rawAmount : rawAmount;

    try {
      await updateDoc(balancesRef, {
        [selectedUser]: increment(balanceAdjustment)
      });

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
      alert("Failed to log transaction: " + err.message);
    }
  });
}
