FROM node:bullseye

WORKDIR /nox
COPY . .
RUN npm install
ENTRYPOINT tail -f /dev/null