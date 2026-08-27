import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, doc, onSnapshot, updateDoc, increment, collection, addDoc, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentType = 'spend';

window.setTxType = (type) => {
  currentType = type;
  const spendBtn = document.getElementById('btn-spend');
  const depositBtn = document.getElementById('btn-deposit');
  const submitBtn = document.getElementById('submit-btn');

  if (type === 'spend') {
    spendBtn.className = 'type-btn active-spend';
    depositBtn.className = 'type-btn';
    submitBtn.innerText = 'Log Expense';
    submitBtn.style.background = '#0284c7';
  } else {
    spendBtn.className = 'type-btn';
    depositBtn.className = 'type-btn active-deposit';
    submitBtn.innerText = 'Log Deposit';
    submitBtn.style.background = '#16a34a';
  }
};

// 1. Real-Time Balances Listener
onSnapshot(doc(db, "accounts", "balances"), (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById("his-balance").innerText = `$${(data.his || 0).toFixed(2)}`;
    document.getElementById("her-balance").innerText = `$${(data.her || 0).toFixed(2)}`;
  }
});

// 2. Real-Time Activity Feed
const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(10));
onSnapshot(q, (snapshot) => {
  const listEl = document.getElementById("tx-list");
  listEl.innerHTML = "";
  
  snapshot.forEach((doc) => {
    const tx = doc.data();
    const li = document.createElement("li");
    li.className = `tx-item ${tx.user}`;
    
    const isSpend = tx.type === 'spend' || !tx.type;
    const sign = isSpend ? '-' : '+';
    const amountClass = isSpend ? 'spend' : 'deposit';

    li.innerHTML = `
      <div>
        <div class="tx-desc">${tx.desc}</div>
        <div class="tx-user">${tx.user === 'his' ? "Brent's Account" : "Ryann's Account"}</div>
      </div>
      <div class="tx-amount ${amountClass}">${sign}$${Math.abs(tx.amount).toFixed(2)}</div>
    `;
    listEl.appendChild(li);
  });
});

// 3. Form Submit Handler
document.getElementById("money-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const user = document.getElementById("user-select").value;
  const rawAmount = parseFloat(document.getElementById("amount").value);
  const desc = document.getElementById("description").value;
  
  const adjustment = currentType === 'spend' ? -rawAmount : rawAmount;

  try {
    await updateDoc(doc(db, "accounts", "balances"), {
      [user]: increment(adjustment)
    });

    await addDoc(collection(db, "transactions"), {
      user,
      type: currentType,
      amount: rawAmount,
      desc,
      timestamp: new Date()
    });

    document.getElementById("amount").value = "";
    document.getElementById("description").value = "";
  } catch (err) {
    alert("Error saving transaction: " + err.message);
  }
});
