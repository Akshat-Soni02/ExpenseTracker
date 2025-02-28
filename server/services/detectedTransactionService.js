import detectedTransaction from "../models/detectedTransaction.js";
import CryptoJS from "crypto-js";

// import CryptoJS from "crypto-js";

export const encryptMessage = (message, secretKey) => {
  return CryptoJS.AES.encrypt(message, secretKey).toString();
};

// // Example usage
// const secretKey = "your-secret-key"; // Store securely
// const message = "Your account XXXX1234 has been debited by ₹5000 on 12-02-2025.";
// const encryptedMessage = encryptMessage(message, secretKey);

// console.log("Encrypted:", encryptedMessage);


export const decryptMessage = (encryptedMessage, secretKey) => {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const extractSMSDetails = (message) => {
    const regex =
    /(Sent|Received) Rs\.?\s*(\d+(?:\.\d{1,2})?) (?:from|in your) (\w+(?: \w+)*) Bank AC (\w+) (?:to|from) (\S+) on (\d{4}-\d{2}-\d{2})\.? UPI Ref[:]? ?(\d+)/i;

    const match = message.match(regex);

    if (match) {
        return {
            transaction_type: match[1].toLowerCase() === "sent" ? "debit" : "credit",
            amount: parseFloat(match[2]),
            bank_name: match[3],
            account_number: match[4],
            party: match[5],
            date: new Date(match[6]), // Date is already in YYYY-MM-DD format
            upi_reference: match[7],
        };
    }
    return null;

};

export const findUserDetectedTransactions = async (id) => {
    const transactions = detectedTransaction.find({user_id: id});
    if(!transactions) throw new Error("Error fetching user auto transactions");
    return transactions;
}  
  // **Testing with Standard Messages**
  const messages = [
    "Sent Rs.40.00 from Kotak Bank AC X4444 to q241747299@ybl on 2025-02-27. UPI Ref 502231073137.",
    "Received Rs.67.00 in your Kotak Bank AC X7015 from kaushalprajapatite@okhdfcbank on 2025-02-27. UPI Ref:100664172215."
  ];
  
//   messages.forEach(msg => console.log(extractTransactionDetails(msg)));
  

