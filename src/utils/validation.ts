/**
 * Shared form validation utilities for Sosika Vendor Portal
 */

export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return "Email address is required.";
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function getPasswordStrength(password: string): {
  strength: "weak" | "fair" | "strong";
  score: number; // 0 to 4
  feedback: string;
} {
  if (!password) {
    return { strength: "weak", score: 0, feedback: "Password is required." };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  // Cap at 4
  const finalScore = Math.min(score, 4);

  let strength: "weak" | "fair" | "strong" = "weak";
  let feedback = "Too weak";

  if (finalScore >= 4) {
    strength = "strong";
    feedback = "Strong password";
  } else if (finalScore >= 2) {
    strength = "fair";
    feedback = "Fair strength";
  } else {
    feedback = "Weak password (min 6 chars, uppercase, digit/symbol recommended)";
  }

  return { strength, score: finalScore, feedback };
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters long.";
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone || !phone.trim()) {
    return "Phone number is required.";
  }

  // Strip non-digit characters except leading plus
  const cleanPhone = phone.replace(/[^\d+]/g, "").trim();

  // Tanzanian format check
  // Standard formatting formats:
  // 1. +255XXXXXXXXX (13 chars total)
  // 2. 0XXXXXXXXX (10 chars total)
  // 3. 255XXXXXXXXX (12 chars total)
  
  if (cleanPhone.startsWith("+")) {
    if (!cleanPhone.startsWith("+255")) {
      return "For Tanzanian numbers, please use +255 format.";
    }
    if (cleanPhone.length !== 13) {
      return "Phone number must be exactly 12 digits after +255.";
    }
  } else if (cleanPhone.startsWith("0")) {
    if (cleanPhone.length !== 10) {
      return "Local phone number must be exactly 10 digits.";
    }
  } else if (cleanPhone.startsWith("255")) {
    if (cleanPhone.length !== 12) {
      return "Phone number must be exactly 12 digits.";
    }
  } else {
    return "Invalid phone format. Use +255, 255, or 07... / 06...";
  }

  return null;
}

export function formatTanzanianPhone(phone: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, "").trim();
  if (cleanPhone.startsWith("0")) {
    return "+255" + cleanPhone.substring(1);
  }
  if (cleanPhone.startsWith("255")) {
    return "+" + cleanPhone;
  }
  return cleanPhone;
}

export function validateName(name: string, fieldLabel: string = "Name"): string | null {
  if (!name || !name.trim()) {
    return `${fieldLabel} is required.`;
  }
  if (name.trim().length < 2) {
    return `${fieldLabel} must be at least 2 characters long.`;
  }
  return null;
}

export function validateFile(
  file: File | null,
  options: {
    maxSizeMB: number;
    allowedTypes: string[];
    fieldName?: string;
  }
): string | null {
  const field = options.fieldName || "File";
  if (!file) {
    return `${field} is required.`;
  }

  const maxBytes = options.maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `${field} exceeds the maximum allowed size of ${options.maxSizeMB}MB.`;
  }

  // Check if type is allowed (using simple mime type startsWith check or extension check)
  const isTypeAllowed = options.allowedTypes.some(allowedType => {
    if (allowedType.includes("/")) {
      // It's a mime type, e.g. "image/*", "application/pdf"
      if (allowedType.endsWith("/*")) {
        const typePrefix = allowedType.split("/")[0];
        return file.type.startsWith(typePrefix + "/");
      }
      return file.type === allowedType;
    } else {
      // It's an extension, e.g., ".pdf", ".jpg"
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      return ext === allowedType.toLowerCase();
    }
  });

  if (!isTypeAllowed) {
    return `Invalid file type for ${field}. Allowed formats: ${options.allowedTypes.join(", ")}`;
  }

  return null;
}
