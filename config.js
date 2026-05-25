// =============================================================================
// config.js — Shared Configuration for ScholarshipDisbursement dApp
// =============================================================================
//
// HOW TO UPDATE AFTER DEPLOYING CONTRACTS:
//   1. Open Remix IDE (https://remix.ethereum.org)
//   2. Compile ScholarshipDisbursement.sol (Solidity 0.8.x)
//   3. Deploy to your network via MetaMask (Ganache, Goerli, etc.)
//   4. Copy each deployed contract address into CONTRACT_ADDRESSES below
//   5. Save this file and refresh the browser
//
// DEPLOYMENT ORDER:
//   Step 1 → Deploy StuDetails         (no constructor args)
//   Step 2 → Deploy ScholarDetails     (pass StuDetails address)
//   Step 3 → Deploy Staff              (pass StuDetails + ScholarDetails addresses)
//   Step 4 → Call ScholarDetails.storeContractAdd(Staff address)
// =============================================================================

const CONTRACT_ADDRESSES = {
  // TODO: Replace with your deployed StuDetails contract address
  student:  "0x5FbDB2315678afecb367f032d93F642f64180aa3",

  // TODO: Replace with your deployed ScholarDetails contract address
  provider: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",

  // TODO: Replace with your deployed Staff contract address
  staff:    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
};


// =============================================================================
// ABI — StuDetails Contract
// =============================================================================
const ABI_STUDENT = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "_ID",        "type": "uint256" },
      { "internalType": "string",  "name": "_FirstName", "type": "string"  },
      { "internalType": "string",  "name": "_LastName",  "type": "string"  }
    ],
    "name": "addStuRecords",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_ID", "type": "uint256" }
    ],
    "name": "getStuDetails",
    "outputs": [
      { "internalType": "uint256",         "name": "", "type": "uint256"  },
      { "internalType": "string",          "name": "", "type": "string"   },
      { "internalType": "string",          "name": "", "type": "string"   },
      { "internalType": "address payable", "name": "", "type": "address"  }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "ID",        "type": "uint256" },
      { "indexed": true,  "internalType": "address", "name": "wallet",    "type": "address" },
      { "indexed": false, "internalType": "string",  "name": "firstName", "type": "string"  },
      { "indexed": false, "internalType": "string",  "name": "lastName",  "type": "string"  }
    ],
    "name": "StudentRegistered",
    "type": "event"
  }
];


// =============================================================================
// ABI — ScholarDetails Contract
// =============================================================================
const ABI_PROVIDER = [
  // --- Write functions ---
  {
    "inputs": [
      { "internalType": "uint256", "name": "_ID",               "type": "uint256" },
      { "internalType": "string",  "name": "_ScholarshipName",  "type": "string"  },
      { "internalType": "uint256", "name": "_Amount",           "type": "uint256" },
      { "internalType": "uint256", "name": "_Attendance",       "type": "uint256" },
      { "internalType": "uint256", "name": "_AvgMark",          "type": "uint256" }
    ],
    "name": "addSchlRecords",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_ID", "type": "uint256" }
    ],
    "name": "cancelScholarship",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address payable", "name": "_StaffContractAdd", "type": "address" }
    ],
    "name": "storeContractAdd",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // --- Status updaters (called by Staff contract) ---
  {
    "inputs": [{ "internalType": "uint256", "name": "_ID", "type": "uint256" }],
    "name": "updStatActive",  "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_ID", "type": "uint256" }],
    "name": "updStatCancel",  "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_ID", "type": "uint256" }],
    "name": "updStatFailed",  "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_ID", "type": "uint256" }],
    "name": "updStatPaid",    "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  // --- Read functions ---
  {
    "inputs": [
      { "internalType": "uint256", "name": "_ID", "type": "uint256" }
    ],
    "name": "getSchlDetails",
    "outputs": [
      { "internalType": "uint256",         "name": "", "type": "uint256" },
      { "internalType": "uint256",         "name": "", "type": "uint256" },
      { "internalType": "address payable", "name": "", "type": "address" },
      { "internalType": "uint256",         "name": "", "type": "uint256" },
      { "internalType": "uint256",         "name": "", "type": "uint256" },
      { "internalType": "string",          "name": "", "type": "string"  }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_ID", "type": "uint256" }],
    "name": "getStatus",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  // --- Events ---
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "studentID",           "type": "uint256" },
      { "indexed": false, "internalType": "string",  "name": "scholarshipName",     "type": "string"  },
      { "indexed": false, "internalType": "uint256", "name": "amount",              "type": "uint256" },
      { "indexed": true,  "internalType": "address", "name": "provider",            "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "attendanceRequired",  "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "markRequired",        "type": "uint256" }
    ],
    "name": "ScholarshipAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "studentID", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "provider",  "type": "address" }
    ],
    "name": "ScholarshipCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "studentID", "type": "uint256" },
      { "indexed": false, "internalType": "string",  "name": "newStatus", "type": "string"  }
    ],
    "name": "ScholarshipStatusUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "ReceivedEth",
    "type": "event"
  },
  { "stateMutability": "payable", "type": "receive"  },
  { "stateMutability": "payable", "type": "fallback" },
  {
    "inputs": [{ "internalType": "address", "name": "_StuContractAdd", "type": "address" }],
    "stateMutability": "payable",
    "type": "constructor"
  }
];


// =============================================================================
// ABI — Staff Contract
// =============================================================================
const ABI_STAFF = [
  // --- Write functions ---
  {
    "inputs": [
      { "internalType": "uint256", "name": "_ID",         "type": "uint256" },
      { "internalType": "uint256", "name": "_Attendance", "type": "uint256" },
      { "internalType": "uint256", "name": "_AvgMark",    "type": "uint256" }
    ],
    "name": "resultNpay",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_ID", "type": "uint256" }],
    "name": "processRefund",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_ID", "type": "uint256" }],
    "name": "processActivation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // --- Read functions ---
  {
    "inputs": [{ "internalType": "uint256", "name": "_ID", "type": "uint256" }],
    "name": "viewStatus",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  // --- Events ---
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "studentID",  "type": "uint256" },
      { "indexed": true,  "internalType": "address", "name": "recipient",  "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount",     "type": "uint256" }
    ],
    "name": "ScholarshipPaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "studentID",          "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "actualAttendance",   "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "actualMark",         "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "requiredAttendance", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "requiredMark",       "type": "uint256" }
    ],
    "name": "ScholarshipFailed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "studentID", "type": "uint256" },
      { "indexed": true,  "internalType": "address", "name": "provider",  "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount",    "type": "uint256" }
    ],
    "name": "RefundProcessed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "studentID", "type": "uint256" }
    ],
    "name": "ScholarshipActivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "ReceivedEth",
    "type": "event"
  },
  { "stateMutability": "payable", "type": "receive"  },
  { "stateMutability": "payable", "type": "fallback" },
  {
    "inputs": [
      { "internalType": "address", "name": "_StuContractAdd",  "type": "address" },
      { "internalType": "address", "name": "_SchlContractAdd", "type": "address" }
    ],
    "stateMutability": "payable",
    "type": "constructor"
  }
];
