import { AuthSession, LoginRequest, LoginResponse } from "@shared/api";

export const Api = {
  login: async ({ email, password, userType }: LoginRequest): Promise<AuthSession> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, userType }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Login failed");
    }

    const data: LoginResponse = await response.json();
    return data.session;
  },
  // Other API methods would go here
};
