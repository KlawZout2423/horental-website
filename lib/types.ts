export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'user' | 'partner' | string;
}

export interface Property {
  id: string;
  title: string;
  type: string;
  status: string;
  price: number;
  location: string;
  description: string;
  contact: string;
  imageUrl: string;
  isFeatured?: boolean;
}

export interface RegisterInput {
  name: string;
  phone: string;
  password: string;
  email?: string;
}
