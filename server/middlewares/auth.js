import  jwt  from "jsonwebtoken";
import user from "../models/user.js";

export const isAuthenticated = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
  
      if (!token) {
        return res.status(401).json({
            message: "Bad Request Try Login First",
        });
      }
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await user.findById(decoded._id);

      if (!req.user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      return next();
    } catch (error) {
      console.error("Authentication Error:", error);
      return res.status(401).json({ message: "Invalid Token" });
    }
  };
  