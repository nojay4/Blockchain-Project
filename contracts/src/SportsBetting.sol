// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract SportsBetting {
    // -------------------------------------------------------------------------
    // Enums
    // -------------------------------------------------------------------------

    enum Outcome {
        Pending,

        Home,
        Away,
        Draw
    }

    enum GameStatus {
        Open,
        Settled
    }

    enum BetType {
        Moneyline,
        Spread,
        Total
    }

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct Game {
        GameStatus status;
        Outcome result; // only meaningful once Settled
        int256 homeScore; // final score × 10 (e.g. 110.5 pts → 1105)
        int256 awayScore;
        bool exists;
    }

    struct Bet {
        address bettor;
        string gameId;
        BetType betType;
        // Moneyline: Home/Away/Draw
        // Spread:    Home = home covers, Away = away covers
        // Total:     Home = Over,         Away = Under
        Outcome outcome;
        int256 line; // spread or total line × 10 (e.g. -3.5 → -35); 0 for Moneyline
        uint256 amount; // wei
        uint256 odds; // decimal odds × 100 (e.g. 1.91x → 191); payout = amount * odds / 100
        bool claimed;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    address public owner;
    address public oracle;

    mapping(string => Game) public games; // gameId → Game
    mapping(uint256 => Bet) public bets; // betId → Bet
    uint256 public nextBetId;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event GameCreated(string gameId);
    event GameSettled(string gameId, Outcome result, int256 homeScore, int256 awayScore);
    event BetPlaced(
        uint256 indexed betId,
        address indexed bettor,
        string gameId,
        BetType betType,
        Outcome outcome,
        int256 line,
        uint256 amount,
        uint256 odds
    );
    event WinningsClaimed(uint256 indexed betId, address indexed bettor, uint256 payout);
    event Funded(address indexed funder, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOracleOrOwner() {
        require(msg.sender == oracle || msg.sender == owner, "Not authorized");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _oracle) {
        owner = msg.sender;
        oracle = _oracle;
    }

    // -------------------------------------------------------------------------
    // Owner functions
    // -------------------------------------------------------------------------

    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        emit Withdrawn(owner, amount);
        (bool ok,) = owner.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    // -------------------------------------------------------------------------
    // Oracle / Owner functions
    // -------------------------------------------------------------------------

    function createGame(string calldata gameId) external onlyOracleOrOwner {
        require(!games[gameId].exists, "Game already exists");
        games[gameId] = Game({
            status: GameStatus.Open,
            result: Outcome.Pending, // placeholder; ignored until Settled
            homeScore: 0,
            awayScore: 0,
            exists: true
        });
        emit GameCreated(gameId);
    }

    /// @notice Report the final result of a game and settle it.
    /// @param gameId       The game identifier from the sports API.
    /// @param result       Winning outcome (Home/Away/Draw) — used for Moneyline resolution.
    /// @param homeScore    Final home score × 10 (e.g. 110.5 pts → 1105).
    /// @param awayScore    Final away score × 10.
    function reportResult(string calldata gameId, Outcome result, int256 homeScore, int256 awayScore)
        external
        onlyOracleOrOwner
    {
        Game storage game = games[gameId];
        require(game.exists, "Game does not exist");
        require(game.status == GameStatus.Open, "Game already settled");

        game.status = GameStatus.Settled;
        game.result = result;
        game.homeScore = homeScore;
        game.awayScore = awayScore;

        emit GameSettled(gameId, result, homeScore, awayScore);
    }

    // -------------------------------------------------------------------------
    // User functions
    // -------------------------------------------------------------------------

    /// @notice Place a bet on a game.
    /// @param gameId   Game identifier.
    /// @param betType  Moneyline, Spread, or Total.
    /// @param outcome  Home/Away/Draw (meaning depends on betType — see Bet struct docs).
    /// @param line     Spread or total line × 10; pass 0 for Moneyline.
    /// @param odds     Decimal odds × 100 (e.g. 1.91x → 191). Locked in at time of bet.
    function placeBet(string calldata gameId, BetType betType, Outcome outcome, int256 line, uint256 odds)
        external
        payable
    {
        require(msg.value > 0, "Bet amount must be > 0");
        require(odds >= 100, "Odds must be >= 1.00x (100)");

        Game storage game = games[gameId];
        require(game.exists, "Game does not exist");
        require(game.status == GameStatus.Open, "Game is not open for betting");

        uint256 betId = nextBetId++;
        bets[betId] = Bet({
            bettor: msg.sender,
            gameId: gameId,
            betType: betType,
            outcome: outcome,
            line: line,
            amount: msg.value,
            odds: odds,
            claimed: false
        });

        emit BetPlaced(betId, msg.sender, gameId, betType, outcome, line, msg.value, odds);
    }

    /// @notice Claim winnings for a settled bet. Uses CEI pattern to prevent reentrancy.
    /// @param betId The bet identifier emitted in the BetPlaced event.
    function claimWinnings(uint256 betId) external {
        Bet storage bet = bets[betId];
        require(bet.bettor == msg.sender, "Not your bet");
        require(!bet.claimed, "Already claimed");

        Game storage game = games[bet.gameId];
        require(game.status == GameStatus.Settled, "Game not yet settled");

        (bool won, bool push) = _evaluate(bet, game);

        // CEI: mark claimed before transferring to prevent reentrancy
        bet.claimed = true;

        uint256 payout;
        if (push) {
            payout = bet.amount; // refund stake on a push
        } else {
            require(won, "Bet did not win");
            payout = (bet.amount * bet.odds) / 100;
        }

        require(address(this).balance >= payout, "Contract has insufficient funds");

        emit WinningsClaimed(betId, msg.sender, payout);
        (bool ok,) = msg.sender.call{value: payout}("");
        require(ok, "Transfer failed");
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    function getBet(uint256 betId) external view returns (Bet memory) {
        return bets[betId];
    }

    function getGame(string calldata gameId) external view returns (Game memory) {
        return games[gameId];
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // -------------------------------------------------------------------------
    // Funding
    // -------------------------------------------------------------------------

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /// @dev Evaluate whether a bet won or pushed against the settled game result.
    ///      All score/line comparisons are done in the ×10 integer space.
    function _evaluate(Bet storage bet, Game storage game) internal view returns (bool won, bool push) {
        if (bet.betType == BetType.Moneyline) {
            won = (bet.outcome == game.result);
            push = false;
        } else if (bet.betType == BetType.Spread) {
            // line is the home team's spread × 10 (negative = home is favored)
            // e.g. home -3.5 → line = -35; home must win by > 3.5 to cover
            int256 margin = game.homeScore - game.awayScore; // ×10
            int256 adjustedMargin = margin + bet.line; // add spread to home margin
            if (bet.outcome == Outcome.Home) {
                push = (adjustedMargin == 0);
                won = (adjustedMargin > 0);
            } else {
                push = (adjustedMargin == 0);
                won = (adjustedMargin < 0);
            }
        } else {
            // Total
            int256 total = game.homeScore + game.awayScore; // ×10
            if (bet.outcome == Outcome.Home) {
                // Over
                push = (total == bet.line);
                won = (total > bet.line);
            } else {
                // Under
                push = (total == bet.line);
                won = (total < bet.line);
            }
        }
    }
}
