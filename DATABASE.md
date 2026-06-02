# Database

## Technology Choice
Firestore (NoSQL document database, GCP native). No SQL schema — 
data is stored as collections of documents with flexible fields.

## Collections

### `users`
Document ID = Firebase Auth UID

| Field | Type | Description |
|---|---|---|
| uid | string | Firebase Auth UID |
| name | string | Display name |
| age | number | User age |
| bio | string | Short bio |
| photos | string[] | Ordered array of photo URLs |
| verified | boolean | Whether email is verified |
| createdAt | timestamp | Account creation time |

### `hangouts`
Document ID = auto-generated

| Field | Type | Description |
|---|---|---|
| id | string | Auto-generated document ID |
| hostUid | string | UID of the host user |
| title | string | Hangout title |
| vibe | string | coffee, food, explore, or chill |
| location | string | Human-readable location name |
| lat | number | Latitude from Geolocation API |
| lng | number | Longitude from Geolocation API |
| datetime | timestamp | When the hangout happens |
| maxPeople | number | Maximum attendees |
| description | string | Full description |
| status | string | active, closed, or cancelled |
| createdAt | timestamp | When post was created |

### `requests`
Document ID = auto-generated

| Field | Type | Description |
|---|---|---|
| id | string | Auto-generated document ID |
| hangoutId | string | Reference to the hangout |
| requesterUid | string | UID of requesting user |
| status | string | pending, approved, or declined |
| createdAt | timestamp | When request was made |

### `notifications`
Document ID = auto-generated

| Field | Type | Description |
|---|---|---|
| id | string | Auto-generated document ID |
| uid | string | UID of receiving user |
| type | string | join_request, approved, declined, nearby |
| hangoutId | string | Related hangout ID |
| fromUid | string | UID of user who triggered it |
| read | boolean | Whether notification was seen |
| createdAt | timestamp | When notification was created |

## Relationships

users (1) ──── (many) hangouts        via hangouts.hostUid
users (1) ──── (many) requests        via requests.requesterUid
hangouts (1) ── (many) requests       via requests.hangoutId
users (1) ──── (many) notifications   via notifications.uid

## Notes
- No joins are performed. Related data fetched in separate queries.
- Photos array stores ordered URLs after drag and drop reordering.
- Distance filtering uses Haversine formula on lat/lng fields.