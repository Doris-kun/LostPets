# Lost Pets Back-end

## Setup

1. Install dependencies: `npm install`
2. Set up environment variables in `.env`:
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
   - MONGODB_URI (optional, defaults to local MongoDB)
3. Start MongoDB locally or update MONGODB_URI.
4. Run: `npm start`

## API Endpoints

- GET /pets - List pets with optional filters (breed, color, area)
- POST /pets - Create a new pet (multipart/form-data with image)
- GET /pets/:id - Get pet details
- PUT /pets/:id - Update pet
- DELETE /pets/:id - Delete pet