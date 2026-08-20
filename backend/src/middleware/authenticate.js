import AppError from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { findUserById } from "../repositories/userRepository.js";

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const authenticate = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    throw new AppError("Authentication is required.", 401);
  }

  const payload = verifyAccessToken(token);

  const user = await findUserById(Number(payload.sub));

  if (!user) {
    throw new AppError(
      "The account linked to this token no longer exists.",
      401,
    );
  }

  if (!user.is_active) {
    throw new AppError("Your account is inactive.", 403);
  }

  req.user = {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
  };

  next();
};

export default authenticate;
