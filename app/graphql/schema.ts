export const typeDefs = `#graphql
    scalar DateTime

    type PropertyImage {
        id: Int!
        url: String!
        caption: String
        order: Int!
        propertyId: Int!
        createdAt: String!
    }

    type Company {
        id: Int!
        name: String!
        logoUrl: String
        contact: String!
        isOwnCompany: Boolean!
        properties: [Property!]!
    }

    type DashboardStats {
        totalProperties: Int!
        totalUsers: Int!
        availableProperties: Int!
        rentedProperties: Int!
        totalPageVisits: Int!
        todayPageVisits: Int!
    }

    type User {
        id: Int!
        name: String!
        email: String!
        role: String!
        phone: String
        mustChangePassword: Boolean
    }

    type Property {
        id: ID!
        title: String!
        location: String!
        digitalAddress: String
        landmarks: String
        latitude: Float
        longitude: Float
        price: Float!
        description: String
        contact: String
        type: String
        status: String
        imageUrl: String
        gallery: [PropertyImage!]!
        isFeatured: Boolean
        createdAt: String
        owner: User
        company: Company
    }

    type Booking {
        id: Int!
        startDate: DateTime!
        endDate: DateTime!
        totalAmount: Float!
        status: String!
        user: User!
        property: Property!
        company: Company!
        commissionAmount: Float!
        momoTxId: String
    }

    type AuthPayload {
        token: String!
        user: User!
    }

    input RegisterInput {
        name: String!
        email: String!
        password: String!
        phone: String
    }

    input PropertyImageInput {
        url: String!
        caption: String
        order: Int
    }

    input PropertyInput {
        title: String!
        location: String!
        digitalAddress: String
        landmarks: String
        latitude: Float
        longitude: Float
        price: Float!
        description: String
        contact: String
        type: String
        status: String
        imageUrl: String
        isFeatured: Boolean
        gallery: [PropertyImageInput!]
    }

    type ContactLog {
        id: Int!
        customerName: String!
        customerPhone: String!
        actionType: String!
        propertyId: Int!
        landlordPhone: String!
        createdAt: String!
        property: Property!
    }

    input PartnerInput {
        userName: String!
        email: String!
        password: String!
        phone: String
        companyId: Int
        companyName: String
        logoUrl: String
        contact: String
        momoAccount: String
    }

    type PasswordResetRequest {
        id: Int!
        name: String!
        identifier: String!
        message: String
        status: String!
        createdAt: String!
    }

    type AuditLog {
        id: Int!
        action: String!
        details: String!
        userEmail: String
        createdAt: String!
    }

    type Query {
        me: User
        users: [User!]!
        properties(type: String): [Property!]!
        property(id: Int!): Property
        myBookings: [Booking!]!
        companies: [Company!]!
        company(id: Int!): Company
        dashboardStats: DashboardStats!
        contactLogs: [ContactLog!]!
        passwordResetRequests: [PasswordResetRequest!]!
        auditLogs: [AuditLog!]!
    }

    type BasicPayload {
        success: Boolean!
        message: String!
    }

    type Mutation {
        register(input: RegisterInput!): AuthPayload!
        login(email: String!, password: String!): AuthPayload!
        submitPasswordResetRequest(name: String!, identifier: String!, message: String): BasicPayload!
        adminResetUserPassword(identifier: String!, newPassword: String!): BasicPayload!
        changePassword(newPassword: String!): BasicPayload!
        resolvePasswordResetRequest(id: Int!): BasicPayload!
        addProperty(input: PropertyInput!): Property!
        updateProperty(id: Int!, input: PropertyInput!): Property!
        deleteProperty(id: Int!): Property!
        createBooking(propertyId: Int!, startDate: DateTime!, endDate: DateTime!, totalAmount: Float!): Booking!
        createCompany(name: String!, logoUrl: String, contact: String!, momoAccount: String): Company!
        createPartner(input: PartnerInput!): AuthPayload!
        updatePropertyCompany(id: Int!, companyId: Int!): Property!
        deleteUser(id: Int!): User!
        updateUserRole(id: Int!, role: String!): User!
        createContactLog(customerName: String!, customerPhone: String!, actionType: String!, propertyId: Int!, landlordPhone: String!): ContactLog!
        recordPageVisit(path: String!): Boolean!
        deleteOldAuditLogs(days: Int!): BasicPayload!
    }
`;
