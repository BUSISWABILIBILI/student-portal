import crypto from "node:crypto";

const requestIdHeader = "x-request-id";
const validRequestId = /^[a-zA-Z0-9._:-]{1,100}$/;

const requestContext = (req, res, next) => {
  const incomingRequestId = req.get(requestIdHeader)?.trim();
  const requestId = validRequestId.test(incomingRequestId || "")
    ? incomingRequestId
    : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
};

export default requestContext;
