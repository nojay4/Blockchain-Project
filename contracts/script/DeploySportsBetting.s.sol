// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {SportsBetting} from "../src/SportsBetting.sol";

contract DeploySportsBetting is Script {
    function run() external {
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        vm.startBroadcast();
        new SportsBetting(oracle);
        vm.stopBroadcast();
    }
}
