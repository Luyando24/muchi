import { toast } from "@/hooks/use-toast";

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string = "Network connection failed") {
    super(message, "NETWORK_ERROR", 0);
    this.name = "NetworkError";
  }
}

export class AuthError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, "AUTH_ERROR", 401);
    this.name = "AuthError";
  }
}

export function handleError(error: unknown, context?: string): void {
  console.error(`Error${context ? ` in ${context}` : ""}: `, error);
  
  let message = "An unexpected error occurred";
  
  if (error instanceof AppError) {
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }
  
  toast({
    title: "Error",
    description: message,
    variant: "destructive",
  });
}

export function validateNRC(nrc: string): boolean {
  // Basic Zambian NRC validation: XXXXXX/XX/X format
  const nrcPattern = /^\d{6}\/\d{2}\/\d{1}$/;
  return nrcPattern.test(nrc.replace(/\s+/g, ""));
}

export function validateEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

export function validatePhone(phone: string): boolean {
  // Basic phone validation for Zambian numbers
  const phonePattern = /^(\+260|0)?[79]\d{8}$/;
  return phonePattern.test(phone.replace(/\s+/g, ""));
}

export function validateRequired(value: unknown, fieldName: string): void {
  if (!value || (typeof value === "string" && value.trim() === "")) {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validatePatientData(patient: {
  nrc: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): void {
  validateRequired(patient.nrc, "NRC");
  
  if (!validateNRC(patient.nrc)) {
    throw new ValidationError("Invalid NRC format. Expected format: XXXXXX/XX/X");
  }
  
  if (patient.phone && !validatePhone(patient.phone)) {
    throw new ValidationError("Invalid phone number format");
  }
}

export function validateServiceNumber(serviceNumber: string): boolean {
  const serviceNumberPattern = /^ZA\d{6}$/;
  return serviceNumberPattern.test(serviceNumber);
}

export function validatePersonnelData(personnel: {
  serviceNumber: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): void {
  validateRequired(personnel.serviceNumber, "Service Number");
  
  if (!validateServiceNumber(personnel.serviceNumber)) {
    throw new ValidationError("Invalid Service Number format. Expected format: ZA123456");
  }
  
  if (personnel.phone && !validatePhone(personnel.phone)) {
    throw new ValidationError("Invalid phone number format");
  }
}

export function validateStaffData(staff: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): void {
  validateRequired(staff.email, "Email");
  validateRequired(staff.password, "Password");
  validateRequired(staff.firstName, "First name");
  validateRequired(staff.lastName, "Last name");
  
  if (!validateEmail(staff.email)) {
    throw new ValidationError("Invalid email format");
  }
  
  if (staff.password.length < 6) {
    throw new ValidationError("Password must be at least 6 characters long");
  }
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context);
    return null;
  }
}