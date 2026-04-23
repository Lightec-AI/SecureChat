## Daily Development Setup

- `brew tap mongodb/brew`
- `brew install mongodb-community`
- `brew services start mongodb-community`
- `brew services list | rg mongodb`

- add to .evn file: `MONGO_URI=mongodb://localhost:27017/SecureChat`
OR one time setup:
- `cp .env.example .env`
- `cp librechat.example.yaml librechat.yaml`

- start backend `npm run backend:dev`