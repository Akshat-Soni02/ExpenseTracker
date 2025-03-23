import ErrorHandler from "../middlewares/error.js";
import group from "../models/group.js";
import { updateFriendlyExchangeStatesOnLending } from "./userService.js";

export const formatMembers = (memberIds) => {
    return memberIds.map((memberId, index) => ({
        member_id: memberId,
        other_members: memberIds
        .filter((otherId) => otherId !== memberId)
        .map((otherMemberId) => ({
            other_member_id: otherMemberId,
            amount: 0,
            exchange_status: "settled",
        })),
    }));
};

export const findGroupById = async (id) => {
    const curGroup = await group.findById(id);
    if (!curGroup) return null;
    return curGroup;
}

export const findUserGroups = async (id) => {
    const groups = await group.find({"members.member_id": id});
    if(!groups) throw new Error("Error finding user groups");
    return groups;
}

export const distributeAmount = async ({ groupId, giverId, borrowers }) => {
    let currGroup = null;
    
    try{
        currGroup = await group.findById(groupId).select("members");
    }
    catch(err){
        console.log("Error finding group",err);
    }

    if (!currGroup) throw new Error("No group with the given ID");
    console.log("this is the giver id,", giverId);
    const lender = currGroup.members.find(m => m.member_id.toString() === giverId.toString());
    if(!lender) throw new Error("lender not found");
    console.log("borrowers in hereeeee,", borrowers);
    for (const { user_id: borrowerId, amount } of borrowers) {
        const res = updateTransaction(lender, borrowerId.toString(), amount, "lended"); //settled
        if(!res)
        {
            throw new Error("cannot update group info for adding expense");
            // return error 
        }
        const borrower = currGroup.members.find(m => m.member_id.toString() === borrowerId.toString());
        if (borrower) {
            updateTransaction(borrower, giverId.toString(), amount, "borrowed"); //settled
        }
    }
    await currGroup.save();
    console.log("Grouppppp done");
};

const updateTransaction = (member, otherMemberId, amount, type) => {
    const transaction = member.other_members.find(
        t => t.other_member_id.toString() === otherMemberId
    );
    if (!transaction) return null;
    console.log("Here Transaction",transaction);
    if (transaction.exchange_status === type) {
        transaction.amount += amount;
    } else if (transaction.exchange_status === "settled") {
        transaction.amount = amount;
        transaction.exchange_status = type;
    } else {
        if(transaction.amount === amount)
        {
            transaction.amount = 0;
            transaction.exchange_status = "settled";
        }
        else if(transaction.amount < amount)
        {
            transaction.amount = amount - transaction.amount;
            transaction.exchange_status = type;
        }
        else
        {
            transaction.amount -= amount;
        }
    }
    transaction.amount = transaction.amount;
    const updatedMember = member;
    updatedMember.otherMembers = transaction;

    return updatedMember;
};

/////////////////////

// const group = {
//     members: [
//             {
//                 member_id: "1ac",
//                 "other_members": [
//                     {
//                         "other_member_id": "2ac",
//                         "amount": 200,
//                         "exchange_status": "lended",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "3ca",
//                         "amount": 0,
//                         "exchange_status": "settled",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "4de",
//                         "amount": 100,
//                         "exchange_status": "borrowed",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     }
//                 ],
//                 "_id": "67c1a4977ad42b6345fae882"
//             },
//             {
//                 "member_id": "2ac",
//                 "other_members": [
//                     {
//                         "other_member_id": "1ac",
//                         "amount": 200,
//                         "exchange_status": "borrowed",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "3ca",
//                         "amount": 150,
//                         "exchange_status": "lended",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "4de",
//                         "amount": 0,
//                         "exchange_status": "settled",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                 ],
//                 "_id": "67c1a4977ad42b6345fae885"
//             },
//             {
//                 member_id: "3ca",
//                 "other_members": [
//                     {
//                         "other_member_id": "1ac",
//                         "amount": 0,
//                         "exchange_status": "settled",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "2ac",
//                         "amount": 150,
//                         "exchange_status": "borrowed",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "4de",
//                         "amount": 50,
//                         "exchange_status": "lended",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     }
//                 ],
//                 "_id": "67c1a4977ad42b6345fae882"
//             },
//             {
//                 member_id: "4de",
//                 "other_members": [
//                     {
//                         "other_member_id": "1ac",
//                         "amount": 100,
//                         "exchange_status": "lended",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "2ac",
//                         "amount": 0,
//                         "exchange_status": "settled",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "3ca",
//                         "amount": 50,
//                         "exchange_status": "borrowed",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     }
//                 ],
//                 "_id": "67c1a4977ad42b6345fae882"
//             }
//         ],
// }

// const simplifyDebts = (group) => {
//     let balances = new Map(); // Store net balance per user

//     // Step 1: Compute net balance for each user
//     group.members.forEach(member => {
//         let memberId = member.member_id.toString();
//         if (!balances.has(memberId)) balances.set(memberId, 0);

//         member.other_members.forEach(transaction => {
//             let otherMemberId = transaction.other_member_id.toString();
//             let amount = transaction.amount;
//             let status = transaction.exchange_status;

//             if (!balances.has(otherMemberId)) balances.set(otherMemberId, 0);

//             if (status === "lended") {
//                 balances.set(memberId, balances.get(memberId) + amount);
//                 balances.set(otherMemberId, balances.get(otherMemberId) - amount);
//             } else if (status === "borrowed") {
//                 balances.set(memberId, balances.get(memberId) - amount);
//                 balances.set(otherMemberId, balances.get(otherMemberId) + amount);
//             }
//         });
//     });
    
//     balances.forEach((value, key) => {
//       balances.set(key, value/2);
//     });
//     console.log(balances);

//     // Step 2: Convert balances to a sorted list of creditors (+ve) and debtors (-ve)
//     let creditors = [];
//     let debtors = [];

//     balances.forEach((balance, userId) => {
//         if (balance > 0) creditors.push({ userId, balance });
//         else if (balance < 0) debtors.push({ userId, balance: -balance });
//     });

//     creditors.sort((a, b) => b.balance - a.balance); // Largest creditor first
//     debtors.sort((a, b) => b.balance - a.balance);   // Largest debtor first

//     let simplifiedTransactions = [];

//     // Step 3: Match debtors with creditors
//     let i = 0, j = 0;
//     while (i < debtors.length && j < creditors.length) {
//         let debtor = debtors[i];
//         let creditor = creditors[j];

//         let minAmount = Math.min(debtor.balance, creditor.balance);
//         simplifiedTransactions.push({
//             from: debtor.userId,
//             to: creditor.userId,
//             amount: minAmount
//         });

//         debtor.balance -= minAmount;
//         creditor.balance -= minAmount;

//         if (debtor.balance === 0) i++;
//         if (creditor.balance === 0) j++;
//     }
//     console.log(simplifiedTransactions);
//     return simplifiedTransactions;
// };

// function transactionsToMatrix(transactions, n) {
//   // Extract unique keys
//   let uniqueKeys = new Set();
//   transactions.forEach(({ from, to }) => {
//     uniqueKeys.add(from);
//     uniqueKeys.add(to);
//   });

//   // Map each unique key to an index (0 to n-1)
//   let keysArray = Array.from(uniqueKeys).slice(0, n); // Ensure max n keys
//   let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));

//   // Initialize an n × n matrix filled with 0s
//   let matrix = Array.from({ length: n }, () => Array(n).fill(0));

//   // Populate the matrix with transactions
//   transactions.forEach(({ from, to, amount }) => {
//     if (keyToIndex[from] !== undefined && keyToIndex[to] !== undefined) {
//       let i = keyToIndex[from];
//       let j = keyToIndex[to];
//       matrix[i][j] = -amount; // From i to j (negative)
//       matrix[j][i] = amount;  // From j to i (positive)
//     }
//   });

//   return { matrix, keysArray };
// }

// function membersToMatrix(members, n, keysArray) {
//   // Extract unique member IDs
//   let uniqueKeys = new Set();
//   members.forEach(({ member_id, other_members }) => {
//     uniqueKeys.add(member_id);
//     other_members.forEach(({ other_member_id }) => uniqueKeys.add(other_member_id));
//   });

//   // Map each unique member_id to an index (0 to n-1)
//   let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));

//   // Initialize an n × n matrix filled with 0s
//   let matrix = Array.from({ length: n }, () => Array(n).fill(0));

//   // Populate the matrix with transactions
//   members.forEach(({ member_id, other_members }) => {
//     let i = keyToIndex[member_id]; // Get index of member_id
//     if (i === undefined) return; // Skip if member_id is not in the index map

//     other_members.forEach(({ other_member_id, amount, exchange_status }) => {
//       let j = keyToIndex[other_member_id]; // Get index of other_member_id
//       if (j === undefined) return; // Skip if other_member_id is not in the index map
//       if (i === j) return; // Keep diagonal 0

//       if (exchange_status === "lended") {
//         matrix[i][j] = +amount;
//       } else if (exchange_status === "borrowed") {
//         matrix[i][j] = -amount;
//       } else if (exchange_status === "settled") {
//         matrix[i][j] = 0;
//       }
//     });
//   });

//   return { matrix, keysArray };
// }

// function subtractMatrices(matrix1, matrix2) {
//   let n = matrix1.length;

//   // Ensure both matrices are of the same size
//   if (n !== matrix2.length || matrix1.some((row, i) => row.length !== matrix2[i].length)) {
//     throw new Error("Matrix dimensions do not match");
//   }

//   // Perform element-wise subtraction
//   let result = Array.from({ length: n }, (_, i) =>
//     Array.from({ length: n }, (_, j) => matrix1[i][j] - matrix2[i][j])
//   );

//   return result;
// }

// const makeDebtMatrix = () => {
//     let transactions = simplifyDebts(group);
//     let n = 4;
//     let { matrix: simplifyMatrix, keysArray } = transactionsToMatrix(transactions, n);
//     let { matrix: earlierMatrix } = membersToMatrix(group.members, n, keysArray);
//     let subtractedMatrix = subtractMatrices(simplifyMatrix, earlierMatrix)
//     console.log("Keys Mapping:", keysArray);
//     console.log("Resulting Matrix:", simplifyMatrix);
//     console.log("earlier below");
//     console.log("Resulting Matrix:", earlierMatrix);
//     console.log("subtracted Matrix:", subtractedMatrix)
// }

// makeDebtMatrix();
/////////////////////////////////////

const simplifyDebts = (group) => {
    let balances = new Map();

    group.members.forEach(member => {
        let memberId = member.member_id.toString();
        if (!balances.has(memberId)) balances.set(memberId, 0);

        member.other_members.forEach(transaction => {
            let otherMemberId = transaction.other_member_id.toString();
            let amount = transaction.amount;
            let status = transaction.exchange_status;

            if (!balances.has(otherMemberId)) balances.set(otherMemberId, 0);

            if (status === "lended") {
                balances.set(memberId, balances.get(memberId) + amount);
                balances.set(otherMemberId, balances.get(otherMemberId) - amount);
            } else if (status === "borrowed") {
                balances.set(memberId, balances.get(memberId) - amount);
                balances.set(otherMemberId, balances.get(otherMemberId) + amount);
            }
        });
    });
    
    balances.forEach((value, key) => {
      balances.set(key, value/2);
    });
    console.log(balances);

    let creditors = [];
    let debtors = [];

    balances.forEach((balance, userId) => {
        if (balance > 0) creditors.push({ userId, balance });
        else if (balance < 0) debtors.push({ userId, balance: -balance });
    });

    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => b.balance - a.balance);

    let simplifiedTransactions = [];

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];

        let minAmount = Math.min(debtor.balance, creditor.balance);
        simplifiedTransactions.push({
            from: debtor.userId,
            to: creditor.userId,
            amount: minAmount
        });

        debtor.balance -= minAmount;
        creditor.balance -= minAmount;

        if (debtor.balance === 0) i++;
        if (creditor.balance === 0) j++;
    }
    let n = creditors.length + debtors.length;
    console.log(simplifiedTransactions);
    // return {transactions: simplifiedTransactions, n};
    return simplifiedTransactions;
};

function transactionsToMatrix(transactions, n, keysArray) {
    let uniqueKeys = new Set();
    transactions.forEach(({ from, to }) => {
        uniqueKeys.add(from);
        uniqueKeys.add(to);
    });

    // let keysArray = Array.from(uniqueKeys).slice(0, n);
    let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));

    let matrix = Array.from({ length: n }, () => Array(n).fill(0));

    transactions.forEach(({ from, to, amount }) => {
        if (keyToIndex[from] !== undefined && keyToIndex[to] !== undefined) {
        let i = keyToIndex[from];
        let j = keyToIndex[to];
        matrix[i][j] = -amount;
        matrix[j][i] = amount;
        }
    });

    return matrix;
}


function membersToMatrix(members, n, keysArray) {
    // Extract unique member IDs
    let uniqueKeys = new Set();
    members.forEach(({ member_id, other_members }) => {
        uniqueKeys.add(member_id);
        other_members.forEach(({ other_member_id }) => uniqueKeys.add(other_member_id));
    });

    // Map each unique member_id to an index (0 to n-1)
    let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));

    // Initialize an n × n matrix filled with 0s
    let matrix = Array.from({ length: n }, () => Array(n).fill(0));

    // Populate the matrix with transactions
    members.forEach(({ member_id, other_members }) => {
        let i = keyToIndex[member_id]; // Get index of member_id
        if (i === undefined) return; // Skip if member_id is not in the index map

        other_members.forEach(({ other_member_id, amount, exchange_status }) => {
        let j = keyToIndex[other_member_id]; // Get index of other_member_id
        if (j === undefined) return; // Skip if other_member_id is not in the index map
        if (i === j) return; // Keep diagonal 0

        if (exchange_status === "lended") {
            matrix[i][j] = +amount;
        } else if (exchange_status === "borrowed") {
            matrix[i][j] = -amount;
        } else if (exchange_status === "settled") {
            matrix[i][j] = 0;
        }
        });
    });

    return { matrix, keysArray };
}

function subtractMatrices(matrix1, matrix2) {
    let n = matrix1.length;

    // Ensure both matrices are of the same size
    if (n !== matrix2.length || matrix1.some((row, i) => row.length !== matrix2[i].length)) {
        throw new Error("Matrix dimensions do not match");
    }

    // Perform element-wise subtraction
    let result = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => matrix1[i][j] - matrix2[i][j])
    );

    return result;
}

const updateGroupToSimplify = async (matrix, group, keysArray) => {
    let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));
    console.log("keytoindex",keyToIndex);
    group.members.forEach((member) => {
        member.other_members.forEach((other_member) => {
            console.log("otherMember", other_member);
            let i = keyToIndex[member.member_id];
            if (i === undefined) return;
            let j = keyToIndex[other_member.other_member_id];
            if (j === undefined) return;
            if (i === j) return;
            console.log("ij", i+" "+j);
            other_member.amount = Math.abs(matrix[i][j]);
            other_member.exchange_status = matrix[i][j] > 0 ? "lended" : matrix[i][j] < 0 ? "borrowed" : "settled";
        });
    });
    await group.save();
//save group in mongo
}

const updateUserToSimplify = async (matrix, keysArray) => {
    let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));
    console.log("keytoindex",keyToIndex);
    let size = keysArray.length;
    for(let i=0;i<size;i++) {
        for(let j=i+1;j<size;j++) {
            if(matrix[i][j] === 0) continue;
            if(matrix[i][j] > 0) {
                await updateFriendlyExchangeStatesOnLending({lender_id: keysArray[i],borrowers: [{user_id: keysArray[j],amount: matrix[i][j]}] });
            } else await updateFriendlyExchangeStatesOnLending({lender_id: keysArray[j],borrowers: [{user_id: keysArray[i],amount: -matrix[i][j]}] });
        }
    }    
}


export const simplifyDebtsService = async ({group, memberSize}) => {
    //get simplified debts
    let keysArray = [];
    let n = memberSize;
    group.members.forEach((member) => keysArray.push(member.member_id));
    let transactions = simplifyDebts(group, keysArray);
    console.log("transsjfakldj",transactions);
    console.log("nnnn", n);
    if(!transactions) throw new Error("Error getting simplify debts transactions");
    if(transactions.length === 0) return;
    //convert simplified debts into matrix format
    let simplifyMatrix = transactionsToMatrix(transactions, n, keysArray);
    if(!simplifyMatrix) throw new Error("Error getting simplify matrix from transactions");
    if(!keysArray) throw new Error("Error getting keysArray transactions");
    console.log("keyarray", keysArray);
    //convert members to matrix format
    let { matrix: earlierMatrix } = membersToMatrix(group.members, n, keysArray);
    if(!earlierMatrix) throw new Error("Error getting members matrix");
    //update group
    await updateGroupToSimplify(simplifyMatrix, group, keysArray);
    //substract (members matrix - simplified matrix)
    let subtractedMatrix = subtractMatrices(simplifyMatrix, earlierMatrix)
    await updateUserToSimplify(subtractedMatrix,keysArray);
    console.log("Keys Mapping:", keysArray);
    console.log("Resulting Matrix:", simplifyMatrix);
    console.log("earlier matrix: ", earlierMatrix);
    console.log(group.members[0]);
    console.log(group.members[1]);
    console.log(group.members[2]);
    console.log(group.members[3]);
    console.log("subtracted Matrix:", subtractedMatrix)
}

