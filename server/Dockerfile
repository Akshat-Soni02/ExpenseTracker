# Use official Node.js 20 image
FROM node:20

# Set working directory inside container
WORKDIR /usr/src/app

# Copy dependency files first
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the app source code
COPY . .

# Expose the port (ensure your app uses process.env.PORT)
EXPOSE 8080

# Set environment variable for production (optional)
ENV NODE_ENV=production

# Start the app
CMD ["npm", "run", "prod"]