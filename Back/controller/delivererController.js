const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const {sequelize} = require("../config/databaseConnection");
const dataBaseModel = require('../model/databaseModel')(sequelize);
const {sendResponse, verifyToken} = require("../utils");
const {bcryptSaltRounds} = require("../const");

const delivererController = {
	signUp: async (req, res) => {
		try {
			let username = req.body.username;
			let password = req.body.password;

			let hashedPassword = await bcrypt.hash(password, bcryptSaltRounds);
			await dataBaseModel.Livreur.create({username: username, password: hashedPassword});

			sendResponse(res, 201, "Livreur added successfully");
		} catch (error) {
			console.error(error);
			sendResponse(res, 500, error.message);
		}
	},

	logIn: async (req, res) => {
		try {
			let username = req.body.username;
			let password = req.body.password;

			const deliverer = await dataBaseModel.Livreur.findOne({where: {username: username}});
			if (!deliverer) {
				return sendResponse(res, 401, "Username or password incorrect");
			}

			const isPasswordValid = await bcrypt.compare(password, deliverer.password);
			if (!isPasswordValid) {
				return sendResponse(res, 401, "Username or password incorrect");
			}

			const token = jwt.sign({delivererId: deliverer.id}, process.env.TOKEN_SECRET, {
				expiresIn: "30d",
			});

			sendResponse(res, 200, "Successfully logged in", {token: token});
		} catch (error) {
			sendResponse(res, 500, error.message);
		}
	},

	getAllOpenOrders: async (req, res) => {
		try {
			let token = req.headers.authorization.split(" ")[1];
			let isTokenValid = verifyToken(token);

			if (!isTokenValid) {
				return sendResponse(res, 401, "Invalid token");
			}

			let result = await dataBaseModel.Commande.findAll({
				where: {
					status: 'En attente de livraison'
				},
				attributes: ['id', 'status'],
				include: [{
					model: dataBaseModel.CommandeAdresse,
					include: [{
						model: dataBaseModel.Adresse,
						attributes: ['city', 'street', 'postalCode', 'country']
					}]
				}]
			});

			if (result.length === 0) {
				return sendResponse(res, 404, "No open orders found");
			}

			sendResponse(res, 200, "Successfully fetched open orders", {id: result[0].id, address: result[0].CommandeAdresse.Adresse});
		} catch (error) {
			sendResponse(res, 500, error.message);
		}
	},

	assingOrderToSelf: async (req, res) => {
		try {
			let token = req.headers.authorization.split(" ")[1];
			let isTokenValid = verifyToken(token);

			if (!isTokenValid) {
				return sendResponse(res, 401, "Invalid token");
			}

			let decodedToken = jwt.decode(token);
			let delivererId = decodedToken.delivererId;
			let orderId = req.body.orderId;

			let order = await dataBaseModel.Commande.findOne({
				where: {
					id: orderId,
					status: 'En attente de livraison'
				}
			});

			if (!order) {
				return sendResponse(res, 404, "Order not found or already taken");
			}

			await order.update({
				status: 'En cours de livraison',
				LivreurId: delivererId
			});

			sendResponse(res, 200, "Successfully assigned order to self");
		} catch (error) {
			sendResponse(res, 500, error.message);
		}
	}
};

module.exports = delivererController;
