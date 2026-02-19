import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export interface CreateTemplateFileDto {
  title: string;
  description?: string;
  category: string;
  clientVisible: boolean;
  createdBy?: string;
}

export interface CreateTemplateFileWithAttachmentsDto {
  title: string;
  description?: string;
  category: string;
  clientVisible: boolean;
  createdBy?: string;
  attachments: {
    filePath: string;
    originalName: string;
    fileSize?: bigint;
    mimeType?: string;
    uploadedBy?: string;
  }[];
}

export interface UpdateTemplateFileDto {
  title?: string;
  description?: string;
  category?: string;
  clientVisible?: boolean;
}

export interface AddAttachmentDto {
  filePath: string;
  originalName: string;
  fileSize: bigint;
  mimeType: string;
  uploadedBy: string;
  sortOrder?: number;
}

export class TemplateFilesService {
  /**
   * Get all template files with their attachments
   */
  async getAllTemplateFiles(category?: string) {
    const where: any = {};
    if (category) {
      where.category = category;
    }

    const files = await (prisma.checklistTemplateFile.findMany as any)({
      where,
      include: {
        attachments: {
          orderBy: {
            sortOrder: 'asc'
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    return files.map((file: any) => this.serializeFile(file));
  }

  /**
   * Get single template file with attachments
   */
  async getTemplateFile(id: string) {
    const file = await (prisma.checklistTemplateFile.findUnique as any)({
      where: { id },
      include: {
        attachments: {
          orderBy: {
            sortOrder: 'asc'
          }
        }
      }
    });

    if (!file) {
      throw new AppError('Template file not found', 404, 'FILE_NOT_FOUND');
    }

    return this.serializeFile(file);
  }

  /**
   * Create template file with multiple attachments
   */
  async createTemplateFileWithAttachments(data: CreateTemplateFileWithAttachmentsDto) {
    const file = await (prisma.checklistTemplateFile.create as any)({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        clientVisible: data.clientVisible,
        createdBy: data.createdBy,
        attachments: {
          create: data.attachments.map((attachment, index) => ({
            filePath: attachment.filePath,
            originalName: attachment.originalName,
            // fileSize: attachment.fileSize,
            mimeType: attachment.mimeType,
            uploadedBy: attachment.uploadedBy,
            sortOrder: index
          }))
        }
      },
      include: {
        attachments: {
          orderBy: {
            sortOrder: 'asc'
          }
        }
      }
    });

    logger.info('Template file with attachments created', {
      id: file.id,
      title: file.title,
      attachmentCount: file.attachments.length
    });

    return this.serializeFile(file);
  }

  /**
   * Create template file (metadata only, without attachments)
   */
  async createTemplateFile(data: CreateTemplateFileDto) {
    const file = await (prisma.checklistTemplateFile.create as any)({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        clientVisible: data.clientVisible,
        createdBy: data.createdBy
      },
      include: {
        attachments: true
      }
    });

    logger.info('Template file created', { id: file.id, title: file.title });

    return this.serializeFile(file);
  }

  /**
   * Update template file metadata
   */
  async updateTemplateFile(id: string, data: UpdateTemplateFileDto) {
    const existingFile = await prisma.checklistTemplateFile.findUnique({
      where: { id }
    });

    if (!existingFile) {
      throw new AppError('Template file not found', 404, 'FILE_NOT_FOUND');
    }

    const updatedFile = await (prisma.checklistTemplateFile.update as any)({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.clientVisible !== undefined && { clientVisible: data.clientVisible })
      },
      include: {
        attachments: {
          orderBy: {
            sortOrder: 'asc'
          }
        }
      }
    });

    logger.info('Template file updated', { id });

    return this.serializeFile(updatedFile);
  }

  /**
   * Add attachment to template file
   */
  async addAttachment(templateFileId: string, data: AddAttachmentDto) {
    const templateFile = await (prisma.checklistTemplateFile.findUnique as any)({
      where: { id: templateFileId },
      include: { attachments: true }
    });

    if (!templateFile) {
      throw new AppError('Template file not found', 404, 'FILE_NOT_FOUND');
    }

    const sortOrder = data.sortOrder ?? templateFile.attachments.length;

    const attachment = await prisma.checklistTemplateFileAttachment.create({
      data: {
        templateFileId,
        filePath: data.filePath,
        originalName: data.originalName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedBy: data.uploadedBy,
        sortOrder
      }
    });

    logger.info('Attachment added to template file', {
      templateFileId,
      attachmentId: attachment.id
    });

    return this.serializeAttachment(attachment);
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string) {
    const attachment = await prisma.checklistTemplateFileAttachment.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) {
      throw new AppError('Attachment not found', 404, 'ATTACHMENT_NOT_FOUND');
    }

    await prisma.checklistTemplateFileAttachment.delete({
      where: { id: attachmentId }
    });

    logger.info('Attachment deleted', { attachmentId });

    return { message: 'Attachment deleted successfully' };
  }

  /**
   * Delete template file (and all its attachments via cascade)
   */
  async deleteTemplateFile(id: string) {
    const existingFile = await (prisma.checklistTemplateFile.findUnique as any)({
      where: { id },
      include: { attachments: true }
    });

    if (!existingFile) {
      throw new AppError('Template file not found', 404, 'FILE_NOT_FOUND');
    }

    await prisma.checklistTemplateFile.delete({
      where: { id }
    });

    logger.info('Template file deleted', {
      id,
      attachmentsDeleted: existingFile.attachments.length
    });

    return { message: 'Template file deleted successfully' };
  }

  /**
   * Helper: Serialize file with attachments (convert BigInt to string)
   */
  private serializeFile(file: any) {
    return {
      ...file,
      attachments: file.attachments?.map((att: any) => this.serializeAttachment(att)) || [],
      createdAt: file.createdAt?.toISOString(),
      updatedAt: file.updatedAt?.toISOString()
    };
  }

  /**
   * Helper: Serialize attachment (convert BigInt to string)
   */
  private serializeAttachment(attachment: any) {
    return {
      ...attachment,
      fileSize: attachment.fileSize ? attachment.fileSize.toString() : null,
      uploadedAt: attachment.uploadedAt?.toISOString()
    };
  }
}
