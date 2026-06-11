# Database

## Why Firestore

The database of our choice for our app is Firestore which is  a NoSQL document database native to Google Cloud. The main reason is integration: Firestore is part of the Firebase/GCP ecosystem, so it works
directly with Firebase Auth and the rest of my stack with no extra setup and no separate
database server to provision or manage. The document model also suited my data. QLink's entities (a user, a hangout, a request) are mostly self-contained — a user is one complete document rather than data split across tables that would need to be joined back together. Because of that, I didn't need relational joins,
so Firestore's NoSQL nature was a good fit.

## Data Model

### users
Document ID = the Firebase Auth UID (the UID is the document key, not a stored field, so a
user's record is found directly by their auth ID).

    name:       string
    age:        number
    bio:        string
    photos:     string[]    // ordered photo URLs; order is set by drag-and-drop
    updatedAt:  timestamp   // last profile update

### hangouts
Document ID = auto-generated.

    hostUid:     string      // UID of the host (links a hangout to its creator)
    title:       string
    vibe:        string      // "coffee" | "food" | "explore" | "chill"
    location:    string      // human-readable place name
    lat:         number      // from the Geolocation API (0 if not pinned)
    lng:         number      // from the Geolocation API (0 if not pinned)
    datetime:    string      // ISO datetime string from the form
    maxPeople:   number|string  // see note below — stored inconsistently across documents
    description: string
    status:      string      // "active" | "closed" | "cancelled"
    createdAt:   timestamp

### requests
Document ID = auto-generated.

    hangoutId:     string    // which hangout this request is for
    requesterUid:  string    // UID of the user asking to join
    status:        string    // "pending" | "approved" | "declined"
    createdAt:     timestamp

### notifications
Document ID = auto-generated.

    uid:         string      // recipient — who this notification is for
    type:        string      // "join_request" | "approved" | "declined" | "nearby"
    hangoutId:   string      // related hangout
    hangoutTitle: string     // title of the related hangout (denormalized for display)
    fromUid:     string      // who triggered it
    read:        boolean
    createdAt:   timestamp

## Relationships and Reasoning

Firestore has no joins and no foreign keys. To link records, I store the ID of the "one"
side as a field on each document on the "many" side, and query by that field. Every
relationship in QLink is naturally one-to-many: one record on the left connects to many on
the right, but each record on the right belongs to exactly one on the left.

    users      (1) ── (many) hangouts        via hangouts.hostUid
    users      (1) ── (many) requests         via requests.requesterUid
    hangouts   (1) ── (many) requests         via requests.hangoutId
    users      (1) ── (many) notifications    via notifications.uid

**users → hangouts** (`hangouts.hostUid`)
One user can host many hangouts over time, but each hangout has exactly one host — there is
no co-hosting. Each hangout stores the host's `hostUid`, so querying hangouts by `hostUid`
returns all of a user's posts, and the field also tells me who to notify when someone
requests to join.

**users → requests** (`requests.requesterUid`)
One user can send many join-requests to different hangouts, but each request is made by
exactly one person. Each request stores `requesterUid`, so I can look up everything a given
user has asked to join.

**hangouts → requests** (`requests.hangoutId`)
One hangout can receive many requests, but each request is for exactly one hangout. Each
request stores `hangoutId`, so querying requests by `hangoutId` shows a host everyone who
wants to join that specific hangout.

**users → notifications** (`notifications.uid`)
One user can receive many notifications over time, but each notification is addressed to
exactly one recipient. Each notification stores the recipient's `uid`, so a user can load
their own alerts feed in a single query.

**The pattern:** in every relationship the link lives on the "many" side as a stored ID
pointing back to the "one" — the NoSQL equivalent of a foreign key. Notice that a `request`
sits between two of these at once: it points up to a user (`requesterUid`) and up to a
hangout (`hangoutId`), so a request is the document that connects a guest to a hangout
(similar to a join table in a relational database, but here just a document holding two IDs).

## Notes

- No joins are performed; related data is fetched in separate queries (e.g. load a hangout,
  then load its host).
- The `photos` array stores URLs in display order, updated when the user reorders them with
  the drag-and-drop API.
- "Nearby" distance filtering uses the Haversine formula on the `lat`/`lng` fields; `lat`/`lng`
  default to `0` when the host doesn't use the geolocation pin.
- `maxPeople` is stored inconsistently across documents (some as a number, some as a string)
  because it comes from a form input that wasn't type-cast on submit. The app handles both
  when reading. A cleaner version would coerce it to a number before saving.
- `notifications.hangoutTitle` is denormalized — the hangout's title is copied onto the
  notification when it's created, so the alerts feed can display it without a second lookup
  to the hangouts collection.
- Trade-off: the document model means some data is fetched in multiple round-trips rather
  than one join, which is acceptable at QLink's scale and keeps documents small and simple.