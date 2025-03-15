// types.ts
export interface GoogleUser {
    full_name: string;
    email: string;
    college_id: number;
  }
  
  export interface AuthResponse {
    message: string;
    token: string;
    user: {
      id: number;
      full_name: string;
      email: string;
      phone_number: string;
      college_id: number;
      college_registration_number: string;
      geolocation: string;
      custom_address: string;
      created_at: string;
    };
  }
  