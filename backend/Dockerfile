FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install native dependencies for robust PDF parsing & OCR
RUN apk add --no-cache poppler-utils fontconfig ttf-dejavu tesseract-ocr tesseract-ocr-data-eng

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Expose port
EXPOSE 5000

# Start command
CMD [ "npm", "start" ]
