const { listCards } = require("../lib/drive");

module.exports = async (req, res) => {
  if (req.method && req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end();
    return;
  }

  try {
    const cards = await listCards();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ cards }));
    console.log("cards", cards);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error:
          error.message ||
          "Could not load images from Google Drive. Check that the folder is shared with anyone who has the link.",
      })
    );
  }
};
