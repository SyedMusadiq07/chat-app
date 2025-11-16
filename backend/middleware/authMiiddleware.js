const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authToken = req.cookies?.auth_token;
  if (!authToken) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};



module.exports = authMiddleware;
