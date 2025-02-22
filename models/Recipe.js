const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    recipe_name: String,
    ingredients: [{ name: String, amount: String }],
    instructions: String
});

module.exports = mongoose.model('Recipe', recipeSchema);
