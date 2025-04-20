import axios from 'axios';

const BUDGETPREDICTION_API_URL = 'http://localhost:5000/predict';

export const getBudgetPredictionResponse = async (data) => {
    try {
        const response = await axios.post(BUDGETPREDICTION_API_URL, { data });
        return response.data;  // { intent: "some_intent", response: "Detected intent: some_intent" }
    } catch (error) {
        console.error("Error connecting to budget prediction API:", error);
        throw new Error("Budget Prediction service is unavailable");
    }
};