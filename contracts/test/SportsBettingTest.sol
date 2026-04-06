// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {SportsBetting} from "../src/SportsBetting.sol";

contract SportsBettingTest is Test {
    SportsBetting public betting;

    address owner = address(this);
    address oracle = address(0xBEEF);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    string constant GAME = "game-001";

    function setUp() public {
        betting = new SportsBetting(oracle);
        // Fund the contract so it can pay out winnings
        vm.deal(address(betting), 100 ether);
        // Give users some ETH
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
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
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200);

        SportsBetting.Bet memory b = betting.getBet(0);
        assertEq(b.bettor, alice);
        assertEq(b.amount, 1 ether);
        assertEq(b.odds, 200);
        assertFalse(b.claimed);
    }

    function test_PlaceBet_Reverts_ZeroValue() public {
        betting.createGame(GAME);
        vm.prank(alice);
        vm.expectRevert("Bet amount must be > 0");
        betting.placeBet{value: 0}(GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200);
    }

    function test_PlaceBet_Reverts_OddsTooLow() public {
        betting.createGame(GAME);
        vm.prank(alice);
        vm.expectRevert("Odds must be >= 1.00x (100)");
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 99);
    }

    function test_PlaceBet_Reverts_NoGame() public {
        vm.prank(alice);
        vm.expectRevert("Game does not exist");
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200);
    }

    function test_PlaceBet_Reverts_GameSettled() public {
        betting.createGame(GAME);
        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 900);

        vm.prank(alice);
        vm.expectRevert("Game is not open for betting");
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200);
    }

    // -------------------------------------------------------------------------
    // claimWinnings — Moneyline
    // -------------------------------------------------------------------------

    function test_ClaimWinnings_Moneyline_Win() public {
        betting.createGame(GAME);
        vm.prank(alice);
        // Bet 1 ETH on Home at 2.00x → payout = 2 ETH
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200);

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
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200);

        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Away, 900, 1100);

        vm.prank(alice);
        vm.expectRevert("Bet did not win");
        betting.claimWinnings(0);
    }

    function test_ClaimWinnings_Reverts_DoubleClaim() public {
        betting.createGame(GAME);
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200);
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
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200);
        vm.prank(oracle);
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 900);

        vm.prank(bob);
        vm.expectRevert("Not your bet");
        betting.claimWinnings(0);
    }

    function test_ClaimWinnings_Reverts_NotSettled() public {
        betting.createGame(GAME);
        vm.prank(alice);
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Moneyline, SportsBetting.Outcome.Home, 0, 200);

        vm.prank(alice);
        vm.expectRevert("Game not yet settled");
        betting.claimWinnings(0);
    }

    // -------------------------------------------------------------------------
    // claimWinnings — Spread
    // -------------------------------------------------------------------------

    function test_ClaimWinnings_Spread_HomeCoverWin() public {
        betting.createGame(GAME);
        vm.prank(alice);
        // Home -3.5 → line = -35; home must win by > 3.5
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Spread, SportsBetting.Outcome.Home, -35, 191);

        vm.prank(oracle);
        // Home wins 110-100 → margin = 100 (×10), adjusted = 100 + (-35) = 65 > 0 → home covers
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1100, 1000);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        betting.claimWinnings(0);
        assertEq(alice.balance - balanceBefore, (1 ether * 191) / 100);
    }

    function test_ClaimWinnings_Spread_HomeCoverLoss() public {
        betting.createGame(GAME);
        vm.prank(alice);
        // Home -3.5 → line = -35; home wins by only 2 → does not cover
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Spread, SportsBetting.Outcome.Home, -35, 191);

        vm.prank(oracle);
        // Home 102 - Away 100 → margin = 20 (×10), adjusted = 20 + (-35) = -15 < 0 → home does NOT cover
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1020, 1000);

        vm.prank(alice);
        vm.expectRevert("Bet did not win");
        betting.claimWinnings(0);
    }

    function test_ClaimWinnings_Spread_Push() public {
        betting.createGame(GAME);
        vm.prank(alice);
        // Home -3.0 → line = -30; home wins by exactly 3 → push
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Spread, SportsBetting.Outcome.Home, -30, 191);

        vm.prank(oracle);
        // Home 103 - Away 100 → margin = 30 (×10), adjusted = 30 + (-30) = 0 → push
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1030, 1000);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        betting.claimWinnings(0);
        // On push, refund the original stake
        assertEq(alice.balance - balanceBefore, 1 ether);
    }

    // -------------------------------------------------------------------------
    // claimWinnings — Total
    // -------------------------------------------------------------------------

    function test_ClaimWinnings_Total_OverWin() public {
        betting.createGame(GAME);
        vm.prank(alice);
        // Over 220.5 → line = 2205
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Total, SportsBetting.Outcome.Home, 2205, 191);

        vm.prank(oracle);
        // 115 + 110 = 225 > 220.5 → over wins
        betting.reportResult(GAME, SportsBetting.Outcome.Home, 1150, 1100);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        betting.claimWinnings(0);
        assertEq(alice.balance - balanceBefore, (1 ether * 191) / 100);
    }

    function test_ClaimWinnings_Total_UnderWin() public {
        betting.createGame(GAME);
        vm.prank(alice);
        // Under 220.5 → line = 2205; outcome = Away (Under)
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Total, SportsBetting.Outcome.Away, 2205, 191);

        vm.prank(oracle);
        // 100 + 105 = 205 < 220.5 → under wins
        betting.reportResult(GAME, SportsBetting.Outcome.Away, 1000, 1050);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        betting.claimWinnings(0);
        assertEq(alice.balance - balanceBefore, (1 ether * 191) / 100);
    }

    function test_ClaimWinnings_Total_Push() public {
        betting.createGame(GAME);
        vm.prank(alice);
        // Over 220.0 → line = 2200
        betting.placeBet{value: 1 ether}(GAME, SportsBetting.BetType.Total, SportsBetting.Outcome.Home, 2200, 191);

        vm.prank(oracle);
        // 110 + 110 = 220 exactly → push
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
