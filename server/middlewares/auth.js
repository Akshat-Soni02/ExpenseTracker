import  jwt  from "jsonwebtoken";
import user from "../models/user.js";

export const isAuthenticated = async (req,res, next) => {
    const {token} = req.cookies;

    if(!token) {
        return res.status(404).json({
            success: false,
            message: "Bad Request Try Login First",
        });
    }
    const decode = jwt.verify(token,process.env.JWT_SECRET);

    req.user = await user.findById(decode._id);
    next();
}