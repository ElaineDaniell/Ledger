//////////////////////////////////////////////////////////////////////////
//
// WARNING!!
// ALWAYS DYNAMICALLY IMPORT THIS FILE TO AVOID INCLUDING THE ENTIRE 
// FHEVM MOCK LIB IN THE FINAL PRODUCTION BUNDLE!!
//
//////////////////////////////////////////////////////////////////////////

import { Contract, JsonRpcProvider } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";
import { FhevmInstance } from "../../fhevmTypes";

export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
}): Promise<FhevmInstance> => {
  const provider = new JsonRpcProvider(parameters.rpcUrl);

  // Dynamically resolve EIP712 domains to ensure verifyingContract addresses match
  const eip712Abi = [
    "function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])",
  ];

  const inputVerifierContract = new Contract(
    parameters.metadata.InputVerifierAddress,
    eip712Abi,
    provider
  );
  const inputDomain = await inputVerifierContract.eip712Domain();
  const verifyingContractAddressInputVerification = inputDomain[4] as `0x${string}`;

  const kmsVerifierContract = new Contract(
    parameters.metadata.KMSVerifierAddress,
    eip712Abi,
    provider
  );
  const kmsDomain = await kmsVerifierContract.eip712Domain();
  const verifyingContractAddressDecryption = kmsDomain[4] as `0x${string}`;

  const instance = await MockFhevmInstance.create(
    provider,
    provider,
    {
      aclContractAddress: parameters.metadata.ACLAddress,
      chainId: parameters.chainId,
      gatewayChainId: 55815,
      inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
      kmsContractAddress: parameters.metadata.KMSVerifierAddress,
      verifyingContractAddressDecryption,
      verifyingContractAddressInputVerification,
    },
    {
      inputVerifierProperties: {},
      kmsVerifierProperties: {},
    }
  );
  return instance as unknown as FhevmInstance;
};
 
