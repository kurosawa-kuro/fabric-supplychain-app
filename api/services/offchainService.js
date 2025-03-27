const { db, initializeMasterData } = require('../database/initializeMasterData');

class OffchainService {
  constructor() {
    this.initialize();
  }

  initialize() {
    initializeMasterData();
  }

  // Part operations
  getPartById(partId) {
    return db.get('parts').find({ part_id: partId }).value();
  }

  // Supplier operations
  getSupplierById(supplierId) {
    return db.get('suppliers').find({ supplier_id: supplierId }).value();
  }

  // Operator operations
  getOperatorById(operatorId) {
    return db.get('operators').find({ operator_id: operatorId }).value();
  }

  // Event operations
  saveEvent(newEvent) {
    db.get('events').remove({ event_id: newEvent.event_id }).write();
    db.get('events').push(newEvent).write();
  }

  getEventById(eventId) {
    return db.get('events').find({ event_id: eventId }).value();
  }

  getAllEvents() {
    return db.get('events').value();
  }
}

module.exports = new OffchainService(); 