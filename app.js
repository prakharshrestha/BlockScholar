// =============================================================================
// app.js — dApp JavaScript Logic
// Depends on: config.js (CONTRACT_ADDRESSES, ABI_STUDENT, ABI_PROVIDER, ABI_STAFF)
//             ethers.js v5 (loaded via CDN)
// =============================================================================

// ─── Tab Navigation ──────────────────────────────────────────────────────────

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(tabId).classList.add('active');
}


// ─── Wallet Connection ────────────────────────────────────────────────────────

let walletAddress = null;

async function connectWallet() {
  alert("Button clicked! Attempting to connect...");
  if (!window.ethereum) {
    alert('MetaMask is not installed. Please install it from https://metamask.io');
    return null;
  }
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    const accounts = await provider.send('eth_requestAccounts', []);
    walletAddress = accounts[0];
    updateWalletUI(walletAddress);

    // --- AUTO SWITCH TO GANACHE NETWORK ---
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x539' }], // 1337 in hex
      });
    } catch (switchError) {
      if (switchError.code === 4902 || switchError.code === -32603) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x539',
              chainName: 'Ganache Local',
              rpcUrls: ['http://127.0.0.1:7545'],
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 }
            }],
          });
        } catch (addError) {
          alert('Error adding network: ' + addError.message);
        }
      } else {
        alert('Error switching network: ' + switchError.message);
      }
    }

    window.ethereum.on('accountsChanged', (accs) => {
      walletAddress = accs[0] || null;
      updateWalletUI(walletAddress);
    });
    alert("Connection successful!");
    return provider;
  } catch (err) {
    alert('Connection error: ' + err.message);
    console.error('Wallet connection failed:', err);
    return null;
  }
}

function updateWalletUI(address) {
  const dot   = document.getElementById('walletDot');
  const label = document.getElementById('walletLabel');
  if (address) {
    dot.classList.add('connected');
    label.textContent = address.slice(0, 6) + '...' + address.slice(-4);
  } else {
    dot.classList.remove('connected');
    label.textContent = 'Connect Wallet';
  }
}

async function getSignerAndProvider() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
  await provider.send('eth_requestAccounts', []);
  walletAddress = (await provider.listAccounts())[0];
  updateWalletUI(walletAddress);
  return { provider, signer: provider.getSigner() };
}


// ─── UI Helpers ───────────────────────────────────────────────────────────────

function setLoading(btnId, spinnerId, loading, label) {
  const btn = document.getElementById(btnId);
  const sp  = document.getElementById(spinnerId);
  btn.disabled = loading;
  sp.style.display = loading ? 'inline-block' : 'none';
  if (!loading && label) btn.childNodes[0].textContent = label;
}

function showAlert(id, type, html) {
  const el = document.getElementById(id);
  el.className = `alert alert-${type} show`;
  el.innerHTML = html;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  el.className = 'alert';
  el.innerHTML = '';
}

function parseContractError(err) {
  const raw = err?.message || err?.stack || '';
  const parts = raw.split('____');
  if (parts.length >= 2) return parts[1].trim();
  return 'Transaction failed. Error: ' + raw.substring(0, 300);
}

function statusBadge(status) {
  const clean = (status || 'unknown').toLowerCase().replace(' ', '_');
  const icons = { active:'🟢', paid:'💙', failed:'🔴', pending_refund:'🟡', cancel:'⚫' };
  return `<span class="status-badge status-${clean}">${icons[clean] || '⚪'} ${status}</span>`;
}

function fieldErr(id, show, msg = 'This field is required.') {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = show ? 'block' : 'none';
  if (msg) el.textContent = msg;
}

function clearFieldErrors(...ids) { ids.forEach(id => fieldErr(id, false)); }


// ─── CONTRACT FACTORIES ───────────────────────────────────────────────────────

async function getStudentContract() {
  const { signer } = await getSignerAndProvider();
  return new ethers.Contract(CONTRACT_ADDRESSES.student, ABI_STUDENT, signer);
}

async function getProviderContract() {
  const { signer } = await getSignerAndProvider();
  return new ethers.Contract(CONTRACT_ADDRESSES.provider, ABI_PROVIDER, signer);
}

async function getStaffContract() {
  const { signer } = await getSignerAndProvider();
  return new ethers.Contract(CONTRACT_ADDRESSES.staff, ABI_STAFF, signer);
}


// =============================================================================
// STUDENT FUNCTIONS
// =============================================================================

async function registerStudent() {
  const id = document.getElementById('stuId').value.trim();
  const fn = document.getElementById('stuFirst').value.trim();
  const ln = document.getElementById('stuLast').value.trim();

  clearFieldErrors('stuIdErr', 'stuFirstErr', 'stuLastErr');
  hideAlert('stuAlert');

  let valid = true;
  if (!id || Number(id) <= 0)  { fieldErr('stuIdErr',    true, 'Please enter a valid numeric ID > 0.'); valid = false; }
  if (!fn)                      { fieldErr('stuFirstErr', true); valid = false; }
  if (!ln)                      { fieldErr('stuLastErr',  true); valid = false; }
  if (!valid) return;

  setLoading('stuSubmitBtn', 'stuSpinner', true);
  try {
    const contract = await getStudentContract();
    const tx = await contract.addStuRecords(id, fn, ln);
    await tx.wait();
    showAlert('stuAlert', 'success', `<strong>✅ Registered!</strong> Student <strong>${fn} ${ln}</strong> (ID: ${id}) has been saved to the blockchain.`);
    document.getElementById('stuId').value = '';
    document.getElementById('stuFirst').value = '';
    document.getElementById('stuLast').value = '';
  } catch (err) {
    showAlert('stuAlert', 'danger', `<strong>❌ Failed:</strong> ${parseContractError(err)}`);
    console.error(err);
  }
  setLoading('stuSubmitBtn', 'stuSpinner', false, 'Register Student');
}

async function lookupStudent() {
  const id = document.getElementById('stuLookupId').value.trim();
  hideAlert('stuLookupAlert');
  document.getElementById('stuLookupResult').innerHTML = '';

  if (!id || Number(id) <= 0) {
    showAlert('stuLookupAlert', 'danger', '<strong>Error:</strong> Please enter a valid Student ID.');
    return;
  }

  setLoading('stuLookupBtn', 'stuLookupSpinner', true);
  try {
    const contract = await getStudentContract();
    const [rid, first, last, addr] = await contract.getStuDetails(id);
    if (Number(rid) === 0) {
      showAlert('stuLookupAlert', 'warning', '<strong>Not Found:</strong> No student registered with this ID.');
    } else {
      document.getElementById('stuLookupResult').innerHTML = `
        <div class="record-grid">
          <div class="record-field"><div class="record-field-label">Student ID</div><div class="record-field-value">${rid}</div></div>
          <div class="record-field"><div class="record-field-label">First Name</div><div class="record-field-value">${first}</div></div>
          <div class="record-field"><div class="record-field-label">Last Name</div><div class="record-field-value">${last}</div></div>
          <div class="record-field" style="grid-column:1/-1"><div class="record-field-label">Wallet Address</div><div class="record-field-value">${addr}</div></div>
        </div>`;
    }
  } catch (err) {
    showAlert('stuLookupAlert', 'danger', `<strong>Error:</strong> ${parseContractError(err)}`);
  }
  setLoading('stuLookupBtn', 'stuLookupSpinner', false, 'Look Up');
}


// =============================================================================
// PROVIDER FUNCTIONS
// =============================================================================

async function addScholarship() {
  const id  = document.getElementById('provStuId').value.trim();
  const nm  = document.getElementById('provName').value.trim();
  const amt = document.getElementById('provAmt').value.trim();
  const att = document.getElementById('provAtt').value.trim();
  const mk  = document.getElementById('provMark').value.trim();

  clearFieldErrors('provStuIdErr','provNameErr','provAmtErr','provAttErr','provMarkErr');
  hideAlert('provAddAlert');

  let valid = true;
  if (!id || Number(id) <= 0)                     { fieldErr('provStuIdErr', true, 'Valid ID required.'); valid = false; }
  if (!nm)                                          { fieldErr('provNameErr',  true); valid = false; }
  if (!amt || Number(amt) <= 0)                     { fieldErr('provAmtErr',   true, 'Amount must be > 0 Wei.'); valid = false; }
  if (att === '' || att < 0 || att > 100)           { fieldErr('provAttErr',   true, 'Enter a value between 0–100.'); valid = false; }
  if (mk  === '' || mk  < 0 || mk  > 100)           { fieldErr('provMarkErr',  true, 'Enter a value between 0–100.'); valid = false; }
  if (!valid) return;

  setLoading('provAddBtn', 'provAddSpinner', true);
  try {
    const contract = await getProviderContract();
    const tx = await contract.addSchlRecords(id, nm, amt, att, mk, { value: amt });
    await tx.wait();
    showAlert('provAddAlert', 'success', `<strong>✅ Scholarship Added!</strong> <strong>${nm}</strong> for Student ID <strong>${id}</strong> — ${amt} Wei sent to escrow.`);
    ['provStuId','provName','provAmt','provAtt','provMark'].forEach(i => document.getElementById(i).value = '');
  } catch (err) {
    showAlert('provAddAlert', 'danger', `<strong>❌ Failed:</strong> ${parseContractError(err)}`);
    console.error(err);
  }
  setLoading('provAddBtn', 'provAddSpinner', false, 'Submit & Fund');
}

async function cancelScholarship() {
  const id = document.getElementById('provCancelId').value.trim();
  hideAlert('provCancelAlert');
  fieldErr('provCancelIdErr', false);

  if (!id || Number(id) <= 0) { fieldErr('provCancelIdErr', true, 'Valid ID required.'); return; }

  setLoading('provCancelBtn', 'provCancelSpinner', true);
  try {
    const contract = await getProviderContract();
    const tx = await contract.cancelScholarship(id);
    await tx.wait();
    showAlert('provCancelAlert', 'success', `<strong>✅ Cancelled!</strong> Scholarship for Student ID <strong>${id}</strong> is now pending refund.`);
    document.getElementById('provCancelId').value = '';
  } catch (err) {
    showAlert('provCancelAlert', 'danger', `<strong>❌ Failed:</strong> ${parseContractError(err)}`);
    console.error(err);
  }
  setLoading('provCancelBtn', 'provCancelSpinner', false, 'Cancel Scholarship');
}

async function lookupScholarship() {
  const id = document.getElementById('provLookupId').value.trim();
  hideAlert('provLookupAlert');
  document.getElementById('provLookupResult').innerHTML = '';

  if (!id || Number(id) <= 0) {
    showAlert('provLookupAlert', 'danger', '<strong>Error:</strong> Please enter a valid Student ID.');
    return;
  }

  setLoading('provLookupBtn', 'provLookupSpinner', true);
  try {
    const contract = await getProviderContract();
    const [rid, amount, provider, att, mark, status] = await contract.getSchlDetails(id);
    if (Number(rid) === 0) {
      showAlert('provLookupAlert', 'warning', '<strong>Not Found:</strong> No scholarship found for this Student ID.');
    } else {
      document.getElementById('provLookupResult').innerHTML = `
        <div class="record-grid">
          <div class="record-field"><div class="record-field-label">Student ID</div><div class="record-field-value">${rid}</div></div>
          <div class="record-field"><div class="record-field-label">Status</div><div class="record-field-value">${statusBadge(status)}</div></div>
          <div class="record-field"><div class="record-field-label">Amount (Wei)</div><div class="record-field-value">${amount.toString()}</div></div>
          <div class="record-field"><div class="record-field-label">Min. Attendance</div><div class="record-field-value">${att}%</div></div>
          <div class="record-field"><div class="record-field-label">Min. Avg Mark</div><div class="record-field-value">${mark}/100</div></div>
          <div class="record-field" style="grid-column:1/-1"><div class="record-field-label">Provider Wallet</div><div class="record-field-value">${provider}</div></div>
        </div>`;
    }
  } catch (err) {
    showAlert('provLookupAlert', 'danger', `<strong>Error:</strong> ${parseContractError(err)}`);
  }
  setLoading('provLookupBtn', 'provLookupSpinner', false, 'Look Up');
}


// =============================================================================
// STAFF FUNCTIONS
// =============================================================================

async function submitResult() {
  const id  = document.getElementById('staffId').value.trim();
  const att = document.getElementById('staffAtt').value.trim();
  const mk  = document.getElementById('staffMark').value.trim();

  clearFieldErrors('staffIdErr','staffAttErr','staffMarkErr');
  hideAlert('staffPayAlert');

  let valid = true;
  if (!id || Number(id) <= 0)           { fieldErr('staffIdErr',   true, 'Valid ID required.'); valid = false; }
  if (att === '' || att < 0 || att > 100) { fieldErr('staffAttErr',  true, 'Enter 0–100.'); valid = false; }
  if (mk  === '' || mk  < 0 || mk  > 100) { fieldErr('staffMarkErr', true, 'Enter 0–100.'); valid = false; }
  if (!valid) return;

  setLoading('staffPayBtn', 'staffPaySpinner', true);
  try {
    const contract = await getStaffContract();
    const tx = await contract.resultNpay(id, att, mk);
    await tx.wait();
    const status = await contract.viewStatus(id);
    if (status === 'paid') {
      showAlert('staffPayAlert', 'success', `<strong>✅ Disbursed!</strong> Scholarship for Student ID <strong>${id}</strong> has been paid directly to the student's wallet.`);
    } else if (status === 'failed') {
      showAlert('staffPayAlert', 'warning', `<strong>⚠️ Not Met:</strong> Student ID <strong>${id}</strong> did not meet the attendance/mark requirements. Scholarship marked as <strong>failed</strong>.`);
    } else {
      showAlert('staffPayAlert', 'danger', `<strong>Unexpected status:</strong> ${status}`);
    }
    ['staffId','staffAtt','staffMark'].forEach(i => document.getElementById(i).value = '');
  } catch (err) {
    showAlert('staffPayAlert', 'danger', `<strong>❌ Failed:</strong> ${parseContractError(err)}`);
    console.error(err);
  }
  setLoading('staffPayBtn', 'staffPaySpinner', false, 'Submit & Disburse');
}

async function processRefund() {
  const id = document.getElementById('staffRefundId').value.trim();
  hideAlert('staffRefundAlert');
  fieldErr('staffRefundIdErr', false);

  if (!id || Number(id) <= 0) { fieldErr('staffRefundIdErr', true, 'Valid ID required.'); return; }

  setLoading('staffRefundBtn', 'staffRefundSpinner', true);
  try {
    const contract = await getStaffContract();
    const tx = await contract.processRefund(id);
    await tx.wait();
    showAlert('staffRefundAlert', 'success', `<strong>✅ Refunded!</strong> Scholarship funds for Student ID <strong>${id}</strong> returned to the provider's wallet.`);
    document.getElementById('staffRefundId').value = '';
  } catch (err) {
    showAlert('staffRefundAlert', 'danger', `<strong>❌ Failed:</strong> ${parseContractError(err)}`);
    console.error(err);
  }
  setLoading('staffRefundBtn', 'staffRefundSpinner', false, 'Process Refund');
}

async function activateScholarship() {
  const id = document.getElementById('staffActivateId').value.trim();
  hideAlert('staffActivateAlert');
  fieldErr('staffActivateIdErr', false);

  if (!id || Number(id) <= 0) { fieldErr('staffActivateIdErr', true, 'Valid ID required.'); return; }

  setLoading('staffActivateBtn', 'staffActivateSpinner', true);
  try {
    const contract = await getStaffContract();
    const tx = await contract.processActivation(id);
    await tx.wait();
    showAlert('staffActivateAlert', 'success', `<strong>✅ Activated!</strong> Scholarship for Student ID <strong>${id}</strong> is active again. Staff can re-submit results.`);
    document.getElementById('staffActivateId').value = '';
  } catch (err) {
    showAlert('staffActivateAlert', 'danger', `<strong>❌ Failed:</strong> ${parseContractError(err)}`);
    console.error(err);
  }
  setLoading('staffActivateBtn', 'staffActivateSpinner', false, 'Activate');
}

async function checkStatus() {
  const id = document.getElementById('staffStatusId').value.trim();
  hideAlert('staffStatusAlert');
  document.getElementById('staffStatusResult').innerHTML = '';
  fieldErr('staffStatusIdErr', false);

  if (!id || Number(id) <= 0) { fieldErr('staffStatusIdErr', true, 'Valid ID required.'); return; }

  setLoading('staffStatusBtn', 'staffStatusSpinner', true);
  try {
    const contract = await getStaffContract();
    const status = await contract.viewStatus(id);
    if (!status) {
      showAlert('staffStatusAlert', 'warning', '<strong>Not Found:</strong> No scholarship found for this Student ID.');
    } else {
      document.getElementById('staffStatusResult').innerHTML = `
        <div style="margin-top:14px; display:flex; align-items:center; gap:12px;">
          <span style="font-size:14px; color:var(--muted);">Current Status:</span>
          ${statusBadge(status)}
        </div>`;
    }
  } catch (err) {
    showAlert('staffStatusAlert', 'danger', `<strong>Error:</strong> ${parseContractError(err)}`);
  }
  setLoading('staffStatusBtn', 'staffStatusSpinner', false, 'Check Status');
}


// ─── Init ─────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  // Auto-detect if MetaMask already connected
  if (window.ethereum) {
    window.ethereum.request({ method: 'eth_accounts' }).then(accs => {
      if (accs.length > 0) { walletAddress = accs[0]; updateWalletUI(walletAddress); }
    });
    window.ethereum.on('accountsChanged', (accs) => {
      walletAddress = accs[0] || null;
      updateWalletUI(walletAddress);
    });
  }
});
