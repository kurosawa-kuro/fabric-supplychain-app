const { v4: uuidv4 } = require('uuid');

function assignRequestId(req, res, next) {
  req.requestId = uuidv4();
  next();
}

module.exports = { assignRequestId }; 