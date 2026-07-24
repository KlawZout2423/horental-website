import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { formatGhanaPhone, isValidGhanaPhone, sanitizeInput } from '../../lib/types';

const COMMISSION_FEE = 5;

// Mock / placeholder for payment collection
async function collectPayment(phone: string, amount: number, transactionId: string, description: string) {
  // Implement actual MoMo payment logic here
  return true;
}

export const resolvers = {
  Query: {
    me: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) return null;
      return prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true, role: true, phone: true, mustChangePassword: true }
      });
    },

    users: async () => {
      return prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, phone: true, mustChangePassword: true },
      });
    },

    properties: async (_: any, { type }: { type?: string }) => {
      const where = type ? { type } : {};
      return prisma.property.findMany({
        where,
        include: {
          owner: true,
          company: true,
          images: { orderBy: { order: 'asc' } },
        },
      });
    },

    property: async (_: any, { id }: { id: number }) => {
      return prisma.property.findUnique({
        where: { id },
        include: {
          owner: true,
          company: true,
          images: { orderBy: { order: 'asc' } },
        },
      });
    },

    dashboardStats: async () => {
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

    myBookings: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      return prisma.booking.findMany({
        where: { userId: user.id },
        include: {
          property: { include: { owner: true } },
          company: true,
        },
      });
    },

    companies: async () => {
      return prisma.company.findMany({ include: { properties: true } });
    },

    company: async (_: any, { id }: { id: number }) => {
      return prisma.company.findUnique({ where: { id }, include: { properties: true } });
    },

    contactLogs: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      return prisma.contactLog.findMany({
        include: { property: true },
        orderBy: { createdAt: 'desc' }
      });
    },

    passwordResetRequests: async (_: any, __: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser?.role !== 'admin') throw new Error('Not authorized');

      return prisma.passwordResetRequest.findMany({
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Mutation: {
    register: async (_: any, { input }: { input: any }) => {
      const sanitizedName = sanitizeInput(input.name);
      const formattedPhone = formatGhanaPhone(input.phone);

      const hashed = await bcrypt.hash(input.password, 10);
      const user = await prisma.user.create({
        data: {
          name: sanitizedName,
          email: input.email,
          password: hashed,
          phone: formattedPhone,
        },
      });

      const JWT_SECRET = process.env.JWT_SECRET || 'horentals-super-secret-jwt-key-2026';
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      return { token, user };
    },

    login: async (_: any, { email, password }: any) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error('Invalid credentials');
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Invalid credentials');

      const JWT_SECRET = process.env.JWT_SECRET || 'horentals-super-secret-jwt-key-2026';
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
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

      let targetUser = await prisma.user.findUnique({ where: { email: identifier.trim() } });
      if (!targetUser) {
        targetUser = await prisma.user.findFirst({ where: { phone: identifier.trim() } });
      }
      if (!targetUser) throw new Error('User not found with this email or phone number.');

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { password: hashed, mustChangePassword: true },
      });

      console.log(`✅ [Admin Password Reset] Admin ${adminUser.email} reset password for user: ${targetUser.email} (${targetUser.phone || 'No Phone'})`);

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
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, mustChangePassword: false },
      });
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
      if (fullUser?.role !== 'admin' && fullUser?.role !== 'partner') {
        throw new Error('Not authorized to upload properties');
      }

      const defaultCompany = await prisma.company.findFirst({ where: { isOwnCompany: true } });
      if (!defaultCompany) throw new Error('Default company not found');

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
          type: input.type,
          status: input.status || 'available',
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
      if (updateData.latitude !== undefined && updateData.latitude !== null) updateData.latitude = parseFloat(updateData.latitude);
      if (updateData.longitude !== undefined && updateData.longitude !== null) updateData.longitude = parseFloat(updateData.longitude);

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

    createBooking: async (_: any, { propertyId, startDate, endDate, totalAmount }: any, { user }: { user: { id: number } | null }) => {
      if (!user) throw new Error('Not authenticated');
      
      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!fullUser?.phone) throw new Error('User phone number required');

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) throw new Error('End date must be after start date');

      const overlapping = await prisma.booking.findFirst({
        where: {
          propertyId,
          OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
          status: { notIn: ['cancelled'] },
        },
      });
      if (overlapping) throw new Error('Property already booked');

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { company: true },
      });
      if (!property) throw new Error('Property not found');

      const companyId = property.companyId;
      const commissionAmount = property.company.isOwnCompany ? 0 : COMMISSION_FEE;
      const momoTxId = `tx_${uuidv4()}`;

      await collectPayment(fullUser.phone, totalAmount, momoTxId, `Booking for ${property.title}`);

      return prisma.booking.create({
        data: {
          propertyId,
          userId: user.id,
          companyId,
          startDate: start,
          endDate: end,
          totalAmount,
          commissionAmount,
          momoTxId,
          status: 'pending_payment',
        },
        include: {
          property: { include: { owner: true } },
          company: true,
        },
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

      const JWT_SECRET = process.env.JWT_SECRET || 'horentals-super-secret-jwt-key-2026';
      const token = jwt.sign({ id: partner.id }, JWT_SECRET, { expiresIn: '7d' });
      return { token, user: partner };
    },

    updatePropertyCompany: async (_: any, { id, companyId }: any) => {
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

      return prisma.user.update({
        where: { id },
        data: { role },
      });
    },

    createContactLog: async (_: any, args: { customerName: string; customerPhone: string; actionType: string; propertyId: number; landlordPhone: string }) => {
      return prisma.contactLog.create({
        data: {
          customerName: sanitizeInput(args.customerName),
          customerPhone: formatGhanaPhone(args.customerPhone),
          actionType: sanitizeInput(args.actionType),
          propertyId: args.propertyId,
          landlordPhone: formatGhanaPhone(args.landlordPhone),
        },
        include: { property: true }
      });
    },

    recordPageVisit: async (_: any, { path }: { path: string }) => {
      await prisma.pageVisit.create({
        data: { path }
      });
      return true;
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
