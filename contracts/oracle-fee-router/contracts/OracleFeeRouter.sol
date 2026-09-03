// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title OracleFeeRouter
/// @notice Atomic on-chain version of Oracle's performance-fee split.
///
/// @dev NOT YET INTEGRATED. BMONI's smart-wallet proposal API (verified
/// live against their sandbox — see apps/oracle-web/src/lib/bmoni.ts)
/// only supports plain ERC20 transfers to a fixed recipient (TRANSFER,
/// SWAP, and a handful of governance proposal types) — there is no
/// "call an arbitrary contract" proposal type today. So a BMONI smart
/// wallet cannot yet call `createIntent` or send funds to this router as
/// part of one atomic on-chain step; that would require BMONI to expose a
/// generic contract-call proposal, which isn't documented or observed in
/// their live API.
///
/// What's shipped today instead is apps/oracle-web's two-proposal split
/// (src/lib/fees.ts) — the same economic outcome using BMONI's existing
/// TRANSFER type twice, live-verified against their sandbox. This
/// contract is the atomic alternative for if/when BMONI adds contract-
/// call proposals, or for a non-BMONI EOA-based integration: deposit,
/// then settle in one call each, funds visible in the router's own
/// balance between the two rather than split invisibly inside a single
/// transaction. Designed and unit-tested locally (see test/); not
/// deployed to any network — no funded deployer key existed when this
/// was built. See this package's README before trusting it with funds.
///
/// Design: one pending intent per depositor at a time. This keeps
/// `settle` unambiguous without needing a token that supports
/// transfer hooks (ERC20 has none) — any balance increase while exactly
/// one intent is open can only be that intent's deposit, so `settle`
/// reads the router's own balance rather than trusting a caller-supplied
/// amount, closing the obvious "settle for more than was actually
/// deposited" griefing vector.
contract OracleFeeRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Intent {
        address depositor;
        address recipient;
        uint256 feeBps;
        bool settled;
    }

    uint256 public constant MAX_FEE_BPS = 1000; // 10% hard cap, enforced on-chain regardless of what a caller requests
    uint256 public constant BPS_DENOMINATOR = 10_000;

    address public feeTreasury;

    mapping(bytes32 => Intent) public intents;
    /// @dev depositor => the single intent id currently open for them, or bytes32(0) if none.
    mapping(address => bytes32) public openIntentOf;

    event FeeTreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event IntentCreated(bytes32 indexed intentId, address indexed depositor, address indexed recipient, uint256 feeBps);
    event IntentSettled(bytes32 indexed intentId, address indexed token, uint256 grossAmount, uint256 netAmount, uint256 feeAmount);
    event IntentCancelled(bytes32 indexed intentId);

    error FeeTooHigh(uint256 requestedBps, uint256 maxBps);
    error ZeroAddress();
    error IntentAlreadyOpen(bytes32 existingIntentId);
    error IntentNotFound();
    error IntentAlreadySettled();
    error NotIntentOwner();
    error NothingToSettle();

    constructor(address initialTreasury) Ownable(msg.sender) {
        if (initialTreasury == address(0)) revert ZeroAddress();
        feeTreasury = initialTreasury;
    }

    function setFeeTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit FeeTreasuryUpdated(feeTreasury, newTreasury);
        feeTreasury = newTreasury;
    }

    /// @notice Registers intent to deposit funds for `recipient`, minus a `feeBps` performance fee.
    /// @dev Must be called BEFORE the deposit transfer lands. Reverts if the caller already has an
    /// unsettled intent open — settle or cancel it first. `intentId` is caller-chosen (e.g. keccak256
    /// of an off-chain proposal id) so the depositor's own backend can correlate it later.
    function createIntent(bytes32 intentId, address recipient, uint256 feeBps) external {
        if (recipient == address(0)) revert ZeroAddress();
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh(feeBps, MAX_FEE_BPS);

        bytes32 existing = openIntentOf[msg.sender];
        if (existing != bytes32(0) && !intents[existing].settled) {
            revert IntentAlreadyOpen(existing);
        }

        intents[intentId] = Intent({depositor: msg.sender, recipient: recipient, feeBps: feeBps, settled: false});
        openIntentOf[msg.sender] = intentId;

        emit IntentCreated(intentId, msg.sender, recipient, feeBps);
    }

    /// @notice Lets a depositor abandon an unsettled intent before depositing, freeing them to create another.
    function cancelIntent(bytes32 intentId) external {
        Intent storage intent = intents[intentId];
        if (intent.depositor == address(0)) revert IntentNotFound();
        if (intent.depositor != msg.sender) revert NotIntentOwner();
        if (intent.settled) revert IntentAlreadySettled();

        intent.settled = true; // reuse the settled flag as "closed" — no funds move
        if (openIntentOf[msg.sender] == intentId) {
            openIntentOf[msg.sender] = bytes32(0);
        }
        emit IntentCancelled(intentId);
    }

    /// @notice Distributes whatever balance of `token` this contract holds against `intentId`'s recipient and fee split.
    /// @dev Permissionless by design — anyone can trigger settlement once the deposit has landed (e.g. a keeper,
    /// Oracle's backend, or the depositor themselves). Reads the router's own token balance rather than a
    /// caller-supplied amount; safe only because at most one intent per depositor is open at a time (see class doc).
    function settle(bytes32 intentId, IERC20 token) external nonReentrant {
        Intent storage intent = intents[intentId];
        if (intent.depositor == address(0)) revert IntentNotFound();
        if (intent.settled) revert IntentAlreadySettled();

        uint256 gross = token.balanceOf(address(this));
        if (gross == 0) revert NothingToSettle();

        intent.settled = true;
        if (openIntentOf[intent.depositor] == intentId) {
            openIntentOf[intent.depositor] = bytes32(0);
        }

        uint256 fee = (gross * intent.feeBps) / BPS_DENOMINATOR;
        uint256 net = gross - fee;

        if (net > 0) token.safeTransfer(intent.recipient, net);
        if (fee > 0) token.safeTransfer(feeTreasury, fee);

        emit IntentSettled(intentId, address(token), gross, net, fee);
    }
}
