## Authentication and Security

**Authentication Method**
We use Firebase Authentication with email/password and 
Google SSO. Firebase Auth satisfies the password hashing 
requirement by proxy — Firebase handles bcrypt internally.

**Password Hashing**
Delegated to Firebase Authentication as permitted by the spec.

## Backend and Persistent Data

**Database**
Firestore. Chosen because it is GCP native, has a free tier,
requires no SQL schema management, and its SDK satisfies the 
ODM requirement.

**ORM/ODM**
Firestore SDK used for all database interactions.