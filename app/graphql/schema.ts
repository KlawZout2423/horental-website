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

    type VisitSourceBreakdown {
        source: String!
        count: Int!
        percentage: Float!
    }

    type VisitDayCount {
        date: String!
        count: Int!
    }

    type TopProperty {
        propertyId: String!
        title: String!
        views: Int!
    }

    type PageVisitAnalytics {
        totalViews: Int!
        todayViews: Int!
        weekViews: Int!
        monthViews: Int!
        sources: [VisitSourceBreakdown!]!
        viewsOverTime(period: String): [VisitDayCount!]!
        topProperties: [TopProperty!]!
    }

    type Subscription {
        id: Int!
        name: String!
        price: Float!
        billingCycle: String!
        status: String!
        paystackCustomerCode: String
        paystackSubscriptionCode: String
        momoNumber: String
        createdAt: String!
    }

    type VerificationRequest {
        id: Int!
        userId: Int!
        idType: String!
        idNumber: String!
        documentUrls: [String!]!
        status: String!
        reviewerNotes: String
        createdAt: String!
        user: User
    }

    type LandlordAgentLink {
        id: Int!
        landlordId: Int!
        agentId: Int!
        status: String!
        commissionShare: Float
        createdAt: String!
        landlord: User
        agent: User
    }

    type LeadInquiry {
        id: Int!
        propertyId: Int!
        tenantName: String!
        tenantPhone: String!
        channel: String!
        status: String!
        createdAt: String!
        property: Property
    }

    type FraudAlert {
        id: Int!
        propertyId: Int
        userId: Int
        reason: String!
        severity: String!
        status: String!
        createdAt: String!
        property: Property
        user: User
    }

    type User {
        id: Int!
        name: String!
        email: String!
        role: String!
        phone: String
        bio: String
        profileImage: String
        agentLocation: String
        agentWhatsapp: String
        verificationStatus: String
        mustChangePassword: Boolean
        subscription: Subscription
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
        landlordName: String
        type: String
        status: String
        imageUrl: String
        gallery: [PropertyImage!]!
        isFeatured: Boolean
        verificationStatus: String
        isSaaSManaged: Boolean
        commissionRate: Float
        createdAt: String
        owner: User
        landlord: User
        company: Company
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
        landlordName: String
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

    type Report {
        id: Int!
        propertyId: Int!
        reason: String!
        details: String
        status: String!
        createdAt: String!
        property: Property
        reporter: User
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

    type LandlordRegistration {
        id: ID!
        name: String!
        dob: String
        gender: String
        nationalId: String
        homeAddress: String
        city: String!
        region: String
        phone1: String!
        phone2: String
        email: String
        occupation: String
        propAddress: String!
        propCity: String
        propLandmark: String
        propRegion: String
        propGps: String
        rent: Float!
        advance: String
        rooms: Int
        availableFrom: String
        propType: String
        amenities: [String!]!
        plan: String
        photos: [String!]!
        status: String!
        agreementSigned: Boolean!
        socialMediaBoost: Boolean!
        createdAt: String!
    }

    input LandlordRegistrationInput {
        name: String!
        dob: String
        gender: String
        nationalId: String
        homeAddress: String
        city: String!
        region: String
        phone1: String!
        phone2: String
        email: String
        occupation: String
        propAddress: String!
        propCity: String
        propLandmark: String
        propRegion: String
        propGps: String
        rent: Float!
        advance: String
        rooms: Int
        availableFrom: String
        propType: String
        amenities: [String!]!
        plan: String
        photos: [String!]!
        socialMediaBoost: Boolean
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
        agents: [User!]!
        user(id: Int!): User
        agentProperties(userId: Int!, includePrivate: Boolean): [Property!]!
        properties(type: String): [Property!]!
        property(id: Int!): Property
        companies: [Company!]!
        company(id: Int!): Company
        dashboardStats: DashboardStats!
        contactLogs: [ContactLog!]!
        passwordResetRequests: [PasswordResetRequest!]!
        auditLogs: [AuditLog!]!
        reports: [Report!]!
        landlordRegistrations: [LandlordRegistration!]!
        pageVisitAnalytics(period: String): PageVisitAnalytics!
        verificationRequests: [VerificationRequest!]!
        landlordAgentLinks: [LandlordAgentLink!]!
        leadInquiries: [LeadInquiry!]!
        fraudAlerts: [FraudAlert!]!
        subscriptions: [Subscription!]!
        readNotificationIds: [Int!]!
    }

    type BasicPayload {
        success: Boolean!
        message: String!
    }

    type Mutation {
        register(input: RegisterInput!): AuthPayload!
        login(email: String!, password: String!): AuthPayload!
        googleAuth(idToken: String!): AuthPayload!
        submitPasswordResetRequest(name: String!, identifier: String!, message: String): BasicPayload!
        adminResetUserPassword(identifier: String!, newPassword: String!): BasicPayload!
        changePassword(newPassword: String!): BasicPayload!
        resolvePasswordResetRequest(id: Int!): BasicPayload!
        addProperty(input: PropertyInput!): Property!
        updateProperty(id: Int!, input: PropertyInput!): Property!
        updatePropertyStatus(id: Int!, status: String!): Property!
        deleteProperty(id: Int!): Property!
        togglePropertyFeatured(id: Int!): Property!
        createCompany(name: String!, logoUrl: String, contact: String!, momoAccount: String): Company!
        createPartner(input: PartnerInput!): AuthPayload!
        updatePropertyCompany(id: Int!, companyId: Int!): Property!
        deleteUser(id: Int!): User!
        updateUserRole(id: Int!, role: String!): User!
        createContactLog(customerName: String!, customerPhone: String!, actionType: String!, propertyId: Int!, landlordPhone: String!): ContactLog!
        recordPageVisit(path: String!, utmSource: String, utmMedium: String, utmCampaign: String, utmContent: String, referrer: String): Boolean!
        deleteOldAuditLogs(days: Int!): BasicPayload!
        deleteAuditLogs(ids: [Int!]!): BasicPayload!
        deleteContactLogs(ids: [Int!]!): BasicPayload!
        createLandlordRegistration(input: LandlordRegistrationInput!): LandlordRegistration!
        updateLandlordRegistrationStatus(id: Int!, status: String!): LandlordRegistration!
        deleteLandlordRegistration(id: Int!): LandlordRegistration!
        publishLandlordRegistration(id: Int!): Property!
        updateReportStatus(id: Int!, status: String!): Report!
        deleteReport(id: Int!): Report!
        updateAgentProfile(bio: String!, profileImage: String, agentLocation: String, agentWhatsapp: String): User!
        submitVerificationRequest(idType: String!, idNumber: String!, documentUrls: [String!]!): VerificationRequest!
        reviewVerificationRequest(id: Int!, status: String!, reviewerNotes: String): VerificationRequest!
        createLandlordAgentLink(landlordId: Int!, agentId: Int!, commissionShare: Float): LandlordAgentLink!
        updateLinkStatus(id: Int!, status: String!): LandlordAgentLink!
        createLeadInquiry(propertyId: Int!, tenantName: String!, tenantPhone: String!, channel: String): LeadInquiry!
        flagFraudAlert(propertyId: Int, userId: Int, reason: String!, severity: String): FraudAlert!
        createSubscription(name: String!, price: Float!, billingCycle: String, momoNumber: String): Subscription!
        markNotificationRead(propertyId: Int!): Boolean!
        markAllNotificationsRead(propertyIds: [Int!]!): Boolean!
    }
`;
