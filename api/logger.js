function log(reqOrMsg, ...rest) {
  const timestamp = new Date().toISOString();
  if (typeof reqOrMsg === 'string') {
    console.log(`[${timestamp}]`, reqOrMsg, ...rest);
  } else {
    const { requestId } = reqOrMsg;
    console.log(`[${timestamp}] [req:${requestId}]`, ...rest);
  }
}

module.exports = { log }; 