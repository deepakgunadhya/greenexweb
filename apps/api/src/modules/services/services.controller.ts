import { Request, Response } from "express";
import { successResponse, errorResponse } from "../../utils/response";
import { asyncHandler, AppError } from "../../middleware/error.middleware";
import prisma from "../../config/database";
import { logger } from "../../utils/logger";

export class ServicesController {
  /**
   * @swagger
   * /api/v1/services/lookup:
   *   get:
   *     summary: Get lightweight service list for dropdowns
   *     tags: [Services]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Service lookup list retrieved successfully
   */
  lookup = asyncHandler(async (req: Request, res: Response) => {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true },
      orderBy: { name: "asc" },
    });
    res.json(successResponse(services));
  });

  /**
   * @swagger
   * /api/v1/services:
   *   get:
   *     summary: Get all services
   *     tags: [Services]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Services retrieved successfully
   */
  findMany = asyncHandler(async (req: Request, res: Response) => {
    const { includeInactive } = req.query;
    
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    const servicesRaw = await prisma.service.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });

    // Convert Decimal to number
    const services = servicesRaw.map(service => ({
      ...service,
      basePrice: service.basePrice ? Number(service.basePrice) : null
    }));

    res.json(successResponse(services));
  });

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   get:
   *     summary: Get service by ID
   *     tags: [Services]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Service retrieved successfully
   *       404:
   *         description: Service not found
   */
  findOne = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const serviceRaw = await prisma.service.findUnique({
      where: { id }
    });

    if (!serviceRaw) {
      throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
    }

    const service = {
      ...serviceRaw,
      basePrice: serviceRaw.basePrice ? Number(serviceRaw.basePrice) : null
    };

    res.json(successResponse(service));
  });

  /**
   * @swagger
   * /api/v1/services:
   *   post:
   *     summary: Create a new service
   *     tags: [Services]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               basePrice:
   *                 type: number
   *               category:
   *                 type: string
   *               unit:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Service created successfully
   *       400:
   *         description: Validation error
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, basePrice, category = 'General', unit, isActive = true } = req.body;

    if (!name || name.trim() === '') {
      throw new AppError('Service name is required', 400, 'VALIDATION_ERROR');
    }

    // Check for duplicate service name
    const existingService = await prisma.service.findFirst({
      where: { name: name.trim() }
    });

    if (existingService) {
      throw new AppError('Service with this name already exists', 400, 'SERVICE_EXISTS');
    }

    const service = await prisma.service.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        basePrice: basePrice ? basePrice : null,
        category,
        unit,
        isActive
      }
    });

    logger.info(`Created service: ${name}`, { serviceId: service.id });

    const formattedService = {
      ...service,
      basePrice: service.basePrice ? Number(service.basePrice) : null
    };

    res.status(201).json(successResponse(formattedService));
  });

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   put:
   *     summary: Update a service
   *     tags: [Services]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               basePrice:
   *                 type: number
   *               category:
   *                 type: string
   *               unit:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Service updated successfully
   *       404:
   *         description: Service not found
   *       400:
   *         description: Validation error
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, basePrice, category, unit, isActive } = req.body;

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id }
    });

    if (!existingService) {
      throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existingService.name) {
      const duplicateService = await prisma.service.findFirst({
        where: { 
          name: name.trim(),
          id: { not: id }
        }
      });

      if (duplicateService) {
        throw new AppError('Service with this name already exists', 400, 'SERVICE_EXISTS');
      }
    }

    // Check if trying to deactivate a service in use
    if (isActive === false) {
      const serviceWithProjects = await prisma.service.findUnique({
        where: { id },
        include: {
          projectServices: true
        }
      });

      if (serviceWithProjects && serviceWithProjects.projectServices.length > 0) {
        throw new AppError(
          'Cannot inactivate service that is used in projects.',
          400,
          'SERVICE_IN_USE'
        );
      }
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(basePrice !== undefined && { basePrice: basePrice }),
        ...(category && { category }),
        ...(unit !== undefined && { unit }),
        ...(isActive !== undefined && { isActive })
      }
    });

    logger.info(`Updated service: ${id}`, { serviceName: service.name });

    const formattedService = {
      ...service,
      basePrice: service.basePrice ? Number(service.basePrice) : null
    };

    res.json(successResponse(formattedService));
  });

  /**
   * @swagger
   * /api/v1/services/{id}:
   *   delete:
   *     summary: Delete a service (soft delete)
   *     tags: [Services]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Service deleted successfully
   *       404:
   *         description: Service not found
   *       400:
   *         description: Service is in use and cannot be deleted
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        projectServices: true
      }
    });

    if (!service) {
      throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
    }

    // Check if service is used in any projects
    if (service.projectServices.length > 0) {
      throw new AppError(
        'Cannot delete service that is used in projects. Deactivate it instead.',
        400,
        'SERVICE_IN_USE'
      );
    }

    // Soft delete by setting isActive = false
    await prisma.service.update({
      where: { id },
      data: { isActive: false }
    });

    logger.info(`Deactivated service: ${id}`, { serviceName: service.name });

    res.json(successResponse({ message: 'Service deactivated successfully' }));
  });
}