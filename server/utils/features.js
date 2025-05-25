import jwt from "jsonwebtoken";

export const sendToken = (userData, res, message, statusCode) => {
  const token = jwt.sign(
    { _id: userData.id, iss: "http://localhost:3001" },
    process.env.JWT_SECRET
  );

  res.status(statusCode).json({
    message,
    token,
    userData,
  });
};
