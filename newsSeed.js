import mongoose from "mongoose";
import News from "./models/News.js"; // adjust path if needed

// MongoDB connection (no dotenv, direct string)
mongoose.connect(
  "mongodb+srv://maharshibhattisro_db_user:UpkuqZEye20QSVzv@gramseva.wnrvl4e.mongodb.net/GramSeva?retryWrites=true&w=majority&appName=Gramseva"
);

const seedNews = async () => {
  try {
    const newsData = [
      {
        title: "Village Farmers Adopt Solar Pumps",
        description: "Farmers in Rampur village have installed solar water pumps, reducing electricity costs and increasing crop yield.",
        content: "Farmers in Rampur village have installed solar-powered water pumps. This initiative has significantly reduced electricity costs and boosted crop yield, making agriculture more sustainable.",
        category: "agriculture",
        source: "GramSeva Reporter",
      },
      {
        title: "New Library Opens in Rural School",
        description: "A modern library with 2000 books has been inaugurated in the government school of Sundarpur.",
        content: "Students in Sundarpur now have access to a new library containing over 2000 books. This facility is expected to improve literacy and encourage a reading habit among children.",
        category: "education",
        source: "Local News",
      },
      {
        title: "Village Women Start Dairy Cooperative",
        description: "Women in Lakshmipur village have started a dairy cooperative, supplying milk to nearby towns.",
        content: "In Lakshmipur, women have united to form a dairy cooperative. The group collects, processes, and sells milk to nearby towns, empowering rural women economically.",
        category: "economy",
        source: "GramSeva News",
      },
      {
        title: "Mobile Health Van Launched",
        description: "A mobile health van will visit Khajuri village twice a week to provide free checkups and medicines.",
        content: "The mobile health van project has been launched in Khajuri village. It will provide free medical checkups, distribute essential medicines, and raise awareness about hygiene.",
        category: "health",
        source: "Government Initiative",
      },
      {
        title: "Organic Farming Training Held",
        description: "Farmers in Bansipur attended a two-day workshop on organic farming techniques.",
        content: "Bansipur village hosted a workshop on organic farming. Farmers learned how to reduce chemical usage and adopt eco-friendly techniques for better soil health.",
        category: "agriculture",
        source: "Agri Dept",
      },
      {
        title: "Village Road Renovation Completed",
        description: "The main road of Shantipur village has been renovated, reducing travel time to the nearest city.",
        content: "The main road in Shantipur has been rebuilt and widened, ensuring faster travel to the nearest city. Transporting goods and commuting for jobs will now be easier.",
        category: "infrastructure",
        source: "GramSeva Reporter",
      },
      {
        title: "Rainwater Harvesting Project Begins",
        description: "Villagers of Rampur have started a rainwater harvesting initiative to tackle water scarcity.",
        content: "Rampur village has launched a rainwater harvesting project to fight water scarcity. The collected water will be used for both farming and household purposes.",
        category: "environment",
        source: "Gram Panchayat",
      },
      {
        title: "Skill Training for Rural Youth",
        description: "A training camp has been organized in Bhawanipur to teach tailoring and carpentry to local youth.",
        content: "Bhawanipur village organized a skill training camp where young villagers were trained in tailoring and carpentry. This initiative aims to improve self-employment opportunities.",
        category: "employment",
        source: "NGO Report",
      },
      {
        title: "Cultural Festival in Sundarpur",
        description: "Villagers celebrated their annual cultural festival with folk dance and traditional food stalls.",
        content: "Sundarpur’s annual cultural festival saw active participation with folk dances, music performances, and food stalls. The event promoted local heritage and traditions.",
        category: "culture",
        source: "Local Reporter",
      },
      {
        title: "Free WiFi Zone in Panchayat Office",
        description: "Panchayat office of Kalyanpur village now has free WiFi access for students and residents.",
        content: "Kalyanpur Panchayat has introduced a free WiFi zone for villagers. Students can now study online and access digital resources for education.",
        category: "technology",
        source: "GramSeva News",
      },
    ];

    await News.insertMany(newsData);
    console.log("✅ 10 news articles inserted successfully!");
    process.exit();
  } catch (err) {
    console.error("❌ Error inserting news:", err);
    process.exit(1);
  }
};

seedNews();
