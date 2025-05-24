export const MESSAGES = {
    RESOURCE_CREATED: (resource) => `${resource} created successfully.`,
    RESOURCE_UPDATED: (resource) => `${resource} updated successfully.`,
    DELETED: "Deleted successfully",
    ERROR: "Something went wrong",
    FETCHED: (resource) => `${resource} fetched.`,
    NOT_FOUND: (resource) => `${resource} not found`,
    INVALID_INPUT: "Invalid input provided",
    UNAUTHORIZED: "Unauthorized access",
    MISSING_FIELDS: (fields) => `Required field${fields.length > 1 ? "s -" : "-"} ${fields.join(", ")} ${fields.length > 1 ? "are" : "is"} missing.`,
};

export const STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
};

