// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SportsBetting} from "../src/SportsBetting.sol";

contract SportsBettingTest is Test {
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant BET_QUOTE_TYPEHASH = keccak256(
        "BetQuote(address bettor,string gameId,uint8 betType,uint8 outcome,int256 line,uint256 odds,uint256 nonce,uint256 expiry)"
    );
    receive() external payable {}

    SportsBetting public betting;

    /// @dev Anvil default account #0 — must match `oracle` passed to constructor.
    uint256 internal constant ORACLE_PK =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    /// @dev Anvil default account #1 — used as `alice` so we can `vm.sign` wrong-signer cases.
    uint256 internal constant ALICE_PK =
        0x59c6995e998f97a5a0044966f0945389dc9e86dae88f7a843b79eacd0a40aedf;

    address internal owner;
    address internal oracle;
    address internal alice;
    address internal bob;

    string constant GAME = "game-001";

    function setUp() public {
        owner = address(this);
        oracle = vm.addr(ORACLE_PK);
        alice = vm.addr(ALICE_PK);
        (bob,) = makeAddrAndKey("bob");

        betting = new SportsBetting(oracle);
        vm.deal(address(betting), 100 ether);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function _expiry() internal view returns (uint256) {
        return block.timestamp + 1 days;
    }

    /// @dev Must match OpenZeppelin EIP712("SportsBetting", "1") on the deployed contract.
    function _eip712DomainSeparator(SportsBetting target) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("SportsBetting")),
                keccak256(bytes("1")),
                block.chainid,
                address(target)
            )
        );
    }

    /// @dev Must match SportsBetting._structHash.
    function _betQuoteStructHash(
        address bettor,
        string memory gameId,
        SportsBetting.BetType betType,
        SportsBetting.Outcome outcome,
        int256 line,
        uint256 odds,
        uint256 nonce,
        uint256 expiry
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                BET_QUOTE_TYPEHASH,
                bettor,
                keccak256(bytes(gameId)),
                uint8(betType),
                uint8(outcome),
                line,
                odds,
                nonce,
                expiry
            )
        );
    }

    function _typedBetDigest(
        SportsBetting target,
        address bettor,
        string memory gameId,
        SportsBetting.BetType betType,
        SportsBetting.Outcome outcome,
        int256 line,
        uint256 odds,
        uint256 nonce,
        uint256 expiry
    ) internal view returns (bytes32) {
        bytes32 structHash =
            _betQuoteStructHash(bettor, gameId, betType, outcome, line, odds, nonce, expiry);
        return ECDSA.toTypedDataHash(_eip712DomainSeparator(target), structHash);
    }

    function _oracleSig(
        address bettor,
        string memory gameId,
        SportsBetting.BetType betType,
        SportsBetting.Outcome outcome,
        int256 line,
        uint256 odds,
        uint256 nonce,
        uint256 expiry
    ) internal view returns (bytes memory) {
        bytes32 digest =
            _typedBetDigest(betting, bettor, gameId, betType, outcome, line, odds, nonce, expiry);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ORACLE_PK, digest);
        return abi.encodePacked(r, s, v);
    }

    function _aliceWrongSig(
        address bettor,
        string memory gameId,
        SportsBetting.BetType betType,
        SportsBetting.Outcome outcome,
        int256 line,
        uint256 odds,
        uint256 nonce,
        uint256 expiry
    ) internal view returns (bytes memory) {
        bytes32 digest = _typedBetDigest(betting, bettor, gameId, betType, outcome, line, odds, nonce, expiry);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ALICE_PK, digest);
        return abi.encodePacked(r, s, v);
    }

    // -------------------------------------------------------------------------
    // createGame
    // -------------------------------------------------------------------------

    function test_CreateGame_Oracle() public {
        vm.prank(oracle);
        betting.createGame(GAME);
        SportsBetting.Game memory g = betting.getGame(GAME);
        assertTrue(g.exists);
        assertEq(uint256(g.status), uint256(SportsBetting.GameStatus.Open));
    }

    function test_CreateGame_Owner() public {
        betting.createGame(GAME);
        assertTrue(betting.getGame(GAME).exists);
    }

    function test_CreateGame_Reverts_Unauthorized() public {
        vm.prank(alice);
        vm.expectRevert("Not authorized");
        betting.createGame(GAME);
    }

    function test_CreateGame_Reverts_Duplicate() public {
        betting.createGame(GAME);
        vm.expectRevert("Game already exists");
        betting.createGame(GAME);
    }

    // -------------------------------------------------------------------------
    // reportResult
    // -------------------------------------------------------------------------

    function test_ReportResult_Settles_Game() public {
        betting.createGame(GAME);
        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 900);

        SportsBetting.Game memory g = betting.getGame(GAME);
        assertEq(uint256(g.status), uint256(SportsBetting.GameStatus.Settled));
        assertEq(uint256(g.result), uint256(SportsBetting.Outcome.Home));
        assertEq(g.homeScore, 1100);
        assertEq(g.awayScore, 900);
    }

    function test_ReportResult_Reverts_AlreadySettled() public {
        betting.createGame(GAME);
        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 900);
        vm.prank(oracle);
        vm.expectRevert("Game already settled");
        betting.reportResult(GAME, SportsBetting.Outcome.Away, 900, 1100);
    }

    function test_ReportResult_Reverts_NoGame() public {
        vm.prank(oracle);
        vm.expectRevert("Game does not exist");
        betting.reportResult("nonexistent", SportsBetting.Outcome.Home, 0, 0);
    }

    function test_ReportResult_Reverts_Unauthorized() public {
        betting.createGame(GAME);
        vm.prank(alice);
        vm.expectRevert("Not authorized");
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 0, 0);
    }

    // -------------------------------------------------------------------------
    // placeBet
    // -------------------------------------------------------------------------

    function test_PlaceBet_Moneyline() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig
        );

        SportsBetting.Bet memory b = betting.getBet(0);
        assertEq(b.bettor, alice);
        assertEq(b.amount, 1 ether);
        assertEq(b.odds, 200);
        assertFalse(b.claimed);
        assertEq(betting.bettorNonces(alice), 1);
    }

    function test_PlaceBet_AutoCreatesGame() public {
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig
        );

        assertTrue(betting.getGame(GAME).exists);
        assertEq(uint256(betting.getGame(GAME).status), uint256(SportsBetting.GameStatus.Open));
        assertEq(betting.getBet(0).bettor, alice);
    }

    function test_PlaceBet_Reverts_ZeroValue() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        vm.expectRevert("Bet amount must be > 0");
        betting.placeBet{value: 0}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig
        );
    }

    function test_PlaceBet_Reverts_OddsTooLow() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 99, 0, _expiry()
        );
        vm.prank(alice);
        vm.expectRevert("Odds must be >= 1.00x (100)");
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 99, 0, _expiry(), sig
        );
    }

    function test_PlaceBet_Reverts_GameSettled() public {
        betting.createGame(GAME);
        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 900);

        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        vm.expectRevert("Game already settled");
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig
        );
    }

    function test_PlaceBet_Reverts_InvalidNonce() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 1, _expiry()
        );
        vm.prank(alice);
        vm.expectRevert("Invalid nonce");
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 1, _expiry(), sig
        );
    }

    function test_PlaceBet_Reverts_QuoteExpired() public {
        betting.createGame(GAME);
        uint256 exp = block.timestamp + 100;
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, exp
        );
        vm.warp(block.timestamp + 200);
        vm.prank(alice);
        vm.expectRevert("Quote expired");
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, exp, sig
        );
    }

    function test_PlaceBet_Reverts_InvalidSignature() public {
        betting.createGame(GAME);
        bytes memory sig = _aliceWrongSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        vm.expectRevert("Invalid signature");
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig
        );
    }

    function test_PlaceBet_Reverts_ReplayNonce() public {
        betting.createGame(GAME);
        bytes memory sig0 = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig0
        );

        vm.prank(alice);
        vm.expectRevert("Invalid nonce");
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig0
        );
    }

    // -------------------------------------------------------------------------
    // claimWinnings — Moneyline
    // -------------------------------------------------------------------------

    function test_ClaimWinnings_Moneyline_Win() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig
        );

        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 900);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        betting.claimWinnings(0);

        assertEq(alice.balance - balanceBefore, 2 ether);
        assertTrue(betting.getBet(0).claimed);
    }

    function test_ClaimWinnings_Moneyline_Loss() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig
        );

        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Away, 900, 1100);

        vm.prank(alice);
        vm.expectRevert("Bet did not win");
        betting.claimWinnings(0);
    }

    function test_ClaimWinnings_Reverts_DoubleClaim() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig
        );
        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 900);

        vm.prank(alice);
        betting.claimWinnings(0);
        vm.prank(alice);
        vm.expectRevert("Already claimed");
        betting.claimWinnings(0);
    }

    function test_ClaimWinnings_Reverts_NotYourBet() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig
        );
        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 900);

        vm.prank(bob);
        vm.expectRevert("Not your bet");
        betting.claimWinnings(0);
    }

    function test_ClaimWinnings_Reverts_NotSettled() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200, 0, _expiry(), sig
        );

        vm.prank(alice);
        vm.expectRevert("Game not yet settled");
        betting.claimWinnings(0);
    }

    // -------------------------------------------------------------------------
    // claimWinnings — Spread
    // -------------------------------------------------------------------------

    function test_ClaimWinnings_Spread_HomeCoverWin() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Spread, SportsBetting.Outcome.Home, -35, 191, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Spread, SportsBetting.Outcome.Home, -35, 191, 0, _expiry(), sig
        );

        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 1000);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        betting.claimWinnings(0);
        assertEq(alice.balance - balanceBefore, (1 ether * 191) / 100);
    }

    function test_ClaimWinnings_Spread_HomeCoverLoss() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Spread, SportsBetting.Outcome.Home, -35, 191, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Spread, SportsBetting.Outcome.Home, -35, 191, 0, _expiry(), sig
        );

        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1020, 1000);

        vm.prank(alice);
        vm.expectRevert("Bet did not win");
        betting.claimWinnings(0);
    }

    function test_ClaimWinnings_Spread_Push() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Spread, SportsBetting.Outcome.Home, -30, 191, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Spread, SportsBetting.Outcome.Home, -30, 191, 0, _expiry(), sig
        );

        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1030, 1000);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        betting.claimWinnings(0);
        assertEq(alice.balance - balanceBefore, 1 ether);
    }

    // -------------------------------------------------------------------------
    // claimWinnings — Total
    // -------------------------------------------------------------------------

    function test_ClaimWinnings_Total_OverWin() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Total, SportsBetting.Outcome.Home, 2205, 191, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Total, SportsBetting.Outcome.Home, 2205, 191, 0, _expiry(), sig
        );

        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1150, 1100);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        betting.claimWinnings(0);
        assertEq(alice.balance - balanceBefore, (1 ether * 191) / 100);
    }

    function test_ClaimWinnings_Total_UnderWin() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Total, SportsBetting.Outcome.Away, 2205, 191, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Total, SportsBetting.Outcome.Away, 2205, 191, 0, _expiry(), sig
        );

        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Away, 1000, 1050);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        betting.claimWinnings(0);
        assertEq(alice.balance - balanceBefore, (1 ether * 191) / 100);
    }

    function test_ClaimWinnings_Total_Push() public {
        betting.createGame(GAME);
        bytes memory sig = _oracleSig(
            alice, GAME, SportsBetting.BetType.Total, SportsBetting.Outcome.Home, 2200, 191, 0, _expiry()
        );
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(
            GAME, SportsBetting.BetType.Total, SportsBetting.Outcome.Home, 2200, 191, 0, _expiry(), sig
        );

        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 1100);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        betting.claimWinnings(0);
        assertEq(alice.balance - balanceBefore, 1 ether);
    }

    // -------------------------------------------------------------------------
    // withdraw
    // -------------------------------------------------------------------------

    function test_Withdraw_Owner() public {
        uint256 balanceBefore = owner.balance;
        betting.withdraw(1 ether);
        assertEq(owner.balance - balanceBefore, 1 ether);
    }

    function test_Withdraw_Reverts_NonOwner() public {
        vm.prank(alice);
        vm.expectRevert("Not owner");
        betting.withdraw(1 ether);
    }

    function test_Withdraw_Reverts_TooMuch() public {
        vm.expectRevert("Insufficient balance");
        betting.withdraw(101 ether);
    }

    // -------------------------------------------------------------------------
    // setOracle
    // -------------------------------------------------------------------------

    function test_SetOracle() public {
        betting.setOracle(alice);
        assertEq(betting.oracle(), alice);
    }

    function test_SetOracle_Reverts_NonOwner() public {
        vm.prank(alice);
        vm.expectRevert("Not owner");
        betting.setOracle(alice);
    }

    // -------------------------------------------------------------------------
    // receive (funding)
    // -------------------------------------------------------------------------

    function test_Receive_Funds_Contract() public {
        uint256 balanceBefore = address(betting).balance;
        (bool ok,) = address(betting).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(betting).balance - balanceBefore, 1 ether);
    }
}
