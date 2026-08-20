import {
  captureResult,
  editResult,
  getMyResults,
  getResult,
  getResults,
  publishResult,
  unpublishResult,
} from "../services/resultService.js";

const getRequestMetadata = (req) => ({
  ipAddress: req.ip || req.socket?.remoteAddress || null,
});

export const captureResultController = async (req, res) => {
  const result = await captureResult(
    req.validated.body,
    req.user,
    getRequestMetadata(req),
  );

  res.status(201).json({
    success: true,
    message: "Result captured successfully.",
    data: {
      result,
    },
  });
};

export const updateResultController = async (req, res) => {
  const result = await editResult(
    req.validated.params.resultId,
    req.validated.body,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Result updated successfully.",
    data: {
      result,
    },
  });
};

export const publishResultController = async (req, res) => {
  const result = await publishResult(
    req.validated.params.resultId,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Result published successfully.",
    data: {
      result,
    },
  });
};

export const unpublishResultController = async (req, res) => {
  const result = await unpublishResult(
    req.validated.params.resultId,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Result returned to draft successfully.",
    data: {
      result,
    },
  });
};

export const listResultsController = async (req, res) => {
  const result = await getResults(req.validated.query);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getResultController = async (req, res) => {
  const result = await getResult(req.validated.params.resultId);

  res.status(200).json({
    success: true,
    data: {
      result,
    },
  });
};

export const listMyResultsController = async (req, res) => {
  const result = await getMyResults(req.user.id, req.validated.query);

  res.status(200).json({
    success: true,
    data: result,
  });
};
