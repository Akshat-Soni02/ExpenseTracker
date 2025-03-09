import jwt from "jsonwebtoken";

// export const sendCookie = (user, res, message, statusCode) => {
//   const token = jwt.sign({ _id: user._id, iss: "http://localhost:3000" }, process.env.JWT_SECRET);

//   res
//     .status(statusCode)
//     .cookie("token", token, {
//       httpOnly: true,
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//       sameSite: "none",
//       secure: true,
//     })
//     .json({
//       message,
//     });
// };

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
