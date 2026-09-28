export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    postalCode: string;
    city: string;
  };
  createdAt: string;
}
