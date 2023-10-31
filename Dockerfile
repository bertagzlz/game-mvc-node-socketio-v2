FROM node:18

WORKDIR /usr/src/app
COPY package*.json ./



COPY . .
RUN npm ci
# no se usa, render usa su propio puerto
# EXPOSE 4111
# EXPOSE 9090

 CMD ["npm", "run", "start"]
# CMD [ "node", "index.js" ]
# CMD ["npm", "run", "develop"]
# construyo la imagen
# docker build -f ./Dockerfile -t game-mvc-node-socket .

# Veo si se ha creado la imagen 1.12Gb
# docker image ls

# Ejecuto en local para probarla
# docker run -p 4111:4111 game-mvc-node-socket

#docker container run -dp 4111:4111 -t game-mvc-node-socket