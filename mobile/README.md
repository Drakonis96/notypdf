# NotyPDF Mobile (React Native)

This directory contains an experimental React Native version of **NotyPDF** targeting iOS and Android. It bundles a lightweight backend so the mobile app can run independently of the main project.

The mobile client now relies on **Expo SDK&nbsp;53.0.0**.

## Getting Started

1. Install dependencies (requires `npm` and the Expo CLI):
   ```sh
   npm install
   ```
2. Build and start the embedded backend:
   ```sh
   npm run backend
   ```
   This will compile and launch a small Express server on port `4000`.
3. In a separate terminal start the Expo development server:
   ```sh
   npm run start
   ```
   Use `npm run ios` or `npm run android` to open the app on a simulator or device.

The app allows you to pick a PDF file from your device, enter the desired Notion configuration and send selected text to the embedded backend.
