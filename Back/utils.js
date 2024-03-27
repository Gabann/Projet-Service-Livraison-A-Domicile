const jwt = require("jsonwebtoken");

function sendResponse(res, statusCode, responseMessage, optionalResponse = {}) {
	res.status(statusCode).json({message: responseMessage, ...optionalResponse});
}

function verifyToken(token) {
	try {
		jwt.verify(token, process.env.TOKEN_SECRET);
		return true;
	} catch (error) {
		return false;
	}
}

function getDecodedToken(token) {
	let isTokenValid = verifyToken(token);

	if (!isTokenValid) {
		return null;
	}

	return jwt.decode(token);
}

module.exports = {
	sendResponse,
	verifyToken,
	getDecodedToken
};
