const express = require('express');
const router = express.Router();

// Static crop data as per requirement - returns exactly this format
const CROP_DATA = [
  {
    "crop_name": "Wheat",
    "min_value": 2150,
    "max_value": 2500,
    "mod_value": 2300
  },
  {
    "crop_name": "Rice (Paddy)",
    "min_value": 1900,
    "max_value": 2200,
    "mod_value": 2050
  },
  {
    "crop_name": "Maize",
    "min_value": 1800,
    "max_value": 2100,
    "mod_value": 1950
  },
  {
    "crop_name": "Cotton",
    "min_value": 6500,
    "max_value": 8000,
    "mod_value": 7200
  },
  {
    "crop_name": "Soybean",
    "min_value": 4600,
    "max_value": 5500,
    "mod_value": 5000
  },
  {
    "crop_name": "Turmeric",
    "min_value": 8000,
    "max_value": 11000,
    "mod_value": 9500
  },
  {
    "crop_name": "Mustard Seed",
    "min_value": 4800,
    "max_value": 6000,
    "mod_value": 5400
  },
  {
    "crop_name": "Groundnut",
    "min_value": 3500,
    "max_value": 5000,
    "mod_value": 4200
  },
  {
    "crop_name": "Sugarcane",
    "min_value": 400,
    "max_value": 600,
    "mod_value": 500
  },
  {
    "crop_name": "Potato",
    "min_value": 1100,
    "max_value": 1800,
    "mod_value": 1500
  },
  {
    "crop_name": "Onion",
    "min_value": 1000,
    "max_value": 1600,
    "mod_value": 1300
  },
  {
    "crop_name": "Tomato",
    "min_value": 1200,
    "max_value": 2000,
    "mod_value": 1600
  },
  {
    "crop_name": "Brinjal (Eggplant)",
    "min_value": 900,
    "max_value": 1400,
    "mod_value": 1100
  },
  {
    "crop_name": "Cabbage",
    "min_value": 700,
    "max_value": 1200,
    "mod_value": 900
  },
  {
    "crop_name": "Cauliflower",
    "min_value": 800,
    "max_value": 1300,
    "mod_value": 1000
  },
  {
    "crop_name": "Chili (Green)",
    "min_value": 2500,
    "max_value": 3500,
    "mod_value": 3000
  },
  {
    "crop_name": "Chili (Dry)",
    "min_value": 6000,
    "max_value": 9000,
    "mod_value": 7500
  },
  {
    "crop_name": "Ginger",
    "min_value": 9000,
    "max_value": 13000,
    "mod_value": 11000
  },
  {
    "crop_name": "Garlic",
    "min_value": 12000,
    "max_value": 16000,
    "mod_value": 14000
  },
  {
    "crop_name": "Coriander Seed",
    "min_value": 5000,
    "max_value": 7000,
    "mod_value": 6000
  },
  {
    "crop_name": "Fenugreek",
    "min_value": 4500,
    "max_value": 6500,
    "mod_value": 5500
  },
  {
    "crop_name": "Mustard (Yellow)",
    "min_value": 4700,
    "max_value": 6200,
    "mod_value": 5500
  },
  {
    "crop_name": "Sesame",
    "min_value": 9000,
    "max_value": 12000,
    "mod_value": 10500
  },
  {
    "crop_name": "Sorghum (Jowar)",
    "min_value": 2000,
    "max_value": 2600,
    "mod_value": 2300
  },
  {
    "crop_name": "Pearl Millet (Bajra)",
    "min_value": 1800,
    "max_value": 2400,
    "mod_value": 2100
  },
  {
    "crop_name": "Finger Millet (Ragi)",
    "min_value": 3000,
    "max_value": 3800,
    "mod_value": 3400
  },
  {
    "crop_name": "Pulses (Moong)",
    "min_value": 5500,
    "max_value": 7000,
    "mod_value": 6200
  },
  {
    "crop_name": "Pulses (Tur / Arhar)",
    "min_value": 7500,
    "max_value": 9000,
    "mod_value": 8200
  },
  {
    "crop_name": "Pulses (Urad)",
    "min_value": 6500,
    "max_value": 8200,
    "mod_value": 7400
  },
  {
    "crop_name": "Pulses (Chana)",
    "min_value": 5200,
    "max_value": 6800,
    "mod_value": 6000
  },
  {
    "crop_name": "Pulses (Masoor)",
    "min_value": 5000,
    "max_value": 6500,
    "mod_value": 5700
  },
  {
    "crop_name": "Soybean (Black)",
    "min_value": 4800,
    "max_value": 6300,
    "mod_value": 5500
  },
  {
    "crop_name": "Safflower",
    "min_value": 9000,
    "max_value": 12000,
    "mod_value": 10500
  },
  {
    "crop_name": "Sunflower",
    "min_value": 8000,
    "max_value": 11000,
    "mod_value": 9500
  },
  {
    "crop_name": "Sesbania",
    "min_value": 700,
    "max_value": 1100,
    "mod_value": 900
  },
  {
    "crop_name": "Sugar Beet",
    "min_value": 2500,
    "max_value": 3200,
    "mod_value": 2900
  },
  {
    "crop_name": "Tea (Green)",
    "min_value": 20000,
    "max_value": 30000,
    "mod_value": 25000
  },
  {
    "crop_name": "Coffee (Arabica)",
    "min_value": 25000,
    "max_value": 35000,
    "mod_value": 30000
  },
  {
    "crop_name": "Coffee (Robusta)",
    "min_value": 18000,
    "max_value": 26000,
    "mod_value": 22000
  },
  {
    "crop_name": "Rubber",
    "min_value": 12000,
    "max_value": 18000,
    "mod_value": 15000
  },
  {
    "crop_name": "Coconut",
    "min_value": 6000,
    "max_value": 9000,
    "mod_value": 7500
  },
  {
    "crop_name": "Arecanut",
    "min_value": 15000,
    "max_value": 22000,
    "mod_value": 18000
  },
  {
    "crop_name": "Cashew Nuts (Raw)",
    "min_value": 90000,
    "max_value": 130000,
    "mod_value": 110000
  },
  {
    "crop_name": "Almonds",
    "min_value": 150000,
    "max_value": 200000,
    "mod_value": 175000
  },
  {
    "crop_name": "Walnuts",
    "min_value": 120000,
    "max_value": 180000,
    "mod_value": 150000
  },
  {
    "crop_name": "Pistachio",
    "min_value": 220000,
    "max_value": 300000,
    "mod_value": 250000
  },
  {
    "crop_name": "Peanuts (Shelled)",
    "min_value": 8000,
    "max_value": 12000,
    "mod_value": 10000
  },
  {
    "crop_name": "Pumpkin",
    "min_value": 500,
    "max_value": 900,
    "mod_value": 700
  },
  {
    "crop_name": "Watermelon",
    "min_value": 300,
    "max_value": 800,
    "mod_value": 550
  },
  {
    "crop_name": "Muskmelon",
    "min_value": 700,
    "max_value": 1300,
    "mod_value": 1000
  },
  {
    "crop_name": "Mango (Local)",
    "min_value": 4000,
    "max_value": 8000,
    "mod_value": 6000
  },
  {
    "crop_name": "Mango (Alphonso)",
    "min_value": 15000,
    "max_value": 25000,
    "mod_value": 20000
  },
  {
    "crop_name": "Banana (Cavendish)",
    "min_value": 1500,
    "max_value": 2500,
    "mod_value": 2000
  },
  {
    "crop_name": "Banana (Local)",
    "min_value": 1200,
    "max_value": 2000,
    "mod_value": 1600
  },
  {
    "crop_name": "Apple (Kashmiri)",
    "min_value": 20000,
    "max_value": 30000,
    "mod_value": 25000
  },
  {
    "crop_name": "Apple (Shimla)",
    "min_value": 18000,
    "max_value": 28000,
    "mod_value": 23000
  },
  {
    "crop_name": "Grapes (Table)",
    "min_value": 5000,
    "max_value": 9000,
    "mod_value": 7000
  },
  {
    "crop_name": "Grapes (Wine)",
    "min_value": 6000,
    "max_value": 10000,
    "mod_value": 8000
  },
  {
    "crop_name": "Papaya",
    "min_value": 1500,
    "max_value": 2500,
    "mod_value": 2000
  },
  {
    "crop_name": "Pomegranate",
    "min_value": 6000,
    "max_value": 10000,
    "mod_value": 8000
  },
  {
    "crop_name": "Litchi",
    "min_value": 12000,
    "max_value": 18000,
    "mod_value": 15000
  },
  {
    "crop_name": "Guava",
    "min_value": 1200,
    "max_value": 2200,
    "mod_value": 1800
  },
  {
    "crop_name": "Lychee (Imported)",
    "min_value": 18000,
    "max_value": 25000,
    "mod_value": 22000
  },
  {
    "crop_name": "Pineapple",
    "min_value": 1500,
    "max_value": 3000,
    "mod_value": 2200
  },
  {
    "crop_name": "Jackfruit",
    "min_value": 800,
    "max_value": 1600,
    "mod_value": 1200
  },
  {
    "crop_name": "Citrus (Orange)",
    "min_value": 2000,
    "max_value": 4000,
    "mod_value": 3000
  },
  {
    "crop_name": "Lemon",
    "min_value": 2500,
    "max_value": 4000,
    "mod_value": 3200
  },
  {
    "crop_name": "Sweet Potato",
    "min_value": 900,
    "max_value": 1500,
    "mod_value": 1200
  },
  {
    "crop_name": "Yam",
    "min_value": 800,
    "max_value": 1400,
    "mod_value": 1100
  },
  {
    "crop_name": "Tapioca (Cassava)",
    "min_value": 900,
    "max_value": 1300,
    "mod_value": 1100
  },
  {
    "crop_name": "Arrowroot",
    "min_value": 400,
    "max_value": 700,
    "mod_value": 550
  },
  {
    "crop_name": "Betel Leaf",
    "min_value": 1200,
    "max_value": 2200,
    "mod_value": 1800
  },
  {
    "crop_name": "Spinach",
    "min_value": 600,
    "max_value": 1000,
    "mod_value": 800
  },
  {
    "crop_name": "Coriander Leaf",
    "min_value": 800,
    "max_value": 1400,
    "mod_value": 1100
  },
  {
    "crop_name": "Mint",
    "min_value": 900,
    "max_value": 1500,
    "mod_value": 1200
  },
  {
    "crop_name": "Cumin Seed",
    "min_value": 10000,
    "max_value": 15000,
    "mod_value": 13000
  },
  {
    "crop_name": "Ajwain",
    "min_value": 8500,
    "max_value": 12500,
    "mod_value": 10500
  },
  {
    "crop_name": "Cardamom (Green)",
    "min_value": 25000,
    "max_value": 35000,
    "mod_value": 30000
  },
  {
    "crop_name": "Cardamom (Black)",
    "min_value": 18000,
    "max_value": 26000,
    "mod_value": 22000
  },
  {
    "crop_name": "Cloves",
    "min_value": 22000,
    "max_value": 32000,
    "mod_value": 28000
  },
  {
    "crop_name": "Pepper (Black)",
    "min_value": 30000,
    "max_value": 45000,
    "mod_value": 38000
  },
  {
    "crop_name": "Pepper (White)",
    "min_value": 35000,
    "max_value": 50000,
    "mod_value": 42000
  },
  {
    "crop_name": "Nutmeg",
    "min_value": 20000,
    "max_value": 30000,
    "mod_value": 25000
  },
  {
    "crop_name": "Vanilla",
    "min_value": 80000,
    "max_value": 120000,
    "mod_value": 100000
  },
  {
    "crop_name": "Saffron",
    "min_value": 300000,
    "max_value": 450000,
    "mod_value": 350000
  },
  {
    "crop_name": "Flaxseed",
    "min_value": 5000,
    "max_value": 8000,
    "mod_value": 6500
  },
  {
    "crop_name": "Sunflower (Hybrid)",
    "min_value": 9000,
    "max_value": 13000,
    "mod_value": 11000
  },
  {
    "crop_name": "Olive (Table)",
    "min_value": 12000,
    "max_value": 20000,
    "mod_value": 15000
  },
  {
    "crop_name": "Olive (Oil)",
    "min_value": 18000,
    "max_value": 26000,
    "mod_value": 22000
  },
  {
    "crop_name": "Sesame (Black)",
    "min_value": 9000,
    "max_value": 13000,
    "mod_value": 11000
  },
  {
    "crop_name": "Sesame (White)",
    "min_value": 9500,
    "max_value": 14000,
    "mod_value": 11500
  },
  {
    "crop_name": "Soybean (Yellow)",
    "min_value": 4800,
    "max_value": 6300,
    "mod_value": 5500
  },
  {
    "crop_name": "Paddy (Basmati)",
    "min_value": 2800,
    "max_value": 4000,
    "mod_value": 3300
  },
  {
    "crop_name": "Paddy (Non-Basmati)",
    "min_value": 1700,
    "max_value": 2300,
    "mod_value": 2000
  },
  {
    "crop_name": "Barley",
    "min_value": 1700,
    "max_value": 2100,
    "mod_value": 1900
  },
  {
    "crop_name": "Oats",
    "min_value": 1800,
    "max_value": 2500,
    "mod_value": 2100
  },
  {
    "crop_name": "Wheat (Durum)",
    "min_value": 2400,
    "max_value": 3000,
    "mod_value": 2700
  },
  {
    "crop_name": "Maize (Sweet)",
    "min_value": 2500,
    "max_value": 3300,
    "mod_value": 2900
  },
  {
    "crop_name": "Millet (Proso)",
    "min_value": 2200,
    "max_value": 3000,
    "mod_value": 2600
  },
  {
    "crop_name": "Millet (Foxtail)",
    "min_value": 2500,
    "max_value": 3200,
    "mod_value": 2800
  },
  {
    "crop_name": "Buckwheat",
    "min_value": 6000,
    "max_value": 8000,
    "mod_value": 7000
  },
  {
    "crop_name": "Quinoa",
    "min_value": 15000,
    "max_value": 22000,
    "mod_value": 18000
  },
  {
    "crop_name": "Amaranth (Green)",
    "min_value": 1200,
    "max_value": 2000,
    "mod_value": 1500
  },
  {
    "crop_name": "Amaranth (Grain)",
    "min_value": 5000,
    "max_value": 8000,
    "mod_value": 6500
  },
  {
    "crop_name": "Buckthorn",
    "min_value": 7000,
    "max_value": 10000,
    "mod_value": 8500
  },
  {
    "crop_name": "Lotus Root",
    "min_value": 3000,
    "max_value": 5000,
    "mod_value": 4000
  },
  {
    "crop_name": "Bamboo Shoots",
    "min_value": 1500,
    "max_value": 2500,
    "mod_value": 2000
  }
];

// @route   GET /api/commodity/prices
// @desc    Get crop prices - returns exactly the specified format
// @access  Public
router.get('/prices', async (req, res) => {
  try {
    // Return exactly the format specified in the comment
    res.status(200).json(CROP_DATA);
  } catch (error) {
    console.error('Commodity prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// @route   GET /api/commodity/crops
// @desc    Get crop prices - alternative endpoint
// @access  Public
router.get('/crops', async (req, res) => {
  try {
    // Return exactly the format specified in the comment
    res.status(200).json(CROP_DATA);
  } catch (error) {
    console.error('Commodity crops error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;