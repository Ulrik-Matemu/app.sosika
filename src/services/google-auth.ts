import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, UserCredential } from "firebase/auth";
import { auth } from '../firebase';
import axios from "axios";
import { GoogleUser, AuthResponse } from "./types"; // Import the types



export const handleGoogleSubmit = async (): Promise<void> => {
    try {
      const provider = new GoogleAuthProvider();
      const result: UserCredential = await signInWithPopup(auth, provider);
      const user = result.user;
  
      if (!user.email || !user.displayName) {
        throw new Error("Google authentication failed: Missing email or display name.");
      }
  
      // Create user object
      const googleUserData: GoogleUser = {
        full_name: user.displayName,
        email: user.email,
        college_id: 1, // Hardcoded for now
      };
  
      // Send data to backend
      const response = await axios.post<AuthResponse>("https://sosika-backend.onrender.com/api/auth/google", googleUserData);
  
      console.log("Login successful:", response.data);
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        alert("Google Sign-In popup was closed. Please try again."); // Show UI message
      } else if (axios.isAxiosError(error)) {
        console.error("Server Error:", error.response?.data || error.message);
      } else {
        console.error("Google Sign-In Error:", error);
      }
    }
  };


export const handleGoogleSubmitWithRedirect = async (): Promise<void> => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
    }
  };