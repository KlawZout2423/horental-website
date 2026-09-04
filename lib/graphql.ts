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
  const proxyUrl = '/api/graphql';

  try {
    let res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store', // Disable caching for real-time rental updates
      credentials: 'same-origin', // Ensures cookies are sent with the request
    });

    if (res.status === 404) {
      // Fallback to /graphql if /api/graphql is not reached
      res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
        credentials: 'same-origin',
      });
    }

    let body: GraphQLResponse<T>;
    try {
      body = await res.json();
    } catch (err) {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      throw new Error('Failed to parse GraphQL response JSON.');
    }

    if (body.errors && body.errors.length > 0) {
      // Sanitize: only expose the message, never internal stack traces
      const msg = body.errors[0].message;
      throw new Error(msg);
    }

    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    if (!body.data) {
      throw new Error('No data returned from server. Please try again.');
    }

    return body.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    
    // If dev server returned transient 404 during Turbopack route compilation, retry once
    if (message.includes('Status: 404')) {
      try {
        await new Promise((res) => setTimeout(res, 500));
        const retryRes = await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables }),
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (retryRes.ok) {
          const retryBody: GraphQLResponse<T> = await retryRes.json();
          if (retryBody.data) return retryBody.data;
        }
      } catch {
        // Fall through to standard error handling if retry fails
      }
    }

    // Only log unexpected errors — not user-facing validation errors or transient auth messages
    if (!message.includes('already exists') && !message.includes('Invalid credentials') && !message.includes('Not authenticated') && !message.includes('Not authorized') && !message.includes('Status: 404')) {
      console.error('GraphQL Request Error:', message);
    }
    throw new Error(message);
  }
}

// Queries and Mutations

export const ME_QUERY = `
  query Me {
    me {
      id
      name
      email
      phone
      role
      bio
      profileImage
      agentLocation
      agentWhatsapp
      verificationStatus
      mustChangePassword
    }
  }
`;

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
        verificationStatus
        mustChangePassword
      }
    }
  }
`;

export const GOOGLE_AUTH_MUTATION = `
  mutation GoogleAuth($idToken: String!) {
    googleAuth(idToken: $idToken) {
      token
      user {
        id
        name
        email
        phone
        role
        verificationStatus
        mustChangePassword
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
        verificationStatus
        mustChangePassword
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
      landlordName
      imageUrl
      isFeatured
      createdAt
      owner {
        id
        name
        email
        role
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
      landlordName
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
        role
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
      landlordName
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
      landlordName
      type
      status
      imageUrl
      isFeatured
      gallery {
        id
        url
        caption
        order
      }
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
      verificationStatus
      mustChangePassword
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

export const RECORD_PAGE_VISIT = `
  mutation RecordPageVisit($path: String!, $utmSource: String, $utmMedium: String, $utmCampaign: String, $utmContent: String, $referrer: String) {
    recordPageVisit(path: $path, utmSource: $utmSource, utmMedium: $utmMedium, utmCampaign: $utmCampaign, utmContent: $utmContent, referrer: $referrer)
  }
`;

export const GET_PAGE_ANALYTICS = `
  query GetPageAnalytics($period: String) {
    pageVisitAnalytics(period: $period) {
      totalViews
      todayViews
      weekViews
      monthViews
      sources {
        source
        count
        percentage
      }
      viewsOverTime {
        date
        count
      }
      topProperties {
        propertyId
        title
        views
      }
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

export const CREATE_REPORT = `
  mutation CreateReport($propertyId: Int!, $reason: String!, $details: String) {
    createReport(propertyId: $propertyId, reason: $reason, details: $details) {
      id
      propertyId
      reason
      details
      status
      createdAt
    }
  }
`;

export const GET_REPORTS = `
  query GetReports {
    reports {
      id
      propertyId
      reason
      details
      status
      createdAt
      property {
        id
        title
        location
        price
        imageUrl
      }
      reporter {
        id
        name
        email
        phone
      }
    }
  }
`;

export const UPDATE_REPORT_STATUS = `
  mutation UpdateReportStatus($id: Int!, $status: String!) {
    updateReportStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const DELETE_REPORT = `
  mutation DeleteReport($id: Int!) {
    deleteReport(id: $id) {
      id
    }
  }
`;

export const SUBMIT_PASSWORD_RESET_REQUEST = `
  mutation SubmitPasswordResetRequest($name: String!, $identifier: String!, $message: String) {
    submitPasswordResetRequest(name: $name, identifier: $identifier, message: $message) {
      success
      message
    }
  }
`;

export const ADMIN_RESET_USER_PASSWORD = `
  mutation AdminResetUserPassword($identifier: String!, $newPassword: String!) {
    adminResetUserPassword(identifier: $identifier, newPassword: $newPassword) {
      success
      message
    }
  }
`;

export const RESOLVE_PASSWORD_RESET_REQUEST = `
  mutation ResolvePasswordResetRequest($id: Int!) {
    resolvePasswordResetRequest(id: $id) {
      success
      message
    }
  }
`;

export const GET_PASSWORD_RESET_REQUESTS = `
  query GetPasswordResetRequests {
    passwordResetRequests {
      id
      name
      identifier
      message
      status
      createdAt
    }
  }
`;

export const GET_AUDIT_LOGS = `
  query GetAuditLogs {
    auditLogs {
      id
      action
      details
      userEmail
      createdAt
    }
  }
`;

export const DELETE_OLD_AUDIT_LOGS = `
  mutation DeleteOldAuditLogs($days: Int!) {
    deleteOldAuditLogs(days: $days) {
      success
      message
    }
  }
`;

export const DELETE_AUDIT_LOGS = `
  mutation DeleteAuditLogs($ids: [Int!]!) {
    deleteAuditLogs(ids: $ids) {
      success
      message
    }
  }
`;

export const DELETE_CONTACT_LOGS = `
  mutation DeleteContactLogs($ids: [Int!]!) {
    deleteContactLogs(ids: $ids) {
      success
      message
    }
  }
`;

export const CHANGE_PASSWORD_MUTATION = `
  mutation ChangePassword($newPassword: String!) {
    changePassword(newPassword: $newPassword) {
      success
      message
    }
  }
`;

export const GET_LANDLORD_REGISTRATIONS = `
  query GetLandlordRegistrations {
    landlordRegistrations {
      id
      name
      dob
      gender
      nationalId
      homeAddress
      city
      region
      phone1
      phone2
      email
      occupation
      propAddress
      propCity
      propLandmark
      propRegion
      propGps
      rent
      advance
      rooms
      availableFrom
      propType
      amenities
      plan
      photos
      status
      agreementSigned
      socialMediaBoost
      createdAt
    }
  }
`;

export const CREATE_LANDLORD_REGISTRATION = `
  mutation CreateLandlordRegistration($input: LandlordRegistrationInput!) {
    createLandlordRegistration(input: $input) {
      id
      name
      status
    }
  }
`;

export const UPDATE_LANDLORD_REGISTRATION_STATUS = `
  mutation UpdateLandlordRegistrationStatus($id: Int!, $status: String!) {
    updateLandlordRegistrationStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const DELETE_LANDLORD_REGISTRATION = `
  mutation DeleteLandlordRegistration($id: Int!) {
    deleteLandlordRegistration(id: $id) {
      id
    }
  }
`;

export const PUBLISH_LANDLORD_REGISTRATION = `
  mutation PublishLandlordRegistration($id: Int!) {
    publishLandlordRegistration(id: $id) {
      id
      title
      status
    }
  }
`;
export const GET_AGENT = `
  query GetAgent($id: Int!) {
    user(id: $id) {
      id
      name
      email
      phone
      role
      bio
      profileImage
      agentLocation
      agentWhatsapp
      verificationStatus
    }
  }
`;

export const GET_AGENTS = `
  query GetAgents {
    agents {
      id
      name
      email
      phone
      role
      bio
      profileImage
      agentLocation
      agentWhatsapp
      verificationStatus
    }
  }
`;

export const GET_AGENT_PROPERTIES = `
  query GetAgentProperties($userId: Int!, $includePrivate: Boolean) {
    agentProperties(userId: $userId, includePrivate: $includePrivate) {
      id
      title
      type
      status
      price
      location
      imageUrl
      isFeatured
      createdAt
      owner {
        id
        name
        role
      }
    }
  }
`;

export const UPDATE_AGENT_PROFILE = `
  mutation UpdateAgentProfile($bio: String!, $profileImage: String, $agentLocation: String, $agentWhatsapp: String) {
    updateAgentProfile(bio: $bio, profileImage: $profileImage, agentLocation: $agentLocation, agentWhatsapp: $agentWhatsapp) {
      id
      name
      email
      role
      phone
      bio
      profileImage
      agentLocation
      agentWhatsapp
    }
  }
`;

export const GET_MY_PROPERTIES = `
  query GetMyProperties {
    agentProperties: properties {
      id
      title
      type
      status
      price
      location
      imageUrl
      isFeatured
      createdAt
    }
  }
`;

export const GET_VERIFICATION_REQUESTS = `
  query GetVerificationRequests {
    verificationRequests {
      id
      userId
      idType
      idNumber
      documentUrls
      status
      reviewerNotes
      createdAt
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

export const REVIEW_VERIFICATION_REQUEST = `
  mutation ReviewVerificationRequest($id: Int!, $status: String!, $reviewerNotes: String) {
    reviewVerificationRequest(id: $id, status: $status, reviewerNotes: $reviewerNotes) {
      id
      status
      reviewerNotes
    }
  }
`;

export const GET_LANDLORD_AGENT_LINKS = `
  query GetLandlordAgentLinks {
    landlordAgentLinks {
      id
      landlordId
      agentId
      status
      commissionShare
      createdAt
      landlord {
        id
        name
        phone
      }
      agent {
        id
        name
        phone
      }
    }
  }
`;

export const GET_LEAD_INQUIRIES = `
  query GetLeadInquiries {
    leadInquiries {
      id
      propertyId
      tenantName
      tenantPhone
      channel
      status
      createdAt
      property {
        id
        title
        location
      }
    }
  }
`;

export const GET_FRAUD_ALERTS = `
  query GetFraudAlerts {
    fraudAlerts {
      id
      propertyId
      userId
      reason
      severity
      status
      createdAt
      property {
        id
        title
      }
      user {
        id
        name
        email
      }
    }
  }
`;

export const GET_SUBSCRIPTIONS = `
  query GetSubscriptions {
    subscriptions {
      id
      name
      price
      billingCycle
      status
      momoNumber
      createdAt
    }
  }
`;

export const READ_NOTIFICATION_IDS_QUERY = `
  query ReadNotificationIds {
    readNotificationIds
  }
`;

export const MARK_NOTIFICATION_READ = `
  mutation MarkNotificationRead($propertyId: Int!) {
    markNotificationRead(propertyId: $propertyId)
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = `
  mutation MarkAllNotificationsRead($propertyIds: [Int!]!) {
    markAllNotificationsRead(propertyIds: $propertyIds)
  }
`;

export const VERIFY_AGENT = `
  mutation VerifyAgent($userId: Int!, $status: String!) {
    verifyAgent(userId: $userId, status: $status) {
      id
      name
      verificationStatus
    }
  }
`;

