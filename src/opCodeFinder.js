import Web3 from "web3";
import fs from "fs";

let web3;
let opCode;
let matchContractCount = 0;

async function validateInputs(args) {
  let startBlock, endBlock, opcode, rpcUrl;
  let validArgs = [];
  // Check if all parameters are provided
  if (args.length !== 4) {
    console.log(
      "Please provide exactly four arguments: startBlock, endBlock, opcode, and rpc url."
    );
    process.exit(1);
  }

  rpcUrl = args[3];
  let latestBlock;
  try {
    web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
    latestBlock = await web3.eth.getBlockNumber();
  } catch (e) {
    console.log("rpc url must be a valid URL.");
    process.exit(1);
  }

  // Get the parameter values
  startBlock = parseInt(args[0], 10);
  if (args[1] === "latest") {
    endBlock = Number(latestBlock);
    console.log("latest Block Number is " + endBlock);
  } else {
    endBlock = parseInt(args[1], 10);
  }
  opcode = args[2];
  // Validate that the block number is a valid positive integer
  if (
    isNaN(startBlock) ||
    isNaN(endBlock) ||
    startBlock < 0 ||
    endBlock < 0 ||
    startBlock > endBlock ||
    startBlock > latestBlock ||
    endBlock > latestBlock
  ) {
    console.log("Invalid block number!");
    process.exit(1);
  }

  // If all validations pass
  validArgs.push(startBlock, endBlock, opcode, rpcUrl);
  return validArgs;
}

async function findContracts(startBlockNumber, endBlockNumber) {
  for (let i = startBlockNumber; i <= endBlockNumber; i++) {
    process.stdout.write(
      `\rSearching for block ${i} , ${matchContractCount} contracts match the criteria`
    );
    try {
      let traceObject = await web3.eth.currentProvider.sendAsync({
        method: "debug_traceBlockByNumber",
        params: [
          `0x${i.toString(16)}`,
          {
            tracer: "contractTracer",
            tracerConfig: { opCode: `${opCode}` },
            timeout: "180s",
          },
        ],
        jsonrpc: "2.0",
        id: "1",
      });
      if (!traceObject || traceObject.error) {
        throw new Error(
          traceObject.error ? traceObject.error.message : "unknown error"
        );
      }
      //go through traceObject.result
      if (traceObject.result.length === 0) continue;
      // Loop through traceObject.result array
      traceObject.result.forEach((item) => {
        if (item.result && item.result.length > 0) {
          item.result.forEach((element) => {
            if (element && element.length > 0) saveTheContract(element);
          });
        }
      });
    } catch (error) {
      //check if the error and throw a specific error message
      console.error("\nAn error occurred in block " + i + ":" + error.message);
    }
  }
  console.log();
}

function saveTheContract(contractAddress) {
  fs.appendFile(
    "match-contract-addresses.txt",
    contractAddress + "\n",
    { encoding: "utf8" },
    (err) => {
      if (err) {
        console.error("Error occurred while appending content.");
        return;
      }
    }
  );
  matchContractCount++;
}

async function main() {
  const args = process.argv.slice(2);
  const validArgs = await validateInputs(args);
  const startBlock = validArgs[0];
  const endBlock = validArgs[1];
  opCode = validArgs[2];
  await findContracts(startBlock, endBlock);
}
main();
