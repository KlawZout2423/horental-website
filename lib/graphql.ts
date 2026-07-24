// GraphQL Client — queries and mutations for HO Rentals webapp
// All requests flow through /api/graphql proxy (see app/api/graphql/route.ts)
// which reads the HttpOnly auth_token cookie server-side.

export const UPLOAD_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/upload-multiple`;

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Execute a GraphQL query or mutation against the backend.
 *
 * All requests are routed through the Next.js API proxy at /api/graphql.
 * The proxy reads the HttpOnly auth_token cookie server-side and attaches
 * it as an Authorization: Bearer header — the JWT never touches client JS.
 */
export async function graphqlRequest<T = any>(
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  // Route through our Next.js proxy so the HttpOnly cookie is attached
  // server-side. The browser automatically sends the cookie with this request.
  const proxyUrl = '/graphql';

  try {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store', // Disable caching for real-time rental updates
      credentials: 'same-origin', // Ensures cookies are sent with the request
    });

    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    const body: GraphQLResponse<T> = await res.json();

    if (body.errors && body.errors.length > 0) {
      // Sanitize: only expose the message, never internal stack traces
      const msg = body.errors[0].message;
      throw new Error(msg);
    }

    if (!body.data) {
      throw new Error('No data returned from server. Please try again.');
    }

    return body.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    console.error('GraphQL Request Error:', message);
    throw new Error(message);
  }
}

// Queries and Mutations

export const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        phone
        role
      }
    }
  }
`;

export const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        name
        email
        phone
        role
      }
    }
  }
`;

export const GET_PROPERTIES = `
  query GetProperties {
    properties {
      id
      title
      type
      status
      price
      location
      digitalAddress
      landmarks
      latitude
      longitude
      description
      contact
      imageUrl
      isFeatured
      createdAt
      owner {
        id
        name
        email
      }
      company {
        id
        name
      }
      gallery {
        id
        url
        caption
        order
      }
    }
  }
`;

export const GET_PROPERTY_BY_ID = `
  query GetPropertyById($id: Int!) {
    property(id: $id) {
      id
      title
      location
      digitalAddress
      landmarks
      latitude
      longitude
      contact
      price
      description
      imageUrl
      type
      status
      isFeatured
      createdAt
      owner {
        id
        name
        email
      }
      gallery {
        id
        url
        caption
        order
      }
    }
  }
`;

export const CREATE_PROPERTY = `
  mutation AddProperty($input: PropertyInput!) {
    addProperty(input: $input) {
      id
      title
      location
      digitalAddress
      landmarks
      latitude
      longitude
      price
      type
      status
      description
      contact
      imageUrl
      isFeatured
      createdAt
    }
  }
`;

export const UPDATE_PROPERTY = `
  mutation UpdateProperty($id: Int!, $input: PropertyInput!) {
    updateProperty(id: $id, input: $input) {
      id
      title
      location
      digitalAddress
      landmarks
      latitude
      longitude
      price
      description
      contact
      type
      status
      imageUrl
      isFeatured
    }
  }
`;

export const DELETE_PROPERTY = `
  mutation DeleteProperty($id: Int!) {
    deleteProperty(id: $id) {
      id
      title
    }
  }
`;

export const UPDATE_PROPERTY_STATUS = `
  mutation UpdatePropertyStatus($id: Int!, $status: String!) {
    updatePropertyStatus(id: $id, status: $status) {
      id
      title
      status
    }
  }
`;

export const TOGGLE_FEATURED = `
  mutation TogglePropertyFeatured($id: Int!) {
    togglePropertyFeatured(id: $id) {
      id
      title
      isFeatured
    }
  }
`;

export const GET_USERS = `
  query GetUsers {
    users {
      id
      name
      email
      phone
      role
    }
  }
`;

export const DELETE_USER = `
  mutation DeleteUser($id: Int!) {
    deleteUser(id: $id) {
      id
      name
    }
  }
`;

export const UPDATE_USER_ROLE = `
  mutation UpdateUserRole($id: Int!, $role: String!) {
    updateUserRole(id: $id, role: $role) {
      id
      role
    }
  }
`;

export const GET_DASHBOARD_STATS = `
  query GetDashboardStats {
    dashboardStats {
      totalProperties
      totalUsers
      availableProperties
      rentedProperties
      totalPageVisits
      todayPageVisits
    }
  }
`;

export const CREATE_CONTACT_LOG = `
  mutation CreateContactLog($customerName: String!, $customerPhone: String!, $actionType: String!, $propertyId: Int!, $landlordPhone: String!) {
    createContactLog(customerName: $customerName, customerPhone: $customerPhone, actionType: $actionType, propertyId: $propertyId, landlordPhone: $landlordPhone) {
      id
      customerName
      customerPhone
      actionType
      createdAt
    }
  }
`;

export const GET_CONTACT_LOGS = `
  query GetContactLogs {
    contactLogs {
      id
      customerName
      customerPhone
      actionType
      landlordPhone
      createdAt
      property {
        id
        title
        location
      }
    }
  }
`;
