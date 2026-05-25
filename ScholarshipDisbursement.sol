// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0 <0.9.0;

// =============================================================================
// ScholarshipDisbursement — Improved Version
// =============================================================================
// Three contracts working together:
//   1. StuDetails       — Student identity registry
//   2. ScholarDetails   — Scholarship funding & status management
//   3. Staff            — Result submission & automatic payment engine
//
// Deployment order:
//   1. Deploy StuDetails                                  → copy address (A)
//   2. Deploy ScholarDetails(A)                           → copy address (B)
//   3. Deploy Staff(A, B)                                 → copy address (C)
//   4. Call ScholarDetails.storeContractAdd(C)            → links Staff contract
// =============================================================================


// =============================================================================
// CONTRACT 1: StuDetails
// Stores student identity. The student's wallet address is auto-captured from
// msg.sender when they register, enabling direct payment later.
// =============================================================================
contract StuDetails {

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new student is successfully registered.
    event StudentRegistered(
        uint256 indexed ID,
        address indexed wallet,
        string firstName,
        string lastName
    );

    // -------------------------------------------------------------------------
    // Data structures
    // -------------------------------------------------------------------------

    struct Student {
        uint256 ID;
        string  FirstName;
        string  LastName;
        address payable Address; // auto-captured from msg.sender at registration
    }

    /// @dev Primary storage: lookup by student ID in O(1)
    mapping(uint256 => Student) internal stuRecords;


    // -------------------------------------------------------------------------
    // Write functions
    // -------------------------------------------------------------------------

    /**
     * @notice Register a new student on the blockchain.
     *         The caller's wallet address is automatically saved and will be
     *         used later as the scholarship payment destination.
     * @param _ID        Unique numeric student ID (must be > 0)
     * @param _FirstName Student's first name (must not be empty)
     * @param _LastName  Student's last name (must not be empty)
     */
    function addStuRecords(
        uint256 _ID,
        string memory _FirstName,
        string memory _LastName
    ) public {
        require(_ID > 0,
            "____ID must be greater than zero____");
        require(bytes(_FirstName).length > 0,
            "____First name cannot be empty____");
        require(bytes(_LastName).length > 0,
            "____Last name cannot be empty____");
        require(stuRecords[_ID].ID != _ID,
            "____Student ID already registered and cannot be altered____");

        stuRecords[_ID] = Student({
            ID:        _ID,
            FirstName: _FirstName,
            LastName:  _LastName,
            Address:   payable(msg.sender)
        });

        emit StudentRegistered(_ID, msg.sender, _FirstName, _LastName);
    }

    // -------------------------------------------------------------------------
    // Read functions
    // -------------------------------------------------------------------------

    /**
     * @notice Retrieve a student's full record by their ID.
     * @param _ID The student's numeric ID
     * @return ID        The stored student ID (returns 0 if not found)
     * @return FirstName Student's first name
     * @return LastName  Student's last name
     * @return Address   Student's payable wallet address
     */
    function getStuDetails(uint256 _ID)
        public
        view
        returns (uint256, string memory, string memory, address payable)
    {
        Student memory s = stuRecords[_ID];
        return (s.ID, s.FirstName, s.LastName, s.Address);
    }
}


// =============================================================================
// CONTRACT 2: ScholarDetails
// Manages scholarship creation, cancellation and status lifecycle.
// On creation, the scholarship ETH is immediately forwarded to the Staff
// contract which acts as the escrow/payment engine.
// =============================================================================
contract ScholarDetails {

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a scholarship is successfully created.
    event ScholarshipAdded(
        uint256 indexed studentID,
        string  scholarshipName,
        uint256 amount,
        address indexed provider,
        uint256 attendanceRequired,
        uint256 markRequired
    );

    /// @notice Emitted when a provider cancels their scholarship.
    event ScholarshipCancelled(uint256 indexed studentID, address indexed provider);

    /// @notice Emitted whenever the scholarship status string changes.
    event ScholarshipStatusUpdated(uint256 indexed studentID, string newStatus);

    /// @notice Emitted when ETH is received directly by this contract.
    event ReceivedEth(uint256 amount);


    // -------------------------------------------------------------------------
    // State variables
    // -------------------------------------------------------------------------

    address          StuContractAdd;
    address payable  StaffContractAdd;

    struct Scholarship {
        uint256 ID;
        string  ScholarshipName;
        uint256 Amount;        // in Wei
        address Provider;      // auto-captured from msg.sender
        uint256 Attendance;    // minimum attendance % required (0-100)
        uint256 AvgMark;       // minimum average mark required  (0-100)
        string  Status;        // active | pending_refund | paid | failed | cancel
    }

    mapping(uint256 => Scholarship) internal schlRecords;


    // -------------------------------------------------------------------------
    // Constructor & setup
    // -------------------------------------------------------------------------

    /**
     * @notice Deploy the ScholarDetails contract, linking the Student contract.
     * @param _StuContractAdd Address of the already-deployed StuDetails contract
     */
    constructor(address _StuContractAdd) payable {
        StuContractAdd = _StuContractAdd;
    }

    /**
     * @notice Store the Staff contract address (call this after deploying Staff).
     * @param _StaffContractAdd Address of the already-deployed Staff contract
     */
    function storeContractAdd(address payable _StaffContractAdd) public {
        StaffContractAdd = _StaffContractAdd;
    }

    // Accept plain ETH transfers
    receive()  external payable { emit ReceivedEth(msg.value); }
    fallback() external payable { emit ReceivedEth(msg.value); }


    // -------------------------------------------------------------------------
    // Write functions
    // -------------------------------------------------------------------------

    /**
     * @notice Create a new scholarship for a registered student.
     *         The exact scholarship amount in Wei must be sent as msg.value.
     *         Funds are immediately forwarded to the Staff contract for escrow.
     * @param _ID               Numeric student ID (must exist in StuDetails)
     * @param _ScholarshipName  Name / label of the scholarship
     * @param _Amount           Scholarship amount in Wei (must equal msg.value)
     * @param _Attendance       Minimum attendance percentage required (0–100)
     * @param _AvgMark          Minimum average mark required (0–100)
     */
    function addSchlRecords(
        uint256 _ID,
        string  memory _ScholarshipName,
        uint256 _Amount,
        uint256 _Attendance,
        uint256 _AvgMark
    ) payable public {
        require(_ID > 0,
            "____ID must be greater than zero____");
        require(bytes(_ScholarshipName).length > 0,
            "____Scholarship name cannot be empty____");
        require(_Amount > 0,
            "____Amount must be greater than zero____");
        require(_Attendance <= 100,
            "____Attendance requirement cannot exceed 100____");
        require(_AvgMark <= 100,
            "____Average mark requirement cannot exceed 100____");
        require(_Amount <= address(this).balance,
            "____This wallet does not have enough balance to offer the scholarship____");

        // Verify the student is registered
        StuDetails stu = StuDetails(StuContractAdd);
        (uint256 stuID, , ,) = stu.getStuDetails(_ID);
        require(_ID == stuID,
            "____The student ID entered is not found____");

        // Record the scholarship
        schlRecords[_ID] = Scholarship({
            ID:             _ID,
            ScholarshipName: _ScholarshipName,
            Amount:         _Amount,
            Provider:       msg.sender,
            Attendance:     _Attendance,
            AvgMark:        _AvgMark,
            Status:         "active"
        });

        // Forward ETH to Staff contract (escrow)
        StaffContractAdd.transfer(_Amount);

        emit ScholarshipAdded(_ID, _ScholarshipName, _Amount, msg.sender, _Attendance, _AvgMark);
    }

    /**
     * @notice Cancel an active scholarship.
     *         Only the wallet that created the scholarship can cancel it.
     *         ETH is NOT returned immediately — staff must call processRefund().
     * @param _ID Student ID linked to the scholarship to cancel
     */
    function cancelScholarship(uint256 _ID) public {
        Scholarship storage s = schlRecords[_ID];
        require(s.ID == _ID,
            "____The student ID entered is either not found or no scholarship____");
        require(s.Provider == msg.sender,
            "____Only the scholarship owner can cancel the scholarship____");
        require(
            keccak256(abi.encodePacked(s.Status)) == keccak256(abi.encodePacked("active")),
            "____The scholarship is already cancelled, no further cancellation needed____"
        );

        s.Status = "pending_refund";
        emit ScholarshipCancelled(_ID, msg.sender);
    }


    // -------------------------------------------------------------------------
    // Read functions
    // -------------------------------------------------------------------------

    /**
     * @notice Get all scholarship details for a student.
     * @param _ID Student ID
     * @return studentID, amount, provider address, attendanceRequired, markRequired, status
     */
    function getSchlDetails(uint256 _ID)
        public
        view
        returns (uint256, uint256, address payable, uint256, uint256, string memory)
    {
        Scholarship memory s = schlRecords[_ID];
        return (s.ID, s.Amount, payable(s.Provider), s.Attendance, s.AvgMark, s.Status);
    }

    /**
     * @notice Get just the status string for a scholarship.
     * @param _ID Student ID
     * @return Status string: active | pending_refund | paid | failed | cancel
     */
    function getStatus(uint256 _ID) public view returns (string memory) {
        return schlRecords[_ID].Status;
    }


    // -------------------------------------------------------------------------
    // Internal status updaters — called only by Staff contract
    // -------------------------------------------------------------------------

    /// @notice Mark scholarship as cancelled (called after refund is processed)
    function updStatCancel(uint256 _ID) public {
        schlRecords[_ID].Status = "cancel";
        emit ScholarshipStatusUpdated(_ID, "cancel");
    }

    /// @notice Mark scholarship as paid (called after student payment succeeds)
    function updStatPaid(uint256 _ID) public {
        schlRecords[_ID].Status = "paid";
        emit ScholarshipStatusUpdated(_ID, "paid");
    }

    /// @notice Mark scholarship as failed (student did not meet requirements)
    function updStatFailed(uint256 _ID) public {
        schlRecords[_ID].Status = "failed";
        emit ScholarshipStatusUpdated(_ID, "failed");
    }

    /// @notice Re-activate a failed scholarship for re-submission
    function updStatActive(uint256 _ID) public {
        schlRecords[_ID].Status = "active";
        emit ScholarshipStatusUpdated(_ID, "active");
    }
}


// =============================================================================
// CONTRACT 3: Staff
// The payment engine. Receives ETH from ScholarDetails (escrow), verifies
// student results against scholarship requirements, and automatically
// transfers ETH to the student or refunds the provider.
// =============================================================================
contract Staff {

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a scholarship is successfully paid to a student.
    event ScholarshipPaid(
        uint256 indexed studentID,
        address indexed recipient,
        uint256 amount
    );

    /// @notice Emitted when a student fails to meet scholarship requirements.
    event ScholarshipFailed(
        uint256 indexed studentID,
        uint256 actualAttendance,
        uint256 actualMark,
        uint256 requiredAttendance,
        uint256 requiredMark
    );

    /// @notice Emitted when a refund is sent back to the scholarship provider.
    event RefundProcessed(
        uint256 indexed studentID,
        address indexed provider,
        uint256 amount
    );

    /// @notice Emitted when a failed scholarship is re-activated.
    event ScholarshipActivated(uint256 indexed studentID);

    /// @notice Emitted when ETH is received directly by this contract.
    event ReceivedEth(uint256 amount);


    // -------------------------------------------------------------------------
    // State variables
    // -------------------------------------------------------------------------

    address          StuContractAdd;
    address payable  SchlContractAdd;

    struct Result {
        uint256 ID;
        uint256 Attendance;
        uint256 AvgMark;
    }

    mapping(uint256 => Result) internal rsltRecords;


    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * @notice Deploy the Staff contract linking both other contracts.
     * @param _StuContractAdd  Address of the already-deployed StuDetails contract
     * @param _SchlContractAdd Address of the already-deployed ScholarDetails contract
     */
    constructor(address _StuContractAdd, address _SchlContractAdd) payable {
        StuContractAdd  = _StuContractAdd;
        SchlContractAdd = payable(_SchlContractAdd);
    }

    // Accept plain ETH transfers (scholarship funds flow in here)
    receive()  external payable { emit ReceivedEth(msg.value); }
    fallback() external payable { emit ReceivedEth(msg.value); }


    // -------------------------------------------------------------------------
    // Write functions
    // -------------------------------------------------------------------------

    /**
     * @notice Submit a student's results and trigger automatic disbursement.
     *         If attendance AND average mark both meet the scholarship thresholds,
     *         the full scholarship amount is transferred directly to the student's
     *         registered wallet. Otherwise the scholarship is marked "failed".
     * @param _ID          Student ID (must have an active scholarship)
     * @param _Attendance  Student's actual attendance percentage (0–100)
     * @param _AvgMark     Student's actual average mark (0–100)
     */
    function resultNpay(
        uint256 _ID,
        uint256 _Attendance,
        uint256 _AvgMark
    ) payable public {
        require(_ID > 0,
            "____ID must be greater than zero____");
        require(_Attendance <= 100,
            "____Attendance value cannot exceed 100____");
        require(_AvgMark <= 100,
            "____Average mark value cannot exceed 100____");

        // Store the result record
        rsltRecords[_ID] = Result(_ID, _Attendance, _AvgMark);

        // Fetch student wallet from StuDetails contract
        StuDetails stu = StuDetails(StuContractAdd);
        (, , , address payable receiver) = stu.getStuDetails(_ID);

        // Fetch scholarship requirements from ScholarDetails contract
        ScholarDetails sc = ScholarDetails(SchlContractAdd);
        (uint256 id, uint256 payAmt, , uint256 reqAtt, uint256 reqMark, string memory status)
            = sc.getSchlDetails(_ID);

        require(_ID == id,
            "____The student ID entered is either not found or no scholarship____");
        require(
            keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked("active")),
            "____The scholarship is not active____"
        );

        if (reqAtt > _Attendance || reqMark > _AvgMark) {
            // Requirements not met — mark as failed, no payment
            sc.updStatFailed(_ID);
            emit ScholarshipFailed(_ID, _Attendance, _AvgMark, reqAtt, reqMark);
        } else {
            // Requirements met — disburse scholarship to student
            require(payAmt <= address(this).balance,
                "____This wallet does not have enough balance to pay to student____");
            receiver.transfer(payAmt);
            sc.updStatPaid(_ID);
            emit ScholarshipPaid(_ID, receiver, payAmt);
        }
    }

    /**
     * @notice Process a refund to the scholarship provider for a cancelled scholarship.
     *         The provider must have first called cancelScholarship() on ScholarDetails
     *         (status must be "pending_refund").
     * @param _ID Student ID linked to the scholarship to refund
     */
    function processRefund(uint256 _ID) payable public {
        ScholarDetails sc = ScholarDetails(SchlContractAdd);
        (uint256 id, uint256 payAmt, address payable provider, , , string memory status)
            = sc.getSchlDetails(_ID);

        require(_ID == id,
            "____The student ID entered is either not found or no scholarship____");
        require(
            keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked("pending_refund")),
            "____No refund pending____"
        );
        require(payAmt <= address(this).balance,
            "____This wallet does not have enough balance to perform refund____");

        provider.transfer(payAmt);
        sc.updStatCancel(_ID);
        emit RefundProcessed(_ID, provider, payAmt);
    }

    /**
     * @notice Re-activate a failed scholarship so results can be re-submitted.
     *         The scholarship status must currently be "failed".
     * @param _ID Student ID linked to the failed scholarship
     */
    function processActivation(uint256 _ID) public {
        ScholarDetails sc = ScholarDetails(SchlContractAdd);
        (uint256 id, , , , , string memory status) = sc.getSchlDetails(_ID);

        require(_ID == id,
            "____The student ID entered is either not found or no scholarship____");
        require(
            keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked("failed")),
            "____The scholarship is not in failed status, no activation required____"
        );

        sc.updStatActive(_ID);
        emit ScholarshipActivated(_ID);
    }


    // -------------------------------------------------------------------------
    // Read functions
    // -------------------------------------------------------------------------

    /**
     * @notice View the current scholarship status for a student (proxied from ScholarDetails).
     * @param _ID Student ID
     * @return Status string: active | paid | failed | pending_refund | cancel
     */
    function viewStatus(uint256 _ID) public view returns (string memory) {
        ScholarDetails sc = ScholarDetails(SchlContractAdd);
        return sc.getStatus(_ID);
    }
}
