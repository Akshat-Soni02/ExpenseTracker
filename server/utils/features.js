import jwt from "jsonwebtoken";

/**
 * 
 * signs token code with JWT and sends it
 * 
 * @param {object} userData 
 * @param {Response} res 
 * @param {string} message 
 * @param {number} statusCode 
 */
export const sendToken = (userData, res, message, statusCode) => {

  const token = jwt.sign(
    { _id: userData.id, iss: "expenzz" },
    process.env.JWT_SECRET
  );

  res.status(statusCode).json({
    message,
    token,
    userData,
  });
};
