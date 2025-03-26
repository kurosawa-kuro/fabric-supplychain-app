// Fabricチェーンコード（Node.js版）: part_event スキーマ対応
'use strict';

const { Contract } = require('fabric-contract-api');

class PartEventContract extends Contract {
  async recordPartEvent(ctx, event_id, part_id, status, timestamp, location, operator_id, part_hash, supplier_hash, operator_hash) {
    const event = {
      event_id,
      part_id,
      status,
      timestamp,
      location,
      operator_id,
      part_hash,
      supplier_hash,
      operator_hash
    };
    await ctx.stub.putState(event_id, Buffer.from(JSON.stringify(event)));
    return JSON.stringify(event);
  }

  async queryPartEvent(ctx, event_id) {
    const data = await ctx.stub.getState(event_id);
    if (!data || data.length === 0) throw new Error(`Event ${event_id} not found`);
    return data.toString();
  }
}

module.exports.contracts = [ PartEventContract ];
