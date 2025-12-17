import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyCmXrB-ENcgx1B1dbnOoh8FhL_Vtj8uxns",
  authDomain: "battleship-3e8fb.firebaseapp.com",
  projectId: "battleship-3e8fb",
  storageBucket: "battleship-3e8fb.firebasestorage.app",
  messagingSenderId: "1063109218848",
  appId: "1:1063109218848:web:9ca9d1611d73c51563e245",
  measurementId: "G-84F4PJFMYQ",
  databaseURL: "https://battleship-3e8fb-default-rtdb.asia-southeast1.firebasedatabase.app",
}

const app = initializeApp(firebaseConfig)
export const database = getDatabase(app)
