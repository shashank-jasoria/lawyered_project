import { Controller, Post, Get, Param, UseGuards, Request , Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WillsService } from './wills.service';
import { WillValidatorService } from './will-validator.service';
import { WillDocumentService } from './will-document.service';
import { Response } from 'express';

@Controller('wills')
export class WillsController {
    constructor(
        private readonly willsService: WillsService , 
        private readonly validatorService: WillValidatorService,
        private readonly documentService: WillDocumentService,
    ) {}

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async create(@Request() req) {
        return this.willsService.createWill(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    async getOne(@Param('id') id: string, @Request() req) {
        return this.willsService.getWill(id, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id/validate')
    async validate(@Param('id') id: string, @Request() req) {
    const will = await this.willsService.getWill(id, req.user.userId);
        return this.validatorService.validate(will);
    }


    @UseGuards(AuthGuard('jwt'))
    @Get(':id/document')
    async getDocument(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const will = await this.willsService.getWill(id, req.user.userId);
    
    // 1. Validate first – only generate if valid
    const validation = this.validatorService.validate(will);
    if (validation.status !== 'valid') {
        return res.status(400).json({
        message: 'Will is not valid for download.',
        issues: validation.issues,
        });
    }

    // 2. Generate PDF
    const pdfBuffer = await this.documentService.generatePdf(will);

    // 3. Stream the PDF as download
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Will-${will.person_name || 'draft'}.pdf"`,
        'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
    }
}