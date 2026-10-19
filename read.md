# Project: Pet Lost & Found Platform
# Stack: MERN (MongoDB, Express, React, Node.js)
# Auth: None (Public access for all features)

## Features:
1. User can post a lost/found dog with: image, breed, color, area, and contact info.
2. Homepage displays a list of all posts (latest first).
3. Filtering system: Filter by Breed, Color, and Area.
4. Clicking a post shows full details and contact information.

## Tech Notes:
- Use Tailwind CSS for UI.
- Use Axios for API calls.
- Use Cloudinary for image storage.

## Setup Instructions:

### Prerequisites:
- Node.js
- MongoDB (local or cloud)
- Cloudinary account for image storage

### Back-end Setup:
1. Navigate to `back-end/` folder
2. Run `npm install`
3. Configure `.env` file with Cloudinary credentials and MongoDB URI
4. Start MongoDB
5. Run `npm start` (starts on port 3000)

### Front-end Setup:
1. Navigate to `front-end-react/` folder
2. Run `npm install`
3. Run `npm run dev` (starts on port 5173)

## UI/UX
- Professional and beautiful website using Tailwind CSS

## Notes:
- Clean code implementation with proper structure and comments