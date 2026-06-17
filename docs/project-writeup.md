# Project Writeup: Waypoint Navigation App

## Product Overview

Waypoint is a location-based web app that helps users save meaningful places, find their way back to them, and share those places with friends. Instead of acting like a full map application, Waypoint focuses on a simpler personal navigation experience: users can store a spot using their current GPS location, organize saved places by category, make selected locations public or private, and use a direction-and-distance finder to return to a saved destination, which can be really helpful in case the destinations are stations in a mass game event e.g.

The app also supports social discovery. Users can add friends, share saved locations with accepted friends, browse shared locations, and explore public destination suggestions based on their current location, distance filters, categories, and community votes.

## Target Users

Waypoint is designed for people who want to remember and rediscover physical places that may not be easy to find again through a traditional search. This includes students, travelers, hikers, event attendees, and local explorers who want to save places like quiet study spots, food locations, hidden gems, scenic views, or personal landmarks.

The friend and sharing features make the app useful for small groups who exchange recommendations, such as classmates sharing campus spots, friends sharing local hangouts, or travelers passing along places they discovered.

## Problem Solved

Many location tools are built around addresses, businesses, and map search. That works well for official destinations, but it is less useful for informal or personal places: a picnic spot in a park, an unmarked shortcut, a good view, or a place a friend found while walking around.

Waypoint solves this by letting users save their exact GPS coordinates with a custom name. The app keeps those saved locations tied to a user account, lets users manage privacy, and provides a simple finder interface that points the user back toward a selected place. Public suggestions and voting add a lightweight recommendation layer so useful destinations can surface for other users nearby.

## Core Features

- **User accounts:** Users can register, log in, log out, and maintain a session with Supabase authentication tokens.
- **Save current location:** The browser Geolocation API captures latitude and longitude, and the app saves the location under a user-provided name.
- **Saved location list:** Authenticated users can view, delete, categorize, and update privacy settings for their saved locations.
- **Finder mode:** Users can select a saved or shared location and navigate toward it using distance and direction feedback.
- **Friend system:** Users can send, accept, reject, and remove friend relationships.
- **Location sharing:** Users can share saved locations with friends through the `location_shares` table.
- **Public suggestions:** Public locations can be filtered by category and distance from the user's current position.
- **Voting:** Users can upvote or downvote public destinations, and suggestion ranking uses both distance and vote score.

## Technologies Used

The frontend is built with **EJS templates**, browser JavaScript, and CSS. EJS renders pages such as the home screen, login, registration, friends, and shared locations. The main frontend behavior lives in `frontend/index.js`, which handles form submissions, API requests, geolocation, saved location rendering, sharing workflows, suggestion filtering, and voting interactions.

The backend uses **Node.js** with **Express**. `backend/server.js` configures JSON parsing, EJS rendering, development Vite middleware, static production assets, and route mounting. The backend is organized into feature routers:

- `backend/route/auth.js` handles registration, login, logout, session checks, and username lookup.
- `backend/route/location.js` handles saved locations, sharing, suggestions, privacy/category updates, deletion, and voting.
- `backend/route/friend.js` handles friend requests and friend relationship management.

The database and authentication layer use **Supabase**. Supabase Auth manages user accounts and JWT session tokens. Supabase Postgres stores application data in tables for `profiles`, `locations`, `friends`, `location_shares`, and `location_votes`. The backend accesses Supabase through a service-role client in `backend/supabase/db.js`, while `frontend/supabaseClient.js` also initializes the Supabase browser SDK with the public anon key.

The app uses the **Browser Geolocation API** to capture the user's current coordinates. These coordinates are used when saving a new location and when searching for public suggestions within a distance range.

For development and asset handling, the project uses **Vite** in middleware mode during development and builds production frontend assets into `dist/`.

## Implementation Approach

The team separated the application into a client layer, an API layer, and a cloud data layer. The frontend is responsible for collecting user input, requesting geolocation permission, rendering dynamic cards, and calling backend endpoints with the user's access token. The Express backend verifies those tokens with Supabase Auth before performing protected operations.

Data is modeled around user-owned locations. Each saved location belongs to a profile, can be public or private, and can have a category. Friend relationships are stored separately, which allows the app to share a location with specific accepted users without making it public. Public destination suggestions are generated by querying public locations, calculating distance from the user's current coordinates, applying filters, adding vote totals, and returning the best-ranked results.

This architecture keeps sensitive database operations on the server while still allowing the browser to provide a responsive experience through fetch requests and local UI updates.

## Impact

Waypoint gives users a practical way to remember places that matter to them and discover places that matter to people nearby or get suggestions for surprising destination when they do not know where to go. By combining personal saved locations, friend sharing, public recommendations, and simple direction-based navigation, the app fills a gap between private notes and full map search.
