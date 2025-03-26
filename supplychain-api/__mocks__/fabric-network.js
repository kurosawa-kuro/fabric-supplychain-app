module.exports = {
  Gateway: jest.fn().mockImplementation(() => {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      getNetwork: jest.fn().mockResolvedValue({
        getContract: jest.fn().mockReturnValue({
          submitTransaction: jest.fn().mockResolvedValue(Buffer.from('mockTxResult')),
          evaluateTransaction: jest.fn().mockResolvedValue(Buffer.from(JSON.stringify({
            part_hash: "mockPartHash",
            supplier_hash: "mockSupplierHash",
            operator_hash: "mockOperatorHash"
          })))
        })
      })
    };
  }),
  Wallets: {
    newFileSystemWallet: jest.fn().mockResolvedValue({
      get: jest.fn().mockResolvedValue(true)
    })
  }
}; 