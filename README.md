# QLink

The name "QLink" comes from the clink of glasses where people end up sharing a drink as a friendly and close gesture. And the app is inspired by the idea of wanting to turn "alone in a city" into "let's grab something" by helping someone who's alone in a city find people to hang out with. A host posts a hangout (a coffee, a walk, a movie), other users browse a feed of hangouts near them, and they can request to join.

## Features

- Sign in with email/password or Google
- Profile with name, age, bio, and drag-to-reorder photos
- Post a hangout (title, vibe, location pin, date/time, group size, description), screened by AI before going live
- Browse a feed of nearby hangouts and open any one for details
- Request to join, with a real-time notification to the host
- Approve or decline as a host, with a real-time notification back to the requester
- Alerts page that updates live
- Installable PWA that loads offline and queues join requests until reconnected

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router
- **Backend:** Node.js, Express, TypeScript
- **Database:** Firestore (via the Firestore SDK)
- **Auth:** Firebase Authentication (email/password + Google SSO)
- **AI:** Gemini 2.5 Flash (content moderation)
- **Notifications:** Server-Sent Events
- **Deployment:** Docker, Google Kubernetes Engine (GKE), GitHub Actions, nginx

## Repository Structure

```
team16/
  client/              React + Vite frontend
  server/              Express + Node backend
  k8s/                 Kubernetes manifests (deployments, ingress, cert)
  .github/workflows/   GitHub Actions CI/CD pipeline
  client.Dockerfile    Client image (multi-stage build, served by nginx)
  server.Dockerfile    Server image
  nginx.conf           nginx config for serving the SPA
```

A fuller breakdown is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

- Node.js 20+
- npm
- A Firebase project (for Auth + Firestore)
- A Gemini API key (Google AI Studio, free tier)
- For deployment: Docker, the `gcloud` CLI, and a GKE cluster

## Running Locally

### 1. Clone

```bash
git clone <repo-url>
cd team16
```

### 2. Set up environment variables

Both the client and the server need their own `.env` file. These are gitignored and are **not** included in the repo, so you create them yourself.

**`server/.env`**
```
PORT=3001
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your-gemini-key
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-service-account-private-key
```

> The Firebase values come from a Firebase Admin service-account key. Match the exact variable names to `server/src/services/firebase.ts`. The private key contains newline characters; keep them intact (wrap the value in quotes).

**`client/.env`**
```
VITE_API_URL=http://localhost:3001
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

> `VITE_API_URL` is the base URL of the backend. It does **not** include `/api`; the API paths add that themselves.

### 3. Start the server

```bash
cd server
npm install
npx ts-node src/index.ts
```

The server runs on `http://localhost:3001`.

To run the unit tests:

```bash
npm test
```

### 4. Start the client

In a second terminal:

```bash
cd client
npm install
npm run dev
```

The client runs on `http://localhost:5173` and talks to the server at the `VITE_API_URL` you set.

## Building with Docker

Both images are built from the repo root.

**Server image:**
```bash
docker build -f server.Dockerfile -t qlink-server .
```

**Client image:** because Vite compiles a static bundle, the frontend's environment values have to be passed in at build time as build args (not at runtime):
```bash
docker build -f client.Dockerfile \
  --build-arg VITE_API_URL=https://team16.cs144.org \
  --build-arg VITE_FIREBASE_API_KEY=... \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=... \
  --build-arg VITE_FIREBASE_PROJECT_ID=... \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=... \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg VITE_FIREBASE_APP_ID=... \
  -t qlink-client .
```

The client image is multi-stage: it builds the React app, then serves the static output with nginx.

## Deployment (GKE)

QLink runs on Google Kubernetes Engine and is deployed automatically through GitHub Actions. There is no manual `kubectl apply` in the normal workflow.

### One-time setup

These steps prepare the cluster and are done once.

1. **Create the GKE cluster** with at least 2 nodes (QLink uses an `e2-small` node pool).
2. **Create the Kubernetes Secrets** the server reads at runtime (Firebase Admin credentials and the Gemini key). The Firebase private key must be created from a file so its newlines are preserved:
   ```bash
   kubectl create secret generic firebase-key --from-file=private-key=./service-account-key.json
   kubectl create secret generic gemini-key --from-literal=GEMINI_API_KEY=your-gemini-key
   ```
   (Match the secret and key names to what `k8s/server-deployment.yml` references.)
3. **Apply the managed certificate** for HTTPS:
   ```bash
   kubectl apply -f k8s/managed-cert.yml
   ```

### GitHub Actions secrets

The CI/CD pipeline needs these repository secrets (Settings → Secrets and variables → Actions):

- `GCP_SA_KEY` — a GCP service-account key with permission to push to Container Registry and deploy to GKE
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` — passed as build args into the client image

### Deploying

Push to `main`:

```bash
git push origin main
```

This triggers the GitHub Actions pipeline (`.github/workflows/deploy.yml`), which:

1. Runs the server unit tests
2. Builds the client and server Docker images
3. Pushes both to Google Container Registry
4. Applies the Kubernetes manifests in `k8s/` to the cluster

GKE then runs 2 replicas of each deployment, recreates any pod that fails, and the ingress routes HTTPS traffic to the healthy pods at the live domain.
