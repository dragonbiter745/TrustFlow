// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TrustFlowEscrow {
    enum EscrowStatus { FUNDED, WORK_SUBMITTED, RELEASED, DISPUTED, REFUNDED }

    struct Escrow {
        uint256 id;
        address payable client;
        address payable freelancer;
        uint256 amount;
        string projectTitle;
        string milestoneDescription;
        string githubRepo;
        EscrowStatus status;
        string workProof; // JSON: {commitHash, prLink, repoLink}
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 public nextEscrowId = 1;
    mapping(uint256 => Escrow) public escrows;
    mapping(address => uint256[]) public clientEscrows;
    mapping(address => uint256[]) public freelancerEscrows;

    uint256 public platformFeePercent = 1; // 1%
    address public owner;

    event EscrowCreated(uint256 indexed id, address indexed client, address indexed freelancer, uint256 amount, string projectTitle);
    event WorkSubmitted(uint256 indexed id, string workProof);
    event FundsReleased(uint256 indexed id, address indexed freelancer, uint256 amount);
    event DisputeRaised(uint256 indexed id, address indexed raisedBy);
    event EscrowRefunded(uint256 indexed id, address indexed client, uint256 amount);

    modifier onlyClient(uint256 escrowId) {
        require(escrows[escrowId].client == msg.sender, "Not the client");
        _;
    }

    modifier onlyFreelancer(uint256 escrowId) {
        require(escrows[escrowId].freelancer == msg.sender, "Not the freelancer");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createEscrow(
        address payable _freelancer,
        string calldata _projectTitle,
        string calldata _milestoneDescription,
        string calldata _githubRepo
    ) external payable returns (uint256) {
        require(msg.value > 0, "Must send ETH");
        require(_freelancer != address(0), "Invalid freelancer");
        require(_freelancer != msg.sender, "Client and freelancer must differ");

        uint256 id = nextEscrowId++;
        escrows[id] = Escrow({
            id: id,
            client: payable(msg.sender),
            freelancer: _freelancer,
            amount: msg.value,
            projectTitle: _projectTitle,
            milestoneDescription: _milestoneDescription,
            githubRepo: _githubRepo,
            status: EscrowStatus.FUNDED,
            workProof: "",
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        clientEscrows[msg.sender].push(id);
        freelancerEscrows[_freelancer].push(id);

        emit EscrowCreated(id, msg.sender, _freelancer, msg.value, _projectTitle);
        return id;
    }

    function submitWork(
        uint256 escrowId,
        string calldata _workProof
    ) external onlyFreelancer(escrowId) {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.FUNDED, "Escrow not in FUNDED state");

        e.status = EscrowStatus.WORK_SUBMITTED;
        e.workProof = _workProof;
        e.updatedAt = block.timestamp;

        emit WorkSubmitted(escrowId, _workProof);
    }

    function approveRelease(uint256 escrowId) external onlyClient(escrowId) {
        Escrow storage e = escrows[escrowId];
        require(
            e.status == EscrowStatus.WORK_SUBMITTED || e.status == EscrowStatus.FUNDED,
            "Cannot release in current state"
        );

        uint256 fee = (e.amount * platformFeePercent) / 100;
        uint256 payout = e.amount - fee;

        e.status = EscrowStatus.RELEASED;
        e.updatedAt = block.timestamp;

        e.freelancer.transfer(payout);
        payable(owner).transfer(fee);

        emit FundsReleased(escrowId, e.freelancer, payout);
    }

    function raiseDispute(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];
        require(
            msg.sender == e.client || msg.sender == e.freelancer,
            "Not a party to this escrow"
        );
        require(
            e.status == EscrowStatus.FUNDED || e.status == EscrowStatus.WORK_SUBMITTED,
            "Cannot dispute in current state"
        );

        e.status = EscrowStatus.DISPUTED;
        e.updatedAt = block.timestamp;

        emit DisputeRaised(escrowId, msg.sender);
    }

    function resolveDispute(uint256 escrowId, bool refundClient) external onlyOwner {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.DISPUTED, "Not in dispute");

        if (refundClient) {
            e.status = EscrowStatus.REFUNDED;
            e.client.transfer(e.amount);
            emit EscrowRefunded(escrowId, e.client, e.amount);
        } else {
            uint256 fee = (e.amount * platformFeePercent) / 100;
            uint256 payout = e.amount - fee;
            e.status = EscrowStatus.RELEASED;
            e.freelancer.transfer(payout);
            payable(owner).transfer(fee);
            emit FundsReleased(escrowId, e.freelancer, payout);
        }
        e.updatedAt = block.timestamp;
    }

    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    function getClientEscrows(address client) external view returns (uint256[] memory) {
        return clientEscrows[client];
    }

    function getFreelancerEscrows(address freelancer) external view returns (uint256[] memory) {
        return freelancerEscrows[freelancer];
    }

    function setPlatformFee(uint256 _percent) external onlyOwner {
        require(_percent <= 5, "Max fee is 5%");
        platformFeePercent = _percent;
    }

    receive() external payable {}
}
