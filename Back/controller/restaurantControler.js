const {sequelize} = require("../config/databaseConnection");
const dataBaseModel = require('../model/databaseModel')(sequelize);
const {sendResponse, getDecodedToken} = require("../utils");

const restaurantController = {
	addRestaurant: async (req, res) => {
		let transaction;

		try {
			let token = req.headers.authorization.split(" ")[1];
			let decodedToken = getDecodedToken(token);
			if (!decodedToken) {
				return sendResponse(res, 401, "Invalid token");
			}

			let managerId = decodedToken.managerId;

			let name = req.body.name;
			let street = req.body.street;
			let city = req.body.city;
			let postalCode = req.body.postalCode;
			let country = req.body.country;

			transaction = await sequelize.transaction();

			let adresse = await dataBaseModel.Adresse.create({
				street: street,
				city: city,
				postalCode: postalCode,
				country: country,
			}, {transaction});

			let restaurant = await dataBaseModel.Restaurant.create({
				name: name,
				adresseId: adresse.id,
				GerantRestaurantId: managerId
			}, {transaction});

			await adresse.update({RestaurantId: restaurant.id}, {transaction});

			await transaction.commit();

			sendResponse(res, 201, "Restaurant added successfully");
		} catch (error) {
			if (transaction) await transaction.rollback();
			console.error(error);
			sendResponse(res, 500, error.message);
		}
	},

	deleteRestaurant: async (req, res) => {
		let transaction;

		try {
			let token = req.headers.authorization.split(" ")[1];
			let decodedToken = getDecodedToken(token);
			if (!decodedToken) {
				return sendResponse(res, 401, "Invalid token");
			}

			let managerId = decodedToken.managerId;

			let restaurantId = req.body.restaurantId;

			transaction = await sequelize.transaction();

			let restaurant = await dataBaseModel.Restaurant.findOne({
				where: {id: restaurantId},
			});

			if (!restaurant) {
				return sendResponse(res, 404, "Restaurant not found");
			}

			if (restaurant.GerantRestaurantId !== managerId) {
				return sendResponse(res, 401, "You don't have the permission to delete this restaurant");
			}

			await dataBaseModel.Adresse.destroy({where: {RestaurantId: restaurantId}}, {transaction});
			await dataBaseModel.Restaurant.destroy({where: {id: restaurantId}}, {transaction});

			await transaction.commit();

			sendResponse(res, 200, "Restaurant deleted successfully");
		} catch (error) {
			if (transaction) await transaction.rollback();
			console.error(error);
			sendResponse(res, 500, error.errors[0].message);
		}
	},

	getAllRestaurants: async (req, res) => {
		try {
			const restaurantLIst = await dataBaseModel.Restaurant.findAll({
				include: [{
					model: dataBaseModel.Adresse,
					attributes: ["street", "city", "postalCode", "country"],
				}],
			});


			sendResponse(res, 200, "Restaurants fetched successfully", {restaurantLIst});
		} catch (error) {
			console.error(error);
			sendResponse(res, 500, error.message);
		}
	},
};

module.exports = restaurantController;
