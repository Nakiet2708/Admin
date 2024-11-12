// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqxTC71v6VnDdPH0aKl10a81BPXabGLgM",
  authDomain: "restaurantdata-d4127.firebaseapp.com",
  projectId: "restaurantdata-d4127",
  storageBucket: "restaurantdata-d4127.appspot.com",
  messagingSenderId: "509548278045",
  appId: "1:509548278045:web:e059d27b3557b5dc96f1f4",
  measurementId: "G-46LD7GZHJH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);