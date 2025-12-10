FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Criar diretório para uploads de PDFs
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["npm", "start"]