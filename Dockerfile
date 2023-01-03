FROM node:latest

# Set timezone
RUN ln -fs /usr/share/zoneinfo/Europe/Zurich /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

WORKDIR /app

COPY package.json package.json
RUN npm install

