import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { formatGhanaPhone, isValidGhanaPhone, sanitizeInput } from '../../lib/types';
import { getJwtSecret } from '../../lib/env';
import { collectPayment } from '../../lib/momo';

const COMMISSION_FEE = 5;

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  password: true,
  role: true,
  phone: true,
  mustChangePassword: true,
  createdAt: true,
};

const PROPERTY_SAFE_SELECT = {
  id: true,
  title: true,
  location: true,
  price: true,
  description: true,
  imageUrl: true,
  status: true,
  type: true,
  contact: true,
  landlordName: true,
  digitalAddress: true,
  landmarks: true,
  latitude: true,
  longitude: true,
  isFeatured: true,
  createdAt: true,
  ownerId: true,
  companyId: true,
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
    }
  },
  company: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
      contact: true,
      isOwnCompany: true,
    }
  },
  images: { orderBy: { order: 'asc' as const } },
};

// Helper to record audit logs for crucial system events
async function createAuditLog(action: string, details: string, userEmail?: string | null) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        details,
        userEmail: userEmail || null,
      },
    });
  } catch (e) {
    console.error('AuditLog error:', e);
  }
}

export const resolvers = {
  Query: {
    me: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) return null;
      return prisma.user.findUnique({
        where: { id: user.id },
        select: USER_SAFE_SELECT,
      });
    },

    users: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true, email: true }
      });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      return prisma.user.findMany({
        select: USER_SAFE_SELECT,
      });
    },

    properties: async (_: any, { type }: { type?: string }, { user }: { user: { id: number } | null }) => {
      let isAdmin = false;
      if (user) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, role: true }
          });
          isAdmin = dbUser?.role === 'admin';
        } catch {
          isAdmin = false;
        }
      }

      const where: any = {};
      if (type && type !== 'All') {
        where.type = type;
      }

      if (!isAdmin) {
        where.OR = [
          { status: { notIn: ['pending_approval', 'pending_verification'] } },
          { status: 'available' },
          ...(user ? [{ ownerId: user.id }] : [])
        ];
      }

      return prisma.property.findMany({
        where,
        select: PROPERTY_SAFE_SELECT,
        orderBy: { createdAt: 'desc' }
      });
    },

    property: async (_: any, { id }: { id: number }, { user }: { user: { id: number } | null }) => {
      const prop = await prisma.property.findUnique({
        where: { id },
        select: PROPERTY_SAFE_SELECT,
      });
      if (!prop) return null;
      if (prop.status === 'pending_approval') {
        if (!user) return null;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true }
        });
        if (dbUser?.role !== 'admin' && prop.ownerId !== user.id) {
          return null;
        }
      }
      return prop;
    },

    // Public: fetch a single user by ID (restricted to agent profile pages or self/admin query)
    user: async (_: any, { id }: { id: number }, { user }: { user: { id: number } | null }) => {
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true, phone: true },
      });
      if (!targetUser) return null;

      // Allow if:
      // 1. Requester is an admin
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true }
        });
        if (dbUser?.role === 'admin') return targetUser;
        // 2. Requester is querying their own profile
        if (user.id === id) return targetUser;
      }

      // 3. Otherwise, public access is only allowed for agent/partner/admin profiles
      if (targetUser.role === 'agent' || targetUser.role === 'partner' || targetUser.role === 'admin') {
        return targetUser;
      }

      // Hide normal customer profiles from public access
      return null;
    },

    // Public: fetch all approved properties submitted by a specific agent
    agentProperties: async (_: any, { userId }: { userId: number }) => {
      return prisma.property.findMany({
        where: {
          ownerId: userId,
          status: 'available',
        },
        select: PROPERTY_SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
      });
    },

    dashboardStats: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true }
      });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      try {
        const totalProperties = await prisma.property.count();
        const totalUsers = await prisma.user.count();
        const availableProperties = await prisma.property.count({
          where: { status: 'available' },
        });
        const rentedProperties = await prisma.property.count({
          where: { status: { in: ['taken', 'rented'] } },
        });

        const totalPageVisits = await prisma.pageVisit.count().catch(() => 0);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayPageVisits = await prisma.pageVisit.count({
          where: {
            createdAt: {
              gte: todayStart
            }
          }
        }).catch(() => 0);

        return { 
          totalProperties, 
          totalUsers, 
          availableProperties, 
          rentedProperties, 
          totalPageVisits, 
          todayPageVisits 
        };
      } catch (dbErr: any) {
        console.warn('[DashboardStats] DB connection warning:', dbErr.message);
        return {
          totalProperties: 0,
          totalUsers: 0,
          availableProperties: 0,
          rentedProperties: 0,
          totalPageVisits: 0,
          todayPageVisits: 0
        };
      }
    },

    pageVisitAnalytics: async (_: any, { period }: { period?: string }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true }
      });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      const now = new Date();

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date(now);
      monthStart.setDate(now.getDate() - 29);
      monthStart.setHours(0, 0, 0, 0);

      // Period for views-over-time chart
      let chartStart = monthStart;
      let days = 30;
      if (period === 'today') { chartStart = todayStart; days = 1; }
      else if (period === '7d') { chartStart = weekStart; days = 7; }
      else if (period === '30d') { chartStart = monthStart; days = 30; }
      else if (period === '90d') {
        chartStart = new Date(now);
        chartStart.setDate(now.getDate() - 89);
        chartStart.setHours(0, 0, 0, 0);
        days = 90;
      } else if (period === 'all') {
        chartStart = new Date('2020-01-01');
        days = Math.ceil((now.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24));
      }

      const [totalViews, todayViews, weekViews, monthViews, allVisits] = await Promise.all([
        prisma.pageVisit.count(),
        prisma.pageVisit.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.pageVisit.count({ where: { createdAt: { gte: weekStart } } }),
        prisma.pageVisit.count({ where: { createdAt: { gte: monthStart } } }),
        prisma.pageVisit.findMany({
          where: { createdAt: { gte: chartStart } },
          select: { createdAt: true, utmSource: true, referrer: true, path: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      // ── Source breakdown ──────────────────────────────────────────────────
      const sourceMap: Record<string, number> = {};
      for (const v of allVisits) {
        let src = 'Direct / Unknown';
        if (v.utmSource) {
          const s = v.utmSource.toLowerCase();
          if (s.includes('tiktok')) src = 'TikTok';
          else if (s.includes('instagram') || s.includes('ig')) src = 'Instagram';
          else if (s.includes('facebook') || s.includes('fb')) src = 'Facebook';
          else if (s.includes('whatsapp') || s.includes('wa')) src = 'WhatsApp';
          else if (s.includes('google')) src = 'Google';
          else if (s.includes('twitter') || s.includes('x.com')) src = 'X / Twitter';
          else src = v.utmSource;
        } else if (v.referrer) {
          const r = v.referrer.toLowerCase();
          if (r.includes('tiktok')) src = 'TikTok';
          else if (r.includes('instagram')) src = 'Instagram';
          else if (r.includes('facebook') || r.includes('fb.com')) src = 'Facebook';
          else if (r.includes('whatsapp')) src = 'WhatsApp';
          else if (r.includes('google')) src = 'Google';
          else if (r.includes('twitter') || r.includes('x.com')) src = 'X / Twitter';
        }
        sourceMap[src] = (sourceMap[src] || 0) + 1;
      }
      const totalForPct = allVisits.length || 1;
      const sources = Object.entries(sourceMap)
        .map(([source, count]) => ({
          source,
          count,
          percentage: Math.round((count / totalForPct) * 1000) / 10,
        }))
        .sort((a, b) => b.count - a.count);

      // ── Views over time ───────────────────────────────────────────────────
      const dayMap: Record<string, number> = {};
      // Pre-fill all days in range with 0
      for (let i = 0; i < days; i++) {
        const d = new Date(chartStart);
        d.setDate(chartStart.getDate() + i);
        const key = d.toISOString().split('T')[0];
        dayMap[key] = 0;
      }
      for (const v of allVisits) {
        const key = v.createdAt.toISOString().split('T')[0];
        if (dayMap[key] !== undefined) dayMap[key]++;
        else dayMap[key] = 1;
      }
      const viewsOverTime = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      // ── Top properties ────────────────────────────────────────────────────
      const propMap: Record<string, number> = {};
      for (const v of allVisits) {
        const match = v.path.match(/^\/properties\/(\d+)$/);
        if (match) {
          propMap[match[1]] = (propMap[match[1]] || 0) + 1;
        }
      }
      const topIds = Object.entries(propMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      const topProperties = await Promise.all(
        topIds.map(async ([propertyId, views]) => {
          const prop = await prisma.property.findUnique({
            where: { id: parseInt(propertyId) },
            select: { title: true },
          });
          return {
            propertyId,
            title: prop?.title || `Property #${propertyId}`,
            views,
          };
        })
      );

      return {
        totalViews,
        todayViews,
        weekViews,
        monthViews,
        sources,
        viewsOverTime,
        topProperties,
      };
    },

    companies: async () => {
      return prisma.company.findMany({ include: { properties: true } });
    },

    company: async (_: any, { id }: { id: number }) => {
      return prisma.company.findUnique({ where: { id }, include: { properties: true } });
    },

    contactLogs: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true }
      });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      return prisma.contactLog.findMany({
        include: { property: true },
        orderBy: { createdAt: 'desc' }
      });
    },

    passwordResetRequests: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true }
      });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      return prisma.passwordResetRequest.findMany({
        orderBy: { createdAt: 'desc' },
      });
    },

    auditLogs: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true }
      });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      return prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
    },

    landlordRegistrations: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true }
      });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      return prisma.landlordRegistration.findMany({
        orderBy: { createdAt: 'desc' },
      });
    },

    reports: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true }
      });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      return [];
    },

    verificationRequests: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      return prisma.verificationRequest.findMany({
        include: { user: { select: { id: true, name: true, email: true, role: true, phone: true } } },
        orderBy: { createdAt: 'desc' }
      });
    },

    landlordAgentLinks: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      return prisma.landlordAgentLink.findMany({
        include: {
          landlord: { select: { id: true, name: true, email: true, role: true, phone: true } },
          agent: { select: { id: true, name: true, email: true, role: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    },

    leadInquiries: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      return prisma.leadInquiry.findMany({
        include: { property: true },
        orderBy: { createdAt: 'desc' }
      });
    },

    fraudAlerts: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      return prisma.fraudAlert.findMany({
        include: { property: true, user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });
    },

    subscriptions: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      return prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' }
      });
    },
  },

  Mutation: {
    register: async (_: any, { input }: { input: any }) => {
      const sanitizedName = sanitizeInput(input.name);
      const formattedPhone = formatGhanaPhone(input.phone);

      // Check if this phone number is already registered
      const existingByPhone = await prisma.user.findFirst({ where: { phone: formattedPhone } });
      if (existingByPhone) {
        throw new Error('An account with this phone number already exists. Please log in instead.');
      }

      // Check if this email is already registered (email is derived from phone on the frontend)
      const existingByEmail = await prisma.user.findUnique({ where: { email: input.email } });
      if (existingByEmail) {
        throw new Error('An account with this phone number already exists. Please log in instead.');
      }

      try {
        const hashed = await bcrypt.hash(input.password, 10);
        const user = await prisma.user.create({
          data: {
            name: sanitizedName,
            email: input.email,
            password: hashed,
            phone: formattedPhone,
          },
          select: USER_SAFE_SELECT,
        });

        const JWT_SECRET = getJwtSecret();
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return { token, user };
      } catch (err: any) {
        // Prisma unique constraint error (P2002) — fallback safety net
        if (err?.code === 'P2002') {
          throw new Error('An account with this phone number already exists. Please log in instead.');
        }
        throw err;
      }
    },

    login: async (_: any, { email, password }: any) => {
      const cleanInput = (email || '').trim();
      let user = await prisma.user.findUnique({
        where: { email: cleanInput },
        select: USER_SAFE_SELECT,
      });
      if (!user) {
        user = await prisma.user.findFirst({
          where: { phone: cleanInput },
          select: USER_SAFE_SELECT,
        });
      }
      if (!user) throw new Error('Invalid credentials');
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Invalid credentials');

      const JWT_SECRET = getJwtSecret();
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      createAuditLog('USER_LOGIN', `User ${user.name} (${user.email}) logged in`, user.email);
      return { token, user };
    },

    // User submits a password reset request → saved to DB + console log for admin
    submitPasswordResetRequest: async (_: any, { name, identifier, message }: any) => {
      if (!name?.trim() || !identifier?.trim()) {
        throw new Error('Name and email/phone are required.');
      }

      await prisma.passwordResetRequest.create({
        data: {
          name: sanitizeInput(name.trim()),
          identifier: identifier.trim(),
          message: message ? sanitizeInput(message.trim()) : null,
          status: 'pending',
        },
      });

      // Log for admin awareness
      console.log(`🔑 [Password Reset Request] Name: ${name}, Contact: ${identifier}, Message: ${message || 'None'}`);

      return {
        success: true,
        message: 'Your password reset request has been submitted. Our admin team will contact you shortly via WhatsApp or phone to help you reset your password.',
      };
    },

    // Admin resets a user's password directly
    adminResetUserPassword: async (_: any, { identifier, newPassword }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Only admins can reset user passwords.');

      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters.');
      }

      const cleanId = (identifier || '').trim();
      let targetUser = null;
      if (!isNaN(Number(cleanId)) && Number(cleanId) > 0) {
        targetUser = await prisma.user.findUnique({ where: { id: parseInt(cleanId) } });
      }
      if (!targetUser) {
        targetUser = await prisma.user.findUnique({ where: { email: cleanId } });
      }
      if (!targetUser) {
        targetUser = await prisma.user.findFirst({ where: { phone: cleanId } });
      }
      if (!targetUser) throw new Error('User not found.');

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { password: hashed, mustChangePassword: true },
      });

      console.log(`✅ [Admin Password Reset] Admin ${adminUser.email} reset password for user: ${targetUser.email} (${targetUser.phone || 'No Phone'})`);
      createAuditLog('ADMIN_RESET_PASSWORD', `Admin reset password for user ${targetUser.name} (${targetUser.email || targetUser.phone})`, targetUser.email || adminUser.email);

      return {
        success: true,
        message: `Password for ${targetUser.name} has been successfully reset.`,
      };
    },

    changePassword: async (_: any, { newPassword }: { newPassword: string }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters.');
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, mustChangePassword: false },
      });
      createAuditLog('PASSWORD_CHANGED', `User ${updatedUser.name} (${updatedUser.email}) updated their password`, updatedUser.email);
      return {
        success: true,
        message: 'Your password has been changed successfully.',
      };
    },

    // Admin marks a reset request as resolved
    resolvePasswordResetRequest: async (_: any, { id }: { id: number }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Not authorized.');

      await prisma.passwordResetRequest.update({
        where: { id },
        data: { status: 'resolved' },
      });

      return { success: true, message: 'Request marked as resolved.' };
    },

    addProperty: async (_: any, { input }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');

      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (fullUser?.role !== 'admin' && fullUser?.role !== 'partner' && fullUser?.role !== 'agent') {
        throw new Error('Not authorized to upload properties');
      }

      // Agents MUST have complete profile details (profile picture & bio) before posting properties
      if (fullUser?.role === 'agent') {
        if (!fullUser?.profileImage || !fullUser.profileImage.trim()) {
          throw new Error('Profile picture required: As a rental agent, you must upload your profile photo before posting properties so tenants can verify your identity.');
        }
        if (!fullUser?.bio || !fullUser.bio.trim()) {
          throw new Error('Agent bio required: Please enter your agent profile bio/description before posting property listings.');
        }
      }

      const defaultCompany = await prisma.company.findFirst({ where: { isOwnCompany: true } });
      if (!defaultCompany) throw new Error('Default company not found');

      // Agents force properties to pending_approval status, partners/admins default to available
      const status = fullUser?.role === 'agent' ? 'pending_approval' : (input.status || 'available');

      return prisma.property.create({
        data: {
          title: sanitizeInput(input.title),
          location: sanitizeInput(input.location),
          digitalAddress: input.digitalAddress ? sanitizeInput(input.digitalAddress) : null,
          landmarks: input.landmarks ? sanitizeInput(input.landmarks) : null,
          latitude: input.latitude !== undefined && input.latitude !== null ? parseFloat(input.latitude) : null,
          longitude: input.longitude !== undefined && input.longitude !== null ? parseFloat(input.longitude) : null,
          price: input.price,
          description: sanitizeInput(input.description),
          contact: formatGhanaPhone(input.contact),
          landlordName: input.landlordName ? sanitizeInput(input.landlordName) : null,
          type: input.type,
          status,
          imageUrl: input.imageUrl,
          isFeatured: input.isFeatured ?? false,
          ownerId: user.id,
          companyId: defaultCompany.id,
          images: {
            create: input.gallery?.map((img: any, index: number) => ({
              url: img.url.trim(),
              caption: img.caption,
              order: img.order || index,
            })) || [],
          },
        },
        include: { owner: true, company: true, images: { orderBy: { order: 'asc' } } },
      });
    },

    updateProperty: async (_: any, { id, input }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const property = await prisma.property.findUnique({ where: { id } });
      if (!property) throw new Error('Property not found');
      
      // Load user role to check authorization
      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (property.ownerId !== user.id && fullUser?.role !== 'admin') {
        throw new Error('Not authorized');
      }

      // Update basic property fields (excluding gallery)
      const { gallery, ...updateData } = input;
      if (updateData.title) updateData.title = sanitizeInput(updateData.title);
      if (updateData.location) updateData.location = sanitizeInput(updateData.location);
      if (updateData.digitalAddress) updateData.digitalAddress = sanitizeInput(updateData.digitalAddress);
      if (updateData.landmarks) updateData.landmarks = sanitizeInput(updateData.landmarks);
      if (updateData.description) updateData.description = sanitizeInput(updateData.description);
      if (updateData.contact) updateData.contact = formatGhanaPhone(updateData.contact);
      if (updateData.landlordName) updateData.landlordName = sanitizeInput(updateData.landlordName);
      if (updateData.latitude !== undefined && updateData.latitude !== null) updateData.latitude = parseFloat(updateData.latitude);
      if (updateData.longitude !== undefined && updateData.longitude !== null) updateData.longitude = parseFloat(updateData.longitude);

      // Force status back to pending_approval if edited by an agent (non-admin)
      if (fullUser?.role !== 'admin') {
        if (fullUser?.role === 'agent') {
          updateData.status = 'pending_approval';
        } else {
          delete updateData.status;
        }
      }

      await prisma.property.update({ where: { id }, data: updateData });

      // Update gallery images
      if (gallery) {
        await prisma.propertyImage.deleteMany({ where: { propertyId: id } });
        await prisma.propertyImage.createMany({
          data: gallery.map((img: any, index: number) => ({
            url: img.url,
            caption: img.caption,
            order: img.order || index,
            propertyId: id,
          })),
        });
      }

      return prisma.property.findUnique({
        where: { id },
        include: { owner: true, company: true, images: { orderBy: { order: 'asc' } } },
      });
    },

    updatePropertyStatus: async (_: any, { id, status }: { id: number; status: string }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Not authorized to update property status');

      const updated = await prisma.property.update({
        where: { id },
        data: { status: sanitizeInput(status) },
        include: { owner: true, company: true, images: { orderBy: { order: 'asc' } } },
      });

      createAuditLog('PROPERTY_STATUS_UPDATED', `Admin ${adminUser.email} updated status of property #${id} to ${status}`, adminUser.email);
      return updated;
    },

    deleteProperty: async (_: any, { id }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');

      const property = await prisma.property.findUnique({ where: { id } });
      if (!property) throw new Error('Property not found');
      
      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (property.ownerId !== user.id && fullUser?.role !== 'admin') {
        throw new Error('Not authorized');
      }

      // Delete all gallery images first
      await prisma.propertyImage.deleteMany({ where: { propertyId: id } });

      // Then delete the property
      return prisma.property.delete({
        where: { id },
        include: { owner: true, company: true },
      });
    },

    togglePropertyFeatured: async (_: any, { id }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (fullUser?.role !== 'admin') throw new Error('Not authorized');

      const property = await prisma.property.findUnique({ where: { id } });
      if (!property) throw new Error('Property not found');

      return prisma.property.update({
        where: { id },
        data: { isFeatured: !property.isFeatured },
        include: { owner: true, company: true, images: { orderBy: { order: 'asc' } } },
      });
    },

    createCompany: async (_: any, { name, logoUrl, contact, momoAccount }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (fullUser?.role !== 'admin') throw new Error('Admin only');

      return prisma.company.create({ data: { name, logoUrl, contact, momoAccount } });
    },

    createPartner: async (_: any, { input }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (fullUser?.role !== 'admin') throw new Error('Admin only');

      const hashed = await bcrypt.hash(input.password, 10);
      let companyId = input.companyId;

      if (!companyId) {
        const newCompany = await prisma.company.create({
          data: {
            name: input.companyName,
            logoUrl: input.logoUrl || '',
            contact: input.contact,
            momoAccount: input.momoAccount,
            isOwnCompany: false,
          },
        });
        companyId = newCompany.id;
      }

      const partner = await prisma.user.create({
        data: {
          name: input.userName,
          email: input.email,
          password: hashed,
          phone: input.phone,
          role: 'partner',
          companyId,
        },
      });

      const JWT_SECRET = getJwtSecret();
      const token = jwt.sign({ id: partner.id }, JWT_SECRET, { expiresIn: '7d' });
      return { token, user: partner };
    },

    updatePropertyCompany: async (_: any, { id, companyId }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      return prisma.property.update({
        where: { id },
        data: { companyId },
        include: { company: true },
      });
    },

    deleteUser: async (_: any, { id }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (fullUser?.role !== 'admin') throw new Error('Admin only');

      return prisma.user.delete({ where: { id } });
    },

    updateUserRole: async (_: any, { id, role }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (fullUser?.role !== 'admin') throw new Error('Admin only');

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
      });
      createAuditLog('ROLE_UPDATED', `Admin ${fullUser.email} updated user ${updatedUser.email} to role ${role}`, fullUser.email);
      return updatedUser;
    },

    createContactLog: async (_: any, { customerName, customerPhone, actionType, propertyId, landlordPhone }: any) => {
      const log = await prisma.contactLog.create({
        data: {
          customerName: sanitizeInput(customerName),
          customerPhone: formatGhanaPhone(customerPhone),
          actionType: sanitizeInput(actionType),
          propertyId,
          landlordPhone: formatGhanaPhone(landlordPhone),
        },
        include: { property: true }
      });
      createAuditLog('LANDLORD_CONTACTED', `Customer ${customerName} (${customerPhone}) initiated ${actionType} for property #${propertyId} (Landlord: ${landlordPhone})`, customerPhone);
      return log;
    },

    deleteOldAuditLogs: async (_: any, { days }: { days: number }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Only admins can delete audit logs.');

      let deletedCount = 0;
      if (days === 0) {
        const res = await prisma.auditLog.deleteMany({});
        deletedCount = res.count;
      } else {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const res = await prisma.auditLog.deleteMany({
          where: { createdAt: { lt: cutoff } }
        });
        deletedCount = res.count;
      }

      createAuditLog('CLEARED_AUDIT_LOGS', `Admin ${adminUser.name} deleted audit logs older than ${days === 0 ? 'all' : days + ' days'} (${deletedCount} removed)`, adminUser.email);
      return { success: true, message: `Successfully deleted ${deletedCount} audit log(s).` };
    },

    deleteAuditLogs: async (_: any, { ids }: { ids: number[] }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Only admins can delete audit logs.');

      const res = await prisma.auditLog.deleteMany({
        where: { id: { in: ids } }
      });
      createAuditLog('DELETED_AUDIT_LOGS', `Admin ${adminUser.name} deleted ${res.count} audit log(s)`, adminUser.email);
      return { success: true, message: `Successfully deleted ${res.count} security log(s).` };
    },

    deleteContactLogs: async (_: any, { ids }: { ids: number[] }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Only admins can delete contact logs.');

      const res = await prisma.contactLog.deleteMany({
        where: { id: { in: ids } }
      });
      createAuditLog('DELETED_CONTACT_LOGS', `Admin ${adminUser.name} deleted ${res.count} contact inquiry log(s)`, adminUser.email);
      return { success: true, message: `Successfully deleted ${res.count} contact log(s).` };
    },

    recordPageVisit: async (_: any, { path, utmSource, utmMedium, utmCampaign, utmContent, referrer }: {
      path: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      referrer?: string;
    }) => {
      await prisma.pageVisit.create({
        data: {
          path,
          utmSource: utmSource || null,
          utmMedium: utmMedium || null,
          utmCampaign: utmCampaign || null,
          utmContent: utmContent || null,
          referrer: referrer || null,
        }
      });
      return true;
    },

    createLandlordRegistration: async (_: any, { input }: any) => {
      return prisma.landlordRegistration.create({
        data: {
          name: sanitizeInput(input.name),
          dob: input.dob ? sanitizeInput(input.dob) : null,
          gender: input.gender ? sanitizeInput(input.gender) : null,
          nationalId: input.nationalId ? sanitizeInput(input.nationalId) : null,
          homeAddress: input.homeAddress ? sanitizeInput(input.homeAddress) : null,
          city: sanitizeInput(input.city),
          region: input.region ? sanitizeInput(input.region) : null,
          phone1: formatGhanaPhone(input.phone1),
          phone2: input.phone2 ? formatGhanaPhone(input.phone2) : null,
          email: input.email ? sanitizeInput(input.email) : null,
          occupation: input.occupation ? sanitizeInput(input.occupation) : null,
          propAddress: sanitizeInput(input.propAddress),
          propCity: input.propCity ? sanitizeInput(input.propCity) : null,
          propLandmark: input.propLandmark ? sanitizeInput(input.propLandmark) : null,
          propRegion: input.propRegion ? sanitizeInput(input.propRegion) : null,
          propGps: input.propGps ? sanitizeInput(input.propGps) : null,
          rent: parseFloat(input.rent),
          advance: input.advance ? sanitizeInput(input.advance) : null,
          rooms: input.rooms !== undefined && input.rooms !== null ? parseInt(input.rooms, 10) : null,
          availableFrom: input.availableFrom ? sanitizeInput(input.availableFrom) : null,
          propType: input.propType ? sanitizeInput(input.propType) : null,
          amenities: input.amenities || [],
          plan: input.plan ? sanitizeInput(input.plan) : null,
          photos: input.photos || [],
          status: 'Pending Verification',
          agreementSigned: true,
          socialMediaBoost: input.socialMediaBoost || false,
        }
      });
    },

    updateLandlordRegistrationStatus: async (_: any, { id, status }: { id: any; status: string }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Not authorized');

      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;

      return prisma.landlordRegistration.update({
        where: { id: parsedId },
        data: { status: sanitizeInput(status) },
      });
    },

    deleteLandlordRegistration: async (_: any, { id }: { id: any }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Not authorized');

      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;

      return prisma.landlordRegistration.delete({
        where: { id: parsedId },
      });
    },

    publishLandlordRegistration: async (_: any, { id }: { id: any }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Not authorized');

      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;

      // 1. Fetch the registration
      const r = await prisma.landlordRegistration.findUnique({
        where: { id: parsedId }
      });
      if (!r) throw new Error('Registration not found');

      // 2. Fetch default company
      const defaultCompany = await prisma.company.findFirst({ where: { isOwnCompany: true } });
      if (!defaultCompany) throw new Error('Default company not found');

      // 3. Construct description & title
      const title = `${r.propType} in ${r.city}`;
      const description = `Beautiful ${r.propType} located in ${r.city}. Rooms: ${r.rooms || 1}. Advance period: ${r.advance || 'N/A'}. Available from: ${r.availableFrom || 'Immediately'}. Utilities/Amenities: ${r.amenities.join(', ') || 'None'}. Landmark: ${r.propLandmark || 'N/A'}.`;

      // 4. Create property in database
      const property = await prisma.property.create({
        data: {
          title: sanitizeInput(title),
          location: sanitizeInput(`${r.propAddress}, ${r.city}`),
          digitalAddress: r.propGps ? sanitizeInput(r.propGps) : null,
          landmarks: r.propLandmark ? sanitizeInput(r.propLandmark) : null,
          price: r.rent,
          description: sanitizeInput(description),
          contact: formatGhanaPhone(r.phone1),
          landlordName: sanitizeInput(r.name),
          type: r.propType || 'Single Room Self Contain',
          status: 'available',
          imageUrl: r.photos[0] || '',
          isFeatured: r.plan === 'Premium',
          ownerId: user.id,
          companyId: defaultCompany.id,
          images: {
            create: r.photos.map((src, index) => ({
              url: src.trim(),
              caption: 'Property Photo',
              order: index,
            })) || [],
          },
        },
        include: { owner: true, company: true, images: { orderBy: { order: 'asc' } } },
      });

      // 5. Update status of the landlord registration to "Verified"
      await prisma.landlordRegistration.update({
        where: { id: parsedId },
        data: { status: 'Verified' }
      });

      createAuditLog('LANDLORD_PUBLISHED', `Admin ${adminUser.name} approved & published landlord registration #${parsedId} as property #${property.id}`, adminUser.email);

      return property;
    },

    updateReportStatus: async (_: any, { id, status }: { id: any; status: string }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Not authorized');

      return { id: typeof id === 'string' ? parseInt(id, 10) : id, status };
    },

    deleteReport: async (_: any, { id }: { id: any }, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Not authorized');

      return { id: typeof id === 'string' ? parseInt(id, 10) : id };
    },

    updateAgentProfile: async (_: any, { bio, profileImage, agentLocation, agentWhatsapp }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser?.role !== 'agent' && dbUser?.role !== 'admin') throw new Error('Only agents can update their profile.');
      if (!bio?.trim()) throw new Error('Bio is required.');

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          bio: sanitizeInput(bio.trim()),
          profileImage: profileImage?.trim() || null,
          agentLocation: agentLocation ? sanitizeInput(agentLocation.trim()) : null,
          agentWhatsapp: agentWhatsapp ? formatGhanaPhone(agentWhatsapp.trim()) : null,
        },
        select: { id: true, name: true, email: true, role: true, phone: true, bio: true, profileImage: true, agentLocation: true, agentWhatsapp: true, mustChangePassword: true },
      });

      createAuditLog('AGENT_PROFILE_UPDATED', `Agent ${dbUser.name} (${dbUser.email}) updated their profile`, dbUser.email);
      return updated;
    },

    submitVerificationRequest: async (_: any, { idType, idNumber, documentUrls }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const req = await prisma.verificationRequest.create({
        data: {
          userId: user.id,
          idType: idType || 'ghana_card',
          idNumber,
          documentUrls: documentUrls || [],
          status: 'pending'
        },
        include: { user: { select: { id: true, name: true, email: true, role: true, phone: true } } }
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationStatus: 'pending' }
      });
      createAuditLog('VERIFICATION_REQUEST_SUBMITTED', `User ${user.id} submitted verification request for ${idType}`, null);
      return req;
    },

    reviewVerificationRequest: async (_: any, { id, status, reviewerNotes }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const adminUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (adminUser?.role !== 'admin') throw new Error('Not authorized');

      const reqId = typeof id === 'string' ? parseInt(id, 10) : id;
      const updatedReq = await prisma.verificationRequest.update({
        where: { id: reqId },
        data: { status, reviewerNotes }
      });

      if (status === 'verified') {
        await prisma.user.update({
          where: { id: updatedReq.userId },
          data: { verificationStatus: 'verified' }
        });
      }

      createAuditLog('VERIFICATION_REVIEWED', `Admin reviewed request ${reqId} with status ${status}`, adminUser.email);
      return updatedReq;
    },

    createLandlordAgentLink: async (_: any, { landlordId, agentId, commissionShare }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const link = await prisma.landlordAgentLink.create({
        data: {
          landlordId: typeof landlordId === 'string' ? parseInt(landlordId, 10) : landlordId,
          agentId: typeof agentId === 'string' ? parseInt(agentId, 10) : agentId,
          commissionShare: commissionShare || null,
          status: 'pending'
        },
        include: {
          landlord: { select: { id: true, name: true, email: true, role: true, phone: true } },
          agent: { select: { id: true, name: true, email: true, role: true, phone: true } }
        }
      });
      createAuditLog('AGENT_LINK_CREATED', `Link requested between landlord ${landlordId} and agent ${agentId}`, null);
      return link;
    },

    updateLinkStatus: async (_: any, { id, status }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const linkId = typeof id === 'string' ? parseInt(id, 10) : id;
      return prisma.landlordAgentLink.update({
        where: { id: linkId },
        data: { status }
      });
    },

    createLeadInquiry: async (_: any, { propertyId, tenantName, tenantPhone, channel }: any) => {
      const pId = typeof propertyId === 'string' ? parseInt(propertyId, 10) : propertyId;
      return prisma.leadInquiry.create({
        data: {
          propertyId: pId,
          tenantName,
          tenantPhone,
          channel: channel || 'whatsapp',
          status: 'new'
        },
        include: { property: true }
      });
    },

    flagFraudAlert: async (_: any, { propertyId, userId, reason, severity }: any, { user }: { user: { id: number } | null }) => {
      const pId = propertyId ? (typeof propertyId === 'string' ? parseInt(propertyId, 10) : propertyId) : null;
      const uId = userId ? (typeof userId === 'string' ? parseInt(userId, 10) : userId) : (user ? user.id : null);
      return prisma.fraudAlert.create({
        data: {
          propertyId: pId,
          userId: uId,
          reason,
          severity: severity || 'medium',
          status: 'open'
        }
      });
    },

    createSubscription: async (_: any, { name, price, billingCycle, momoNumber }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const sub = await prisma.subscription.create({
        data: {
          name,
          price,
          billingCycle: billingCycle || 'monthly',
          status: 'active',
          momoNumber: momoNumber || null
        }
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionId: sub.id }
      });
      createAuditLog('SUBSCRIPTION_CREATED', `User ${user.id} subscribed to ${name} for GHc ${price}`, null);
      return sub;
    },
  },

  Property: {
    gallery: (parent: any) =>
      parent.images?.map((img: any) => ({
        ...img,
        url: img.url.trim(),
      })) || [],
  },

  ContactLog: {
    property: async (parent: any) => {
      return prisma.property.findUnique({
        where: { id: parent.propertyId },
        include: { owner: true, company: true, images: true }
      });
    }
  }
};
