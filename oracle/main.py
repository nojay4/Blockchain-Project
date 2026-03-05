"""
Oracle stub: sports API + reportResult to contract.
Run with: python main.py (or uv run main.py)
Set RPC_URL, ORACLE_PRIVATE_KEY, CONTRACT_ADDRESS, SPORTS_API_KEY in .env (copy from repo .env.example).
"""
import os
from dotenv import load_dotenv

load_dotenv()


def main() -> None:
    if not os.getenv("RPC_URL"):
        print("Oracle stub: set RPC_URL (and other vars) in .env to connect to contract.")
    else:
        print("Oracle stub: env loaded; implement sports API fetch + reportResult call.")
    return


if __name__ == "__main__":
    main()
