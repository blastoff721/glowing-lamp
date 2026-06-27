import axios from "axios";

export default async function handler(req, res) {
  try {
    const merchantOrderId = `YTK_${Date.now()}`;

    res.status(200).json({
      success: true,
      merchantOrderId
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
