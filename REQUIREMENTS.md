# Requirements

## Look and Feel

**Semantic HTML5**
We use semantic HTML5 elements throughout — `<nav>`, `<main>`, 
`<article>`, `<section>`, `<header>` — avoiding unnecessary 
`<div>` tags where a semantic alternative exists.

**HTML5 APIs (2 required)**
- Geolocation API: Used in CreateHangout component to pin the 
Geolocation API is implemented in CreateHangout — when a user taps the Pin button, the browser requests their location and automatically attaches the coordinates to the hangout post. This means every hangout has real lat/lng data stored in Firestore for future distance filtering.

- Drag and Drop API: Used in ProfilePage to allow users to 
reorder their profile photos.


**Responsive Design**
The app is fully responsive at 320px (mobile), 768px (tablet), 
and 1024px (desktop) using Tailwind CSS breakpoint utilities. 
Mobile uses a bottom navigation bar, desktop uses a left sidebar.

**CSS Framework**
Tailwind CSS is used consistently throughout the entire 
application. No other CSS approaches are mixed in.

**Single Page Application**
Built with React and React Router. Navigation never triggers 
full page reloads. All routing is client-side.
e.g.
After creating a hangout, the app navigates to the feed without any page reload — the new hangout appears immediately in the list.

**Frontend Framework**
React with Vite and TypeScript.

**Backend Framework**
Node.js with Express and TypeScript. Chosen because it was 
taught in lecture and provides a clean separation between 
frontend and backend.

**Accessibility**
- ARIA labels applied to all interactive elements
- Color contrast meets WCAG AA standards
- Tab navigation supported across all pages
- LoadingSpinner announces "Loading" to screen readers via 
aria-live region
- Semantic HTML provides screen reader context throughout

---

## Progressive Web App (PWA)

**Installable**
The app includes a manifest.json with name, icons, and 
display: standalone. Installable on both desktop and mobile.

**Offline Support**
A service worker caches static assets and provides an offline 
fallback page. When offline, the app shows the layout with a 
"Reconnecting..." indicator informing the user data is loading.

**Server-Initiated Notifications**
We use Server-Sent Events (SSE) via an Express endpoint at 
/api/notifications/stream. The server pushes join requests, 
approvals, and nearby hangout alerts to connected clients in 
real time. Demonstrated in the recorded demo.

**HTTPS**
Enforced via GKE ingress with TLS termination.

---

## Authentication and Security

**Authentication Method**

QLink is built around meeting strangers in real cities. That 
means we had to be serious about who is actually behind each 
hangout post and join request — you cannot just let anyone 
in and hope for the best.

We chose Firebase Auth because it gave us both Google SSO 
and JWT token verification in one library without having to 
build any of it ourselves. When someone logs into QLink, 
Firebase issues them a token. Every time they do anything — 
create a hangout, send a request, check their notifications 
— that token travels with the request to our server, which 
checks it is real before doing anything else.

We specifically wanted Google SSO because it raises the bar 
for fake accounts. Creating ten fake Gmail accounts is 
meaningfully harder than creating ten fake email addresses. 
For an app where people are physically meeting up, that 
extra layer of credibility matters.

We built auth before any other QLink feature because 
everything depends on it. You cannot show someone their 
own hangouts without knowing who they are. You cannot 
notify the right person when their request gets approved 
without knowing who sent it. Getting auth right first 
meant we never had to go back and rewire anything.

On the server side we kept Firebase setup and auth 
checking deliberately separate. One file gives the server 
its Firebase credentials. Another file — the middleware — 
uses those credentials to check every incoming request. 
If someone sends a request without a valid token, or tries 
to tamper with one, they get a 401 back before we touch 
a single piece of QLink data. We liked this separation 
because if we ever needed to change how we verify tokens, 
we only touch one file.

**Password Hashing**
Firebase Auth handles password hashing internally using 
industry standard methods. We did not implement our own 
hashing — we trusted Firebase to do it correctly so we 
could focus on building QLink.

**Route Protection**
Every QLink page that requires being logged in is wrapped 
in a ProtectedRoute component. If someone tries to access 
the feed or a hangout detail without being authenticated, 
they get redirected to the login page immediately.

**XSS Mitigation**
We use Helmet.js on the Express server which sets the 
right security headers automatically on every response. 
This protects QLink users from malicious scripts being 
injected through the app.

**CSRF Mitigation**

We lock CORS to QLink's frontend domain using the CLIENT_URL environment variable to make sure no other website can make requests to QLink's server even if a user is logged in. The domain is stored in an environment variable so it automatically switches between localhost in development and the live GKE URL in production.

CORS on our server is locked to the QLink frontend domain 
only. Requests coming from anywhere else get blocked. We 
also enforce SameSite cookie policy so cookies cannot be 
sent from external sites pretending to be QLink.

**Injection Mitigation**
Every database interaction in QLink goes through the 
Firestore SDK. We never write raw queries — the SDK 
handles parameterized queries automatically, which means 
there is no path for injection attacks through our data 
layer.

**Secrets Management**
No API keys, Firebase credentials, or Gemini keys are 
hardcoded anywhere in the QLink codebase. Locally they 
live in .env files that are gitignored. In production 
they live in GKE Secrets. Anyone who clones the repo 
gets no credentials.

## Backend and Persistent Data

**Database**
Firestore (GCP native). Chosen because it integrates naturally 
with Firebase Auth, has a free tier, requires no SQL schema 
management, and fits the document-based data model of user 
profiles and hangout posts.

**ORM/ODM**
Firestore SDK used for all database interactions, satisfying 
the ODM requirement.

**Routes**
"We built three core route files — hangouts, requests, and users. Every single route is protected by auth middleware, meaning no QLink data can be read or written without a verified user. We checked for duplicate join requests on the server side so a user cannot spam request the same hangout twice. We also check ownership before allowing deletes — only the host who created a hangout can cancel it."

We discovered that combining Firestore's where() and orderBy() on the same query requires a composite index. Rather than blocking feed functionality while waiting for the index to build, we removed the orderBy() temporarily and will add it back with the proper index configured in Firestore console.

---

## AI Integration

**Provider**
Gemini 2.5 Flash via Google AI Studio free tier.

**Usage**
- Content moderation: When a user creates a hangout post, 
the content is sent to Gemini for moderation before going 
live. Inappropriate content is flagged and rejected.
- Icebreaker generation: Once a user is approved to join a 
hangout, Gemini generates a contextual icebreaker question 
based on the hangout vibe and description.

---

## Systems and Deployment

**GKE**
Deployed on Google Kubernetes Engine with 2 e2-micro nodes 
and 2 pod replicas per Deployment (client and server). 
Self-healing demonstrated in the recorded demo by killing a 
pod and showing Kubernetes recreate it automatically. Manual 
scaling demonstrated by modifying the replica spec.

**CI/CD**
GitHub Actions triggers on every push to main. The pipeline 
builds Docker images, pushes to Google Container Registry, 
and applies Kubernetes manifests via kubectl. No manual 
kubectl apply is ever used.

---

## AI Usage in Development

The following parts of this project were assisted by AI:
- Initial folder structure scaffolding
- Boilerplate component shells
- Tailwind class generation for responsive layouts
- Kubernetes YAML configuration
- GitHub Actions workflow

All AI-generated code was reviewed, understood, and modified 
by the developer. The developer is responsible for all bugs 
and architectural decisions.

---


## User Experience

# Responsiveness
QLink uses a bottom navigation bar on mobile because users are out in the city, often holding their phone with one hand. Bottom nav keeps all pages reachable with one thumb. On desktop, a left sidebar gives more space and fits how people naturally scan screens from left to right.

# Error Handling
The feed page shows an empty state with a prompt to create the first hangout when no hangouts exist nearby. This was a deliberate choice — a blank screen would confuse users, but a clear message like 'Be the first to create one' turns an empty state into an invitation."