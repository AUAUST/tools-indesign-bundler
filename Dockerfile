# Use a Node base image
FROM node:latest

# Set timezone otherwise the timestamps in console logs are wrong
RUN ln -fs /usr/share/zoneinfo/Europe/Zurich /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

# All files are mounted to /app in docker-compose.yml
WORKDIR /app

# Copy and install dependencies in the image to not deal with them in a mount
COPY package.json package.json
RUN npm install

